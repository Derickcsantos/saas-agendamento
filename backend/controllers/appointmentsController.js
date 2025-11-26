import { supabase } from '../lib/supabase.js';
import express from 'express';

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
