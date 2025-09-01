document.addEventListener('DOMContentLoaded', () => {
  const categorySelect = document.getElementById('categorySelect');
  const serviceSelect = document.getElementById('serviceSelect');
  const employeeSelect = document.getElementById('employeeSelect');
  const appointmentDate = document.getElementById('appointmentDate');
  const timeSlotSelect = document.getElementById('timeSlotSelect');
  const finalPriceInput = document.getElementById('finalPrice');
  const form = document.getElementById('quickBookingForm');

  let selectedService = null;
  let selectedEmployee = null;

  // Carregar categorias
  fetch('/api/categories')
    .then(res => res.json())
    .then(categories => {
      categorySelect.innerHTML = '<option value="">Selecione...</option>';
      categories.forEach(c => {
        categorySelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
      });
    });

  categorySelect.addEventListener('change', () => {
    serviceSelect.innerHTML = '';
    employeeSelect.innerHTML = '';
    timeSlotSelect.innerHTML = '';
    const categoryId = categorySelect.value;
    if (!categoryId) return;

    fetch(`/api/services/${categoryId}`)
      .then(res => res.json())
      .then(services => {
        serviceSelect.innerHTML = '<option value="">Selecione...</option>';
        services.forEach(service => {
          serviceSelect.innerHTML += `<option value="${service.id}" data-duration="${service.duration}" data-price="${service.price}">${service.name}</option>`;
        });
      });
  });

  serviceSelect.addEventListener('change', () => {
    employeeSelect.innerHTML = '';
    timeSlotSelect.innerHTML = '';
    const serviceId = serviceSelect.value;
    selectedService = serviceSelect.selectedOptions[0];
    if (!serviceId) return;

    fetch(`/api/employees/${serviceId}`)
      .then(res => res.json())
      .then(employees => {
        employeeSelect.innerHTML = '<option value="">Selecione...</option>';
        employees.forEach(emp => {
          employeeSelect.innerHTML += `<option value="${emp.id}">${emp.name}</option>`;
        });
      });

    finalPriceInput.value = selectedService.dataset.price || '';
  });

  function loadTimeSlots() {
    timeSlotSelect.innerHTML = '';
    const employeeId = employeeSelect.value;
    const date = appointmentDate.value;
    const duration = selectedService ? selectedService.dataset.duration : 0;

    if (!employeeId || !date || !duration) return;

    fetch(`/api/available-times?employeeId=${employeeId}&date=${date}&duration=${duration}`)
      .then(res => res.json())
      .then(slots => {
        timeSlotSelect.innerHTML = '<option value="">Selecione...</option>';
        slots.forEach(slot => {
          timeSlotSelect.innerHTML += `<option value="${slot.start}|${slot.end}">${slot.start} - ${slot.end}</option>`;
        });
      });
  }

  employeeSelect.addEventListener('change', loadTimeSlots);
  appointmentDate.addEventListener('change', loadTimeSlots);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const [start_time, end_time] = timeSlotSelect.value.split('|');
    const payload = {
      client_name: document.getElementById('clientName').value,
      client_email: document.getElementById('clientEmail').value,
      client_phone: document.getElementById('clientPhone').value,
      service_id: serviceSelect.value,
      employee_id: employeeSelect.value,
      date: appointmentDate.value,
      start_time,
      end_time,
      final_price: parseFloat(finalPriceInput.value),
      original_price: parseFloat(selectedService.dataset.price),
      coupon_code: null
    };

    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      alert('Agendamento realizado com sucesso!');
      form.reset();
      timeSlotSelect.innerHTML = '';
    } else {
      alert('Erro ao agendar. Verifique os dados e tente novamente.');
    }
  });
});
