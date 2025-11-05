import { supabase } from '../lib/supabase.js'
import express from 'express'
import convertDayToNumber from '../utils/convertDayToNumber.js';
import formatTimeToHHMMSS from '../utils/formatTimeToHHMMSS.js'
import formatTimeFromDB from '../utils/formatTimeFromDB.js'

export const getSchedules = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("work_schedules")
      .select("*, employees(name, email)")
      .eq('organization_id', req.organizationId);


    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getScheduleByEmployeeId = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { data, error } = await supabase
      .from("work_schedules")
      .select("*")
      .eq("employee_id", employee_id)
      .eq('organization_id', req.organizationId);

    if (error) throw error;
    
    // Função para converter número para nome do dia
    const convertNumberToDayName = (dayNumber) => {
      const days = [
        'Domingo',
        'Segunda-feira', 
        'Terça-feira',
        'Quarta-feira',
        'Quinta-feira',
        'Sexta-feira',
        'Sábado'
      ];
      return days[dayNumber] || 'Dia inválido';
    };

    // Formatar os dados antes de retornar
    const formattedData = data.map(schedule => ({
      ...schedule,
      day: convertNumberToDayName(schedule.day_of_week), // Adiciona o nome do dia
      start_time: formatTimeFromDB(schedule.start_time),
      end_time: formatTimeFromDB(schedule.end_time)
    }));
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching employee schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSchedule = async (req, res) => {
  try {
    const { employee_id, day_of_week, start_time, end_time, is_available = true } = req.body;

    // Validações
    if (!employee_id || day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({ 
        error: 'Dados incompletos',
        details: 'employee_id, day_of_week (número), start_time e end_time são obrigatórios'
      });
    }

    // Converter dia da semana para número se for string
    const dayNumber = convertDayToNumber(day_of_week);
    if (dayNumber === null) {
      return res.status(400).json({ 
        error: 'Dia da semana inválido',
        details: 'Use número (0-6) ou nome do dia (ex: "Segunda-feira")'
      });
    }

    // Formatando os horários para HH:MM:SS
    const formattedStart = formatTimeToHHMMSS(start_time);
    const formattedEnd = formatTimeToHHMMSS(end_time);

    // Inserção no banco
    const { data, error } = await supabase
      .from("work_schedules")
      .insert([{ 
        employee_id, 
        day_of_week: dayNumber, 
        start_time: formattedStart, 
        end_time: formattedEnd, 
        is_available 
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);

  } catch (error) {
    console.error('Erro no servidor:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const schedules = req.body;

    // Verificar se o funcionário existe
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employee_id)
      .single();

    if (employeeError || !employee) {
      throw new Error('Funcionário não encontrado');
    }

    // Deletar horários existentes
    const { error: deleteError } = await supabase
      .from('work_schedules')
      .delete()
      .eq('employee_id', employee_id);

    if (deleteError) throw deleteError;

    // Inserir novos horários (se houver)
    if (schedules.length > 0) {
      // Validar horários
      const validSchedules = schedules.map(schedule => {
        if (isNaN(schedule.day_of_week) || schedule.day_of_week < 0 || schedule.day_of_week > 6) {
          throw new Error('Dia da semana inválido');
        }

        return {
          employee_id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        };
      });

      const { error: insertError } = await supabase
        .from('work_schedules')
        .insert(validSchedules);

      if (insertError) throw insertError;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating schedules:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
};

export const deleteAllSchedulesFromEmployee = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { error } = await supabase
      .from("work_schedules")
      .delete()
      .eq("employee_id", employee_id);

    if (error) throw error;
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting employee schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteOnlyOneSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("work_schedules")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};