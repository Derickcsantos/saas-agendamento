document.addEventListener('DOMContentLoaded', function() {
  // Elementos do DOM
  const form = document.getElementById('appointmentForm');
  const steps = document.querySelectorAll('.step');
  const stepIndicators = document.querySelectorAll('.step-indicator');
  const appointmentDate = document.getElementById('appointmentDate');
  const timeSlotsContainer = document.getElementById('timeSlots');
  const selectedTimeInput = document.getElementById('selectedTime');
  const couponCode = document.getElementById('couponCode');
  const applyCouponBtn = document.getElementById('applyCoupon');
  const couponMessage = document.getElementById('couponMessage');
  const couponConfirmation = document.getElementById('couponConfirmation');
  let appliedCoupon = null;
  let originalPrice = 0;
  
  // Elementos de confirmação
  const confirmService = document.getElementById('confirmService');
  const confirmEmployee = document.getElementById('confirmEmployee');
  const confirmDate = document.getElementById('confirmDate');
  const confirmTime = document.getElementById('confirmTime');
  const confirmPrice = document.getElementById('confirmPrice');
  const confirmOriginalPrice = document.getElementById('confirmOriginalPrice');
  const confirmDiscount = document.getElementById('confirmDiscount');
  
  // Variáveis para armazenar dados selecionados
  let selectedCategory = null;
  let selectedService = null;
  let selectedEmployee = null;
  let selectedDate = null;
  let selectedTime = null;
  
  // Inicializar Flatpickr para seleção de data (se o elemento existir)
  if (appointmentDate) {
    flatpickr(appointmentDate, {
      locale: 'pt',
      minDate: 'today',
      dateFormat: 'd/m/Y',
      disable: [
        function(date) {
          // Desabilita todas as datas depois de 01/012/2025
          return date >= new Date(2025, 11, 1); // Mês é 0-based (11 = dezembro)
        }
      ]
    });
  }

  function getOrganizationIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("organization_id");
}

const organizationId = getOrganizationIdFromUrl();
console.log(organizationId);


/**
 * Busca os horários disponíveis na API e renderiza-os no Step 5.
 * @param {string} employeeId - ID do profissional.
 * @param {string} date - Data selecionada.
 * @param {number} duration - Duração do serviço em minutos.
 */
// A função completa que busca horários disponíveis
function fetchAvailableTimes(employeeId, date, duration) {
    
    // 🚨 ASSUME-SE: 'organizationId' é a variável global lida da URL no topo do index.js.
    if (!organizationId) {
        console.error("Erro: Organization ID não está definida. Verifique a URL.");
        alert("Erro: O ID da organização não foi encontrado na URL.");
        return;
    }

    // 1. CONSTRUÇÃO DA URL (Escalável)
    const url = `/api/available-times?employeeId=${employeeId}&date=${date}&duration=${duration}&organization_id=${organizationId}`; 

    // 2. Elementos de UI
    const timeSlotsContainer = document.getElementById('time-slots');
    const timeLoadingMessage = document.getElementById('time-loading-message');

    if (timeSlotsContainer) {
        timeSlotsContainer.innerHTML = ''; // Limpa slots
    }
    if (timeLoadingMessage) {
        timeLoadingMessage.style.display = 'block'; // Inicia carregamento
    }

    fetch(url)
        .then(response => {
            if (!response.ok) {
                // Lança um erro para o bloco .catch lidar com HTTP 4xx/5xx
                throw new Error('Falha na busca de horários. Erro do servidor.');
            }
            return response.json();
        })
        .then(availableSlots => {
            if (timeLoadingMessage) {
                timeLoadingMessage.style.display = 'none'; // Termina carregamento
            }
            
            if (!timeSlotsContainer) return;

            if (availableSlots.length === 0) {
                timeSlotsContainer.innerHTML = '<p class="no-slots">Nenhum horário disponível para a data e profissional selecionados.</p>';
                // O sistema NÃO avança se não houver slots.
            } else {
                // 3. RENDERIZAÇÃO DOS SLOTS
                availableSlots.forEach(slot => {
                    const button = document.createElement('button');
                    button.classList.add('time-slot-btn');
                    button.dataset.startTime = slot.start;
                    button.dataset.endTime = slot.end;
                    button.textContent = slot.start;

                    button.addEventListener('click', () => {
                        // Limpa seleção anterior
                        document.querySelectorAll('.time-slot-btn').forEach(btn => btn.classList.remove('selected'));
                        button.classList.add('selected');

                        // Salva o horário selecionado
                        const selectedTimeInput = document.getElementById('selectedTimeInput');
                        if (selectedTimeInput) {
                            selectedTimeInput.value = slot.start;
                        }
                    });

                    timeSlotsContainer.appendChild(button);
                });
                
                // 🚨 LINHA CRÍTICA PARA AVANÇAR: Manda o usuário para o Step 5 (Seleção de Horário)
                navigateToStep(5); 
            }
        })
        .catch(error => {
            console.error('Erro ao buscar horários:', error);
            if (timeLoadingMessage) {
                timeLoadingMessage.style.display = 'none';
            }
            if (timeSlotsContainer) {
                timeSlotsContainer.innerHTML = '<p class="error-message">Erro ao carregar horários. Tente novamente.</p>';
            }
            // Se houver falha, garante que o Step 5 não é exibido
            navigateToStep(4); 
        });
}
  // Navegação entre passos
  function navigateToStep(stepNumber) {
    // 1. Esconder todos os passos
    steps.forEach(step => {
      step.classList.remove('active');

      step.style.display = 'none'
    });

    // 2. Mostrar e Ativar o passo atual
    const currentStep = document.getElementById(`step${stepNumber}`);
    if(currentStep){
      currentStep.style.display = 'block'
      currentStep.classList.add('active');
    } else {
      indicator.classList.remove('active');
    }

    if(stepNumber === 6){
      updateConfirmationData()
    }


    // Atualizar indicadores de passo
    stepIndicators.forEach(indicator => {
      if (parseInt(indicator.dataset.step) <= stepNumber) {
        indicator.classList.add('active');
      } else {
        indicator.classList.remove('active');
      }
    });
    
    // Atualizar dados de confirmação quando chegar no último passo
    if (stepNumber === 5) {
      updateConfirmationData();
    }
  }
  
  // Event listeners para navegação
document.querySelectorAll('.next-step').forEach(button => {
    button.addEventListener('click', function() {
        const currentStepElement = this.closest('.step');
        if(!currentStepElement) return;

        const currentStepNumber = parseInt(currentStepElement.id.replace('step', ''))
        const nextStep = parseInt(this.dataset.next);

        if(currentStepNumber === 5){
            return; // Impede que o listener Global tente validar / Navegar (Step 5 deve ter seu próprio listener)
        }

        // 1. Validação Geral (Usa a função validateStep)
        if (!validateStep(currentStepNumber)){
            return; // Para a execução se a validação falhar
        }
        
        // 2. Lógica especial: Avanço do Step 4 (Seleção de Data)
        if(currentStepNumber === 4){
            
            // 🚨 CRÍTICO: Verifica se as variáveis globais foram definidas
            if (!selectedService || !selectedEmployee) {
                alert('Erro na seleção: Por favor, reveja o Serviço e o Profissional.');
                // Força o retorno para o Step 3 para corrigir se necessário
                navigateToStep(3); 
                return;
            }
            
            // Obtém os valores CRÍTICOS para a chamada ao servidor
            const selectedEmployeeId = selectedEmployee.id;
            const selectedDuration = selectedService.duration;
            
            // Assumimos que appointmentDate é o INPUT DOM, logo precisamos do .value
            const selectedDateValue = document.getElementById('appointmentDate').value; 
            
            // Garante que os dados existem (validateStep já fez isso, mas a segurança é boa)
            if (selectedEmployeeId && selectedDateValue && selectedDuration) {
                
                // Chamada que inicia a busca. fetchAvailableTimes irá chamar navigateToStep(5) após o sucesso.
                fetchAvailableTimes(
                    selectedEmployeeId,
                    selectedDateValue,
                    selectedDuration
                );
            }

            // CRÍTICO: Retorna. O fetchAvailableTimes É quem avança.
            return; 

        } else {
            // 3. Lógica Padrão: Para todos os outros Steps
            navigateToStep(nextStep)
        }
    });
});

  // Listener exclusivo para o botão 'Próximo' do Step 5
document.getElementById('confirmTimeBtn').addEventListener('click', function(event) {
    const selectedTimeInput = document.getElementById('selectedTimeInput');
    const step6 = 6; 

    // 1. Verificação Final do Horário
    if (!selectedTimeInput || !selectedTimeInput.value) {
        event.preventDefault(); // Por segurança
        alert('Por favor, selecione um horário antes de prosseguir.');
        return;
    }

    // 2. Preenche o Resumo (Importante para o Step 6)
    // Se você tem uma função que atualiza os dados de resumo (ex: selectedEmployee.name, selectedService.name)
    updateConfirmationData(); // Use sua função para preencher os spans de resumo.

    // 3. Avança para o Step 6
    navigateToStep(step6);
});
  
  document.querySelectorAll('.prev-step').forEach(button => {
    button.addEventListener('click', function() {
      const prevStep = this.dataset.prev;
      navigateToStep(parseInt(prevStep));
    });
  });
  
  function validateStep(stepNumber) {
    switch(stepNumber) {
      case 1:
        if (!selectedCategory) {
          alert('Por favor, selecione uma categoria');
          return false;
        }
        return true;
      case 2:
        if (!selectedService) {
          alert('Por favor, selecione um serviço');
          return false;
        }
        return true;
      case 3:
        if (!selectedEmployee) {
          alert('Por favor, selecione um profissional');
          return false;
        }
        return true;
      case 4:
        if (!appointmentDate || !appointmentDate.value) {
          alert('Por favor, selecione uma data');
          return false;
        }
        return true;
      case 5:
        if (!selectedTimeInput || !selectedTimeInput.value) {
          alert('Por favor, selecione um horário');
          return false;
        }
        return true;
      case 6:
        // Cupom é opcional, sempre válido
        return true;
      default:
        return true;
    }
  }

  // Listener para o botão Finalizar Agendamento (Step 6)
document.getElementById('finishBookingBtn').addEventListener('click', async function(event) {
    event.preventDefault(); 
    
    // 1. Coleta dos Dados Finais (Validação básica do formulário)
    const clientName = document.getElementById('clientName').value;
    const clientEmail = document.getElementById('clientEmail').value;
    const clientPhone = document.getElementById('clientPhone').value;
    
    if (!clientName || !clientEmail || !clientPhone) {
        alert('Por favor, preencha todos os seus dados de contato: Nome, E-mail e Telefone.');
        return;
    }
    
    // 2. Coleta dos Dados do Agendamento
    // Assumimos que 'selectedEmployee', 'selectedService' são variáveis GLOBAIS preenchidas
    const appointmentData = {
        organization_id: '11111111-1111-1111-1111-111111111111',
        employee_id: selectedEmployee.id,             
        service_id: selectedService.id,               
        appointment_date: document.getElementById('appointmentDate').value,
        start_time: document.getElementById('selectedTimeInput').value,
        // O End Time deve ser calculado no backend (na sua rota /api/book-appointment) 
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone
    };

    // Opcional: Mostrar um estado de "Carregando"
    this.disabled = true;
    this.textContent = 'Finalizando...';
    
    try {
        // 3. Chamada à API para Salvar
        // 🚨 CRÍTICO: Você precisa criar esta rota no seu server.js
        const response = await fetch('/api/book-appointment', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appointmentData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Falha ao finalizar agendamento no servidor.');
        }

        // Sucesso
        alert('Agendamento realizado com sucesso! Em breve você receberá a confirmação.');
        window.location.reload(); // Recarrega a página ou redireciona
        
    } catch (error) {
        console.error('Erro ao finalizar agendamento:', error);
        alert('Erro ao agendar: ' + error.message);
        
    } finally {
        // Restaura o botão após o processamento (se não tiver recarregado a página)
        this.disabled = false;
        this.textContent = 'Finalizar Agendamento';
    }
});

  // Validar cupom
  async function validateCoupon(code, serviceId) {
    try {
      console.log('Validando cupom:', code, 'para serviço:', serviceId);
      const response = await fetch(`/api/validate-coupon?code=${encodeURIComponent(code)}&serviceId=${serviceId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao validar cupom');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro na validação do cupom:', error);
      return { 
        valid: false, 
        message: error.message || 'Erro ao validar cupom' 
      };
    }
  }

  // Aplicar cupom (se o botão existir)
  if (applyCouponBtn) {
    applyCouponBtn.addEventListener('click', async function() {
      console.log('Clicou em aplicar cupom');
      const code = couponCode ? couponCode.value.trim() : '';
      if (!code) {
        if (couponMessage) {
          couponMessage.textContent = 'Digite um código de cupom';
          couponMessage.className = 'text-small text-danger';
        }
        return;
      }

      if (!selectedService) {
        if (couponMessage) {
          couponMessage.textContent = 'Selecione um serviço primeiro';
          couponMessage.className = 'text-small text-danger';
        }
        return;
      }

      const result = await validateCoupon(code, selectedService.id);
      
      if (couponMessage) {
        if (result.valid) {
          appliedCoupon = {
            code: code,
            discount: result.discount,
            type: result.discountType,
            message: result.message
          };
          
          couponMessage.textContent = result.message || 'Cupom aplicado com sucesso!';
          couponMessage.className = 'text-small text-success';
          updateConfirmationData();
        } else {
          appliedCoupon = null;
          couponMessage.textContent = result.message || 'Cupom inválido';
          couponMessage.className = 'text-small text-danger';
          updateConfirmationData();
        }
      }
    });
  }


  const categoryCards = document.querySelectorAll('#categories-container .item-card');

  categoryCards.forEach(card => {
    card.addEventListener('click', function(){
      // Remove a seleção de todos os cartões e adiciona ao que foi clicado
      categoryCards.forEach(el => {
        el.classList.remove('selected');
      });
      this.classList.add('selected');

      // Pega o ID da categoria ao atributo 'data-id'
      const categoryId = this.dataset.id;

      // Chama a função para carregar os serviços da categoria selecionada
      loadServices(categoryId);

      // Navega para o proximo passo do formulário
      setTimeout(() => navigateToStep(2), 100);
    });
  });

  // Chama a função para buscar o ID da URL, pois a página foi carregada
  getOrganizationIdFromUrl()

  // Carregar serviços baseado na categoria selecionada
  async function loadServices(categoryId) {
    try {
      const container = document.getElementById('services-container');
      if (!container) return;
      
      container.innerHTML = '<div class="loading">Carregando serviços...</div>';
      
      const response = await fetch(`/api/services/${categoryId}?organization_id=${organizationId}`);
      if (!response.ok) throw new Error('Erro ao carregar serviços');
      
      const services = await response.json();
      
      if (services.length === 0) {
        container.innerHTML = '<div class="empty-message">Nenhum serviço disponível para esta categoria</div>';
        return;
      }
      
      container.innerHTML = '';
      
      // Gera o HTML para os cartões de serviço
      services.forEach(service => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.id = service.id;
        
        card.innerHTML = `
          ${service.imagem_service ? 
            `<img src="${service.imagem_service}" alt="${service.name}">` : 
            `<div style="width: 40px; height: 40px; border-radius: 50%; background-image: img/LogoClara.jpg;"></div>`
          }
          <div class="item-info">
            <h5>${service.name}</h5>
            <p>R$ ${service.price.toFixed(2)} • ${service.duration} min</p>
          </div>
        `;
        
        card.addEventListener('click', function() {
          document.querySelectorAll('#services-container .item-card').forEach(el => {
            el.classList.remove('selected');
          });
          this.classList.add('selected');

          selectedService = {
            id: service.id,
            name: service.name,
            price: service.price,
            duration: service.duration,
            image: service.imagem_service
          };
          
          loadEmployees(service.id);
          setTimeout(() => navigateToStep(3), 100); 
        });
        
        container.appendChild(card);
      });
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      const container = document.getElementById('services-container');
      if (container) {
        container.innerHTML = '<div class="empty-message">Erro ao carregar serviços. Tente novamente.</div>';
      }
    }
  }

  // Carregar funcionários baseado no serviço selecionado
async function loadEmployees(serviceId) {
  try {
    const container = document.getElementById('employees-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Carregando profissionais...</div>';
    
    const response = await fetch(`/api/employees/${serviceId}?organization_id=${organizationId}`);
    if (!response.ok) throw new Error('Erro ao carregar profissionais');
    
    const allEmployees = await response.json();
    
    // Filtrar apenas funcionários ativos
    const activeEmployees = allEmployees.filter(employee => employee.is_active === true);
    
    if (activeEmployees.length === 0) {
      container.innerHTML = '<div class="empty-message">Nenhum profissional disponível para este serviço</div>';
      return;
    }
    
    container.innerHTML = '';
    
    // Gera o HTML para os cartões de funcionário
    activeEmployees.forEach(employee => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.dataset.id = employee.id;
      
      card.innerHTML = `
        ${employee.imagem_profile ? 
          `<img src="${employee.imagem_profile}" alt="${employee.name}">` : 
          `<div style="width: 40px; height: 40px; border-radius: 50%; background-image: url('img/LogoClara.jpg'); background-size: cover;"></div>`
        }
        <div class="item-info">
          <h5>${employee.name}</h5>
      `;
      
      card.addEventListener('click', function() {
        document.querySelectorAll('#employees-container .item-card').forEach(el => {
          el.classList.remove('selected');
        });
        
        this.classList.add('selected');
        selectedEmployee = {
          id: employee.id,
          name: employee.name,
          photo: employee.imagem_funcionario,
        };

        setTimeout(() => navigateToStep(4), 100); 
      });
      
      container.appendChild(card);
    });
  } catch (error) {
    console.error('Erro ao carregar profissionais:', error);
    const container = document.getElementById('employees-container');
    if (container) {
      container.innerHTML = '<div class="empty-message">Erro ao carregar profissionais. Tente novamente.</div>';
    }
  }
}
  
  // Carregar horários disponíveis
  async function loadAvailableTimes(employeeId, date, duration, organizationId) {
    try {
      if (!timeSlotsContainer) return;

      if (!organizationId) {
      organizationId = getOrganizationIdFromUrl();
      console.log('Organization ID obtido da URL:', organizationId);
    }
    
    // Verificar se temos um organization_id válido
    if (!organizationId) {
      console.error('Erro: organization_id não disponível');
      timeSlotsContainer.innerHTML = '<p>Erro ao carregar horários disponíveis: ID da organização não disponível</p>';
      return;
    }
    
      
      const response = await fetch(`/api/available-times?employeeId=${employeeId}&date=${date}&duration=${duration}&organization_id=${organizationId}`);
      if (!response.ok) throw new Error('Erro ao carregar horários disponíveis');
      
      const timeSlots = await response.json();
      
      // Limpar e popular os horários disponíveis
      timeSlotsContainer.innerHTML = '';
      if (selectedTimeInput) {
        selectedTimeInput.value = '';
      }
      
      if (timeSlots.length === 0) {
        timeSlotsContainer.innerHTML = '<p>Nenhum horário disponível para esta data</p>';
        return;
      }
      
      timeSlots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = 'time-slot';
        slotElement.textContent = `${slot.start} - ${slot.end}`;
        slotElement.dataset.start = slot.start;
        slotElement.dataset.end = slot.end;
        
        slotElement.addEventListener('click', function() {
          document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
          
          this.classList.add('selected');
          if (selectedTimeInput) {
            selectedTimeInput.value = `${this.dataset.start}-${this.dataset.end}`;
          }
          selectedTime = {
            start: this.dataset.start,
            end: this.dataset.end
          };

          setTimeout(() => navigateToStep(6), 100); 
        });
        
        timeSlotsContainer.appendChild(slotElement);
      });
    } catch (error) {
      console.error('Erro ao carregar horários disponíveis:', error);
      if (timeSlotsContainer) {
        timeSlotsContainer.innerHTML = '<p>Erro ao carregar horários disponíveis. Por favor, tente novamente.</p>';
      }
    }
  }

  // Atualizar dados de confirmação
  function updateConfirmationData() {

    // 1. Capturar os elementos Span (IDs no HTML)
    const summaryServiceSpan = document.getElementById('summaryService');
    const summaryEmployeeSpan = document.getElementById('summaryEmployee');
    const summaryDateSpan = document.getElementById('summaryDate');
    const summaryTimeSpan = document.getElementById('summaryTime');
    
    // Capturar inputs e variáveis globais
    const appointmentDateInput = document.getElementById('appointmentDate');
    const selectedTimeInput = document.getElementById('selectedTimeInput');
    
    if (!selectedService) return;
    
    if (summaryServiceSpan) {
      summaryServiceSpan.textContent = selectedService.name || 'Não Selecionado';
    }
    
    if (summaryEmployeeSpan && selectedEmployee) {
      summaryEmployeeSpan.textContent = selectedEmployee.name || 'Não Selecionado';
    }

    if (summaryDateSpan && appointmentDateInput) {
        // Pega o valor do INPUT de Data
        summaryDateSpan.textContent = appointmentDateInput.value || 'N/A';
    }
    
    if (summaryTimeSpan && selectedTimeInput) {
        // Pega o valor do INPUT de Horário (o valor do input é apenas a hora de início)
        summaryTimeSpan.textContent = selectedTimeInput.value || 'N/A';
        // Note: Removi a concatenação de start e end, pois selectedTimeInput só tem o valor de início
    }
    
    if (confirmDate && appointmentDate) {
      confirmDate.textContent = appointmentDate.value;
    }
    
    if (confirmTime && selectedTime) {
      confirmTime.textContent = `${selectedTime.start} - ${selectedTime.end}`;
    }
    
    // Preços e descontos
    originalPrice = selectedService.price;
    let finalPrice = originalPrice;
    let discountText = '';
    
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percentage') {
        finalPrice = originalPrice * (1 - appliedCoupon.discount / 100);
      } else {
        finalPrice = originalPrice - appliedCoupon.discount;
      }
      finalPrice = Math.max(0, finalPrice);
      discountText = ` (${appliedCoupon.discount}${appliedCoupon.type === 'percentage' ? '%' : 'R$'} de desconto)`;
    }
    
    // Atualizar elementos de preço
    if (confirmOriginalPrice) {
      confirmOriginalPrice.textContent = `R$ ${originalPrice.toFixed(2)}`;
    }
    
    if (confirmPrice) {
      confirmPrice.textContent = `R$ ${finalPrice.toFixed(2)}`;
    }
    
    if (confirmDiscount) {
      confirmDiscount.textContent = discountText;
      confirmDiscount.style.display = appliedCoupon ? 'inline' : 'none';
    }
  }
  
  // Event listener para data (se o elemento existir)
  if (appointmentDate) {
    appointmentDate.addEventListener('change', function() {
      if (this.value && selectedService && selectedEmployee) {
        const [day, month, year] = this.value.split('/');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const organizationId = getOrganizationIdFromUrl();
        
        selectedDate = formattedDate;
        loadAvailableTimes(selectedEmployee.id, formattedDate, selectedService.duration, organizationId);
      }
    });
  }
  
  // Envio do formulário
  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const clientName = document.getElementById('clientName').value;
    const clientEmail = document.getElementById('clientEmail').value;
    const clientPhone = document.getElementById('clientPhone').value;

    try {
      // Calcular preço final considerando o cupom
      let finalPrice = originalPrice;
      if (appliedCoupon) {
        if (appliedCoupon.type === 'percentage') {
          finalPrice = originalPrice * (1 - appliedCoupon.discount / 100);
        } else {
          finalPrice = originalPrice - appliedCoupon.discount;
        }
        finalPrice = Math.max(0, finalPrice); // Garante que não fique negativo
      }

    const response = await fetch(`/api/appointments?organization_id=${organizationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          service_id: selectedService.id,
          employee_id: selectedEmployee.id,
          date: selectedDate,
          start_time: selectedTime.start,
          end_time: selectedTime.end,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          original_price: originalPrice,
          final_price: finalPrice
        })
      });

      const appointment = await response.json();

      // Sempre mostrar o modal de confirmação, mesmo se response.ok for falso
      const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
      const detailsList = document.getElementById('appointmentDetails');

      // Função para calcular duração
      function calculateDuration(startTime, endTime) {
        try {
          const start = startTime.includes(':') ? startTime.replace(':', '') : startTime;
          const end = endTime.includes(':') ? endTime.replace(':', '') : endTime;
          const startHours = parseInt(start.substring(0, 2));
          const startMins = parseInt(start.substring(2, 4));
          const endHours = parseInt(end.substring(0, 2));
          const endMins = parseInt(end.substring(2, 4));
          const totalStart = startHours * 60 + startMins;
          const totalEnd = endHours * 60 + endMins;
          if (totalEnd <= totalStart) return '00:00';
          const durationMins = totalEnd - totalStart;
          const hours = Math.floor(durationMins / 60);
          const mins = durationMins % 60;
          return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        } catch {
          return '00:00';
        }
      }

      const duration = calculateDuration(appointment.start_time, appointment.end_time);

      detailsList.innerHTML = `
        <li><strong>Nome:</strong> ${appointment.client_name}</li>
        <li><strong>Serviço:</strong> ${confirmService.textContent}</li>
        <li><strong>Profissional:</strong> ${confirmEmployee.textContent}</li>
        <li><strong>Data:</strong> ${formatDateToBR(appointment.appointment_date)}</li>
        <li><strong>Horário:</strong> ${appointment.start_time}</li>
        <li><strong>Duração:</strong> ${duration}</li>
        ${originalPrice ? `
          <li><strong>Valor original:</strong> R$ ${originalPrice.toFixed(2)}</li>
          ${appliedCoupon ? `<li><strong>Desconto:</strong> ${appliedCoupon.discount}${appliedCoupon.type === 'percentage' ? '%' : 'R$'}</li>` : ''}
          <li><strong>Valor total:</strong> R$ ${finalPrice.toFixed(2)}</li>
        ` : ''}
      `;

      // Dados do agendamento para os botões
      let currentAppointment = {
        name: appointment.client_name,
        email: clientEmail,
        phone: clientPhone,
        service: confirmService.textContent,
        professional: confirmEmployee.textContent,
        date: formatDateToBR(appointment.appointment_date),
        time: `${appointment.start_time}`,
        originalPrice: originalPrice ? `R$ ${originalPrice.toFixed(2)}` : '',
        finalPrice: finalPrice ? `R$ ${finalPrice.toFixed(2)}` : '',
        discount: appliedCoupon ? `${appliedCoupon.discount}${appliedCoupon.type === 'percentage' ? '%' : 'R$'}` : ''
      };

      // Função para garantir que os botões SEMPRE tenham listeners corretos
      function setupConfirmationButtons() {
        // Substitui botões por clones para remover listeners antigos
        function replaceButton(id) {
          const oldBtn = document.getElementById(id);
          if (!oldBtn) return null;
          const newBtn = oldBtn.cloneNode(true);
          oldBtn.parentNode.replaceChild(newBtn, oldBtn);
          return newBtn;
        }

        // WhatsApp
        const whatsappBtn = replaceButton('whatsappBtn');
        if (whatsappBtn) {
          whatsappBtn.addEventListener('click', async () => {
            const userPhone = currentAppointment.phone.replace(/\D/g, '');
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
            const validationModal = new bootstrap.Modal(document.getElementById('validationModal'));
            if (userPhone.length < 11) {
              document.getElementById('validationMessage').textContent = 'Número inválido. Digite um número com DDD.';
              validationModal.show();
              return;
            }
            try {
              const response = await fetch('/api/send-whatsapp-confirmation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  clientPhone: userPhone,
                  appointmentDetails: {
                    service: currentAppointment.service,
                    professional: currentAppointment.professional,
                    date: currentAppointment.date,
                    time: currentAppointment.time,
                    originalPrice: currentAppointment.originalPrice,
                    discount: currentAppointment.discount,
                    finalPrice: currentAppointment.finalPrice
                  }
                })
              });
              const result = await response.json();
              if (result.success) {
                successModal.show();
              } else {
                document.getElementById('errorMessage').textContent = result.error || 'Erro ao enviar mensagem';
                errorModal.show();
              }
            } catch (error) {
              document.getElementById('errorMessage').textContent = 'Falha na comunicação com o servidor';
              errorModal.show();
            }
          });
        }

        // Email
        const emailBtn = replaceButton('emailBtn');
        if (emailBtn) {
          emailBtn.addEventListener('click', async () => {
            const emailSuccessModal = new bootstrap.Modal(document.getElementById('emailSuccessModal'));
            const emailErrorModal = new bootstrap.Modal(document.getElementById('emailErrorModal'));
            const emailLoadingModal = new bootstrap.Modal(document.getElementById('emailLoadingModal'));
            try {
              emailLoadingModal.show();
              const response = await fetch('/api/send-confirmation-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: currentAppointment.email,
                  subject: 'Confirmação de Agendamento',
                  body: `
                    <h1>Confirmação de Agendamento</h1>
                    <p>Seu agendamento foi confirmado com sucesso!</p>
                    <p><strong>Nome:</strong> ${currentAppointment.name}</p>
                    <p><strong>Serviço:</strong> ${currentAppointment.service}</p>
                    <p><strong>Profissional:</strong> ${currentAppointment.professional}</p>
                    <p><strong>Data:</strong> ${currentAppointment.date}</p>
                    <p><strong>Horário:</strong> ${currentAppointment.time}</p>
                    ${currentAppointment.originalPrice ? `<p><strong>Valor original:</strong> ${currentAppointment.originalPrice}</p>` : ''}
                    ${currentAppointment.discount ? `<p><strong>Desconto:</strong> ${currentAppointment.discount}</p>` : ''}
                    ${currentAppointment.finalPrice ? `<p><strong>Valor total:</strong> ${currentAppointment.finalPrice}</p>` : ''}
                  `
                })
              });
              emailLoadingModal.hide();
              if (response.ok) {
                emailSuccessModal.show();
              } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao enviar e-mail');
              }
            } catch (error) {
              document.getElementById('emailErrorMessage').textContent = error.message || 'Erro ao enviar e-mail de confirmação';
              emailErrorModal.show();
            }
          });
        }

        // Calendário
        const calendarBtn = replaceButton('calendarBtn');
        if (calendarBtn) {
          calendarBtn.addEventListener('click', () => {
            try {
              const calendarAppointment = {
                service: currentAppointment.service,
                professional: currentAppointment.professional,
                name: currentAppointment.name,
                finalPrice: currentAppointment.finalPrice,
                date: currentAppointment.date, // formato dd/mm/yyyy
                startTime: appointment.start_time,
                endTime: appointment.end_time
              };
              const title = encodeURIComponent(`Agendamento: ${calendarAppointment.service}`);
              const details = encodeURIComponent(
                `Profissional: ${calendarAppointment.professional}\n` +
                `Valor: ${calendarAppointment.finalPrice}\n` +
                `Cliente: ${calendarAppointment.name}`
              );
              const location = encodeURIComponent('Online ou no local do serviço');
              const [day, month, year] = calendarAppointment.date.split('/');
              const normalizeAndAdjustTime = (timeStr) => {
                const cleanTime = timeStr.replace(/:/g, '');
                const paddedTime = cleanTime.padStart(4, '0');
                let hours = parseInt(paddedTime.substring(0, 2));
                const minutes = parseInt(paddedTime.substring(2, 4));
                let adjustedHours = hours + 3;
                if (adjustedHours >= 24) adjustedHours -= 24;
                return `${String(adjustedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
              };
              const startTime = normalizeAndAdjustTime(calendarAppointment.startTime);
              const endTime = normalizeAndAdjustTime(calendarAppointment.endTime);
              const startDateStr = `${year}-${month}-${day}T${startTime}:00`;
              const endDateStr = `${year}-${month}-${day}T${endTime}:00`;
              const formatForGoogleCalendar = (dateStr) => {
                return dateStr.replace(/-/g, '').replace(/:/g, '').replace('T', 'T') + 'Z';
              };
              const formattedStart = formatForGoogleCalendar(startDateStr);
              const formattedEnd = formatForGoogleCalendar(endDateStr);
              const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE` +
                `&text=${title}` +
                `&dates=${formattedStart}/${formattedEnd}` +
                `&details=${details}` +
                `&location=${location}` +
                `&sf=true` +
                `&output=xml`;
              window.open(calendarUrl, '_blank');
            } catch (error) {
              console.error('Erro ao gerar link para Google Calendar:', error);
            }
          });
        }
      }

      // Configura os botões ANTES de mostrar o modal
      setupConfirmationButtons();
      modal.show();

      // Resetar formulário após confirmação
      modal._element.addEventListener('hidden.bs.modal', function() {
        form.reset();
        categorySelect.innerHTML = '<option value="" selected disabled>Selecione uma categoria</option>';
        serviceSelect.innerHTML = '<option value="" selected disabled>Primeiro selecione uma categoria</option>';
        serviceSelect.disabled = true;
        employeeSelect.innerHTML = '<option value="" selected disabled>Selecione um profissional</option>';
        timeSlotsContainer.innerHTML = '';
        selectedTimeInput.value = '';
        couponCode.value = '';
        couponMessage.textContent = '';
        couponMessage.className = 'text-small';
        appliedCoupon = null;
        
        // Recarregar categorias
        loadCategories();
        
        // Voltar para o primeiro passo
        navigateToStep(1);
      });

      function setupConfirmationButtonsGlobal() {
        function replaceButton(id) {
        const oldBtn = document.getElementById(id);
        if (!oldBtn) return null;
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);
        return newBtn;
      }

      // Email
      const emailBtn = replaceButton('emailBtn');
      if (emailBtn) {
        emailBtn.addEventListener('click', async () => {
          const emailSuccessModal = new bootstrap.Modal(document.getElementById('emailSuccessModal'));
          const emailErrorModal = new bootstrap.Modal(document.getElementById('emailErrorModal'));
          const emailLoadingModal = new bootstrap.Modal(document.getElementById('emailLoadingModal'));
          try {
            emailLoadingModal.show();
            // Pega dados do formulário ou do último agendamento
            const clientEmail = document.getElementById('clientEmail')?.value || '';
            const clientName = document.getElementById('clientName')?.value || '';
            const confirmServiceName = document.getElementById('confirmService')?.textContent || '';
            const confirmEmployeeName = document.getElementById('confirmEmployee')?.textContent || '';
            const confirmDateValue = document.getElementById('confirmDate')?.textContent || '';
            const confirmTimeValue = document.getElementById('confirmTime')?.textContent || '';
            const confirmOriginalPriceValue = document.getElementById('confirmOriginalPrice')?.textContent || '';
            const confirmDiscountValue = document.getElementById('confirmDiscount')?.textContent || '';
            const confirmPriceValue = document.getElementById('confirmPrice')?.textContent || '';

            const response = await fetch('/api/send-confirmation-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: clientEmail,
                subject: 'Confirmação de Agendamento',
                body: `
                  <h1>Confirmação de Agendamento</h1>
                  <p>Seu agendamento foi confirmado com sucesso!</p>
                  <p><strong>Nome:</strong> ${clientName}</p>
                  <p><strong>Serviço:</strong> ${confirmServiceName}</p>
                  <p><strong>Profissional:</strong> ${confirmEmployeeName}</p>
                  <p><strong>Data:</strong> ${confirmDateValue}</p>
                  <p><strong>Horário:</strong> ${confirmTimeValue}</p>
                  ${confirmOriginalPriceValue ? `<p><strong>Valor original:</strong> ${confirmOriginalPriceValue}</p>` : ''}
                  ${confirmDiscountValue ? `<p><strong>Desconto:</strong> ${confirmDiscountValue}</p>` : ''}
                  ${confirmPriceValue ? `<p><strong>Valor total:</strong> ${confirmPriceValue}</p>` : ''}
                `
              })
            });
            emailLoadingModal.hide();
            if (response.ok) {
              emailSuccessModal.show();
            } else {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Erro ao enviar e-mail');
            }
          } catch (error) {
            document.getElementById('emailErrorMessage').textContent = error.message || 'Erro ao enviar e-mail de confirmação';
            emailErrorModal.show();
          }
        });
      }

      // Calendário
      const calendarBtn = replaceButton('calendarBtn');
      if (calendarBtn) {
        calendarBtn.addEventListener('click', () => {
          try {
            // Pega dados do formulário ou do último agendamento
            const clientName = document.getElementById('clientName')?.value || '';
            const confirmServiceName = document.getElementById('confirmService')?.textContent || '';
            const confirmEmployeeName = document.getElementById('confirmEmployee')?.textContent || '';
            const confirmDateValue = document.getElementById('confirmDate')?.textContent || '';
            const confirmTimeValue = document.getElementById('confirmTime')?.textContent || '';
            const confirmPriceValue = document.getElementById('confirmPrice')?.textContent || '';

            // Extrai horário de início e fim
            let startTime = '';
            let endTime = '';
            if (confirmTimeValue && confirmTimeValue.includes('-')) {
              [startTime, endTime] = confirmTimeValue.split('-').map(s => s.trim());
            }

            // Extrai data
            let day = '', month = '', year = '';
            if (confirmDateValue && confirmDateValue.includes('/')) {
              [day, month, year] = confirmDateValue.split('/');
            }

            const title = encodeURIComponent(`Agendamento: ${confirmServiceName}`);
            const details = encodeURIComponent(
              `Profissional: ${confirmEmployeeName}\n` +
              `Valor: ${confirmPriceValue}\n` +
              `Cliente: ${clientName}`
            );
            const location = encodeURIComponent('Rua mucugê 127 - Jardim maracanã');
            const normalizeAndAdjustTime = (timeStr) => {
              const cleanTime = timeStr.replace(/:/g, '');
              const paddedTime = cleanTime.padStart(4, '0');
              let hours = parseInt(paddedTime.substring(0, 2));
              const minutes = parseInt(paddedTime.substring(2, 4));
              let adjustedHours = hours + 3;
              if (adjustedHours >= 24) adjustedHours -= 24;
              return `${String(adjustedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            };
            const startTimeAdj = normalizeAndAdjustTime(startTime);
            const endTimeAdj = normalizeAndAdjustTime(endTime);
            const startDateStr = `${year}-${month}-${day}T${startTimeAdj}:00`;
            const endDateStr = `${year}-${month}-${day}T${endTimeAdj}:00`;
            const formatForGoogleCalendar = (dateStr) => {
              return dateStr.replace(/-/g, '').replace(/:/g, '').replace('T', 'T') + 'Z';
            };
            const formattedStart = formatForGoogleCalendar(startDateStr);
            const formattedEnd = formatForGoogleCalendar(endDateStr);
            const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE` +
              `&text=${title}` +
              `&dates=${formattedStart}/${formattedEnd}` +
              `&details=${details}` +
              `&location=${location}` +
              `&sf=true` +
              `&output=xml`;
            window.open(calendarUrl, '_blank');
          } catch (error) {
            console.error('Erro ao gerar link para Google Calendar:', error);
          }
        });
      }
    }

    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      console.log('Erro ao confirmar agendamento. Por favor, tente novamente.');
      // Ainda assim, mostrar o modal para permitir envio de comprovante
      const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
     setupConfirmationButtonsGlobal();
      modal.show();
    }
  });

  function formatDateToBR(dateString) {
    if (!dateString) return '';
  
    let year, month, day;
  
    if (typeof dateString === 'string' && dateString.includes('-')) {
      [year, month, day] = dateString.split('-');
    } else {
      const date = new Date(dateString);
      day = String(date.getDate()).padStart(2, '0');
      month = String(date.getMonth() + 1).padStart(2, '0');
      year = date.getFullYear();
    }
  
    return `${day}/${month}/${year}`;
  }
  
  // Inicialização
  loadCategories();
});
