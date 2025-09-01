// Gerenciamento de Cupons
document.addEventListener('DOMContentLoaded', function() {
  // Elementos do formulário
  const couponForm = document.getElementById('couponForm');
  const couponIdInput = document.getElementById('couponId');
  const couponNameInput = document.getElementById('couponName');
  const couponCodeInput = document.getElementById('couponCode');
  const couponDiscountType = document.getElementById('couponDiscountType');
  const couponDiscountValue = document.getElementById('couponDiscountValue');
  const couponValidFrom = document.getElementById('couponValidFrom');
  const couponValidUntil = document.getElementById('couponValidUntil');
  const couponMaxUses = document.getElementById('couponMaxUses');
  const couponMinValue = document.getElementById('couponMinValue');
  const couponDescription = document.getElementById('couponDescription');
  const couponStatus = document.getElementById('couponStatus');
  const cancelCouponEdit = document.getElementById('cancelCouponEdit');
  const couponsTable = document.getElementById('couponsTable');

  // Carregar cupons
  async function loadCoupons() {
    try {
      const response = await fetch('/api/coupons');
      if (!response.ok) throw new Error('Erro ao carregar cupons');
      
      const coupons = await response.json();
      renderCouponsTable(coupons);
    } catch (error) {
      showFeedback('Erro ao carregar cupons: ' + error.message, 'danger');
    }
  }

  // Renderizar tabela de cupons
  function renderCouponsTable(coupons) {
    couponsTable.innerHTML = '';
    
    coupons.forEach(coupon => {
      const row = document.createElement('tr');
      
      // Formatar data de validade
      const validUntil = coupon.valid_until ? 
        new Date(coupon.valid_until).toLocaleDateString() : 'Indeterminado';
      
      // Formatar desconto
      const discountText = coupon.discount_type === 'percentage' ? 
        `${coupon.discount_value}%` : `R$ ${coupon.discount_value.toFixed(2)}`;
      
      row.innerHTML = `
        <td><strong>${coupon.code}</strong></td>
        <td>${coupon.name}</td>
        <td>${discountText}</td>
        <td>${validUntil}</td>
        <td>${coupon.current_uses}${coupon.max_uses ? `/${coupon.max_uses}` : ''}</td>
        <td>
          <span class="badge ${coupon.is_active ? 'bg-success' : 'bg-secondary'}">
            ${coupon.is_active ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary edit-coupon" data-id="${coupon.id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger delete-coupon" data-id="${coupon.id}">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      `;
      
      couponsTable.appendChild(row);
    });
    
    // Adicionar event listeners aos botões
    document.querySelectorAll('.edit-coupon').forEach(btn => {
      btn.addEventListener('click', () => editCoupon(btn.dataset.id));
    });
    
    document.querySelectorAll('.delete-coupon').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteCoupon(btn.dataset.id));
    });
  }

  // Editar cupom
  async function editCoupon(id) {
    try {
      const response = await fetch(`/api/coupons/${id}`);
      if (!response.ok) throw new Error('Erro ao carregar cupom');
      
      const coupon = await response.json();
      
      // Preencher formulário
      couponIdInput.value = coupon.id;
      couponNameInput.value = coupon.name;
      couponCodeInput.value = coupon.code;
      couponDiscountType.value = coupon.discount_type;
      couponDiscountValue.value = coupon.discount_value;
      couponValidFrom.value = coupon.valid_from ? formatDateTimeForInput(coupon.valid_from) : '';
      couponValidUntil.value = coupon.valid_until ? formatDateTimeForInput(coupon.valid_until) : '';
      couponMaxUses.value = coupon.max_uses || 0;
      couponMinValue.value = coupon.min_service_value || 0;
      couponDescription.value = coupon.description || '';
      couponStatus.checked = coupon.is_active;
      
      // Rolar para o formulário
      document.querySelector('#coupons .form-section').scrollIntoView();
      showFeedback('Preencha os dados do cupom e clique em Salvar', 'info');
      
    } catch (error) {
      showFeedback('Erro ao carregar cupom: ' + error.message, 'danger');
    }
  }

  // Formatar data para input datetime-local
  function formatDateTimeForInput(dateTimeString) {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toISOString().slice(0, 16);
  }

  // Confirmar exclusão de cupom
  function confirmDeleteCoupon(id) {
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    document.getElementById('modalTitle').textContent = 'Excluir Cupom';
    document.getElementById('modalBody').textContent = 'Tem certeza que deseja excluir este cupom? Esta ação não pode ser desfeita.';
    
    document.getElementById('confirmAction').onclick = async function() {
      try {
        const response = await fetch(`/api/coupons/${id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Erro ao excluir cupom');
        
        loadCoupons();
        showFeedback('Cupom excluído com sucesso', 'success');
        modal.hide();
      } catch (error) {
        showFeedback('Erro ao excluir cupom: ' + error.message, 'danger');
        modal.hide();
      }
    };
    
    modal.show();
  }

  // Cancelar edição
  cancelCouponEdit.addEventListener('click', function() {
    couponForm.reset();
    couponIdInput.value = '';
    showFeedback('Edição cancelada', 'info');
  });

  // Enviar formulário
  couponForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const couponData = {
      name: couponNameInput.value,
      code: couponCodeInput.value.toUpperCase(),
      discount_type: couponDiscountType.value,
      discount_value: parseFloat(couponDiscountValue.value),
      valid_from: couponValidFrom.value || null,
      valid_until: couponValidUntil.value || null,
      max_uses: parseInt(couponMaxUses.value) || null,
      min_service_value: parseFloat(couponMinValue.value) || 0,
      description: couponDescription.value,
      is_active: couponStatus.checked
    };
    
    try {
      let response;
      const id = couponIdInput.value;
      
      if (id) {
        // Atualizar cupom existente
        response = await fetch(`/api/coupons/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(couponData)
        });
      } else {
        // Criar novo cupom
        response = await fetch('/api/coupons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(couponData)
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar cupom');
      }
      
      const savedCoupon = await response.json();
      loadCoupons();
      couponForm.reset();
      couponIdInput.value = '';
      
      showFeedback(`Cupom ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
      
    } catch (error) {
      showFeedback('Erro ao salvar cupom: ' + error.message, 'danger');
    }
  });

  // Mostrar feedback
  function showFeedback(message, type) {
    const feedbackDiv = document.getElementById('userFeedback');
    feedbackDiv.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `;
  }

  // Inicializar
  loadCoupons();
});