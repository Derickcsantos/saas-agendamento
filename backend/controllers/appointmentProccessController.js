import { supabase } from '../lib/supabase.js';
import { getEmployeeGoogleBusyIntervals } from "../utils/googleCalendarAvailability.js";

export const getAppointmentCategories = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: 'Slug não fornecido' });
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, imagem_category')
      .eq('organization_id', orgData.id)
      .not('name', 'eq', 'Interno')
      .order('name', { ascending: true });

    if (error) throw error;
    
    // Converter imagens base64 para URLs de dados
    const categoriesWithImages = data.map(category => {
      return {
        ...category,
        imagem_category: category.imagem_category 
          ? category.imagem_category
          : null
      };
    });
    
    res.json(categoriesWithImages);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAppointmentServices =  async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, category_id, duration, price, imagem_service, durability_days')
      .eq('organization_id', req.organizationId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAppointmentServicesByCategory = async (req, res) => {
  try {
    const { categoryId, slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: 'Slug não fornecido' });
    }

    // Busca o organization_id correspondente ao slug
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const { data, error } = await supabase
      .from('services')
      .select('id, name, price, duration, imagem_service, durability_days')
      .eq('category_id', categoryId)
      .eq('organization_id', orgData.id)
      .order('name', { ascending: true });

    if (error) throw error;
    
    // Converter imagens base64 para URLs de dados
    const servicesWithImages = data.map(service => {
      return {
        ...service,
        imagem_service: service.imagem_service 
          ? service.imagem_service
          : null
      };
    });
    
    res.json(servicesWithImages);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAppointmentEmployeeByService = async (req, res) => {
  try {
    const { serviceId, slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: 'Slug não fornecido' });
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const { data, error } = await supabase
      .from('employee_services')
      .select(`
        employees(
          id,
          name,
          imagem_funcionario,
          is_active
        )
      `)
      .eq('service_id', serviceId)
      .eq('organization_id', orgData.id);

    if (error) throw error;
    
    // Converter imagens base64 para URLs de dados
    const employees = data.map(item => ({
      ...item.employees,
      imagem_funcionario: item.employees.imagem_funcionario 
        ? `data:image/jpeg;base64,${item.employees.imagem_funcionario}`
        : null
    }));
    
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAppointmentAdditionalServices = async (req, res) => {
  try {
    const { serviceId, employeeId, slug } = req.params;
    const serviceIdInt = Number(serviceId);
    const employeeIdInt = Number(employeeId);

    if (!slug || !Number.isInteger(serviceIdInt) || serviceIdInt <= 0 || !Number.isInteger(employeeIdInt) || employeeIdInt <= 0) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const { data: links, error: linksError } = await supabase
      .from('additional_services')
      .select('additional_id, subservice_id')
      .eq('service_id', serviceIdInt)
      .order('additional_id', { ascending: true });

    if (linksError) throw linksError;

    if (!links || links.length === 0) {
      return res.json([]);
    }

    const subserviceIds = [...new Set(links.map((item) => item.subservice_id).filter(Boolean))];

    const { data: employeeServices, error: employeeServicesError } = await supabase
      .from('employee_services')
      .select('service_id')
      .eq('employee_id', employeeIdInt)
      .eq('organization_id', orgData.id)
      .in('service_id', subserviceIds);

    if (employeeServicesError) throw employeeServicesError;

    const allowedSubserviceIds = new Set((employeeServices || []).map((item) => item.service_id));

    if (allowedSubserviceIds.size === 0) {
      return res.json([]);
    }

    const allowedLinks = links.filter((item) => allowedSubserviceIds.has(item.subservice_id));

    const { data: subservices, error: subservicesError } = await supabase
      .from('services')
      .select('id, name, price, duration, durability_days, imagem_service')
      .in('id', [...allowedSubserviceIds])
      .eq('organization_id', orgData.id);

    if (subservicesError) throw subservicesError;

    const subservicesById = new Map((subservices || []).map((item) => [item.id, item]));

    const payload = allowedLinks
      .map((item) => ({
        additional_id: item.additional_id,
        subservice_id: item.subservice_id,
        subservice: subservicesById.get(item.subservice_id) || null,
      }))
      .filter((item) => !!item.subservice);

    return res.json(payload);
  } catch (error) {
    console.error('Error fetching additional services for appointment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAvailableTimes = async (req, res) => {
  try {
    const { employeeId, date, duration } = req.query;
    const { slug } = req.params;
    const employeeIdInt = parseInt(employeeId, 10);
    const durationInt = parseInt(duration, 10);
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""));

    if (!Number.isInteger(employeeIdInt) || employeeIdInt <= 0 || !isValidDate || !Number.isInteger(durationInt) || durationInt <= 0) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, user_id, is_active")
      .eq("id", employeeIdInt)
      .single();

    if (employeeError || !employee || !employee.is_active) {
      return res.json([]); // funcionário inativo não gera horários
    }

    const employeeUserId = employee.user_id; // única referência


    console.log('Parâmetros recebidos:', { employeeIdInt, date, duration, slug });

    if (!slug) {
      return res.status(400).json({ error: 'Slug não fornecido' });
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
      .select("sync_google_calendar, max_schedule_days, min_hours_before_booking")
      .eq("organization_id", orgData.id)
      .maybeSingle();

    if (policyError) {
      throw policyError;
    }

    const shouldSyncGoogle = policy?.sync_google_calendar === true;
    const minHoursPolicy = Number(policy?.min_hours_before_booking);
    const minHoursBeforeBooking = Number.isFinite(minHoursPolicy)
      ? Math.max(0, Math.trunc(minHoursPolicy))
      : 0;
    const minBookingDateTime =
      minHoursBeforeBooking > 0
        ? new Date(Date.now() + minHoursBeforeBooking * 60 * 60 * 1000)
        : null;

    
    // 🔒 Verificar períodos fechados do salão
    const { data: closedPeriods, error: closedError } = await supabase
      .from('closed_periods')
      .select('start_day, end_day')
      .eq('organization_id', orgData.id);

    if (closedError) {
      throw closedError;
    }

    // Não bloqueia o dia inteiro, bloqueia apenas horários que colidem
    // A lógica de bloqueio será aplicada nos slots abaixo

    // interpreta a data como local, sem UTC implícito
    const [year, month, day] = date.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 = domingo, 1 = segunda, ...

    console.log("Dia da semana calculado (local):", dayOfWeek);

    console.log('Dia da semana calculado:', dayOfWeek);

    const { data: schedule, error: scheduleError } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('employee_id', employeeIdInt)
      .eq('day_of_week', dayOfWeek)
      .eq('organization_id', orgData.id)
      .maybeSingle();

    console.log('Resultado do schedule =>', schedule);
    console.log('Erro do schedule =>', scheduleError);


    if (scheduleError || !schedule || !schedule.is_available) {
      return res.json([]);
    }

    const BLOCKING_STATUSES = ['confirmed', 'completed'];

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('employee_id', employeeIdInt)
      .eq('appointment_date', date)
      .eq('organization_id', orgData.id)
      .in('status', BLOCKING_STATUSES)
      .order('start_time', { ascending: true });

    if (appointmentsError) throw appointmentsError;

    let googleEvents = [];

    if (shouldSyncGoogle && employeeUserId) {
      const dayStartISO = `${date}T00:00:00-03:00`;
      const dayEndISO = `${date}T23:59:59-03:00`;

      const googleBusyResult = await getEmployeeGoogleBusyIntervals({
        userId: employeeUserId,
        timeMin: dayStartISO,
        timeMax: dayEndISO,
      });

      if (googleBusyResult.ok) {
        googleEvents = (googleBusyResult.busyIntervals || []).map((item) => ({
          start: item.start,
          end: item.end,
        }));

        const hasAllDayBlock = googleEvents.some((ev) => {
          const dayStart = new Date(`${date}T00:00:00`);
          const dayEnd = new Date(`${date}T23:59:59.999`);
          return ev.start <= dayStart && ev.end >= dayEnd;
        });

        if (hasAllDayBlock) {
          return res.json([]);
        }
      } else {
        console.warn(
          "⚠️ Não foi possível ler eventos do Google Calendar para disponibilidade:",
          googleBusyResult.reason
        );
      }
    }

    const workStart = new Date(`${date}T${schedule.start_time}`);
    const workEnd = new Date(`${date}T${schedule.end_time}`);
    const interval = 15 * 60 * 1000;
    const durationMs = durationInt * 60 * 1000;
    
    let currentSlot = new Date(workStart);
    const availableSlots = [];

    while (currentSlot.getTime() + durationMs <= workEnd.getTime()) {
      const slotStart = new Date(currentSlot);
      const slotEnd = new Date(slotStart.getTime() + durationMs);

      if (minBookingDateTime && slotStart < minBookingDateTime) {
        currentSlot = new Date(currentSlot.getTime() + interval);
        continue;
      }

      function rangesOverlap(aStart, aEnd, bStart, bEnd) {
        return (
          (aStart >= bStart && aStart < bEnd) ||
          (aEnd > bStart && aEnd <= bEnd) ||
          (aStart <= bStart && aEnd >= bEnd)
        );
      }

      // Transformar os appointments do banco
      const dbBusy = appointments.map((appt) => ({
        start: new Date(`${date}T${appt.start_time}`),
        end: new Date(`${date}T${appt.end_time}`),
      }));

      // Transformar eventos do Google
      const googleBusy = googleEvents;

      // Transformar períodos fechados em busy
      const closedBusy = (closedPeriods || []).map((period) => ({
        start: new Date(period.start_day),
        end: new Date(period.end_day),
      }));

      // Unificar ocupações
      const allBusy = [...dbBusy, ...googleBusy, ...closedBusy];

      const isAvailable = !allBusy.some((busy) =>
        rangesOverlap(slotStart, slotEnd, busy.start, busy.end)
      );

      if (isAvailable) {
        availableSlots.push({
          start: slotStart.toTimeString().substring(0, 5),
          end: slotEnd.toTimeString().substring(0, 5)
        });
      }

      currentSlot = new Date(currentSlot.getTime() + interval);
    }

    res.json(availableSlots);
  } catch (error) {
    console.error('Error fetching available times:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
