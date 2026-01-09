import { supabase } from '../lib/supabase.js';
import findCalendarIdByEventId from '../utils/findCalendarByEventId.js';
import createOAuthClient from '../utils/createOAuthClient.js';
import updateYesterdayAppointmentsToCompleted from '../utils/confirmAppointments.js';
import { google } from "googleapis";

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
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

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
    
    let filteredData = data;
    if (employee) {
      filteredData = data.filter(appt => 
        appt.employees?.name?.toLowerCase().includes(employee.toLowerCase())
      );
    }

    res.json(filteredData);
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
    // ✅ 4) Se virou canceled -> atualizar Google Calendar
    // =========================
    const becameCanceled =
      updates.status === "canceled" && appointment.status !== "canceled";

    if (becameCanceled) {
      // 4.1) Política da organização
      const { data: policy, error: policyErr } = await supabase
        .from("organization_policies")
        .select("sync_google_calendar")
        .eq("organization_id", org.id)
        .maybeSingle();

      if (policyErr) throw policyErr;

      const shouldSyncGoogle = policy?.sync_google_calendar === true;

      if (shouldSyncGoogle && updated.google_event_id) {
        // 4.2) Pegar user_id do profissional
        const { data: employee, error: empErr } = await supabase
          .from("employees")
          .select("user_id")
          .eq("id", updated.employee_id)
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