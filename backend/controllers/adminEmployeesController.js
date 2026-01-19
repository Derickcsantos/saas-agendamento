import { supabase } from '../lib/supabase.js';
import express from 'express';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

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

        // Buscar cor do calendário
        const { data: colorData } = await supabase
          .from('employee_calendar_color')
          .select('calendar_color_id')
          .eq('employee_id', employee.id)
          .maybeSingle();

        return { 
          ...employee, 
          services: services?.map(item => item.services) || [],
          work_schedules: schedules || [],
          calendar_color_id: colorData?.calendar_color_id || null
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

    // Buscar cor do calendário
    const { data: colorData } = await supabase
      .from('employee_calendar_color')
      .select('calendar_color_id')
      .eq('employee_id', id)
      .maybeSingle();

    // Converter imagem base64 para URL de dados se existir
    const employeeWithImage = data.imagem_funcionario 
      ? {
          ...data,
          calendar_color_id: colorData?.calendar_color_id || null,
          imagem_funcionario: `data:image/jpeg;base64,${data.imagem_funcionario}`
        }
      : { ...data, calendar_color_id: colorData?.calendar_color_id || null };

    res.json(employeeWithImage);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const { name, email, phone, comissao, salary, is_active, calendar_color_id } = req.body;
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

    // Se houver arquivo, converte para url
    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 }) // opcional: redimensiona para largura máxima de 600px
        .webp({ quality: 80 }) // converte para webp com qualidade razoável
        .toBuffer();

        const fileName = `${uuidv4()}.webp`;

        const {error: uploadError} = await supabase.storage
          .from('employee_images')
          .upload(fileName, buffer, {
            contentType: 'image/webp', 
            upsert: false,
          })
        
        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('employee_images')
          .getPublicUrl(fileName);

        imageData = publicUrl.publicUrl;
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

    const createdEmployee = data[0];

    // Salvar cor do calendário se fornecida
    if (calendar_color_id) {
      const { error: colorError } = await supabase
        .from('employee_calendar_color')
        .insert([{
          employee_id: createdEmployee.id,
          calendar_color_id: parseInt(calendar_color_id)
        }])
        .select();

      if (colorError) {
        console.error('Error saving employee calendar color:', colorError);
        // Não lançar erro aqui - o funcionário foi criado, só a cor não salvou
      }
    }

    res.status(201).json({ ...createdEmployee, calendar_color_id: calendar_color_id || null });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { slug, id } = req.params;
    const { name, email, phone, comissao, salary, is_active, calendar_color_id } = req.body;
    let imageData = null;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Se enviou nova imagem, converte para url
    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 }) // opcional: redimensiona para largura máxima de 600px
        .webp({ quality: 80 }) // converte para webp com qualidade razoável
        .toBuffer();

        const fileName = `${uuidv4()}.webp`;

        const {error: uploadError} = await supabase.storage
          .from('employee_images')
          .upload(fileName, buffer, {
            contentType: 'image/webp', 
            upsert: false,
          })
        
        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('employee_images')
          .getPublicUrl(fileName);

        imageData = publicUrl.publicUrl;
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

    const updatedEmployee = data[0];

    // Atualizar cor do calendário
    if (calendar_color_id) {
      // Primeiro, verificar se já existe uma cor para este funcionário
      const { data: existingColor } = await supabase
        .from('employee_calendar_color')
        .select('id')
        .eq('employee_id', id)
        .maybeSingle();

      if (existingColor) {
        // Atualizar cor existente
        await supabase
          .from('employee_calendar_color')
          .update({ calendar_color_id: parseInt(calendar_color_id) })
          .eq('employee_id', id);
      } else {
        // Criar nova relação de cor
        await supabase
          .from('employee_calendar_color')
          .insert([{
            employee_id: id,
            calendar_color_id: parseInt(calendar_color_id)
          }]);
      }
    } else if (calendar_color_id === null || calendar_color_id === '') {
      // Se enviou para remover a cor
      await supabase
        .from('employee_calendar_color')
        .delete()
        .eq('employee_id', id);
    }

    res.json({ ...updatedEmployee, calendar_color_id });
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