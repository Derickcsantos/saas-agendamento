import { supabase } from '../lib/supabase.js';
import express from 'express';

export const getAppointmentsByEmployee = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Id do usuário: ${userId}`)

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()

    if (userError) throw new Error

    console.log(`Email do usuário: ${userData.email}`)

    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('email', userData.email)
      .single()
    
    if (employeeError) throw new Error

    console.log(`Id do funcionário: ${employeeData.id}`)
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services:service_id (name),
        employees:employee_id (name)
      `)
      .eq('employee_id', employeeData.id)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    console.log(`agendamentos: ${data}`)
    
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const { client_name, client_email, client_phone, service_id, employee_id, date, start_time, end_time , final_price , coupon_code , original_price } = req.body;
    const { slug } = req.params;
    console.log({ client_name, client_email, client_phone, service_id, employee_id, date, start_time, end_time , final_price , coupon_code , original_price })

    if (!slug) {
      return res.status(400).json({ error: 'Slug não fornecido' });
    }

    if (!client_name || !service_id || !employee_id || !date) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
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
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
