import { supabase } from '../lib/supabase.js';
import express from 'express';

export const getAppointmentsByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services:service_id (name),
        employees:employee_id (name)
      `)
      .eq('employee_id', employeeId)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAppointment = async (req, res) => {
  try {
    const { client_name, client_email, client_phone, service_id, employee_id, date, start_time, end_time , final_price , coupon_code , original_price } = req.body;
    
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        organization_id: req.organizationId,
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
