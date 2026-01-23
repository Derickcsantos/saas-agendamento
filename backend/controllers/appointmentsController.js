import { supabase } from '../lib/supabase.js';
import { google } from "googleapis";
import axios from "axios";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";
import { isUserAdmin } from '../middlewares/authMiddleware.js';

// Garante que a linha de saldo exista para a organização
async function ensureOrganizationBalance(organizationId) {
  const { data } = await supabase
    .from("organization_withdrawals_balance")
    .select("id")
    .eq("organization_id", organizationId)
    .single();

  if (!data) {
    await supabase
      .from("organization_withdrawals_balance")
      .insert({ organization_id: organizationId });
  }
}

// Cria cobrança PIX via AbacatePay e retorna dados para pagamento
async function createPixCharge({ organizationId, appointmentId, amountInCents }) {
  if (!amountInCents || amountInCents <= 0) {
    throw new Error("Valor inválido para cobrança PIX");
  }

  await ensureOrganizationBalance(organizationId);

  const feeAmount = 100; // R$1 taxa da plataforma em centavos
  const netAmount = amountInCents - feeAmount;

  if (netAmount <= 0) {
    throw new Error("Valor líquido inválido para cobrança PIX");
  }

  // 1️⃣ Cria transação pendente
  const { data: transaction, error: txError } = await supabase
    .from("transactions_organizations")
    .insert({
      organization_id: organizationId,
      appointment_id: appointmentId,
      type: "pix_in",
      status: "pending",
      gross_amount: amountInCents,
      fee_amount: feeAmount,
      net_amount: netAmount
    })
    .select()
    .single();

  if (txError) {
    throw txError;
  }

  // 2️⃣ Gera QR Code PIX via AbacatePay
  let abacateResponse;
  try {
    abacateResponse = await axios.post(
      `${process.env.ABACATEPAY_BASE_URL}/pixQrcode/create`,
      {
        amount: amountInCents,
        description: "Appointment payment",
        expires_in: 1800,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ABACATEPAY_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (apiError) {
    // Marca transação como falha
    await supabase
      .from("transactions_organizations")
      .update({ status: "failed" })
      .eq("id", transaction.id);

    const details = apiError.response?.data || apiError.message;
    throw new Error(`Falha ao gerar PIX: ${JSON.stringify(details)}`);
  }

  const pixData = abacateResponse.data;

  // 3️⃣ Salva dados do PIX na transação
  await supabase
    .from("transactions_organizations")
    .update({
      external_id: pixData.id,
      pix_qr_code: pixData.qr_code,
      pix_copy_paste: pixData.copy_paste,
    })
    .eq("id", transaction.id);

  return {
    transactionId: transaction.id,
    qrCode: pixData.qr_code,
    copyPaste: pixData.copy_paste,
    grossAmount: amountInCents,
    feeAmount,
    netAmount,
  };
}

export const getAppointmentsByEmployee = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(" Buscando agendamentos do usuário:", userId);

    // 1) Buscar email do usuário
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (userErr || !user) {
      console.error(" Usuário não encontrado:", userErr);
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    console.log("📧 Email do usuário:", user.email);

    // 2) Tentar buscar employee pelo user_id
    let { data: employee, error: employeeErr } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .single();

    // 3) Se não achar pelo user_id, tenta pelo email
    if (!employee) {
      console.warn("Funcionário não encontrado via user_id. Tentando via email...");

      const empByEmail = await supabase
        .from("employees")
        .select("id")
        .eq("email", user.email)
        .single();

      employee = empByEmail.data;

      if (empByEmail.error || !employee) {
        console.error(" Funcionário não encontrado pelo email:", empByEmail.error);
        return res.status(404).json({ error: "Funcionário não encontrado" });
      }
    }

    console.log(" ID do funcionário:", employee.id);

    // 4) Buscar agendamentos do funcionário
    const { data: appointments, error: apptErr } = await supabase
      .from("appointments")
      .select(`
        *,
        services:service_id (name),
        employees:employee_id (name)
      `)
      .eq("employee_id", employee.id)
      .order("appointment_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (apptErr) {
      console.error(" Erro ao buscar agendamentos:", apptErr);
      return res.status(500).json({ error: "Erro ao buscar agendamentos" });
    }

    console.log(`📅 Agendamentos encontrados: ${appointments.length}`);

    res.json(appointments || []);
  } catch (error) {
    console.error(" Erro inesperado:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const {
      client_name,
      client_email,
      client_phone,
      service_id,
      employee_id,
      date,
      start_time,
      end_time,
      final_price,
      coupon_code,
      original_price,
    } = req.body;
    const { slug } = req.params;

    console.log("📌 Dados recebidos para criar agendamento:", req.body);

    if (!slug) {
      return res.status(400).json({ error: "Slug não fornecido" });
    }

    if (!client_name || !service_id || !employee_id || !date || !start_time || !end_time) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // =====================================================
    // ✅ VALIDAÇÃO INTELIGENTE DE PREÇO
    // =====================================================
    console.log("💰 Iniciando validação inteligente de preço...");
    
    let finalPriceToUse = final_price;
    let originalPriceToUse = original_price;
    let isAdminUser = false;

    try {
      // Verificar se o usuário autenticado é admin
      isAdminUser = isUserAdmin(req);
      console.log(`👤 Usuário é admin? ${isAdminUser ? 'SIM' : 'NÃO'}`);

      if (isAdminUser) {
        // Admin: aceita valores do frontend
        console.log("✅ Admin autenticado - usando valores do frontend");
        console.log(`   Frontend final: R$ ${final_price}, Original: R$ ${original_price}`);
      } else {
        // Não-admin ou não autenticado: valida com o backend
        console.log("🔍 Usuário não-admin ou não autenticado - validando com backend");
        
        // Buscar preço original do serviço
        const { data: service, error: serviceError } = await supabase
          .from('services')
          .select('id, name, price, organization_id')
          .eq('id', service_id)
          .single();

        if (serviceError || !service) {
          console.error('❌ Serviço não encontrado:', serviceError);
          // Continua com valor do frontend como fallback
          console.log("⚠️ Serviço não encontrado - usando frontend como fallback");
        } else if (service.organization_id !== orgData.id) {
          console.error('❌ Serviço não pertence à organização');
          // Continua com valor do frontend como fallback
          console.log("⚠️ Serviço não pertence à org - usando frontend como fallback");
        } else {
          const backendOriginalPrice = parseFloat(service.price);
          let backendFinalPrice = backendOriginalPrice;
          let discountApplied = false;

          console.log(`✅ Serviço encontrado: "${service.name}" - R$ ${backendOriginalPrice.toFixed(2)}`);

          // Se houver cupom, calcular desconto
          if (coupon_code && coupon_code.trim() !== '') {
            console.log(`🎟️ Validando cupom: ${coupon_code}`);

            const { data: coupon, error: couponError } = await supabase
              .from('coupons')
              .select('*')
              .eq('code', coupon_code.trim().toUpperCase())
              .single();

            if (!couponError && coupon) {
              // Validar vigência do cupom
              const now = new Date();
              let isValidCoupon = true;

              if (coupon.valid_from) {
                const validFrom = new Date(coupon.valid_from);
                if (now < validFrom) {
                  console.warn('⚠️ Cupom ainda não está válido');
                  isValidCoupon = false;
                }
              }

              if (coupon.valid_until) {
                const validUntil = new Date(coupon.valid_until);
                if (now > validUntil) {
                  console.warn('⚠️ Cupom expirado');
                  isValidCoupon = false;
                }
              }

              if (isValidCoupon) {
                const discountValue = parseFloat(coupon.discount_value);

                if (coupon.discount_type === 'percentage' || coupon.discount_type === 'porcentagem') {
                  if (discountValue <= 100 && discountValue >= 0) {
                    const discountAmount = (backendOriginalPrice * discountValue) / 100;
                    backendFinalPrice = backendOriginalPrice - discountAmount;
                    if (backendFinalPrice < 0) backendFinalPrice = 0;
                    console.log(`✅ Desconto ${discountValue}% aplicado: R$ ${backendFinalPrice.toFixed(2)}`);
                    discountApplied = true;
                  } else {
                    console.warn('⚠️ Desconto percentual inválido');
                  }
                } else if (coupon.discount_type === 'fixed' || coupon.discount_type === 'fixo') {
                  backendFinalPrice = backendOriginalPrice - discountValue;
                  if (backendFinalPrice < 0) backendFinalPrice = 0;
                  console.log(`✅ Desconto fixo R$ ${discountValue.toFixed(2)} aplicado: R$ ${backendFinalPrice.toFixed(2)}`);
                  discountApplied = true;
                }
              }
            } else {
              console.warn(`⚠️ Cupom não encontrado: ${coupon_code}`);
            }
          }

          // Usar preço validado do backend
          finalPriceToUse = backendFinalPrice;
          originalPriceToUse = backendOriginalPrice;
          console.log(`✅ Preços calculados pelo backend: Original R$ ${originalPriceToUse.toFixed(2)} → Final R$ ${finalPriceToUse.toFixed(2)}`);
        }
      }
    } catch (priceValidationErr) {
      console.error('❌ Erro na validação de preço:', priceValidationErr.message);
      console.log('⚠️ Continuando com valores do frontend como fallback');
      // Continua com os valores do frontend
    }

    console.log(`📝 Preços finais para salvar: Original: R$ ${originalPriceToUse}, Final: R$ ${finalPriceToUse}`);

    const { data: policy, error: policyError } = await supabase
      .from("organization_policies")
      .select("sync_google_calendar, appointment_prepayment")
      .eq("organization_id", orgData.id)
      .maybeSingle();

    console.log("📌 Política encontrada:", policy);

    if (policyError) {
      console.error("Erro buscando políticas:", policyError);
    }

    const requiresPrepayment = policy?.appointment_prepayment === true && !isAdminUser;
    console.log(`💳 Pré-pagamento obrigatório? ${requiresPrepayment ? 'SIM' : 'NÃO'} (admin isento: ${isAdminUser ? 'sim' : 'não'})`);

    // ✅ Telefone opcional: envia null ao invés de string vazia/undefined
    const safeClientPhone =
      typeof client_phone === "string" ? client_phone.trim() : client_phone;
    const normalizedClientPhone = safeClientPhone ? safeClientPhone : null;

    // =====================================================
    // ✅ BUSCAR OU CRIAR CLIENTE
    // =====================================================
    console.log("🔍 Buscando ou criando cliente...");
    let clientId = null;

    try {
      // 1º: Buscar por email
      if (client_email) {
        const { data: clientByEmail, error: emailErr } = await supabase
          .from("clients")
          .select("client_id")
          .eq("client_email", client_email)
          .eq("organization_id", orgData.id)
          .maybeSingle();

        if (!emailErr && clientByEmail) {
          clientId = clientByEmail.client_id;
          console.log("✅ Cliente encontrado por email:", clientId);
        }
      }

      // 2º: Buscar por telefone (se email não achou)
      if (!clientId && normalizedClientPhone) {
        const { data: clientByPhone, error: phoneErr } = await supabase
          .from("clients")
          .select("client_id")
          .eq("client_phone", normalizedClientPhone)
          .eq("organization_id", orgData.id)
          .maybeSingle();

        if (!phoneErr && clientByPhone) {
          clientId = clientByPhone.client_id;
          console.log("✅ Cliente encontrado por telefone:", clientId);
        }
      }

      // 3º: Criar novo cliente
      if (!clientId) {
        console.log("Criando novo cliente...");
        const { data: newClient, error: createErr } = await supabase
          .from("clients")
          .insert([
            {
              organization_id: orgData.id,
              client_name,
              client_email: client_email || null,
              client_phone: normalizedClientPhone,
            },
          ])
          .select("client_id")
          .single();

        if (createErr) {
          console.error("⚠️ Erro ao criar cliente:", createErr);
          // Continua mesmo se falhar (cria agendamento sem client_id)
        } else {
          clientId = newClient.client_id;
          console.log("✅ Cliente criado:", clientId);
        }
      }
    } catch (clientErr) {
      console.error("⚠️ Erro ao processar cliente:", clientErr);
      // Continua sem cliente se falhar
    }

    // =====================================================
    // ✅ CRIAR AGENDAMENTO
    // =====================================================
    const { data: created, error: createError } = await supabase
      .from("appointments")
      .insert([
        {
          organization_id: orgData.id,
          client_id: clientId, // ✅ Novo: client_id
          client_name,
          client_email,
          client_phone: normalizedClientPhone,
          service_id,
          employee_id,
          appointment_date: date,
          start_time,
          end_time,
          final_price: finalPriceToUse, // ✅ Usando preço validado
          coupon_code,
          original_price: originalPriceToUse, // ✅ Usando preço validado
          status: requiresPrepayment ? "pending" : "confirmed",
        },
      ])
      .select()
      .single();

    if (createError) throw createError;

    console.log("✅ Agendamento criado:", created);

    // Se exigir pré-pagamento (e não for admin), gerar cobrança PIX e retornar
    if (requiresPrepayment) {
      try {
        const pixCharge = await createPixCharge({
          organizationId: orgData.id,
          appointmentId: created.id,
          amountInCents: Math.round(finalPriceToUse * 100),
        });

        console.log("💳 PIX gerado para pré-pagamento:", {
          transactionId: pixCharge.transactionId,
          amount: pixCharge.grossAmount,
        });

        return res.status(201).json({
          appointment: { ...created, status: "pending" },
          payment_required: true,
          payment: {
            transaction_id: pixCharge.transactionId,
            qr_code: pixCharge.qrCode,
            copy_paste: pixCharge.copyPaste,
            amount: finalPriceToUse,
          },
          validated_prices: {
            final: finalPriceToUse,
            original: originalPriceToUse,
            is_admin: isAdminUser,
          },
        });
      } catch (pixErr) {
        console.error("❌ Erro ao gerar PIX de pré-pagamento:", pixErr.message);
        // Mesmo com erro de cobrança, retorna agendamento pendente (para não quebrar fluxo)
        return res.status(201).json({
          appointment: { ...created, status: "pending" },
          payment_required: true,
          payment: null,
          error: "Falha ao gerar PIX. Tente novamente ou contate o suporte.",
          validated_prices: {
            final: finalPriceToUse,
            original: originalPriceToUse,
            is_admin: isAdminUser,
          },
        });
      }
    }

    // ✅ meetingUrl precisa existir para o return final mesmo se não sincronizar
    let meetingUrl = null;

    // ✅ NÃO RETORNA MAIS AQUI (para garantir WhatsApp sempre)
    if (!policy?.sync_google_calendar) {
      console.log("🔕 Organização não sincroniza com Google Calendar.");
    } else {
      console.log("🔄 Tentando sincronizar com Google Calendar...");

      const { data: employee, error: employeeError } = await supabase
        .from("employees")
        .select("user_id, name")
        .eq("id", employee_id)
        .single();

      if (employeeError || !employee) {
        console.error("❌ Funcionário não encontrado para Google Calendar");
      } else {
        const { data: serviceInfo, error: serviceInfoError } = await supabase
          .from("services")
          .select("id, name, price")
          .eq("id", service_id)
          .single();

        if (serviceInfoError || !serviceInfo) {
          console.error("❌ Serviço não encontrado para Google Calendar");
        } else {
          const { data: googleData } = await supabase
            .from("organization_google_calendar")
            .select("*")
            .eq("user_id", employee.user_id)
            .maybeSingle();

          if (!googleData) {
            console.log("🔕 Funcionário não tem Google Calendar conectado.");
          } else {
            console.log("📌 Tokens encontrados:", googleData);

            const oauth2Client = new google.auth.OAuth2(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET_KEY,
              process.env.GOOGLE_REDIRECT_URI
            );

            oauth2Client.setCredentials({
              access_token: googleData.access_token,
              refresh_token: googleData.refresh_token,
              token_type: googleData.token_type,
              scope: googleData.scope,
              expiry_date: googleData.expiry_date,
            });

            const calendar = google.calendar({ version: "v3", auth: oauth2Client });

            const eventStart = new Date(`${date}T${start_time}:00-03:00`).toISOString();
            const eventEnd = new Date(`${date}T${end_time}:00-03:00`).toISOString();

            // ✅ Buscar cor do funcionário: employee_calendar_color -> google_calendar_colors
            console.log("🎨 Buscando cor do funcionário ID:", employee_id);
            
            let googleColorId = "1"; // ✅ Cor padrão como fallback (Google Calendar aceita 1-11)
            
            try {
              // 1º: Buscar calendar_color_id do funcionário
              const { data: employeeColor, error: empColorErr } = await supabase
                .from('employee_calendar_color')
                .select('calendar_color_id')
                .eq('employee_id', employee_id)
                .maybeSingle();

              console.log("📌 employee_calendar_color:", { employeeColor, empColorErr });

              if (employeeColor?.calendar_color_id) {
                // 2º: Buscar google_color_id usando calendar_color_id
                const { data: googleColor, error: googleColorErr } = await supabase
                  .from('google_calendar_colors')
                  .select('google_color_id')
                  .eq('calendar_color_id', employeeColor.calendar_color_id)
                  .single();

                console.log("📌 google_calendar_colors:", { googleColor, googleColorErr });

                if (googleColor?.google_color_id) {
                  googleColorId = String(googleColor.google_color_id);
                  console.log("✅ Cor do Google Calendar encontrada:", googleColorId);
                } else {
                  console.log("⚠️ google_color_id não encontrado, usando padrão (1)");
                  googleColorId = "1";
                }
              } else {
                console.log("⚠️ Funcionário sem cor atribuída, usando padrão (1)");
                googleColorId = "1";
              }
            } catch (colorErr) {
              console.error("⚠️ Erro ao buscar cor, usando padrão (1):", colorErr.message);
              googleColorId = "1";
            }

            // Buscar dados do serviço para saber se é online
            const { data: serviceData, error: serviceError } = await supabase
              .from("services")
              .select("is_online, name")
              .eq("id", service_id)
              .single();

            if (serviceError) {
              console.warn("⚠️ Erro ao buscar dados do serviço:", serviceError);
            }

            const eventBody = {
              summary: `Agendamento: ${client_name}`,
              description: `Serviço: ${serviceData?.name}\nProfissional: ${employee?.name}\nPreço original: R$ ${originalPriceToUse?.toFixed(2) || original_price}\nPreço final: R$ ${finalPriceToUse?.toFixed(2) || final_price}\nCliente: ${client_name}\nTelefone: ${normalizedClientPhone}`,
              start: { dateTime: eventStart, timeZone: "America/Sao_Paulo" },
              end: { dateTime: eventEnd, timeZone: "America/Sao_Paulo" },
              colorId: googleColorId, // ✅ Sempre com valor (nunca null)
            };

            // Só adiciona conferenceData se for online
            if (serviceData?.is_online) {
              eventBody.conferenceData = {
                createRequest: {
                  requestId: `${created?.id}-${Date.now()}`,
                  conferenceSolutionKey: { type: "hangoutsMeet" },
                },
              };
            }

            console.log("📌 Enviando evento ao Google Calendar:", {
              summary: eventBody.summary,
              colorId: eventBody.colorId,
              isOnline: serviceData?.is_online,
              eventStart,
              eventEnd,
            });

            try {
              const result = await calendar.events.insert({
                calendarId: "primary",
                requestBody: eventBody,
                conferenceDataVersion: serviceData?.is_online ? 1 : 0,
              });

              const googleEvent = result.data;

              if (serviceData?.is_online) {
                meetingUrl =
                  googleEvent?.conferenceData?.entryPoints?.find(
                    (e) => e.entryPointType === "video"
                  )?.uri || null;
              }

              await supabase
                .from("appointments")
                .update({
                  meeting_url: meetingUrl,
                  meeting_provider: meetingUrl ? "google_meet" : null,
                  google_event_id: googleEvent.id,
                })
                .eq("id", created.id);

              console.log("✅ Evento criado no Google Calendar - ID:", googleEvent.id);
            } catch (googleErr) {
              console.error("❌ Erro ao criar evento no Google Calendar:", googleErr);
              console.log("⚠️ Agendamento permanece no banco, mas evento do Google falhou");
            }
          }
        }
      }
    }

    // ===============================
    // 🔔 NOTIFICAR REPRESENTANTE DA ORGANIZAÇÃO
    // ===============================
    try {
      // Buscar representante da organização
      const { data: representative } = await supabase
        .from("organization_representative")
        .select("user_id")
        .eq("organization_id", orgData.id)
        .maybeSingle();

      if (!representative?.user_id) {
        console.log("🔕 Organização sem representante cadastrado.");
      } else {
        // Buscar dados do usuário representante
        const { data: user } = await supabase
          .from("users")
          .select("username, phone")
          .eq("id", representative.user_id)
          .single();

        if (!user?.phone) {
          console.log("🔕 Representante sem telefone cadastrado.");
        } else {
          // Buscar dados auxiliares
          const { data: service } = await supabase
            .from("services")
            .select("name")
            .eq("id", service_id)
            .single();

          const { data: employeeInfo } = await supabase
            .from("employees")
            .select("name")
            .eq("id", employee_id)
            .single();

          // Formatar data dd/mm/yyyy
          const formattedDate = date.split("-").reverse().join("/");

          const message = `
    📢 *Novo agendamento recebido*

    Olá, *${user.username}* 👋  
    Um novo agendamento foi realizado para ${orgData?.name}.

    👤 Cliente: ${client_name}
    📞 Telefone: ${normalizedClientPhone || "-"}
    💇 Serviço: ${service?.name || "-"}
    🧑‍💼 Profissional: ${employeeInfo?.name || "-"}
    📅 Data: ${formattedDate}
    ⏰ Horário: ${start_time} - ${end_time}

    💰 Valor final: ${
      finalPriceToUse
        ? finalPriceToUse.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })
        : "-"
    }

    🔐 Faça login e verifique todas as informações no seu painel administrativo:
    👉 https://marcafy.com.br/${slug}/login
          `.trim();

          await sendWhatsAppMessage(user.phone, message, orgData.id);

          console.log("📲 WhatsApp enviado ao representante:", user.username);
        }
      }
    } catch (notifyErr) {
      console.error("❌ Erro ao notificar representante:", notifyErr);
    }

    return res.status(201).json({
      ...created,
      meeting_url: meetingUrl,
      payment_required: false,
      validated_prices: {
        final: finalPriceToUse,
        original: originalPriceToUse,
        is_admin: isAdminUser,
      },
    });
  } catch (error) {
    console.error("Error creating appointment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
