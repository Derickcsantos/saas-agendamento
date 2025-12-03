import { supabase } from '../lib/supabase.js';
import express from 'express';


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
      .select('id, name, category_id, duration, price, imagem_service')
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
      .select('id, name, price, duration, imagem_service')
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

export const getAvailableTimes = async (req, res) => {
  try {
    const { employeeId, date, duration } = req.query;
    const employeeIdInt = parseInt(employeeId, 10);
    const { slug } = req.params;

    console.log('Parâmetros recebidos:', { employeeIdInt, date, duration, slug });

    if (!slug) {
      return res.status(400).json({ error: 'Slug não fornecido' });
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

      console.log(orgData.id)

    if (orgError || !orgData) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }
    
    
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

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('employee_id', employeeIdInt)
      .eq('appointment_date', date)
      .eq('organization_id', orgData.id)
      .order('start_time', { ascending: true });

    if (appointmentsError) throw appointmentsError;

    const workStart = new Date(`${date}T${schedule.start_time}`);
    const workEnd = new Date(`${date}T${schedule.end_time}`);
    const interval = 15 * 60 * 1000;
    const durationMs = duration * 60 * 1000;
    
    let currentSlot = new Date(workStart);
    const availableSlots = [];

    while (currentSlot.getTime() + durationMs <= workEnd.getTime()) {
      const slotStart = new Date(currentSlot);
      const slotEnd = new Date(slotStart.getTime() + durationMs);
      
      const isAvailable = !appointments.some(appointment => {
        const apptStart = new Date(`${date}T${appointment.start_time}`);
        const apptEnd = new Date(`${date}T${appointment.end_time}`);
        
        return (
          (slotStart >= apptStart && slotStart < apptEnd) ||
          (slotEnd > apptStart && slotEnd <= apptEnd) ||
          (slotStart <= apptStart && slotEnd >= apptEnd)
        );
      });
      
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