document.addEventListener('DOMContentLoaded', function() {
  // Seletores dos elementos principais (verifica existência)
  const loginForm = document.getElementById('loginForm');
  const cadastroForm = document.getElementById('cadastroForm');
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const loginMessage = document.getElementById('loginMessage');
  const cadastroMessage = document.getElementById('cadastroMessage');
  const recoveryMessage = document.getElementById('recoveryMessage');
  const loginContainer = document.getElementById('loginContainer');
  const cadastroContainer = document.getElementById('cadastroContainer');
  const switchToCadastro = document.getElementById('switchToCadastro');
  const switchToLogin = document.getElementById('switchToLogin');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');

  const forgotPasswordModalEl = document.getElementById('forgotPasswordModal');
  const forgotPasswordModal = (typeof bootstrap !== 'undefined' && forgotPasswordModalEl)
    ? new bootstrap.Modal(forgotPasswordModalEl)
    : null;

  // ---------- getOrganizationId ----------
  function getOrganizationId() {
    const params = new URLSearchParams(window.location.search);
    let orgId = params.get("organization_id");

    if (orgId) {
      // Se veio na URL, salva no localStorage para persistir entre reloads
      localStorage.setItem("organization_id", orgId);
      return orgId;
    }

    // Se não veio na URL, tenta buscar do localStorage
    orgId = localStorage.getItem("organization_id");
    if (orgId) {
      // Se já existe no localStorage, garante que a URL mostre isso sem recarregar
      params.set("organization_id", orgId);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      // replaceState evita adicionar histórico extra
      window.history.replaceState({}, "", newUrl);
    }

    return orgId;
  }

  // Uso
  const organizationId = getOrganizationId();
  console.log("Organization ID:", organizationId);

  // ---------- UI switches (só se os elementos existirem) ----------
  if (switchToCadastro && loginContainer && cadastroContainer) {
    switchToCadastro.addEventListener('click', function(e) {
      e.preventDefault();
      loginContainer.style.display = 'none';
      cadastroContainer.style.display = 'block';
    });
  }

  if (switchToLogin && cadastroContainer && loginContainer) {
    switchToLogin.addEventListener('click', function(e) {
      e.preventDefault();
      cadastroContainer.style.display = 'none';
      loginContainer.style.display = 'block';
    });
  }

  // ---------- Função utilitária de mensagens ----------
  function showMessage(element, message, type) {
    if (!element) {
      // fallback para console se elemento NÃO existir
      console[type === 'danger' ? 'error' : 'log'](message);
      return;
    }
    element.textContent = message;
    element.className = `mt-3 alert alert-${type}`;
    element.classList.remove('d-none');
  }

  // ---------- LOGIN ----------
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const login = document.getElementById('login')?.value.trim() || '';
      const password = document.getElementById('password')?.value || '';

      if (!login || !password) {
        showMessage(loginMessage, 'Preencha login e senha.', 'danger');
        return;
      }

      try {
        // NOTE: envio do organization_id na query para que o servidor consiga
        // buscar o usuário e gerar o token. O servidor então retornará e
        // setará o cookie HttpOnly; por isso usamos credentials: 'include'.
        const response = await fetch(`/api/login?organization_id=${encodeURIComponent(organizationId || '')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login, password }),
          credentials: 'include' // fundamental para receber cookie HttpOnly
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          // Incrementa tentativas de login no localStorage
          let attempts = parseInt(localStorage.getItem('tentativaslogin') || '0', 10);
          attempts = Number.isNaN(attempts) ? 1 : attempts + 1;
          localStorage.setItem('tentativaslogin', attempts);

          if (attempts >= 5) {
            throw new Error('Você excedeu o número máximo de tentativas. Tente novamente mais tarde.');
          } else {
            throw new Error(result.error || `Credenciais inválidas. Tentativa ${attempts}/5.`);
          }
        }

        // NÃO salve senha no localStorage! salvar apenas dados não sensíveis.
        const safeUserData = {
          id: result.user?.id,
          username: result.user?.username,
          email: result.user?.email,
          phone: result.user?.phone || '',
          aniversario: result.user?.aniversario || '',
          tipo: result.user?.tipo || '',
          organization_id: result.user?.organization_id || organizationId
        };

        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('tentativaslogin', '0');
        localStorage.setItem('currentUser', JSON.stringify(safeUserData));

        // Redireciona conforme o tipo de usuário (a URL continua contendo organization_id
        // para compatibilidade com páginas que ainda leem da query)
        if (safeUserData.tipo === 'admin') {
          window.location.href = `/admin?organization_id=${encodeURIComponent(safeUserData.organization_id)}`;
        } else if (safeUserData.tipo === 'funcionario') {
          window.location.href = `/funcionario?organization_id=${encodeURIComponent(safeUserData.organization_id)}`;
        } else {
          window.location.href = `/logado?organization_id=${encodeURIComponent(safeUserData.organization_id)}`;
        }

      } catch (error) {
        console.error('Erro no submit da categoria:', error);
        showMessage(loginMessage, error.message || 'Erro ao efetuar login', 'danger');
      }
    });
  }

  // ---------- LOGIN COM GOOGLE ----------
  const googleBtn = document.getElementById('googleLoginBtn');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      // redireciona com organization_id — o server (passport) colocará esse state no fluxo
      const orgQuery = organizationId ? `?organization_id=${encodeURIComponent(organizationId)}` : '';
      window.location.href = `/auth/google${orgQuery}`;
    });
  }

  // ---------- CADASTRO ----------
  if (cadastroForm) {
    cadastroForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const username = document.getElementById('cadastroUsername')?.value.trim();
      const email = document.getElementById('cadastroEmail')?.value.trim();
      const aniversario = document.getElementById('cadastroAniversario')?.value.trim();
      const phone = document.getElementById('cadastroPhone')?.value.trim();
      const password = document.getElementById('cadastroPassword')?.value;
      const confirmPassword = document.getElementById('confirmPassword')?.value;

      if (!username || !email || !password) {
        showMessage(cadastroMessage, 'Preencha os campos obrigatórios.', 'danger');
        return;
      }

      if (password !== confirmPassword) {
        showMessage(cadastroMessage, 'As senhas não coincidem', 'danger');
        return;
      }

      if (password.length < 3) {
        showMessage(cadastroMessage, 'A senha deve ter pelo menos 3 caracteres', 'danger');
        return;
      }

      try {
        // Recomendo que o servidor DESCRIPTE e valide organization_id no body
        const payload = {
          username,
          email,
          aniversario,
          phone,
          organization_id: organizationId,
          password_plaintext: password
        };

        const response = await fetch(`/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          // não precisa de credentials aqui, registro inicial não depende de cookie
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Erro ao cadastrar usuário');
        }

        showMessage(cadastroMessage, 'Cadastro realizado com sucesso! Faça login para continuar.', 'success');

        // Volta para o login após 2 segundos
        setTimeout(() => {
          if (cadastroContainer && loginContainer) {
            cadastroContainer.style.display = 'none';
            loginContainer.style.display = 'block';
            cadastroForm.reset();
          }
        }, 2000);

      } catch (error) {
        console.error('Erro no cadastro:', error);
        showMessage(cadastroMessage, error.message || 'Erro ao cadastrar', 'danger');
      }
    });
  }

  // ---------- RECUPERAÇÃO DE SENHA ----------
  if (forgotPasswordLink && forgotPasswordModal) {
    forgotPasswordLink.addEventListener('click', function(e) {
      e.preventDefault();
      forgotPasswordModal.show();
    });
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('recoveryEmail')?.value.trim();
      if (!email) {
        showMessage(recoveryMessage, 'Informe o email para recuperação', 'danger');
        return;
      }

      try {
        const response = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Erro ao processar solicitação');
        }

        showMessage(recoveryMessage, 'Uma nova senha foi enviada para seu email. Verifique sua caixa de entrada.', 'success');

        setTimeout(() => {
          if (forgotPasswordModal) forgotPasswordModal.hide();
          forgotPasswordForm.reset();
          if (recoveryMessage) recoveryMessage.classList.add('d-none');
        }, 3000);

      } catch (error) {
        console.error('Erro na recuperação:', error);
        showMessage(recoveryMessage, error.message || 'Erro ao solicitar recuperação', 'danger');
      }
    });
  }

  // ---------- VISIBILIDADE DA SENHA ----------
  document.addEventListener('click', function(e) {
    if (e.target.closest && e.target.closest('.toggle-password')) {
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
});
