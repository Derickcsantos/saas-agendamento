import { supabase } from '../lib/supabase.js'
import express from 'express'
import ExcelJS from 'exceljs';

export const getRevenues = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const { slug } = req.params

    const { data: org, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (error || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }
    
    // 1. Buscar todos os agendamentos concluídos
    let appointmentsQuery = supabase
      .from('appointments')
      .select('id, final_price, appointment_date, employee_id, employees(id, name, comissao)')
      .eq('status', 'completed')
      .eq('organization_id', org.id); // Considerar apenas agendamentos confirmados
    
    // Aplicar filtro de datas se existir (corrigido para usar appointment_date)
    if (start_date && end_date) {
      appointmentsQuery = appointmentsQuery
        .gte('appointment_date', start_date)
        .lte('appointment_date', end_date);
    }
    
    const { data: appointments, error: appointmentsError } = await appointmentsQuery;
    if (appointmentsError) throw appointmentsError;
    
    // 2. Buscar todos os funcionários para garantir que apareçam mesmo sem agendamentos
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, comissao')
      .eq('organization_id', org.id);
    
    if (employeesError) throw employeesError;
    
    // 3. Processar os dados para calcular métricas
    const employeesMap = new Map();
    let totalAppointments = 0;
    let totalRevenue = 0;
    let totalCommissions = 0;
    
    // Inicializar mapa com todos os funcionários
    employees.forEach(employee => {
      employeesMap.set(employee.id, {
        id: employee.id,
        name: employee.name,
        commission_rate: employee.comissao || 0,
        appointments_count: 0,
        total_revenue: 0,
        commission_value: 0,
        net_profit: 0
      });
    });
    
    // Processar agendamentos
    appointments.forEach(appointment => {
      totalAppointments++;
      
      const finalPrice = appointment.final_price || 0;
      totalRevenue += finalPrice;
      
      const employeeId = appointment.employee_id; // Usando employee_id diretamente
      if (!employeeId) return;
      
      const employee = employeesMap.get(employeeId);
      if (!employee) return;
      
      employee.appointments_count++;
      employee.total_revenue += finalPrice;
    });
    
    // Calcular comissões e lucro líquido para cada funcionário
    employeesMap.forEach(employee => {
      employee.commission_value = employee.total_revenue * (employee.commission_rate / 100);
      employee.net_profit = employee.total_revenue - employee.commission_value;
      
      totalCommissions += employee.commission_value;
    });
    
    // Converter o Map para array e ordenar por maior faturamento
    const details = Array.from(employeesMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue);
    
    // 4. Retornar os dados
    res.json({
      period: start_date && end_date 
        ? `${start_date} a ${end_date}` 
        : 'Todos os períodos',
      total_appointments: totalAppointments,
      total_revenue: totalRevenue,
      total_commissions: totalCommissions,
      details: details
    });
    
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

export const getRevenuesLast12Months = async (req, res) => {
  try {
    const { slug } = req.params

    // 1) Buscar org
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // 2) Definir range: do 1º dia do mês (11 meses atrás) até o fim do mês atual
    const now = new Date();

    // início do mês atual
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // início do mês de 11 meses atrás (total 12 meses contando o atual)
    const start = new Date(startOfThisMonth);
    start.setMonth(start.getMonth() - 11);

    // fim do mês atual (23:59:59.999)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // format YYYY-MM-DD (para comparar com campo date/timestamp no Supabase)
    const toISODate = (d) => d.toISOString().slice(0, 10);
    const startDate = toISODate(start);
    const endDate = toISODate(end);

    // 3) Buscar agendamentos no período
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, final_price, appointment_date')
      .eq('status', 'completed')
      .eq('organization_id', org.id)
      .gte('appointment_date', startDate)
      .lte('appointment_date', endDate);

    if (appointmentsError) throw appointmentsError;

    // 4) Pré-criar os 12 meses (mesmo se não tiver receita)
    const monthKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;

    const months = [];
    const monthsMap = new Map();

    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1; // 1-12
      const key = monthKey(year, month);

      const label = d.toLocaleString('pt-BR', { month: 'short', year: 'numeric' }); // ex: "jan. 2026"

      const row = {
        year,
        month,
        label,
        appointments_count: 0,
        total_revenue: 0
      };

      months.push(row);
      monthsMap.set(key, row);
    }

    // 5) Agregar
    let totalAppointments = 0;
    let totalRevenue = 0;

    for (const appt of appointments || []) {
      if (!appt.appointment_date) continue;

      const d = new Date(appt.appointment_date);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;

      const key = monthKey(year, month);
      const row = monthsMap.get(key);
      if (!row) continue;

      const price = appt.final_price || 0;

      row.appointments_count += 1;
      row.total_revenue += price;

      totalAppointments += 1;
      totalRevenue += price;
    }

    return res.json({
      period: `${startDate} a ${endDate}`,
      total_appointments: totalAppointments,
      total_revenue: totalRevenue,
      months // sempre 12 itens, ordenados do mais antigo -> mais recente
    });
  } catch (error) {
    console.error('Error fetching last 12 months revenue:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

export const exportRevenue = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const { slug } = req.params

    const { data: org, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (error || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }
    
    // Reutilizar a mesma lógica da rota principal
    let appointmentsQuery = supabase
      .from('appointments')
      .select('id, final_price, appointment_date, employees(id, name, comissao)')
      .eq('status', 'completed')
      .eq('organization_id', org.id);
    
    if (start_date && end_date) {
      appointmentsQuery = appointmentsQuery
        .gte('appointment_date', start_date)
        .lte('appointment_date', end_date);
    }
    
    const { data: appointments, error: appointmentsError } = await appointmentsQuery;
    if (appointmentsError) throw appointmentsError;
    
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, comissao');
    
    if (employeesError) throw employeesError;
    
    // Processar os dados (mesma lógica da rota principal)
    const employeesMap = new Map();
    employees.forEach(employee => {
      employeesMap.set(employee.id, {
        name: employee.name,
        commission_rate: employee.comissao || 0,
        appointments_count: 0,
        total_revenue: 0,
        commission_value: 0,
        net_profit: 0
      });
    });
    
    appointments.forEach(appointment => {
      const employeeId = appointment.employees?.id;
      if (!employeeId) return;
      
      const employee = employeesMap.get(employeeId);
      if (!employee) return;
      
      const finalPrice = appointment.final_price || 0;
      
      employee.appointments_count++;
      employee.total_revenue += finalPrice;
    });
    
    employeesMap.forEach(employee => {
      employee.commission_value = employee.total_revenue * (employee.commission_rate / 100);
      employee.net_profit = employee.total_revenue - employee.commission_value;
    });
    
    const details = Array.from(employeesMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório de Receitas');
    
    // Adicionar cabeçalhos
    worksheet.columns = [
      { header: 'Profissional', key: 'name', width: 30 },
      { header: 'Agendamentos', key: 'appointments_count', width: 15 },
      { header: 'Faturamento Total', key: 'total_revenue', width: 20, style: { numFmt: '"R$"#,##0.00' } },
      { header: 'Comissão (%)', key: 'commission_rate', width: 15 },
      { header: 'Valor Comissão', key: 'commission_value', width: 20, style: { numFmt: '"R$"#,##0.00' } },
      { header: 'Lucro Líquido', key: 'net_profit', width: 20, style: { numFmt: '"R$"#,##0.00' } }
    ];
    
    // Adicionar dados
    worksheet.addRows(details);
    
    // Adicionar totais
    const totalAppointments = details.reduce((sum, emp) => sum + emp.appointments_count, 0);
    const totalRevenue = details.reduce((sum, emp) => sum + emp.total_revenue, 0);
    const totalCommissions = details.reduce((sum, emp) => sum + emp.commission_value, 0);
    
    worksheet.addRow([]);
    worksheet.addRow({
      name: 'TOTAIS',
      appointments_count: totalAppointments,
      total_revenue: totalRevenue,
      commission_value: totalCommissions
    });
    
    // Configurar resposta
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=relatorio-receitas.xlsx'
    );
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Error exporting revenue data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
