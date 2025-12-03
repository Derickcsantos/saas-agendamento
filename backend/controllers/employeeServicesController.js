import express from 'express';
import { supabase } from '../lib/supabase.js';

export const getEmployeeServicesByEmployeeId = async (req, res) => {
  try {
    const { slug, employeeId } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data, error } = await supabase
      .from('employee_services')
      .select('service_id')
      .eq('employee_id', employeeId)
      .eq('organization_id', org.id);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching employee services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateEmployeeServices = async (req, res) => {
  try {
    const { slug, employeeId } = req.params;
    const services = req.body;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const validServices = services.filter(service => {
      if (!service.employee_id) {
        service.employee_id = parseInt(employeeId);
      }
      return service.service_id; 
    });

    const { error: deleteError } = await supabase
      .from('employee_services')
      .delete()
      .eq('employee_id', employeeId);

    if (deleteError) throw deleteError;

    if (validServices.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < validServices.length; i += batchSize) {
        const batch = validServices.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('employee_services')
          .insert({
            ...batch,
            organization_id: org.id
          });

        if (insertError) throw insertError;
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating employee services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};