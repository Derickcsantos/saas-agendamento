  // Função para alternar o sidebar em dispositivos móveis
  document.querySelector('.sidebar-toggle').addEventListener('click', function() {
    document.querySelector('.sidebar').classList.toggle('active');
  });

  // Função para alternar visibilidade da senha
  document.querySelectorAll('.toggle-password').forEach(function(button) {
    button.addEventListener('click', function() {
      const input = this.previousElementSibling;
      const icon = this.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('bi-eye-slash-fill');
        icon.classList.add('bi-eye-fill');
      } else {
        input.type = 'password';
        icon.classList.remove('bi-eye-fill');
        icon.classList.add('bi-eye-slash-fill');
      }
    });
  });

  // Atualizar data e hora
  function updateDateTime() {
    const now = new Date();
    const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    
    document.getElementById('dataAtual').textContent = now.toLocaleDateString('pt-BR', dateOptions);
    document.getElementById('tempoAtual').textContent = now.toLocaleTimeString('pt-BR', timeOptions);
  }
  
  setInterval(updateDateTime, 1000);
  updateDateTime();

  // Alternar tema
  document.getElementById('themeToggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-theme');
    const icon = this.querySelector('i');
    if (document.body.classList.contains('dark-theme')) {
      this.innerHTML = '<i class="bi bi-sun-fill"></i> Alternar para Modo Claro';
    } else {
      this.innerHTML = '<i class="bi bi-moon-fill"></i> Alternar para Modo Escuro';
    }
  });

  // Inicializa os tabs do Bootstrap
    var tabElms = document.querySelectorAll('a[data-bs-toggle="tab"]');
    tabElms.forEach(function(tabEl) {
    tabEl.addEventListener('click', function(e) {
        e.preventDefault();
        var tab = new bootstrap.Tab(this);
        tab.show();
        
        // Fecha o sidebar em dispositivos móveis
        if (window.innerWidth < 768) {
        document.querySelector('.sidebar').classList.remove('active');
        }
    });
    });

  // Logout
  function logout() {
    // Implemente a lógica de logout aqui
    console.log('Usuário deslogado');
  }