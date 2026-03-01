import { supabase } from '../lib/supabase.js';
import { google } from "googleapis";
import axios from "axios";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";
import { isUserAdmin } from '../middlewares/authMiddleware.js';
import createGoogleCalendarEvent from "../utils/createGoogleCalendarEvent.js";

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
    console.log("🔄 Chamando AbacatePay API com:", {
      url: `${process.env.ABACATEPAY_BASE_URL}/v1/pixQrCode/create`,
      amount: amountInCents,
      description: "Appointment payment"
    });

    abacateResponse = await axios.post(
      `${process.env.ABACATEPAY_BASE_URL}/v1/pixQrCode/create`,
      {
        amount: amountInCents,
        description: "Appointment payment",
        expiresIn: 300,  // ✅ 5 minutos
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ABACATEPAY_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Resposta AbacatePay:", {
      status: abacateResponse.status,
      hasData: !!abacateResponse.data,
      dataKeys: Object.keys(abacateResponse.data || {})
    });
  } catch (apiError) {
    // Marca transação como falha
    await supabase
      .from("transactions_organizations")
      .update({ status: "failed" })
      .eq("id", transaction.id);

    console.error("❌ Erro ao chamar AbacatePay:", {
      message: apiError.message,
      response: apiError.response?.data,
      status: apiError.response?.status
    });

    const details = apiError.response?.data || apiError.message;
    throw new Error(`Falha ao gerar PIX: ${JSON.stringify(details)}`);
  }

  // ✅ Corrigido: AbacatePay retorna 'data.brCode' e 'data.brCodeBase64'
  const pixData = abacateResponse.data?.data || abacateResponse.data;

  console.log("📦 Dados do PIX recebidos:", {
    id: pixData.id,
    brCode: pixData.brCode ? "✅ presente" : "❌ ausente",
    brCodeBase64: pixData.brCodeBase64 ? "✅ presente" : "❌ ausente",
    status: pixData.status
  });

  // 3️⃣ Salva dados do PIX na transação
  await supabase
    .from("transactions_organizations")
    .update({
      external_id: pixData.id,
      pix_qr_code: pixData.brCodeBase64,  // ✅ Corrigido de qr_code para brCodeBase64
      pix_copy_paste: pixData.brCode,     // ✅ Corrigido de copy_paste para brCode
    })
    .eq("id", transaction.id);

  return {
    transactionId: transaction.id,
    qrCode: pixData.brCodeBase64,  // ✅ Retorna base64 do QR
    copyPaste: pixData.brCode,     // ✅ Retorna código copia e cola
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
      admin_override, // ✅ Flag para agendamentos especiais de admin (ignora validações de horário/conflito)
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
      .select("sync_google_calendar, appointment_prepayment, prepayment_type, prepayment_value, pix_key, user_main_calendar, show_all_appointments_in_google")
      .eq("organization_id", orgData.id)
      .maybeSingle();

    console.log("📌 Política encontrada:", policy);

    if (policyError) {
      console.error("Erro buscando políticas:", policyError);
    }

    const policyRequiresPrepayment = policy?.appointment_prepayment === true && !isAdminUser;
    console.log(`💳 Pré-pagamento obrigatório? ${policyRequiresPrepayment ? 'SIM' : 'NÃO'}`);
    console.log(`   - appointment_prepayment: ${policy?.appointment_prepayment}`);
    console.log(`   - isAdminUser: ${isAdminUser}`);
    console.log(`   - prepayment_type: ${policy?.prepayment_type}`);
    console.log(`   - prepayment_value: ${policy?.prepayment_value}`);
    console.log(`   - pix_key: ${policy?.pix_key ? '✅ configurada' : '❌ NÃO configurada'}`);

    let prepaymentAmount = finalPriceToUse; // padrão: total
    if (policyRequiresPrepayment) {
      const rawValue = policy?.prepayment_value ? Number(policy.prepayment_value) : null;
      if (policy?.prepayment_type === 'percent') {
        const pct = rawValue && rawValue > 0 ? rawValue : 0;
        prepaymentAmount = Math.max(0, (finalPriceToUse * pct) / 100);
        console.log(`💳 Tipo: Percentual (${pct}%) = R$ ${prepaymentAmount.toFixed(2)}`);
      } else if (policy?.prepayment_type === 'value') {
        prepaymentAmount = rawValue && rawValue > 0 ? rawValue : finalPriceToUse;
        console.log(`💳 Tipo: Valor fixo = R$ ${prepaymentAmount.toFixed(2)}`);
      } else {
        console.log(`💳 Tipo: Total (sem configuração) = R$ ${prepaymentAmount.toFixed(2)}`);
      }
      // Nunca cobra acima do valor final
      prepaymentAmount = Math.min(prepaymentAmount, finalPriceToUse);
      console.log(`💳 Valor de pré-pagamento calculado: R$ ${prepaymentAmount.toFixed(2)} (${policy?.prepayment_type || 'full'})`);
    }

    const requiresPrepayment = policyRequiresPrepayment && prepaymentAmount > 0;

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
          final_price: finalPriceToUse, 
          coupon_code,
          original_price: originalPriceToUse,
          status: requiresPrepayment ? "pending" : "confirmed",
        },
      ])
      .select()
      .single();

    if (createError) throw createError;

    console.log("✅ Agendamento criado:", created);

    // ✅ meetingUrl precisa existir para o return final mesmo se não sincronizar
    let meetingUrl = null;
    let pixPaymentData = null;

    // ===============================
    // 🔄 SINCRONIZAR COM GOOGLE CALENDAR (ANTES do pré-pagamento)
    // ===============================
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
        // Verificar se funcionário é o mesmo que usuário principal
        const isSameAsMainUser = policy?.user_main_calendar === employee.user_id;
        
        // Criar evento para o funcionário
        const employeeEvent = await createGoogleCalendarEvent({
          calendarUserId: employee.user_id,
          appointmentId: created?.id,
          appointmentDate: date,
          startTime: start_time,
          endTime: end_time,
          clientName: client_name,
          employeeId: employee_id,
          employeeName: employee?.name || "-",
          serviceId: service_id,
          originalPrice: originalPriceToUse,
          finalPrice: finalPriceToUse,
          normalizedClientPhone,
          organizationName: orgData?.name,
          includeConference: true,
        });

        if (employeeEvent?.created) {
          meetingUrl = employeeEvent.meetingUrl || null;

          await supabase
            .from("appointments")
            .update({
              meeting_url: meetingUrl,
              meeting_provider: meetingUrl ? "google_meet" : null,
              google_event_id: employeeEvent.googleEventId,
            })
            .eq("id", created.id);

          console.log("✅ Evento criado no Google Calendar (funcionário) - ID:", employeeEvent.googleEventId);
        } else {
          console.log("⚠️ Falha ao criar evento no Google Calendar (funcionário):", employeeEvent?.reason);
        }

        // Criar evento no calendário principal APENAS se:
        // 1. Política estiver ativada
        // 2. Usuário principal estiver definido
        // 3. Usuário principal for diferente do funcionário
        const shouldCreateMainCalendarEvent =
          policy?.show_all_appointments_in_google === true &&
          !!policy?.user_main_calendar &&
          !isSameAsMainUser;

        if (shouldCreateMainCalendarEvent) {
          const mainEvent = await createGoogleCalendarEvent({
            calendarUserId: policy.user_main_calendar,
            appointmentId: created?.id,
            appointmentDate: date,
            startTime: start_time,
            endTime: end_time,
            clientName: client_name,
            employeeId: employee_id,
            employeeName: employee?.name || "-",
            serviceId: service_id,
            originalPrice: originalPriceToUse,
            finalPrice: finalPriceToUse,
            normalizedClientPhone,
            organizationName: orgData?.name,
            includeConference: true,
          });

          if (mainEvent?.created) {
            console.log("✅ Evento criado no Google Calendar (usuário principal) - ID:", mainEvent.googleEventId);
          } else {
            console.log("⚠️ Falha ao criar evento no Google Calendar (usuário principal):", mainEvent?.reason);
          }
        } else if (isSameAsMainUser) {
          console.log("ℹ️ Evento no calendário principal não será criado (funcionário é o mesmo usuário).");
        } else {
          console.log("ℹ️ Evento no calendário principal não será criado (configuração desativada).");
        }
      }
    }

    // ===============================
    // 💳 GERAR PIX (se necessário)
    // ===============================
    if (requiresPrepayment) {
      try {
        const pixCharge = await createPixCharge({
          organizationId: orgData.id,
          appointmentId: created.id,
          amountInCents: Math.round(prepaymentAmount * 100),
        });

        console.log("💳 PIX gerado para pré-pagamento:", {
          transactionId: pixCharge.transactionId,
          amount: pixCharge.grossAmount,
        });

        pixPaymentData = {
          transaction_id: pixCharge.transactionId,
          qr_code: pixCharge.qrCode,
          copy_paste: pixCharge.copyPaste,
          amount: prepaymentAmount,
        };
      } catch (pixErr) {
        console.error("❌ Erro ao gerar PIX de pré-pagamento:", pixErr.message);
        // Continua mesmo com erro de cobrança (não quebra fluxo)
      }
    }

    // ===============================
    // 🔔 NOTIFICAR CLIENTE
    // ===============================
    try {
      if (normalizedClientPhone) {
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

        const paymentInfo = requiresPrepayment 
          ? `💳 *Atenção:* Este agendamento requer pré-pagamento de R$ ${prepaymentAmount.toFixed(2)}.`
          : `✅ *Agendamento confirmado!*`;

        const normalizedFinalPrice = Number.isFinite(Number(finalPriceToUse))
          ? Number(finalPriceToUse)
          : Number.isFinite(Number(created?.final_price))
          ? Number(created.final_price)
          : Number.isFinite(Number(originalPriceToUse))
          ? Number(originalPriceToUse)
          : null;

        const formattedFinalPrice = Number.isFinite(normalizedFinalPrice)
          ? normalizedFinalPrice.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          : "-";

        const message = `
*${paymentInfo}*

Olá, *${client_name}* 👋  
Seu agendamento foi realizado com sucesso em *${orgData?.name}*.

💇 Serviço: ${service?.name || "-"}
🧑‍💼 Profissional: ${employeeInfo?.name || "-"}
📅 Data: ${formattedDate}
⏰ Horário: ${start_time} - ${end_time}
💰 Valor: ${formattedFinalPrice}

${
  requiresPrepayment
    ? `
📌 *Próximos passos:*
1. Escaneie o código QR enviado
2. Realize o pagamento de R$ ${prepaymentAmount.toFixed(2)}
3. Seu agendamento será confirmado após o pagamento

Dúvidas? Entre em contato conosco! 💬
`
    : `
Obrigado por agendar conosco! 🙌
Qualquer dúvida, entre em contato conosco! 💬
`
}
        `.trim();

        await sendWhatsAppMessage(normalizedClientPhone, message, orgData.id);

        console.log("📲 WhatsApp enviado ao cliente:", client_name);
      } else {
        console.log("🔕 Cliente sem telefone cadastrado - mensagem não enviada");
      }
    } catch (clientNotifyErr) {
      console.error("❌ Erro ao notificar cliente:", clientNotifyErr);
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

          // ✅ Enviar para representante usando API key padrão (.env)
          await sendWhatsAppMessage(user.phone, message, null, true);

          console.log("📲 WhatsApp enviado ao representante:", user.username);
        }
      }
    } catch (notifyErr) {
      console.error("❌ Erro ao notificar representante:", notifyErr);
    }

    // ===============================
    // 📤 RETORNAR RESPOSTA FINAL
    // ===============================
    const responsePayload = {
      ...created,
      meeting_url: meetingUrl,
      payment_required: !!requiresPrepayment,
      validated_prices: {
        final: finalPriceToUse,
        original: originalPriceToUse,
        is_admin: isAdminUser,
      },
    };

    if (requiresPrepayment) {
      responsePayload.payment = pixPaymentData || null;
      if (!pixPaymentData) {
        responsePayload.error = "Falha ao gerar PIX. Tente novamente ou contate o suporte.";
      }
    }

    return res.status(201).json(responsePayload);
  } catch (error) {
    console.error("Error creating appointment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
