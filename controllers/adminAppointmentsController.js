import { supabase } from '../lib/supabase.js';
import express from 'express';
import updateYesterdayAppointmentsToCompleted from '../utils/confirmAppointments.js';

export const getAdminAppointments = async (req, res) => {
  try {
    const { search, date, employee, start_date, end_date } = req.query;
    let query = supabase
      .from('appointments')
      .select(`
        *,
        services:service_id (name, price),
        employees:employee_id (name)
      `)
      .eq('organization_id', req.organizationId)
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
    const { id } = req.params;
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services(name, price),
        employees(name)
      `)
      .eq('id', id)
      .eq('organization_id', req.organizationId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Agendamento não encontrado' });

    res.json({
      id: data.id,
      client_name: data.client_name,
      service: data.services?.name || 'N/A',
      professional: data.employees?.name || 'N/A',
      date: data.appointment_date, // Formato YYYY-MM-DD
      start_time: data.start_time, // Formato HH:MM:SS
      end_time: data.end_time,     // Formato HH:MM:SS
      status: data.status,
      price: data.services?.price || 0
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateAdminAppointmentToCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o agendamento existe E pertence à organização correta
    const { data: appointmentData, error: fetchError } = await supabase
      .from('appointments')
      .select('status')
      .eq('id', id)
      .eq('organization_id', req.organizationId) // Filtro por organization_id
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
      .eq('organization_id', req.organizationId) // Filtro por organization_id
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

export const updateAdminAppointmentToCanceled = async (req, res) => {
  const { id } = req.params;
  const { cancel_reason } = req.body || null;

  try {
    // 1. Buscar agendamento pelo id
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.organizationId)
      .single();

    if (fetchError) throw fetchError;
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    // 2. Verificar se pode cancelar
    if (appointment.status === 'completed') {
      return res.status(400).json({ error: 'Agendamento concluído não pode ser cancelado' });
    }

    // (Não precisa verificar cancelado, pois vai remover da tabela)

    // 3. Inserir dados na tabela canceled_appointments
    const { data: canceledData, error: insertError } = await supabase
      .from('canceled_appointments')
      .insert([{
        original_appointment_id: appointment.id,
        client_name: appointment.client_name,
        client_email: appointment.client_email,
        client_phone: appointment.client_phone,
        service_id: appointment.service_id,
        employee_id: appointment.employee_id,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: 'canceled',
        notes: appointment.notes,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at,
        final_price: appointment.final_price,
        original_price: appointment.original_price,
        coupon_code: appointment.coupon_code,
        cancel_reason: cancel_reason || null,
        canceled_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // 4. Apagar o agendamento original da tabela appointments
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // 5. Responder com os dados do cancelamento
    res.json(canceledData);

  } catch (error) {
    console.error('Error canceling appointment:', error);
    res.status(500).json({ 
      error: 'Erro interno no servidor',
      details: error.message
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