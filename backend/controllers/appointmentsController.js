import { supabase } from '../lib/supabase.js';
import { google } from "googleapis";

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
    const { client_name, client_email, client_phone, service_id, employee_id, date, start_time, end_time , final_price , coupon_code , original_price } = req.body;
    const { slug } = req.params;

    console.log("📌 Dados recebidos para criar agendamento:", req.body);

    if (!slug) {
      return res.status(400).json({ error: 'Slug não fornecido' });
    }

    if (!client_name || !service_id || !employee_id || !date || !start_time || !end_time) {
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const { data: policy, error: policyError } = await supabase
      .from("organization_policies")
      .select("sync_google_calendar")
      .eq("organization_id", orgData.id)
      .maybeSingle();

    console.log("📌 Política encontrada:", policy);

    if (policyError) {
      console.error("Erro buscando políticas:", policyError);
    }
    
    const { data: created, error: createError } = await supabase
      .from('appointments')
      .insert([{
        organization_id: orgData.id,
        client_name,
        client_email,
        client_phone,
        service_id,
        employee_id,
        appointment_date: date,
        start_time,
        end_time,
        final_price,
        coupon_code,
        original_price, 
        status: 'confirmed'
      }])
      .select()
      .single();

    if (createError) throw createError;
    
    console.log("✅ Agendamento criado:", created);

    if (!policy?.sync_google_calendar) {
      console.log("🔕 Organização não sincroniza com Google Calendar.");
      return res.status(201).json(created);
    }

    console.log("🔄 Tentando sincronizar com Google Calendar...");

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("user_id, name")
      .eq("id", employee_id)
      .single();

    if (employeeError || !employee) {
      console.error("❌ Funcionário não encontrado para Google Calendar");
      return res.status(201).json(created);
    }

    const { data: googleData } = await supabase
      .from("organization_google_calendar")
      .select("*")
      .eq("user_id", employee.user_id)
      .maybeSingle();

    if (!googleData) {
      console.log("🔕 Funcionário não tem Google Calendar conectado.");
      return res.status(201).json(created);
    }

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

    const eventBody = {
      summary: `Agendamento: ${client_name}`,
      description: `Serviço ID: ${service_id}\nCliente: ${client_name}\nTelefone: ${client_phone}`,
      start: { dateTime: eventStart, timeZone: "America/Sao_Paulo" },
      end: { dateTime: eventEnd, timeZone: "America/Sao_Paulo" },

      conferenceData: {
        createRequest: {
          requestId: `${created?.id}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet'},
        },
      },
    };

    console.log("📌 Enviando evento ao Google:", eventBody);

    // Buscar serviço para verificar se é online
    const { data: serviceData } = await supabase
      .from("services")
      .select("is_online, name")
      .eq("id", service_id)
      .single();

    if (!serviceData?.is_online) {
      console.log("🔕 Serviço não é online. Nenhum link será criado.");
      console.log("📌 Evento criado no Google Calendar sem link", result.data.id);
      return res.status(201).json(created);
    }

    let meetingUrl = null;

    try {
      const result = await calendar.events.insert({
        calendarId: "primary",
        requestBody: eventBody,
        conferenceDataVersion: 1,
      });

      const googleEvent = result.data;
      meetingUrl =
        googleEvent?.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri || null;

      await supabase
        .from("appointments")
        .update({
          meeting_url: meetingUrl,
          meeting_provider: "google_meet",
          google_event_id: googleEvent.id,
        })
        .eq("id", created.id);

      console.log("📌 Evento criado no Google Calendar com link:", result.data.id);
    } catch (googleErr) {
      console.error("❌ Erro ao criar evento no Google Calendar com link:", googleErr);
    }

    return res.status(201).json({
      ...created,
      meeting_url: meetingUrl
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
