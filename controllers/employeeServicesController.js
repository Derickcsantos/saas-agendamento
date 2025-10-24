import express from 'express';
import { supabase } from '../lib/supabase.js';

export const getEmployeeServicesByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { data, error } = await supabase
      .from('employee_services')
      .select('service_id')
      .eq('employee_id', employeeId)
      .eq('organization_id', req.organizationId);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching employee services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEmployeeServices = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const services = req.body;

    // Validar que todos os serviços têm employee_id
    const validServices = services.filter(service => {
      // Se não tiver employee_id, usar o da URL
      if (!service.employee_id) {
        service.employee_id = parseInt(employeeId);
      }
      return service.service_id; // Garantir que pelo menos tem service_id
    });

    // Primeiro deletar todos os serviços atuais
    const { error: deleteError } = await supabase
      .from('employee_services')
      .delete()
      .eq('employee_id', employeeId);

    if (deleteError) throw deleteError;

    // Depois inserir os novos serviços (se houver) em lotes
    if (validServices.length > 0) {
      // Dividir em lotes de 10 serviços para evitar sobrecarga
      const batchSize = 10;
      for (let i = 0; i < validServices.length; i += batchSize) {
        const batch = validServices.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('employee_services')
          .insert(batch);

        if (insertError) throw insertError;
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating employee services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};