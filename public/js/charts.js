// Variáveis globais para os gráficos
let charts = {
  employees: null,
  categories: null,
  services: null,
  appointments: null,
  users: null,
  coupons: null,
  appointmentsByEmployee: null
};

  
  // Configurações dos gráficos
  const chartConfigs = {
    employees: {
      type: 'doughnut',
      data: {
        labels: ['Ativos', 'Inativos'],
        datasets: [{
          backgroundColor: ['#36a2eb', '#ff6384'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Status dos Funcionários', padding: 10 },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } }
        },
        cutout: '70%'
      }
    },
    categories: {
      type: 'pie',
      data: {
        labels: ['Categorias'],
        datasets: [{
          backgroundColor: ['#ff6384', '#36a2eb', '#4bc0c0', '#ff9f40'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Total de Categorias', padding: 10 },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } }
        }
      }
    },
    services: {
      type: 'bar',
      data: {
        labels: ['Serviços'],
        datasets: [{
          backgroundColor: ['#4bc0c0', '#36a2eb', '#ff6384', '#ff9f40'],
          borderColor: '#fff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Total de Serviços', padding: 10 },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    },
    appointments: {
      type: 'bar',
      data: {
        labels: [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
        datasets: [{
          label: 'Agendamentos Confirmados',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          borderColor: '#ff9f40',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Agendamentos por Mês', padding: 10 },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    },
    users: {
      type: 'doughnut',
      data: {
        labels: ['Administradores', 'Usuários Comuns'],
        datasets: [{
          backgroundColor: ['#4bc0c0', '#ff9f40'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Distribuição de Usuários', padding: 10 },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } }
        },
        cutout: '70%'
      }
    },
    coupons: {
      type: 'pie',
      data: {
        labels: ['Ativos', 'Inativos'],
        datasets: [{
          backgroundColor: ['#36a2eb', '#ff6384'],
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Status dos Cupons', padding: 10 },
          tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}` } }
        }
      }
    },
    appointmentsByEmployee: {
    type: 'bar',
    data: {
      labels: [], // Será preenchido dinamicamente
      datasets: [{
        label: 'Agendamentos',
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { 
          display: true, 
          text: 'Agendamentos por Funcionário', 
          padding: 10 
        },
        tooltip: { 
          callbacks: { 
            label: ctx => `${ctx.label}: ${ctx.raw} agendamentos` 
          } 
        }
      },
      scales: {
        y: { 
          beginAtZero: true, 
          ticks: { precision: 0 },
          title: {
            display: true,
            text: 'Quantidade de Agendamentos'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Funcionários'
          }
        }
      }
    }
  }
};
  
  // Inicialização quando o DOM estiver pronto
  document.addEventListener('DOMContentLoaded', function() {
    // Carrega os dados imediatamente
    loadDashboardData();
    
    // Adicionar listener para a tab Home
    const homeTab = document.querySelector('[data-bs-target="#home"]');
    if (homeTab) {
      homeTab.addEventListener('shown.bs.tab', async function() {
        try {
          await loadDashboardData();
          // Atualizar dados a cada 30 segundos quando na tab Home
          const dashboardRefreshInterval = setInterval(async () => {
            if (!document.querySelector('#home.tab-pane.active')) {
              clearInterval(dashboardRefreshInterval);
              return;
            }
            await loadDashboardData();
          }, 30000);
        } catch (error) {
          console.error('Erro ao inicializar dashboard:', error);
        }
      });
    }
  });
  
  // Função para carregar dados do dashboard
async function loadDashboardData() {
  try {
    showLoading(true);

    // Busca todos os dados em paralelo
    const response = await fetch('/api/admin/dashboard');
    if (!response.ok) {
      throw new Error(`Erro HTTP! status: ${response.status}`);
    }
    
    const appointmentsByEmployeeRes = await fetch('/api/admin/appointments/by-employee');
    if (!appointmentsByEmployeeRes.ok) throw new Error('Erro ao carregar agendamentos por funcionário');
    const appointmentsByEmployeeData = await appointmentsByEmployeeRes.json();
    
    // Buscar todos os dados necessários
    const [dashboardRes, employeesRes, usersRes, couponsRes] = await Promise.all([
      fetch('/api/admin/dashboard'),
      fetch('/api/admin/employees'),
      fetch('/api/users'),
      fetch('/api/coupons')
    ]);
    
    if (!dashboardRes.ok) throw new Error('Erro ao carregar dados do dashboard');
    if (!employeesRes.ok) throw new Error('Erro ao carregar funcionários');
    if (!usersRes.ok) throw new Error('Erro ao carregar usuários');
    if (!couponsRes.ok) throw new Error('Erro ao carregar cupons');
    
    const dashboardData = await dashboardRes.json();
    const employeesData = await employeesRes.json();
    const usersData = await usersRes.json();
    const couponsData = await couponsRes.json();
    
    // Processar dados para os gráficos
    const processedData = {
      ...dashboardData,
      employeesStatus: processEmployeesData(employeesData),
      usersDistribution: processUsersData(usersData),
      couponsStatus: processCouponsData(couponsData),
      appointmentsByEmployee: appointmentsByEmployeeData
    };
    
    renderCharts(processedData);
    updateStatsCards(processedData);
    
  } catch (error) {
    console.error('Erro ao carregar dados do dashboard:', error);
    showToast(`Erro ao carregar dashboard: ${error.message}`, 'error');
  } finally {
    showLoading(false);
  }
}

// Processar dados de funcionários
function processEmployeesData(employees) {
  const active = employees.filter(e => e.is_active).length;
  const inactive = employees.filter(e => !e.is_active).length;
  return { active, inactive };
}

// Processar dados de usuários
function processUsersData(users) {
  const admins = users.filter(u => u.tipo === 'admin').length;
  const common = users.filter(u => u.tipo === 'comum').length;
  return { admins, common };
}

// Processar dados de cupons
function processCouponsData(coupons) {
  const active = coupons.filter(c => c.is_active).length;
  const inactive = coupons.filter(c => !c.is_active).length;
  return { active, inactive };
}

 // Renderizar gráficos com dados processados
function renderCharts(data) {
  // Gráfico de funcionários (ativos/inativos)
  renderChart('employees', [data.employeesStatus.active, data.employeesStatus.inactive]);
  
  // Gráficos existentes
  renderChart('categories', [data.totalCategories]);
  renderChart('services', [data.totalServices]);
  
  // Gráfico de agendamentos (mantendo os meses)
  if (data.monthlyAppointments) {
    renderChart('appointments', data.monthlyAppointments);
  }
  
  // Novo gráfico de usuários
  renderChart('users', [data.usersDistribution.admins, data.usersDistribution.common]);
  
  // Novo gráfico de cupons
  renderChart('coupons', [data.couponsStatus.active, data.couponsStatus.inactive]);
  
  // Novo gráfico de agendamentos por funcionário
  if (data.appointmentsByEmployee && data.appointmentsByEmployee.length > 0) {
    const labels = data.appointmentsByEmployee.map(item => item.employee_name);
    const values = data.appointmentsByEmployee.map(item => item.count);
    renderChart('appointmentsByEmployee', values, labels);
  }
}

// Função auxiliar para renderizar um gráfico específico
function renderChart(chartKey, data, customLabels = null) {
  // Obter a altura máxima disponível
  const chartContainers = document.querySelectorAll('.chart-container');
  let maxHeight = 0;
  
  chartContainers.forEach(container => {
    const height = container.clientHeight;
    if (height > maxHeight) maxHeight = height;
  });

  Object.keys(chartConfigs).forEach(key => {
    chartConfigs[key].options.maintainAspectRatio = false;
    chartConfigs[key].options.responsive = true;
  });

  const ctx = document.getElementById(`${chartKey}Chart`)?.getContext('2d');
  if (!ctx) return;
  
  const config = JSON.parse(JSON.stringify(chartConfigs[chartKey]));
  // Atualiza os labels se customLabels for fornecido
  if (customLabels) {
    config.data.labels = customLabels;
  }
  config.data.datasets[0].data = data;
  
  if (charts[chartKey]) charts[chartKey].destroy();
  charts[chartKey] = new Chart(ctx, config);
}
  
  // Atualizar cards de estatísticas (opcional)
  function updateStatsCards(data) {
    const stats = {
      employees: data.totalEmployees,
      categories: data.totalCategories,
      services: data.totalServices,
      appointments: data.totalAppointments
    };
    
    Object.keys(stats).forEach(key => {
      const element = document.getElementById(`${key}Stat`);
      if (element) {
        element.textContent = stats[key];
        // Animação de contagem
        animateValue(element, 0, stats[key], 1000);
      }
    });
  }
  
  // Função auxiliar para animação de contagem
  function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      element.textContent = Math.floor(progress * (end - start) + start);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }
  
  // Mostrar/ocultar loading
  function showLoading(show) {
    const loaders = document.querySelectorAll('.chart-loading');
    loaders.forEach(loader => {
      loader.style.display = show ? 'flex' : 'none';
    });
  }