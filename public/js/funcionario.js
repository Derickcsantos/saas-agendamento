document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    checkAuth();
    
    // Elementos do DOM
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const sidebarCollapse = document.getElementById('sidebarCollapse');
    const themeToggle = document.getElementById('themeToggle');
    const appointmentsTableBody = document.getElementById('appointmentsTableBody');
    const searchAppointments = document.getElementById('searchAppointments');
    const searchButton = document.getElementById('searchButton');
    const filterButtons = document.querySelectorAll('[data-filter]');
    const perfilLink = document.getElementById('perfilLink');
    const agendamentosSection = document.getElementById('agendamentosSection');
    const perfilSection = document.getElementById('perfilSection');
    const profileForm = document.getElementById('profileForm');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const newAppointmentBtn = document.getElementById('newAppointmentBtn');
    const logoutLink = document.getElementById('logoutLink');
    
    // Variáveis de estado
    let currentUser = null;
    let appointments = [];
    let filteredAppointments = [];
    let currentFilter = 'all';
    let currentPage = 1;
    const appointmentsPerPage = 10;
    
    // Inicialização
    initTheme();
    loadUserData();
    loadAppointments();
    setupEventListeners();
    
    // Funções
    function checkAuth() {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userData = localStorage.getItem('currentUser');
        
        if (!isLoggedIn || !userData) {
            window.location.href = '/login';
            return;
        }
        
        currentUser = JSON.parse(userData);
        
        // Verificar se o usuário é realmente um funcionário
        if (currentUser.tipo !== 'funcionario') {
            window.location.href = currentUser.tipo === 'admin' ? '/admin' : '/logado';
        }
    }
    
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', savedTheme);
        updateThemeToggleText(savedTheme);
    }
    
    function updateThemeToggleText(theme) {
        if (theme === 'dark') {
            themeToggle.innerHTML = '<i class="bi bi-sun-fill"></i> Tema Claro';
        } else {
            themeToggle.innerHTML = '<i class="bi bi-moon-fill"></i> Tema Escuro';
        }
    }
    
    function loadUserData() {
        if (!currentUser) return;
        
        // Preencher informações do usuário
        document.getElementById('userName').textContent = currentUser.username;
        document.getElementById('welcomeName').textContent = currentUser.username;
        document.getElementById('profileName').textContent = currentUser.username;
        document.getElementById('username').value = currentUser.username;
        document.getElementById('email').value = currentUser.email;
        document.getElementById('tipo').value = currentUser.tipo;
    }
    
    async function loadAppointments() {
        try {
            showLoadingAppointments();
            
            // Primeiro, obter o ID do funcionário associado ao usuário
            const employeeResponse = await fetch(`/api/employees/by-user/${currentUser.id}`);
            const employeeData = await employeeResponse.json();
            
            if (!employeeResponse.ok) {
                throw new Error(employeeData.error || 'Erro ao carregar dados do funcionário');
            }
            
            if (!employeeData || !employeeData.id) {
                throw new Error('Funcionário não encontrado para este usuário');
            }
            
            // Agora buscar os agendamentos para este funcionário
            const appointmentsResponse = await fetch(`/api/appointments/by-employee/${employeeData.id}`);
            const appointmentsData = await appointmentsResponse.json();
            
            if (!appointmentsResponse.ok) {
                throw new Error(appointmentsData.error || 'Erro ao carregar agendamentos');
            }
            
            appointments = appointmentsData;
            filteredAppointments = [...appointments];
            renderAppointments();
        } catch (error) {
            console.error('Error loading appointments:', error);
            appointmentsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">Erro ao carregar agendamentos: ${error.message}</td>
                </tr>
            `;
        }
    }
    
    function showLoadingAppointments() {
        appointmentsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                </td>
            </tr>
        `;
    }
    
    function renderAppointments(page = 1) {
        currentPage = page;
        
        if (filteredAppointments.length === 0) {
            appointmentsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Nenhum agendamento encontrado</td>
                </tr>
            `;
            renderPagination();
            return;
        }
        
        // Paginação
        const startIndex = (page - 1) * appointmentsPerPage;
        const endIndex = Math.min(startIndex + appointmentsPerPage, filteredAppointments.length);
        const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex);
        
        // Renderizar tabela
        appointmentsTableBody.innerHTML = paginatedAppointments.map(appointment => `
            <tr>
                <td>${formatDate(appointment.appointment_date)}</td>
                <td>${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}</td>
                <td>${appointment.client_name}</td>
                <td>${appointment.services?.name || 'N/A'}</td>
                <td><span class="badge badge-${appointment.status}">${getStatusText(appointment.status)}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-appointment" data-id="${appointment.id}">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        renderPagination();
        setupAppointmentViewButtons();
    }
    
    function renderPagination() {
        const totalPages = Math.ceil(filteredAppointments.length / appointmentsPerPage);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Botão Anterior
        paginationHTML += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">Anterior</a>
            </li>
        `;
        
        // Páginas
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Botão Próximo
        paginationHTML += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">Próximo</a>
            </li>
        `;
        
        pagination.innerHTML = paginationHTML;
        
        // Adicionar event listeners para os links de paginação
        document.querySelectorAll('.page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = parseInt(this.getAttribute('data-page'));
                if (page !== currentPage) {
                    renderAppointments(page);
                }
            });
        });
    }
    
    function filterAppointments(filter) {
    currentFilter = filter;

    if (filter === 'all') {
        filteredAppointments = [...appointments];
    } else {
        filteredAppointments = appointments.filter(app => app.status === filter);
    }

    // Aplicar busca se houver termo de pesquisa
    const searchTerm = searchAppointments.value.toLowerCase();
    if (searchTerm) {
        filteredAppointments = filteredAppointments.filter(app =>
            app.client_name?.toLowerCase().includes(searchTerm) ||
            app.services?.name?.toLowerCase().includes(searchTerm) ||
            app.appointment_date?.includes(searchTerm)
        ); // <-- Parêntese que estava faltando aqui
    }

    currentPage = 1;
    renderAppointments();
}

    
    function formatDate(dateString) {
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('pt-BR', options);
    }
    
    function formatTime(timeString) {
        return timeString.substring(0, 5); // Retorna apenas HH:MM
    }
    
    function getStatusText(status) {
        const statusTexts = {
            'confirmed': 'Confirmado',
            'pending': 'Pendente',
            'cancelled': 'Cancelado'
        };
        return statusTexts[status] || status;
    }
    
    function setupAppointmentViewButtons() {
        document.querySelectorAll('.view-appointment').forEach(button => {
            button.addEventListener('click', async function() {
                const appointmentId = this.getAttribute('data-id');
                try {
                    const response = await fetch(`/api/admin/appointments/${appointmentId}`);
                    const appointment = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(appointment.error || 'Erro ao carregar agendamento');
                    }
                    
                    showAppointmentDetails(appointment);
                } catch (error) {
                    console.error('Error loading appointment details:', error);
                    alert(`Erro ao carregar detalhes do agendamento: ${error.message}`);
                }
            });
        });
    }
    
    function showAppointmentDetails(appointment) {
        const modalBody = document.getElementById('appointmentDetails');
        
        modalBody.innerHTML = `
            <div class="mb-3">
                <h6>Cliente</h6>
                <p>${appointment.client_name}</p>
            </div>
            <div class="mb-3">
                <h6>Serviço</h6>
                <p>${appointment.service}</p>
            </div>
            <div class="mb-3">
                <h6>Profissional</h6>
                <p>${appointment.professional}</p>
            </div>
            <div class="mb-3">
                <h6>Data e Horário</h6>
                <p>${formatDate(appointment.date)} - ${formatTime(appointment.start_time)} às ${formatTime(appointment.end_time)}</p>
            </div>
            <div class="mb-3">
                <h6>Status</h6>
                <p><span class="badge badge-${appointment.status}">${getStatusText(appointment.status)}</span></p>
            </div>
            <div class="mb-3">
                <h6>Valor</h6>
                <p>R$ ${appointment.price.toFixed(2)}</p>
            </div>
        `;
        
        // Configurar botão do Google Calendar
        const googleCalendarBtn = document.getElementById('addToGoogleCalendar');
        googleCalendarBtn.onclick = function() {
            const googleCalendarUrl = createGoogleCalendarUrl(appointment);
            window.open(googleCalendarUrl, '_blank');
        };
        
        // Mostrar o modal
        const modal = new bootstrap.Modal(document.getElementById('appointmentModal'));
        modal.show();
    }
    
    // Função para formatar a URL do Google Calendar
    function createGoogleCalendarUrl(appointment) {
        // Converter data de YYYY-MM-DD para YYYYMMDD
        const formattedDate = appointment.date.replace(/-/g, '');
        
        // Converter horários (HH:MM:SS para HHMM) e ajustar fuso horário (+3 horas)
        const adjustTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':');
            let adjustedHours = parseInt(hours) + 3;
            if (adjustedHours >= 24) adjustedHours -= 24;
            return `${String(adjustedHours).padStart(2, '0')}${minutes}`;
        };

        const startTime = adjustTime(appointment.start_time);
        const endTime = adjustTime(appointment.end_time);

        // Criar parâmetros para a URL
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: `Agendamento: ${appointment.service}`,
            details: `Cliente: ${appointment.client_name}\nServiço: ${appointment.service}\nProfissional: ${appointment.professional}\nValor: R$ ${appointment.price.toFixed(2)}`,
            location: 'Rua mucugê 127 - Jardim maracanã',
            dates: `${formattedDate}T${startTime}00Z/${formattedDate}T${endTime}00Z`
        });

        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }
    
    function setupEventListeners() {
        // Toggle sidebar em telas pequenas
        sidebarCollapse.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            mainContent.classList.toggle('active');
        });
        
        // Toggle tema
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeToggleText(newTheme);
        });
        
        // Filtros de status
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                filterAppointments(this.getAttribute('data-filter'));
            });
        });
        
        // Busca
        searchButton.addEventListener('click', function() {
            filterAppointments(currentFilter);
        });
        
        searchAppointments.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                filterAppointments(currentFilter);
            }
        });
        
        // Navegação entre seções
        perfilLink.addEventListener('click', function(e) {
            e.preventDefault();
            agendamentosSection.classList.add('d-none');
            perfilSection.classList.remove('d-none');
        });
        
        document.querySelectorAll('.agenda-filter').forEach(filter => {
            filter.addEventListener('click', function(e) {
                e.preventDefault();
                agendamentosSection.classList.remove('d-none');
                perfilSection.classList.add('d-none');
                
                // Aqui você implementaria a filtragem por período
                const period = this.getAttribute('data-filter');
                // Implemente a lógica de filtro conforme necessário
            });
        });
        
        // Formulário de perfil
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            
            try {
                const response = await fetch(`/api/users/${currentUser.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username,
                        email,
                        tipo: currentUser.tipo,
                        password_plaintext: currentUser.password
                    })
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Erro ao atualizar perfil');
                }
                
                // Atualizar dados do usuário no localStorage
                currentUser.username = username;
                currentUser.email = email;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Atualizar exibição
                document.getElementById('userName').textContent = username;
                document.getElementById('welcomeName').textContent = username;
                document.getElementById('profileName').textContent = username;
                
                alert('Perfil atualizado com sucesso!');
            } catch (error) {
                console.error('Error updating profile:', error);
                alert(`Erro ao atualizar perfil: ${error.message}`);
            }
        });
        
        // Botão de alterar senha
        changePasswordBtn.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
            modal.show();
        });
        
        // Formulário de alteração de senha
        document.getElementById('savePasswordBtn').addEventListener('click', async function() {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            
            const errorElement = document.getElementById('passwordError');
            const successElement = document.getElementById('passwordSuccess');
            
            // Validações
            if (currentPassword !== currentUser.password) {
                errorElement.textContent = 'A senha atual está incorreta';
                errorElement.classList.remove('d-none');
                successElement.classList.add('d-none');
                return;
            }
            
            if (newPassword !== confirmNewPassword) {
                errorElement.textContent = 'As novas senhas não coincidem';
                errorElement.classList.remove('d-none');
                successElement.classList.add('d-none');
                return;
            }
            
            if (newPassword.length < 3) {
                errorElement.textContent = 'A senha deve ter pelo menos 3 caracteres';
                errorElement.classList.remove('d-none');
                successElement.classList.add('d-none');
                return;
            }
            
            try {
                const response = await fetch(`/api/users/${currentUser.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: currentUser.username,
                        email: currentUser.email,
                        tipo: currentUser.tipo,
                        password_plaintext: newPassword
                    })
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Erro ao atualizar senha');
                }
                
                // Atualizar dados do usuário no localStorage
                currentUser.password = newPassword;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Mostrar mensagem de sucesso
                errorElement.classList.add('d-none');
                successElement.textContent = 'Senha alterada com sucesso!';
                successElement.classList.remove('d-none');
                
                // Limpar campos
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmNewPassword').value = '';
                
                // Fechar modal após 2 segundos
                setTimeout(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                    modal.hide();
                }, 2000);
            } catch (error) {
                console.error('Error changing password:', error);
                errorElement.textContent = `Erro ao alterar senha: ${error.message}`;
                errorElement.classList.remove('d-none');
                successElement.classList.add('d-none');
            }
        });
        
        // Botão de novo agendamento
        newAppointmentBtn.addEventListener('click', function() {
            window.location.href = '/';
        });
        
        // Botão de logout
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUser');
            window.location.href = '/home';
        });
        
        // Toggle visibilidade da senha
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
    }
});