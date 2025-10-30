import { supabase } from '../lib/supabase.js'
import express from 'express'

export const getDashboardData = async (req, res) => {
  try {
    // 1. Contagem básica de funcionários, categorias, serviços e agendamentos
    const [
      { count: employeesCount },
      { count: categoriesCount },
      { count: servicesCount },
      { count: appointmentsCount }
    ] = await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('organization_id', req.organizationId), 
      supabase.from('categories').select('*', { count: 'exact', head: true }).eq('organization_id', req.organizationId), 
      supabase.from('services').select('*', { count: 'exact', head: true }).eq('organization_id', req.organizationId), 
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('organization_id', req.organizationId).eq('status', 'confirmed') 
    ]);

    // 2. Dados detalhados para os gráficos
    const [
      { data: employeesData, error: employeesError },
      { data: usersData, error: usersError },
      { data: couponsData, error: couponsError },
      { data: appointmentsData, error: appointmentsError }
    ] = await Promise.all([
      supabase.from('employees').select('is_active').eq('organization_id', req.organizationId), 
      supabase.from('users').select('tipo').eq('organization_id', req.organizationId), 
      supabase.from('coupons').select('is_active').eq('organization_id', req.organizationId), 
      supabase.from('appointments').select('appointment_date').eq('organization_id', req.organizationId).eq('status', 'confirmed') 
    ]);

    // Verificar erros nas consultas
    if (employeesError || usersError || couponsError || appointmentsError) {
      throw new Error(
        employeesError?.message || 
        usersError?.message || 
        couponsError?.message || 
        appointmentsError?.message
      );
    }

    // 3. Processamento dos dados para os gráficos
    // Funcionários (ativos/inativos)
    const employeesStatus = {
      active: employeesData.filter(e => e.is_active).length,
      inactive: employeesData.filter(e => !e.is_active).length
    };

    // Usuários (admin/comum)
    const usersDistribution = {
      admin: usersData.filter(u => u.tipo === 'admin').length,
      comum: usersData.filter(u => u.tipo === 'comum').length
    };

    // Cupons (ativos/inativos)
    const couponsStatus = {
      active: couponsData.filter(c => c.is_active).length,
      inactive: couponsData.filter(c => !c.is_active).length
    };

    // Agendamentos por mês
    const monthlyAppointments = Array(12).fill(0); // Janeiro a Dezembro
    appointmentsData.forEach(item => {
      const month = new Date(item.appointment_date).getMonth(); // 0-11
      monthlyAppointments[month]++;
    });

    // 4. Retornar todos os dados consolidados
    res.json({
      // Totais básicos
      totalEmployees: employeesCount || 0,
      totalCategories: categoriesCount || 0,
      totalServices: servicesCount || 0,
      totalAppointments: appointmentsCount || 0,
      
      // Dados para gráficos
      monthlyAppointments,
      employeesStatus,
      usersDistribution,
      couponsStatus,
      
      // Metadados
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};