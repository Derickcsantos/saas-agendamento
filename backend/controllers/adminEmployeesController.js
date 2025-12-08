import { supabase } from '../lib/supabase.js';
import express from 'express';
import sharp from 'sharp';

export const getEmployees = async (req, res) => {
  try {
    const { slug } = req.params

    const { data: org, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (error || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Buscar funcionários
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('name, email, phone, comissao, salary, is_active, id')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false });

    if (employeesError) throw employeesError;

    // Buscar serviços e horários para cada funcionário
    const employeesWithDetails = await Promise.all(
      employees.map(async employee => {
        // Buscar serviços
        const { data: services, error: servicesError } = await supabase
          .from('employee_services')
          .select('services(name)')
          .eq('employee_id', employee.id);

        if (servicesError) throw servicesError;

        // Buscar horários
        const { data: schedules, error: schedulesError } = await supabase
          .from('work_schedules')
          .select('*')
          .eq('employee_id', employee.id);

        if (schedulesError) throw schedulesError;

        return { 
          ...employee, 
          services: services?.map(item => item.services) || [],
          work_schedules: schedules || [] 
        };
      })
    );

    res.json(employeesWithDetails);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const { slug, id } = req.params;
    
    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .eq('organization_id', org.id)
      .single();

    if (error) throw error;

    // Converter imagem base64 para URL de dados se existir
    const employeeWithImage = data.imagem_funcionario 
      ? {
          ...data,
          imagem_funcionario: `data:image/jpeg;base64,${data.imagem_funcionario}`
        }
      : data;

    res.json(employeeWithImage);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const { name, email, phone, comissao, salary, is_active } = req.body;
    let imageData = null;
    const { slug } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Se houver arquivo, converte para base64
    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 }) // opcional: redimensiona para largura máxima de 600px
        .webp({ quality: 80 }) // converte para webp com qualidade razoável
        .toBuffer();

        imageData = buffer.toString('base64'); // se ainda quiser salvar como base64
    }

    const { data, error } = await supabase
      .from('employees')
      .insert([{ 
        name, 
        email, 
        phone,
        comissao, 
        salary,
        imagem_funcionario: imageData,
        is_active: is_active === 'true' || is_active === true,
        organization_id: org.id
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { slug, id } = req.params;
    const { name, email, phone, comissao, salary, is_active } = req.body;
    let imageData = null;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Se enviou nova imagem, converte para base64
    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 }) // opcional: redimensiona para largura máxima de 600px
        .webp({ quality: 80 }) // converte para webp com qualidade razoável
        .toBuffer();

        imageData = buffer.toString('base64'); // se ainda quiser salvar como base64
    }

    const updateData = { 
      name, 
      email, 
      phone,
      salary, 
      comissao,
      organization_id: org.id,
      is_active: is_active === 'true' || is_active === true,
      ...(imageData && { imagem_funcionario: imageData })
    };

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { slug, id } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }
    
    // Primeiro deletar os horários associados
    const { error: scheduleError } = await supabase
      .from('work_schedules')
      .delete()
      .eq('employee_id', id);

    if (scheduleError) throw scheduleError;

    // Depois deletar o funcionário
    const { error: employeeError } = await supabase
      .from('employees')
      .delete()
      .eq('organization_id', org.id)
      .eq('id', id);

    if (employeeError) throw employeeError;

    res.status(204).end();
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};