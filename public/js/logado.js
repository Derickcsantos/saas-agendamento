// Adicione esta função no início do arquivo, antes do event listener
function verificarPaginaAtual() {
  const paginaInicial = document.getElementById('paginaInicial');
  const paginaAgendamentos = document.getElementById('paginaAgendamentos');
  
  if (window.location.pathname.endsWith('/agendamentos')) {
    paginaInicial.style.display = 'none';
    paginaAgendamentos.style.display = 'block';
    // Forçar recarregamento dos agendamentos
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) carregarAgendamentos(user);
  } else {
    paginaInicial.style.display = 'block';
    paginaAgendamentos.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const user = JSON.parse(localStorage.getItem('currentUser'));

  if (!user || localStorage.getItem('isLoggedIn') !== 'true') {
    window.location.href = '/login';
    return;
  }

  verificarPaginaAtual(); // Agora será chamado corretamente

  // Carrega agendamentos se estiver na página correta
  if (document.getElementById('paginaAgendamentos')) {
    carregarAgendamentos(user);
  }


  // Elementos da UI
  const paginaInicial = document.getElementById('paginaInicial');
  const paginaAgendamentos = document.getElementById('paginaAgendamentos');
  const perfilModal = new bootstrap.Modal(document.getElementById('perfilModal'));
  const btnPerfil = document.getElementById('btnPerfil');
  const btnLogout = document.getElementById('btnLogout');
  const profileForm = document.getElementById('profileForm');
  const themeToggle = document.getElementById('themeToggle');

  // Aplicar tema salvo ao carregar
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', savedTheme);
  updateThemeIcon();

  // Configurar páginas
  if (window.location.pathname === '/logado/agendamentos') {
    paginaInicial.style.display = 'none';
    paginaAgendamentos.style.display = 'block';
    carregarAgendamentos(user);
  } else {
    paginaInicial.style.display = 'block';
    paginaAgendamentos.style.display = 'none';
  }

  // Event Listeners
  btnPerfil.addEventListener('click', () => carregarDadosPerfil(user));
  btnLogout.addEventListener('click', logout);
  themeToggle.addEventListener('click', toggleTheme);
  
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      atualizarPerfil(user);
    });
  }

  // Função para carregar dados do perfil - CORRIGIDA
  function carregarDadosPerfil(user) {
    document.getElementById('profileName').value = user.username || '';
    document.getElementById('profilePhone').value = user.phone || '';
    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profileBirthdate').value = user.aniversario || '';
    document.getElementById('profileTipo').value = user.tipo || 'comum';
    document.getElementById('profilePassword').value = user.password || '';
    perfilModal.show();
  }
  
  document.addEventListener('click', function(e) {
    if (e.target.closest('.toggle-password')) {
      const button = e.target.closest('.toggle-password');
      const input = button.parentElement.querySelector('.password-input');

      if (input) {
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';

        const icon = button.querySelector('i');
        if (icon) {
          icon.classList.toggle('bi-eye-fill', !isHidden);
          icon.classList.toggle('bi-eye-slash-fill', isHidden);
        }
      }
    }
  });

  // Função para carregar agendamentos
async function carregarAgendamentos(user) {
  try {
    const tbody = document.querySelector('#tabelaAgendamentos tbody');
    const semAgendamentos = document.getElementById('semAgendamentos');

    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2">Carregando agendamentos...</p>
        </td>
      </tr>
    `;

    const response = await fetch(`/api/logado/appointments?email=${encodeURIComponent(user.email)}`);
    if (!response.ok) throw new Error(`Erro ${response.status}: ${response.statusText}`);

    const agendamentos = await response.json();

    if (!agendamentos || agendamentos.length === 0) {
      tbody.innerHTML = '';
      semAgendamentos.style.display = 'block';
      document.getElementById('contagemRegressiva').style.display = 'none';
      return;
    }

    semAgendamentos.style.display = 'none';

    agendamentos.sort((a, b) => new Date(a.date) - new Date(b.date));
    atualizarContagemRegressiva(agendamentos);

    tbody.innerHTML = agendamentos.map(agendamento => {
      const dataHora = new Date(`${agendamento.date}T${agendamento.start_time}`);
      const agora = new Date();
      const diffHoras = (dataHora - agora) / (1000 * 60 * 60);
      const podeCancelar = agendamento.status === 'confirmed' && diffHoras >= 24;

      return `
        <tr>
          <td>${formatarData(agendamento.date)}</td>
          <td>${agendamento.service_name}</td>
          <td>${agendamento.professional_name}</td>
          <td>${formatarHora(agendamento.start_time)} - ${formatarHora(agendamento.end_time)}</td>
          <td><span class="badge ${getStatusClass(agendamento.status)}">${formatarStatus(agendamento.status)}</span></td>
          <td>R$ ${agendamento.price?.toFixed(2)}</td>
          <td>
            ${podeCancelar ? `
              <button class="btn btn-sm btn-outline-danger cancelar-agendamento" data-id="${agendamento.id}" data-start="${agendamento.date}T${agendamento.start_time}">
                <i class="bi bi-x-circle"></i> Cancelar
              </button>
            ` : '<span class="text-muted">Não disponível</span>'}
          </td>
        </tr>`;
    }).join('');

    document.querySelectorAll('.cancelar-agendamento').forEach(btn => {
      btn.addEventListener('click', (e) => cancelarAgendamento(e, user));
    });

  } catch (error) {
    console.error('Erro ao carregar agendamentos:', error);
    document.querySelector('#tabelaAgendamentos tbody').innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-danger">
          <i class="bi bi-exclamation-triangle-fill"></i> Erro ao carregar agendamentos: ${error.message}
          <button class="btn btn-sm btn-outline-primary mt-2" onclick="carregarAgendamentos(JSON.parse(localStorage.getItem('currentUser')))">
            <i class="bi bi-arrow-repeat"></i> Tentar novamente
          </button>
        </td>
      </tr>
    `;
  }
}

// Adicione esta função auxiliar para formatar horas
function formatarHora(timeString) {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  return `${hours}:${minutes}`;
}

 // Função para atualizar contagem regressiva
function atualizarContagemRegressiva(agendamentos) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Separar agendamentos futuros e passados
    const agendamentosFuturos = agendamentos
        .filter(a => {
            const dataAgendamento = new Date(a.date);
            dataAgendamento.setHours(0, 0, 0, 0);
            return dataAgendamento >= hoje && a.status === 'confirmed';
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const agendamentosPassados = agendamentos
        .filter(a => {
            const dataAgendamento = new Date(a.date);
            dataAgendamento.setHours(0, 0, 0, 0);
            return dataAgendamento < hoje && a.status === 'confirmed';
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar do mais recente para o mais antigo

    const contagemElement = document.getElementById('contagemRegressiva');
    const proximoServicoElement = document.getElementById('proximoServico');
    const diasRestantesElement = document.getElementById('diasRestantes');
    const dataAgendamentoElement = document.getElementById('dataProximoAgendamento');

    if (agendamentosFuturos.length > 0) {
        // Mostrar próximo agendamento futuro
        const proximo = agendamentosFuturos[0];
        const dataAgendamento = new Date(proximo.date);
        dataAgendamento.setHours(0, 0, 0, 0);

        const diffTime = dataAgendamento - hoje;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Formatar data e hora
        const optionsDate = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const optionsTime = { hour: '2-digit', minute: '2-digit' };
        const [year, month, day] = proximo.date.split('-').map(Number);
        const [hour, minute] = proximo.start_time.split(':').map(Number);
        const dataHoraCompleta = new Date(year, month - 1, day, hour, minute);

        const dataFormatada = dataHoraCompleta.toLocaleDateString('pt-BR', optionsDate);
        const horaFormatada = dataHoraCompleta.toLocaleTimeString('pt-BR', optionsTime);


        proximoServicoElement.textContent = 'Seu próximo serviço é ';
        diasRestantesElement.textContent = 
            diffDays === 0 ? 'hoje' : 
            diffDays === 1 ? 'amanhã' : 
            `em ${diffDays} dias`;
        
        dataAgendamentoElement.textContent = `${dataFormatada} às ${horaFormatada}`;
        contagemElement.style.display = 'flex';
        contagemElement.className = 'alert mb-4 alert-primary'; // Estilo para agendamentos futuros
    } else if (agendamentosPassados.length > 0) {
        // Mostrar mensagem para agendamentos passados
        const ultimoAgendamento = agendamentosPassados[0];
        
        // Formatar data e hora
        const optionsDate = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const optionsTime = { hour: '2-digit', minute: '2-digit' };
        const dataFormatada = new Date(ultimoAgendamento.date).toLocaleDateString('pt-BR', optionsDate);
        const horaFormatada = new Date(ultimoAgendamento.start_time).toLocaleTimeString('pt-BR', optionsTime);

        proximoServicoElement.textContent = 'Seu último serviço foi ';
        diasRestantesElement.textContent = 'realizado';
        dataAgendamentoElement.textContent = `em ${dataFormatada} às ${horaFormatada}`;
        contagemElement.style.display = 'flex';
        contagemElement.className = 'alert mb-4 alert-secondary'; // Estilo diferente para agendamentos passados
    } else {
        // Sem agendamentos
        contagemElement.style.display = 'none';
    }
}

  // Função para cancelar agendamento
  async function cancelarAgendamento(e, user) {
  const btn = e.target.closest('button');
  const id = btn.dataset.id;
  const dataHoraAgendamento = new Date(btn.dataset.start);
  const agora = new Date();
  const diffHoras = (dataHoraAgendamento - agora) / (1000 * 60 * 60);

  if (diffHoras < 24) {
    showToast('Você só pode cancelar agendamentos com mais de 24h de antecedência.', 'warning');
    return;
  }

  if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

  try {
    const response = await fetch(`/api/admin/appointments/${id}/cancel`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancel_reason: 'Cancelado pelo cliente' })
    });

    if (!response.ok) throw new Error('Falha ao cancelar agendamento');

    showToast('Agendamento cancelado com sucesso!', 'success');
    carregarAgendamentos(user);
  } catch (error) {
    console.error('Erro ao cancelar agendamento:', error);
    showToast('Erro ao cancelar agendamento', 'error');
  }
}

  // Função para atualizar perfil
  async function atualizarPerfil(user) {
    const username = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;
    const aniversario = document.getElementById('profileBirthdate').value;
    const phone = document.getElementById('profilePhone').value;
    const password = document.getElementById('profilePassword').value;

    try {
      const updateData = { username, email, phone, aniversario };
      if (password) updateData.password = password;

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Erro ao atualizar perfil');

      const updatedUser = await response.json();
      
      // Atualizar localStorage
      localStorage.setItem('currentUser', JSON.stringify({
        ...user,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        aniversario: updatedUser.aniversario
      }));

      showToast('Perfil atualizado com sucesso!', 'success');
      perfilModal.hide();
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      showToast(`Erro: ${error.message}`, 'error');
    }
  }

  // Função para logout
  function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
    window.location.href = '/login';
  }

    // Função para alternar tema - CORRIGIDA
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon();
  }

  // Função para atualizar ícone do tema - CORRIGIDA
  function updateThemeIcon() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const icon = themeToggle.querySelector('i');
    const banner = document.getElementById('bannerPrincipal');
    const textoCorrecao = document.getElementsByClassName('textoCorrecao');
    
    if (currentTheme === 'dark') {
      icon.classList.remove('bi-moon-fill');
      icon.classList.add('bi-sun-fill');
      banner.style.backgroundColor = '#771bce'; // Cor escura
          for (let i = 0; i < textoCorrecao.length; i++) {
        textoCorrecao[i].style.color = "#fff";
      }
    } else {
      icon.classList.remove('bi-sun-fill');
      icon.classList.add('bi-moon-fill');
      banner.style.backgroundColor = '#9c5cb8'; // Cor clara
        for (let i = 0; i < textoCorrecao.length; i++) {
        textoCorrecao[i].style.color = "#000";
      }
    }
  }


  // Funções auxiliares
  function formatarData(dataString) {
    if (!dataString) return 'N/A';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dataString).toLocaleDateString('pt-BR', options);
  }

  function formatarStatus(status) {
    const statusMap = {
      'confirmed': 'Confirmado',
      'completed': 'Concluído',
      'canceled': 'Cancelado',
      'no_show': 'Não Compareceu'
    };
    return statusMap[status] || status;
  }

  function getStatusClass(status) {
    const classes = {
      'confirmed': 'bg-primary',
      'completed': 'bg-success',
      'canceled': 'bg-secondary',
      'no_show': 'bg-danger'
    };
    return classes[status] || 'bg-warning text-dark';
  }

  function showToast(message, type) {
    // Remover toasts existentes
    const existingToasts = document.querySelectorAll('.toast-container');
    existingToasts.forEach(toast => toast.remove());

    // Criar novo toast
    const toastContainer = document.createElement('div');
    toastContainer.className = `toast-container position-fixed bottom-0 end-0 p-3`;
    
    const toast = document.createElement('div');
    toast.className = `toast show align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;
    toast.role = 'alert';
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const toastBody = document.createElement('div');
    toastBody.className = 'd-flex';
    
    const toastMessage = document.createElement('div');
    toastMessage.className = 'toast-body';
    toastMessage.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close btn-close-white me-2 m-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');
    
    toastBody.appendChild(toastMessage);
    toastBody.appendChild(closeButton);
    toast.appendChild(toastBody);
    toastContainer.appendChild(toast);
    
    document.body.appendChild(toastContainer);
    
    // Remover toast após 3 segundos
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toastContainer.remove(), 300);
    }, 3000);
  }

  // Alternar visibilidade da senha
  document.addEventListener('click', function(e) {
    if (e.target.closest('.toggle-password')) {
      const button = e.target.closest('.toggle-password');
      const input = button.parentElement.querySelector('.password-input');

      if (input) {
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';

        const icon = button.querySelector('i');
        if (icon) {
          icon.classList.toggle('bi-eye-fill', !isHidden);
          icon.classList.toggle('bi-eye-slash-fill', isHidden);
        }
      }
    }
  });

  // Ano atual no footer
    document.getElementById('ano').textContent = new Date().getFullYear();
    
    // Inicializar VLibras
    new window.VLibras.Widget('https://vlibras.gov.br/app');
    
    
    // Definir ícone inicial
    const icon = themeToggle.querySelector('i');
    icon.className = savedTheme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill';
    
    // Alternar visibilidade da senha
    document.querySelectorAll('.toggle-password').forEach(button => {
      button.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.className = type === 'password' ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill';
      });
    });
});

document.addEventListener('click', function(e) {
  if (e.target.closest('a[href="/logado/agendamentos"]')) {
    e.preventDefault();
    window.history.pushState({}, '', '/logado/agendamentos');
    verificarPaginaAtual();
  } else if (e.target.closest('a[href="/logado"]')) {
    e.preventDefault();
    window.history.pushState({}, '', '/logado');
    verificarPaginaAtual();
  }
});