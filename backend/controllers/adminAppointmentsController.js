import { supabase } from '../lib/supabase.js';
import findCalendarIdByEventId from '../utils/findCalendarByEventId.js';
import createOAuthClient from '../utils/createOAuthClient.js';
import updateYesterdayAppointmentsToCompleted from '../utils/confirmAppointments.js';
import updateGoogleCalendarEvent from '../utils/updateGoogleCalendarEvent.js';
import { getEmployeeGoogleBusyIntervals, slotOverlapsBusyIntervals } from '../utils/googleCalendarAvailability.js';
import { google } from "googleapis";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";
import { getEmployeeIntervalsForDate, hasIntervalConflict } from "../utils/employeeIntervals.js";

async function loadAdditionalServicesByAppointments(appointmentIds = []) {
  const uniqueAppointmentIds = [...new Set(
    (Array.isArray(appointmentIds) ? appointmentIds : [])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  )];

  if (!uniqueAppointmentIds.length) {
    return new Map();
  }

  const { data: appointmentLinks, error: linksError } = await supabase
    .from("additional_services_appointments")
    .select("appointment_id, additional_id")
    .in("appointment_id", uniqueAppointmentIds);

  if (linksError) throw linksError;

  if (!appointmentLinks?.length) {
    return new Map();
  }

  const additionalIds = [...new Set(appointmentLinks.map((item) => item.additional_id).filter(Boolean))];

  const { data: additionalLinks, error: additionalError } = await supabase
    .from("additional_services")
    .select("additional_id, subservice_id")
    .in("additional_id", additionalIds);

  if (additionalError) throw additionalError;

  const subserviceIds = [...new Set((additionalLinks || []).map((item) => item.subservice_id).filter(Boolean))];

  const { data: subservices, error: subservicesError } = await supabase
    .from("services")
    .select("id, name, duration, price")
    .in("id", subserviceIds);

  if (subservicesError) throw subservicesError;

  const additionalById = new Map((additionalLinks || []).map((item) => [item.additional_id, item]));
  const subserviceById = new Map((subservices || []).map((item) => [item.id, item]));

  const grouped = new Map();
  for (const link of appointmentLinks) {
    const additional = additionalById.get(link.additional_id);
    const subservice = additional ? subserviceById.get(additional.subservice_id) : null;
    if (!additional || !subservice) continue;

    const row = {
      additional_id: link.additional_id,
      subservice_id: additional.subservice_id,
      name: subservice.name,
      duration: subservice.duration,
      price: subservice.price,
    };

    if (!grouped.has(link.appointment_id)) {
      grouped.set(link.appointment_id, []);
    }
    grouped.get(link.appointment_id).push(row);
  }

  return grouped;
}

export const getAdminAppointments = async (req, res) => {
  try {
    const { search, date, employee, start_date, end_date } = req.query;
    const { slug } = req.params;

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, logo_organization')
      .eq('slug_organization', slug)
      .single();

    if (orgErr || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    let query = supabase
      .from('appointments')
      .select(`
        *,
        services:service_id (name, price),
        employees:employee_id (name)
      `)
      .eq('organization_id', org.id)
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (search) {
      query = query.or(`client_name.ilike.%${search}%,client_email.ilike.%${search}%,client_phone.ilike.%${search}%`);
    }

    if (date) {
      // Converte DD-MM-YYYY para YYYY-MM-DD (formato do Supabase)
      query = query.eq('appointment_date', date);
    } else if (start_date && end_date) {
      // Converte DD-MM-YYYY para YYYY-MM-DD
      const [startDay, startMonth, startYear] = start_date.split('-');
      const [endDay, endMonth, endYear] = end_date.split('-');
      
      const dbStartDate = `${startYear}-${startMonth}-${startDay}`;
      const dbEndDate = `${endYear}-${endMonth}-${endDay}`;
      
      query = query.gte('appointment_date', dbStartDate).lte('appointment_date', dbEndDate);
    }

    if (employee) {
      query = query.ilike('employees.name', `%${employee}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    const additionalMap = await loadAdditionalServicesByAppointments((data || []).map((item) => item.id));
    
    let filteredData = data;
    if (employee) {
      filteredData = data.filter(appt => 
        appt.employees?.name?.toLowerCase().includes(employee.toLowerCase())
      );
    }

    res.json((filteredData || []).map((appt) => ({
      ...appt,
      additional_services: additionalMap.get(appt.id) || [],
      total_duration: Number(appt.services?.duration || 0) + (additionalMap.get(appt.id) || []).reduce((sum, item) => sum + Number(item.duration || 0), 0),
    })));
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAdminAppointmentById = async (req, res) => {
  try {
    const { slug, id } = req.params;

    // Buscar organização
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, logo_organization")
      .eq("slug_organization", slug)
      .single();

    if (orgErr || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Buscar agendamento completo
    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        services:service_id (
          id,
          name,
          description,
          price,
          duration,
          is_online,
          imagem_service,
          categories:category_id (
            id,
            name
          )
        ),
        employees:employee_id (
          id,
          name,
          email,
          phone,
          imagem_funcionario,
          is_active,
          comissao,
          user_id
        )
      `)
      .eq("id", id)
      .eq("organization_id", org.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Agendamento não encontrado" });

    const additionalMap = await loadAdditionalServicesByAppointments([data.id]);
    const additionalServices = additionalMap.get(data.id) || [];

    // Formatar resposta
    return res.json({
      id: data.id,
      organization_id: org.id,

      // Para o modal funcionar
      appointment_date: data.appointment_date,
      start_time: data.start_time,
      end_time: data.end_time,

      employees: data.employees,
      services: data.services,

      client: {
        name: data.client_name,
        email: data.client_email,
        phone: data.client_phone,
      },

      service: {
        id: data.services?.id,
        name: data.services?.name,
        description: data.services?.description,
        price: data.services?.price,
        duration: data.services?.duration,
        is_online: data.services?.is_online,
        image: data.services?.imagem_service,
        category: data.services?.categories || null,
      },

      additional_services: additionalServices,
      total_duration: Number(data.services?.duration || 0) + additionalServices.reduce((sum, item) => sum + Number(item.duration || 0), 0),

      employee: {
        id: data.employees?.id,
        name: data.employees?.name,
        email: data.employees?.email,
        phone: data.employees?.phone,
        image: data.employees?.imagem_funcionario,
        is_active: data.employees?.is_active,
        commission: data.employees?.comissao,
        user_id: data.employees?.user_id,
      },

      schedule: {
        date: data.appointment_date,
        start_time: data.start_time,
        end_time: data.end_time,
      },

      price: {
        original_price: data.original_price,
        final_price: data.final_price,
        coupon_code: data.coupon_code,
      },

      status: data.status,
      notes: data.notes,

      meeting: {
        url: data.meeting_url,
        provider: data.meeting_provider,
        google_event_id: data.google_event_id,
      },

      created_at: data.created_at,
      updated_at: data.updated_at,
    });


  } catch (error) {
    console.error("Error fetching appointment by ID:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};


export const updateAdminAppointmentToCompleted = async (req, res) => {
  try {
    const { id, slug } = req.params;

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, logo_organization')
      .eq('slug_organization', slug)
      .single();

    if (orgErr || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }


    // Verificar se o agendamento existe E pertence à organização correta
    const { data: appointmentData, error: fetchError } = await supabase
      .from('appointments')
      .select('status')
      .eq('id', id)
      .eq('organization_id', org.id) // Filtro por organization_id
      .single();

    if (fetchError) throw fetchError;
    if (!appointmentData) return res.status(404).json({ error: 'Agendamento não encontrado' });

    // Verificar se o agendamento já está concluído ou cancelado
    if (appointmentData.status === 'completed') {
      return res.status(400).json({ error: 'Agendamento já está concluído' });
    }
    if (appointmentData.status === 'canceled') {
      return res.status(400).json({ error: 'Agendamento cancelado não pode ser concluído' });
    }

    // Ao atualizar, também garantimos que só atualizamos da organização correta
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'completed'
      })
      .eq('id', id)
      .eq('organization_id', org.id) // Filtro por organization_id
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error in API:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

export const updateAdminAppointmentToCompletedYesterday = async (req, res) => {
  try {
    const result = await updateYesterdayAppointmentsToCompleted();
    
    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to update appointments',
        details: result.error 
      });
    }

    res.json({
      message: result.message,
      updatedCount: result.updatedIds.length,
      updatedIds: result.updatedIds
    });
  } catch (error) {
    console.error('Error in complete-yesterday route:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

export const updateAdminAppointment = async (req, res) => {
  try {
    const { slug, id } = req.params;
    const updates = req.body || {};

    // 1) Buscar organização
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgErr || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // 2) Buscar agendamento existente
    const { data: appointment, error: fetchErr } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .eq("organization_id", org.id)
      .single();

    if (fetchErr || !appointment) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    const nextEmployeeId = updates.employee_id || appointment.employee_id;
    const nextDate = updates.appointment_date || appointment.appointment_date;
    const nextStartTime = updates.start_time || appointment.start_time;
    const nextEndTime = updates.end_time || appointment.end_time;

    const dateTimeOrEmployeeChanged =
      nextEmployeeId !== appointment.employee_id ||
      nextDate !== appointment.appointment_date ||
      nextStartTime !== appointment.start_time ||
      nextEndTime !== appointment.end_time;

    if (dateTimeOrEmployeeChanged) {
      const nextStart = new Date(`${nextDate}T${nextStartTime}`);
      const nextEnd = new Date(`${nextDate}T${nextEndTime}`);

      if (!(nextStart < nextEnd)) {
        return res.status(400).json({ error: "Horário do agendamento inválido" });
      }

      const { data: dbAppointments, error: dbConflictError } = await supabase
        .from("appointments")
        .select("id, appointment_date, start_time, end_time, status")
        .eq("organization_id", org.id)
        .eq("employee_id", nextEmployeeId)
        .eq("appointment_date", nextDate)
        .in("status", ["confirmed", "completed"])
        .neq("id", appointment.id);

      if (dbConflictError) throw dbConflictError;

      const hasDbConflict = (dbAppointments || []).some((appt) => {
        const busyStart = new Date(`${appt.appointment_date}T${appt.start_time}`);
        const busyEnd = new Date(`${appt.appointment_date}T${appt.end_time}`);
        return nextStart < busyEnd && nextEnd > busyStart;
      });

      if (hasDbConflict) {
        return res.status(409).json({
          error: "Horário indisponível",
          details: "Já existe um agendamento neste horário para o funcionário selecionado.",
        });
      }

      const employeeIntervalsResult = await getEmployeeIntervalsForDate({
        organizationId: org.id,
        employeeId: Number(nextEmployeeId),
        date: nextDate,
      });

      if (
        hasIntervalConflict({
          startDateTime: nextStart,
          endDateTime: nextEnd,
          intervalRanges: employeeIntervalsResult.ranges,
        })
      ) {
        return res.status(409).json({
          error: "Horário indisponível",
          details: "O funcionário possui um intervalo configurado neste horário.",
        });
      }

      const { data: policy } = await supabase
        .from("organization_policies")
        .select("sync_google_calendar")
        .eq("organization_id", org.id)
        .maybeSingle();

      if (policy?.sync_google_calendar) {
        const { data: employeeForCalendar } = await supabase
          .from("employees")
          .select("user_id")
          .eq("id", nextEmployeeId)
          .single();

        if (employeeForCalendar?.user_id) {
          const googleBusyResult = await getEmployeeGoogleBusyIntervals({
            userId: employeeForCalendar.user_id,
            timeMin: `${nextDate}T00:00:00-03:00`,
            timeMax: `${nextDate}T23:59:59-03:00`,
          });

          if (googleBusyResult.ok) {
            const busyIntervals = (googleBusyResult.busyIntervals || []).filter((busy) => {
              if (!appointment.google_event_id) return true;
              return busy.id !== appointment.google_event_id;
            });

            const hasGoogleConflict = slotOverlapsBusyIntervals(nextStart, nextEnd, busyIntervals);

            if (hasGoogleConflict) {
              return res.status(409).json({
                error: "Horário indisponível",
                details: "Existe um evento no Google Calendar do funcionário neste horário.",
              });
            }
          } else {
            console.warn(
              "⚠️ Não foi possível ler eventos do Google Calendar durante atualização:",
              googleBusyResult.reason
            );
          }
        }
      }
    }

    // 3) Atualizar no banco
    const { data: updated, error: updateErr } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", id)
      .eq("organization_id", org.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // =========================
    // ✅ 4) Detectar mudanças para sincronizar com Google Calendar
    // =========================
    const becameCanceled =
      updates.status === "canceled" && appointment.status !== "canceled";

    const employeeChanged = updates.employee_id && updates.employee_id !== appointment.employee_id;

    const dateTimeChanged =
      (updates.appointment_date && updates.appointment_date !== appointment.appointment_date) ||
      (updates.start_time && updates.start_time !== appointment.start_time) ||
      (updates.end_time && updates.end_time !== appointment.end_time);

    if (becameCanceled || employeeChanged || dateTimeChanged) {
      // 4.1) Política da organização
      const { data: policy, error: policyErr } = await supabase
        .from("organization_policies")
        .select("sync_google_calendar")
        .eq("organization_id", org.id)
        .maybeSingle();

      if (policyErr) throw policyErr;

      const shouldSyncGoogle = policy?.sync_google_calendar === true;

      if (shouldSyncGoogle && updated.google_event_id) {
        // Usar o novo employee_id se mudou, senão usar o antigo
        const targetEmployeeId = employeeChanged ? updates.employee_id : updated.employee_id;

        // 4.2) Pegar user_id do profissional
        const { data: employee, error: empErr } = await supabase
          .from("employees")
          .select("user_id")
          .eq("id", targetEmployeeId)
          .single();

        if (!empErr && employee?.user_id) {
          // 4.3) Buscar tokens
          const { data: integration, error: intErr } = await supabase
            .from("organization_google_calendar")
            .select("access_token, refresh_token, token_type, scope, expiry_date")
            .eq("user_id", employee.user_id)
            .maybeSingle();

          if (!intErr && integration?.refresh_token) {
            try {
              const oauth2Client = createOAuthClient();
              oauth2Client.setCredentials({
                access_token: integration.access_token,
                refresh_token: integration.refresh_token,
                token_type: integration.token_type,
                scope: integration.scope,
                expiry_date: integration.expiry_date,
              });

              const calendar = google.calendar({ version: "v3", auth: oauth2Client });

              // 4.4) Descobrir calendarId (se não tiver salvo)
              const calendarId =
                (await findCalendarIdByEventId(calendar, updated.google_event_id)) || "primary";

              let colorId = null;

              // Se cancelou, usar vermelho
              if (becameCanceled) {
                const clientName = updated.client_name || "Cliente";
                const canceledSummary = `Agendamento cancelado: ${clientName}`;
                
                // 4.5) PATCH no evento (summary + vermelho)
                await calendar.events.patch({
                  calendarId,
                  eventId: updated.google_event_id,
                  requestBody: {
                    summary: canceledSummary,
                    colorId: "11", // vermelho (geralmente)
                  },
                });
              } else if (employeeChanged) {
                // Se funcionário mudou, buscar a cor do novo funcionário
                const { data: employeeColor } = await supabase
                  .from('employee_calendar_color')
                  .select('calendar_color_id')
                  .eq('employee_id', targetEmployeeId)
                  .maybeSingle();

                if (employeeColor?.calendar_color_id) {
                  const { data: colorInfo } = await supabase
                    .from('google_calendar_colors')
                    .select('google_color_id')
                    .eq('id', employeeColor.calendar_color_id)
                    .single();
                  colorId = colorInfo?.google_color_id || null;
                }

                // Atualizar apenas a cor do evento
                await calendar.events.patch({
                  calendarId,
                  eventId: updated.google_event_id,
                  requestBody: {
                    ...(colorId && { colorId }),
                  },
                });
              } else if (dateTimeChanged) {
                // ✅ Se data/horário mudou, sincronizar completo com Google Calendar
                console.log("📅 Data/horário mudou - sincronizando com Google Calendar...");

                // Buscar dados necessários para atualizar o evento
                const { data: appointmentFull } = await supabase
                  .from("appointments")
                  .select(`
                    *,
                    services:service_id (id, name, is_online),
                    employees:employee_id (id, name)
                  `)
                  .eq("id", updated.id)
                  .single();

                if (appointmentFull) {
                  const updateResult = await updateGoogleCalendarEvent({
                    calendarUserId: employee.user_id,
                    googleEventId: updated.google_event_id,
                    appointmentDate: updated.appointment_date,
                    startTime: updated.start_time,
                    endTime: updated.end_time,
                    clientName: updated.client_name,
                    employeeId: targetEmployeeId,
                    employeeName: appointmentFull.employees?.name || "-",
                    serviceId: updated.service_id,
                    originalPrice: updated.original_price,
                    finalPrice: updated.final_price,
                    normalizedClientPhone: updated.client_phone,
                    organizationName: org.name,
                  });

                  if (updateResult.updated) {
                    console.log("✅ Evento atualizado no Google Calendar:", updateResult.googleEventId);
                  } else {
                    console.error("❌ Falha ao atualizar evento:", updateResult.reason);
                  }
                }
              }

              // 4.6) Se Google renovou token, salva no Supabase (igual seu controller faz)
              const newCreds = oauth2Client.credentials;
              if (newCreds.access_token && newCreds.access_token !== integration.access_token) {
                await supabase
                  .from("organization_google_calendar")
                  .update({
                    access_token: newCreds.access_token,
                    expiry_date: newCreds.expiry_date,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("user_id", employee.user_id);
              }
            } catch (e) {
              console.error("Falha ao atualizar evento no Google Calendar:", e);
              // não falha a requisição principal
            }
          }
        }
      }
    }

    return res.json({
      message: "Agendamento atualizado com sucesso",
      updated,
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

export const resendAdminAppointmentConfirmation = async (req, res) => {
  try {
    const { slug, id } = req.params;

    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id, name, phone, address")
      .eq("slug_organization", slug)
      .single();

    if (orgErr || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data: appointment, error: appointmentErr } = await supabase
      .from("appointments")
      .select(`
        id,
        client_name,
        client_phone,
        appointment_date,
        start_time,
        end_time,
        final_price,
        services:service_id (name),
        employees:employee_id (name)
      `)
      .eq("id", id)
      .eq("organization_id", org.id)
      .single();

    if (appointmentErr || !appointment) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    if (!appointment.client_phone) {
      return res.status(400).json({ error: "Cliente sem telefone cadastrado" });
    }

    const formattedDate = String(appointment.appointment_date || "")
      .split("-")
      .reverse()
      .join("/");

    const formattedFinalPrice = Number.isFinite(Number(appointment.final_price))
      ? Number(appointment.final_price).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : "-";

    const message = `
🎉 *Agendamento Confirmado com Sucesso!*

🏢 *${org?.name || "Nossa equipe"}*

👤 Cliente: ${appointment.client_name || "-"}
💇 Serviço: ${appointment.services?.name || "-"}
🧑‍💼 Profissional: ${appointment.employees?.name || "-"}

📅 Data: ${formattedDate || "-"}
⏰ Horário: ${String(appointment.start_time || "").slice(0, 5)} - ${String(appointment.end_time || "").slice(0, 5)}
📞 Telefone p/ contato: ${org?.phone || "-"}
📍 Endereço: ${org?.address || "-"}

💰 Valor final: ${formattedFinalPrice}

🔐 Link para agendar novamente:
👉 https://marcafy.com.br/${slug}/agendar

Qualquer dúvida, estamos à disposição 💬
    `.trim();

    await sendWhatsAppMessage(appointment.client_phone, message, org.id);

    return res.status(200).json({
      success: true,
      message: "Confirmação reenviada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao reenviar confirmação de agendamento:", error);
    return res.status(500).json({
      error: error.message || "Erro ao reenviar confirmação",
    });
  }
};


export const getAdminAppointmentsByEmployee = async (req, res) => {
  try {
    // Primeiro, buscamos todos os funcionários
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name')
      .eq('organization_id', req.organizationId)
      .order('name', { ascending: true });

    if (employeesError) throw employeesError;

    // Depois, para cada funcionário, contamos os agendamentos confirmados
    const appointmentsByEmployee = await Promise.all(
      employees.map(async (employee) => {
        const { count, error: countError } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('employee_id', employee.id)
          .eq('status', 'confirmed');

        if (countError) throw countError;

        return {
          employee_id: employee.id,
          employee_name: employee.name,
          count: count || 0
        };
      })
    );

    // Ordenar por quantidade de agendamentos (decrescente)
    const sortedData = appointmentsByEmployee.sort((a, b) => b.count - a.count);

    res.json(sortedData);
  } catch (error) {
    console.error('Error fetching appointments by employee:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

export const getCancelledAppointments = async (req, res) => {
  try {
    const { search, date, employee, start_date, end_date } = req.query;
    let query = supabase
      .from('canceled_appointments')
      .select(`
        *,
        services(name, price),
        employees(name)
      `)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (search) {
      query = query.or(`client_name.ilike.%${search}%,client_email.ilike.%${search}%,client_phone.ilike.%${search}%`);
    }

    if (date) {
      // Esperando data no formato YYYY-MM-DD
      query = query.eq('appointment_date', date);
    } else if (start_date && end_date) {
      query = query.gte('appointment_date', start_date).lte('appointment_date', end_date);
    }

    if (employee) {
      query = query.ilike('employees.name', `%${employee}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar agendamentos cancelados:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
