import express from 'express'
import { supabase } from '../lib/supabase.js'

export const getAvailableTimes = async (req, res) => {
  try {
    const { employeeId, date, duration } = req.query;
    const organizationId = req.organizationId;
    console.log('Parâmetros recebidos:', { employeeId, date, duration, organizationId });
    
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0=Domingo, 1=Segunda, 2=Terça, ..., 6=Sábado
    console.log('Dia da semana calculado:', dayOfWeek);

    const { data: schedule, error: scheduleError } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('day_of_week', dayOfWeek)
      .eq('organization_id', req.organizationId)
      .single();

    if (scheduleError || !schedule || !schedule.is_available) {
      return res.json([]);
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('appointment_date', date)
      .eq('organization_id', req.organizationId)
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