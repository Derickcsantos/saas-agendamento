import { supabase } from '../lib/supabase.js'
import express from 'express'

export const getLoggedInUserAppointments = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Busca os agendamentos do cliente
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        client_name,
        client_email,
        client_phone,
        appointment_date,
        start_time,
        end_time,
        status,
        created_at,
        services(name, price),
        employees(name)
      `)
      .eq('client_email', email)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Formata os dados para resposta (ajustando para o formato esperado pelo frontend)
    const formattedData = data.map(item => ({
      id: item.id,
      date: item.appointment_date, // Mantém o nome do campo que seu frontend espera
      start_time: item.start_time,
      end_time: item.end_time,
      status: item.status,
      service_name: item.services?.name || 'Serviço não especificado',
      price: item.services?.price || 0,
      professional_name: item.employees?.name || 'Profissional não especificado',
      client_name: item.client_name,
      client_email: item.client_email,
      client_phone: item.client_phone
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching client appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
