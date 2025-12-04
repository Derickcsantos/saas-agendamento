import { supabase } from '../lib/supabase.js'
import express from 'express'

export const getDashboardData = async (req, res) => {
  try {
    const { slug } = req.params
    
    if (!slug) {
      return res.status(400).json({ error: 'Slug não fornecido' });
    }

    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !orgData) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const [
      { count: employeesCount },
      { count: categoriesCount },
      { count: servicesCount },
      { count: appointmentsCount }
    ] = await Promise.all([
      supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgData.id), 
      supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgData.id), 
      supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgData.id), 
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgData.id)
        .eq('status', 'confirmed') 
    ]);

    // 2. Dados detalhados para os gráficos
    const [
      { data: employeesData, error: employeesError },
      { data: usersData, error: usersError },
      { data: couponsData, error: couponsError },
      { data: appointmentsData, error: appointmentsError },
      { data: latestAppointmentsData, error: latestAppointmentsError },
      { data: employeesListData, error: employeesListError }
    ] = await Promise.all([
      supabase
        .from('employees')
        .select('is_active')
        .eq('organization_id', orgData.id),

      supabase
        .from('users')
        .select('tipo')
        .eq('organization_id', orgData.id),

      supabase
        .from('coupons')
        .select('is_active')
        .eq('organization_id', orgData.id),

      // para gráficos (mês + serviços populares)
      supabase
        .from('appointments')
        .select('appointment_date, services(name)')
        .eq('organization_id', orgData.id)
        .eq('status', 'confirmed'),

      // últimos 5 agendamentos (tabela)
      supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          status,
          client_name,
          services(name),
          employees(name)
        `)
        .eq('organization_id', orgData.id)
        .order('appointment_date', { ascending: false })
        .limit(5),

      // lista de funcionários (tabela)
      supabase
        .from('employees')
        .select('name, email, phone, is_active')
        .eq('organization_id', orgData.id)
    ]);

    // Verificar erros nas consultas
    if (
      employeesError ||
      usersError ||
      couponsError ||
      appointmentsError ||
      latestAppointmentsError ||
      employeesListError
    ) {
      throw new Error(
        employeesError?.message ||
        usersError?.message ||
        couponsError?.message ||
        appointmentsError?.message ||
        latestAppointmentsError?.message ||
        employeesListError?.message
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
    
    const servicesPopularityMap = {};
    appointmentsData.forEach(item => {
      const serviceName = item.services?.name || 'Outro';
      servicesPopularityMap[serviceName] = (servicesPopularityMap[serviceName] || 0) + 1;
    });

    const servicesPopularity = Object.entries(servicesPopularityMap)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count);

    // Últimos agendamentos (para tabela)
    const latestAppointments = (latestAppointmentsData || []).map(a => ({
      cliente: a.client_name || 'N/D',
      serviço: a.services?.name || 'N/D',
      profissional: a.employees?.name || 'N/D',
      data: a.appointment_date,
      status: a.status
    }));

    // Lista de funcionários (para tabela)
    const employeesList = (employeesListData || []).map(e => ({
      nome: e.name,
      email: e.email,
      telefone: e.phone,
      status: e.is_active ? 'Ativo' : 'Inativo'
    }));

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
      servicesPopularity,
      latestAppointments,
      employeesList,
      
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