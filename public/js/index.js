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
  
  // Navegação entre passos
  function navigateToStep(stepNumber) {
    // Esconder todos os passos
    steps.forEach(step => step.classList.remove('active'));
    
    // Mostrar o passo atual
    const currentStep = document.getElementById(`step${stepNumber}`);
    if (currentStep) {
      currentStep.classList.add('active');
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
      const nextStep = this.dataset.next;
      if (validateStep(parseInt(nextStep) - 1)) {
        navigateToStep(parseInt(nextStep));
      }
    });
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

  // Carregar categorias do banco de dados
async function loadCategories() {
  try {
    const container = document.getElementById('categories-container');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Carregando categorias...</div>';
    
    const response = await fetch('/api/categories');
    if (!response.ok) throw new Error('Erro ao carregar categorias');
    
    let categories = await response.json();

    // Filtro extra no frontend - oculta "Serviços internos"
    categories = categories.filter(category => 
      category.name.toLowerCase().trim() !== 'serviços internos'
    );

    if (categories.length === 0) {
      container.innerHTML = '<div class="empty-message">Nenhuma categoria disponível</div>';
      return;
    }

    container.innerHTML = '';

    categories.forEach(category => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.dataset.id = category.id;

      card.innerHTML = `
        ${category.imagem_category ? 
          `<img src="${category.imagem_category}" alt="${category.name}">` : 
          `<div style="width: 40px; height: 40px; border-radius: 50%; background: #eee;"></div>`
        }
        <div class="item-info">
          <h5>${category.name}</h5>
        </div>
      `;

      card.addEventListener('click', function() {
        document.querySelectorAll('#categories-container .item-card').forEach(el => {
          el.classList.remove('selected');
        });

        this.classList.add('selected');
        selectedCategory = {
          id: category.id,
          name: category.name,
          image: category.imagem_category
        };

        loadServices(category.id);
        setTimeout(() => navigateToStep(2), 100); 
      });

      container.appendChild(card);
    });
  } catch (error) {
    console.error('Erro ao carregar categorias:', error);
    const container = document.getElementById('categories-container');
    if (container) {
      container.innerHTML = '<div class="empty-message">Erro ao carregar categorias. Recarregue a página.</div>';
    }
  }
}


  // Carregar serviços baseado na categoria selecionada
  async function loadServices(categoryId) {
    try {
      const container = document.getElementById('services-container');
      if (!container) return;
      
      container.innerHTML = '<div class="loading">Carregando serviços...</div>';
      
      const response = await fetch(`/api/services/${categoryId}`);
      if (!response.ok) throw new Error('Erro ao carregar serviços');
      
      const services = await response.json();
      
      if (services.length === 0) {
        container.innerHTML = '<div class="empty-message">Nenhum serviço disponível para esta categoria</div>';
        return;
      }
      
      container.innerHTML = '';
      
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
    
    const response = await fetch(`/api/employees/${serviceId}`);
    if (!response.ok) throw new Error('Erro ao carregar profissionais');
    
    const allEmployees = await response.json();
    
    // Filtrar apenas funcionários ativos
    const activeEmployees = allEmployees.filter(employee => employee.is_active === true);
    
    if (activeEmployees.length === 0) {
      container.innerHTML = '<div class="empty-message">Nenhum profissional disponível para este serviço</div>';
      return;
    }
    
    container.innerHTML = '';
    
    activeEmployees.forEach(employee => {
      const card = document.createElement('div');
      card.className = 'item-card';
      card.dataset.id = employee.id;
      
      card.innerHTML = `
        ${employee.imagem_funcionario ? 
          `<img src="${employee.imagem_funcionario}" alt="${employee.name}" onerror="this.onerror=null; this.src='https://via.placeholder.com/40'">` : 
          `<div style="width: 40px; height: 40px; border-radius: 50%; background: #eee;"></div>`
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
  async function loadAvailableTimes(employeeId, date, duration) {
    try {
      if (!timeSlotsContainer) return;
      
      const response = await fetch(`/api/available-times?employeeId=${employeeId}&date=${date}&duration=${duration}`);
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
    if (!selectedService) return;
    
    if (confirmService) {
      confirmService.textContent = selectedService.name;
    }
    
    if (confirmEmployee && selectedEmployee) {
      confirmEmployee.textContent = selectedEmployee.name;
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
        
        selectedDate = formattedDate;
        loadAvailableTimes(selectedEmployee.id, formattedDate, selectedService.duration);
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

      const response = await fetch('/api/appointments', {
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
