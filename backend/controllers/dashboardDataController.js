import { supabase } from '../lib/supabase.js'

const toISODate = (date) => date.toISOString().slice(0, 10);

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

    const now = new Date();
    const start30Days = new Date(now);
    start30Days.setDate(start30Days.getDate() - 30);

    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const start12Months = new Date(startOfCurrentMonth);
    start12Months.setMonth(start12Months.getMonth() - 11);

    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const start30DaysISO = toISODate(start30Days);
    const todayISO = toISODate(now);
    const start12MonthsISO = toISODate(start12Months);
    const endOfCurrentMonthISO = toISODate(endOfCurrentMonth);

    const [
      { count: employeesCount, error: employeesCountError },
      { count: categoriesCount, error: categoriesCountError },
      { count: servicesCount, error: servicesCountError },
      { count: appointmentsCount, error: appointmentsCountError },
      { count: clientsCountRaw, data: clientsRows, error: clientsCountError },
      { data: revenueRows, error: revenueError },
      { data: expensesRows, error: expensesError }
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
        .eq('status', 'confirmed'),
      supabase
        .from('clients')
        .select('client_id', { count: 'exact' })
        .eq('organization_id', orgData.id),
      supabase
        .from('appointments')
        .select('final_price')
        .eq('organization_id', orgData.id)
        .eq('status', 'completed')
        .gte('appointment_date', start30DaysISO)
        .lte('appointment_date', todayISO),
      supabase
        .from('organizations_expenses')
        .select('value_expense')
        .eq('organization_id', orgData.id)
        .gte('created_at', start30DaysISO)
        .lte('created_at', todayISO)
    ]);

    if (
      employeesCountError ||
      categoriesCountError ||
      servicesCountError ||
      appointmentsCountError ||
      clientsCountError ||
      revenueError ||
      expensesError
    ) {
      throw new Error(
        employeesCountError?.message ||
        categoriesCountError?.message ||
        servicesCountError?.message ||
        appointmentsCountError?.message ||
        clientsCountError?.message ||
        revenueError?.message ||
        expensesError?.message
      );
    }

    const totalRevenue = (revenueRows || []).reduce(
      (sum, row) => sum + Number(row?.final_price || 0),
      0
    );

    const totalExpenses = (expensesRows || []).reduce(
      (sum, row) => sum + Number(row?.value_expense || 0),
      0
    );

    const totalClients = Number(clientsCountRaw ?? (clientsRows?.length || 0));

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
        .eq('status', 'confirmed')
        .gte('appointment_date', start12MonthsISO)
        .lte('appointment_date', endOfCurrentMonthISO),

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

    const monthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

    const monthlyAppointmentsLabels = [];
    const monthlyAppointments = [];
    const monthsMap = new Map();

    for (let i = 0; i < 12; i++) {
      const d = new Date(start12Months.getFullYear(), start12Months.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const key = monthKey(year, month);
      const label = d.toLocaleString('pt-BR', { month: 'short' });

      monthsMap.set(key, i);
      monthlyAppointmentsLabels.push(label.charAt(0).toUpperCase() + label.slice(1));
      monthlyAppointments.push(0);
    }

    appointmentsData.forEach(item => {
      if (!item.appointment_date) return;
      const d = new Date(item.appointment_date);
      const key = monthKey(d.getFullYear(), d.getMonth() + 1);
      const index = monthsMap.get(key);
      if (index === undefined) return;

      monthlyAppointments[index] += 1;
    });
    
    const servicesPopularityMap = {};
    appointmentsData.forEach(item => {
      const serviceName = item.services?.name || 'Outro';
      servicesPopularityMap[serviceName] = (servicesPopularityMap[serviceName] || 0) + 1;
    });

    const servicesPopularity = Object.entries(servicesPopularityMap)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count);

    const statusMap = {
      confirmed: "Confirmado",
      completed: "Completo",
      cancelled: "Cancelado",
    };
    // Últimos agendamentos (para tabela)
    const latestAppointments = (latestAppointmentsData || []).map(a => ({
      cliente: a.client_name || 'N/D',
      serviço: a.services?.name || 'N/D',
      profissional: a.employees?.name || 'N/D',
      data: a.appointment_date,
      status: statusMap[a.status] || 'N/D', 
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
      totalClients,
      totalRevenue,
      totalExpenses,
      
      // Dados para gráficos
      monthlyAppointmentsLabels,
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