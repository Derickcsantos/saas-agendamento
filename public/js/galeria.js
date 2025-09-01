document.addEventListener('DOMContentLoaded', () => {
  // Elementos do DOM
  const galleryGrid = document.getElementById('galleryGrid');
  const searchInput = document.getElementById('searchInput');
  const loadingIndicator = document.getElementById('loading');
  const form = document.getElementById('formUpload');
  const listaGaleria = document.getElementById('listaGaleria');
  const totalImagens = document.getElementById('totalImagens');
  const buscaTitulo = document.getElementById('buscaTitulo');
  const btnLimparBusca = document.getElementById('btnLimparBusca');

  // Variáveis de estado
  let imagens = [];
  let galleryImages = [];

  // Inicialização
  fetchGalleryImages();
  setupEventListeners();
  criarToastContainer();

  // Função para alternar entre temas
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Verifica o tema salvo ou preferência do sistema
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Carrega o tema quando a página é aberta
document.addEventListener('DOMContentLoaded', loadTheme);

// Adiciona o evento de clique ao botão de tema
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.getElementById('themeToggleSidebar').addEventListener('click', toggleTheme);

  // Função principal para carregar a galeria
  async function fetchGalleryImages() {
    try {
      showLoading(true);
      clearGallery();
      
      const response = await fetch('/api/galeria');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao carregar imagens');
      }
      
      galleryImages = await response.json();
      imagens = galleryImages; // Mantém compatibilidade com o código antigo
      
      if (galleryGrid) displayImages(galleryImages);
      if (listaGaleria) renderGaleria(imagens);
      
    } catch (error) {
      console.error('Error:', error);
      showError('Erro ao carregar a galeria. Por favor, tente novamente mais tarde.');
    } finally {
      showLoading(false);
    }
  }

  // Função para exibir imagens no novo layout
  function displayImages(images) {
    if (!galleryGrid) return;
    
    galleryGrid.innerHTML = '';
    
    if (images.length === 0) {
      galleryGrid.innerHTML = `
        <div class="no-images">
          <i class="far fa-images"></i>
          <p>Nenhuma imagem encontrada.</p>
        </div>`;
      return;
    }
    
    images.forEach(image => {
      const galleryItem = document.createElement('div');
      galleryItem.className = 'gallery-item';
      
      const imgContainer = document.createElement('div');
      imgContainer.className = 'img-container';
      
      const img = document.createElement('img');
      img.src = `/api/galeria/imagem/${image._id}`;
      img.alt = image.titulo;
      img.loading = 'lazy';
      
      img.onerror = function() {
        this.onerror = null;
        this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#f8f9fa"/><text x="50" y="50" font-family="Arial" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="#6c757d">Imagem não disponível</text></svg>';
      };

      const imageTitle = document.createElement('div');
      imageTitle.className = 'image-title';
      imageTitle.textContent = image.titulo;
      
      imgContainer.appendChild(img);
      galleryItem.appendChild(imgContainer);
      galleryItem.appendChild(imageTitle);
      galleryGrid.appendChild(galleryItem);
    });
  }

  // Função para renderizar a galeria no layout antigo
  function renderGaleria(lista) {
    if (!listaGaleria || !totalImagens) return;
    
    listaGaleria.innerHTML = '';
    totalImagens.textContent = lista.length;

    if (lista.length === 0) {
      listaGaleria.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-images fs-1 text-muted"></i>
          <p class="mt-3">Nenhuma imagem encontrada</p>
        </div>`;
      return;
    }

    lista.forEach(img => {
      const col = document.createElement('div');
      col.className = 'col-md-4 mb-4 gallery-item';
      col.dataset.id = img._id;

      const card = document.createElement('div');
      card.className = 'card h-100';

      // Container da imagem com spinner
      const imgContainer = document.createElement('div');
      imgContainer.className = 'img-container position-relative';
      imgContainer.style.height = '200px';
      imgContainer.style.backgroundColor = '#f8f9fa';

      const spinner = document.createElement('div');
      spinner.className = 'spinner-border text-primary position-absolute top-50 start-50 translate-middle';
      
      const imgElement = document.createElement('img');
      imgElement.src = `/api/galeria/imagem/${img._id}`;
      imgElement.className = 'card-img-top h-100 w-100 object-fit-cover';
      imgElement.alt = img.titulo;
      imgElement.loading = 'lazy';

      // Tratamento de erro da imagem
      imgElement.onerror = function() {
        spinner.style.display = 'none';
        this.onerror = null;
        this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="%23f8f9fa"/><text x="50" y="50" fill="%236c757d" font-family="Arial" font-size="10" text-anchor="middle" dominant-baseline="middle">Imagem não disponível</text></svg>';
      };

      imgElement.onload = () => {
        spinner.style.display = 'none';
        imgContainer.style.backgroundColor = 'transparent';
      };

      imgContainer.appendChild(spinner);
      imgContainer.appendChild(imgElement);

      // Corpo do card
      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';

      const cardTitle = document.createElement('h5');
      cardTitle.className = 'card-title text-truncate';
      cardTitle.textContent = img.titulo;
      cardTitle.title = img.titulo;

      // Rodapé do card (apenas se existir listaGaleria)
      if (listaGaleria) {
        const cardFooter = document.createElement('div');
        cardFooter.className = 'card-footer bg-transparent d-flex justify-content-end';

        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn btn-sm btn-outline-danger';
        btnDelete.innerHTML = '<i class="bi bi-trash"></i> Excluir';
        btnDelete.onclick = () => confirmarExclusao(img._id, img.titulo);

        cardFooter.appendChild(btnDelete);
        card.appendChild(cardFooter);
      }

      // Montagem do card
      card.appendChild(imgContainer);
      card.appendChild(cardBody);
      card.appendChild(cardTitle);
      col.appendChild(card);
      listaGaleria.appendChild(col);
    });
  }

  // Configuração dos event listeners
  function setupEventListeners() {
    // Busca por título (nova implementação)
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        const searchTerm = searchInput.value.toLowerCase();
        
        if (searchTerm.length > 2) {
          searchImages(searchTerm);
        } else if (searchTerm.length === 0) {
          if (galleryGrid) displayImages(galleryImages);
          if (listaGaleria) renderGaleria(imagens);
        }
      }, 300));
    }

    // Busca por título (implementação antiga)
    if (buscaTitulo) {
      buscaTitulo.addEventListener('input', debounce(() => {
        const termo = buscaTitulo.value.trim().toLowerCase();
        if (termo.length > 2 || termo.length === 0) {
          buscarImagens(termo);
        }
      }, 300));
    }

    // Limpar busca (implementação antiga)
    if (btnLimparBusca) {
      btnLimparBusca.addEventListener('click', () => {
        if (buscaTitulo) buscaTitulo.value = '';
        renderGaleria(imagens);
      });
    }

    // Upload de imagem (compatível com ambos os formulários)
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        
        try {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enviando...';

          const formData = new FormData(form);
          const fileInput = form.querySelector('input[type="file"]');
          
          if (!fileInput.files.length) {
            throw new Error('Selecione uma imagem para upload');
          }

          const response = await fetch('/api/galeria/upload', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro no upload');
          }

          showToast('Imagem enviada com sucesso!', 'success');
          form.reset();
          await fetchGalleryImages();
        } catch (error) {
          console.error('Erro:', error);
          showToast(error.message, 'danger');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar';
          }
        }
      });
    }
  }

  // Função para buscar imagens (nova implementação)
  async function searchImages(term) {
    try {
      showLoading(true);
      const response = await fetch(`/api/galeria/busca?termo=${encodeURIComponent(term)}`);
      
      if (!response.ok) throw new Error('Erro na busca');
      
      const filteredImages = await response.json();
      if (galleryGrid) displayImages(filteredImages);
      if (listaGaleria) renderGaleria(filteredImages);
    } catch (error) {
      console.error('Search error:', error);
      showToast('Erro ao buscar imagens', 'danger');
    } finally {
      showLoading(false);
    }
  }

  // Função para buscar imagens (implementação antiga)
  async function buscarImagens(termo) {
    try {
      showLoading(true);
      const res = await fetch(`/api/galeria/busca?termo=${encodeURIComponent(termo)}`);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro na busca');
      }

      const resultados = await res.json();
      renderGaleria(resultados);
    } catch (error) {
      console.error('Erro:', error);
      showToast(error.message, 'danger');
    } finally {
      showLoading(false);
    }
  }

  // Função para confirmar exclusão (implementação antiga)
  async function confirmarExclusao(id, titulo) {
    try {
      const confirmacao = confirm(`Tem certeza que deseja excluir "${titulo}"?`);
      if (!confirmacao) return;

      const res = await fetch(`/api/galeria/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao excluir');
      }

      showToast('Imagem excluída com sucesso!', 'success');
      await fetchGalleryImages();
    } catch (error) {
      console.error('Erro:', error);
      showToast(error.message, 'danger');
    }
  }

  // Funções auxiliares
  function showLoading(show) {
    if (loadingIndicator) {
      loadingIndicator.style.display = show ? 'block' : 'none';
    }
  }

  function showError(message) {
    if (galleryGrid) {
      galleryGrid.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>${message}</p>
        </div>`;
    }
  }

  function clearGallery() {
    if (galleryGrid) galleryGrid.innerHTML = '';
    if (listaGaleria) listaGaleria.innerHTML = '';
  }

  function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
  }

  // Sistema de notificações
  function showToast(message, type = 'info') {
    // Verifica se Bootstrap Toast está disponível
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
      const toastContainer = document.getElementById('toastContainer') || createToastContainer();
      
      const toast = document.createElement('div');
      toast.className = `toast align-items-center text-white bg-${type} border-0`;
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'assertive');
      toast.setAttribute('aria-atomic', 'true');
      
      toast.innerHTML = `
        <div class="d-flex">
          <div class="toast-body">
            <i class="fas fa-${type === 'danger' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
            ${message}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      `;

      toastContainer.appendChild(toast);
      
      const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 5000
      });
      bsToast.show();
      
      toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
      });
    } else {
      // Fallback para toast simples se Bootstrap não estiver disponível
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `
        <div class="toast-content">
          <i class="fas fa-${type === 'danger' ? 'exclamation-circle' : 'info-circle'}"></i>
          <span>${message}</span>
        </div>
      `;
      
      const toastContainer = document.getElementById('toastContainer') || createToastContainer();
      toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  }

  function criarToastContainer() {
    if (!document.getElementById('toastContainer')) {
      const container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      container.style.zIndex = '1100';
      document.body.appendChild(container);
      return container;
    }
    return document.getElementById('toastContainer');
  }
});

 function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
    
    // Opcional: Desativar scroll do body quando sidebar está aberto
    document.body.classList.toggle('no-scroll', sidebar.classList.contains('active'));
}