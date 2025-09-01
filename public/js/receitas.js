// Função para formatar valores monetários
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  
  // Função para formatar período
  function formatPeriod(startDate, endDate) {
    if (!startDate || !endDate) return 'Todos os períodos';
    
    const start = new Date(startDate).toLocaleDateString('pt-BR');
    const end = new Date(endDate).toLocaleDateString('pt-BR');
    
    return `${start} a ${end}`;
  }
  
  // Função para carregar os dados de receita
  async function loadRevenueData(startDate = null, endDate = null) {
    try {
      // Mostrar loading
      const revenueDetails = document.getElementById('revenueDetails');
      revenueDetails.innerHTML = '<tr><td colspan="6" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div></td></tr>';
      
      // Construir a URL da API com os parâmetros
      let url = '/api/admin/revenue';
      const params = new URLSearchParams();
      
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      if (params.toString()) url += `?${params.toString()}`;
      
      // Fazer a requisição
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar dados');
      
      // Atualizar os cards de resumo
      document.getElementById('totalAppointments').textContent = data.total_appointments;
      document.getElementById('totalRevenue').textContent = formatCurrency(data.total_revenue);
      document.getElementById('totalCommissions').textContent = formatCurrency(data.total_commissions);
      
      // Atualizar o título do período
      const periodTitle = document.getElementById('periodTitle');
      if (periodTitle) {
        periodTitle.textContent = data.period || 'Todos os períodos';
      }
      
      // Atualizar a tabela de detalhes
      if (data.details.length === 0) {
        revenueDetails.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum dado encontrado</td></tr>';
        return;
      }
      
      let html = '';
      data.details.forEach(employee => {
        html += `
          <tr>
            <td>${employee.name}</td>
            <td>${employee.appointments_count}</td>
            <td>${formatCurrency(employee.total_revenue)}</td>
            <td>${employee.commission_rate}%</td>
            <td>${formatCurrency(employee.commission_value)}</td>
            <td>${formatCurrency(employee.net_profit)}</td>
          </tr>
        `;
      });
      
      revenueDetails.innerHTML = html;
      
    } catch (error) {
      console.error('Erro ao carregar dados de receita:', error);
      document.getElementById('revenueDetails').innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar dados: ${error.message}</td></tr>`;
    }
  }
  
  // Função para inicializar a página
  function initRevenuePage() {
    // Adicionar título do período acima da tabela
    const cardHeader = document.querySelector('.card-header h5');
    if (cardHeader) {
      const periodTitle = document.createElement('p');
      periodTitle.className = 'text-muted mb-0';
      periodTitle.id = 'periodTitle';
      periodTitle.textContent = 'Todos os períodos';
      cardHeader.insertAdjacentElement('afterend', periodTitle);
    }
    
    // Carregar dados sem filtro inicial (alltime)
    loadRevenueData();
    
    // Evento do botão Aplicar Filtro
    const applyFilterBtn = document.getElementById('applyFilter');
    if (applyFilterBtn) {
      applyFilterBtn.addEventListener('click', function() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
          alert('A data inicial não pode ser maior que a data final');
          return;
        }
        
        loadRevenueData(startDate || null, endDate || null);
      });
    }
    
    // Evento do botão Limpar Filtros
    const resetFilterBtn = document.getElementById('resetFilter');
    const rechargePage = document.getElementById('rechargePage');

    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', function() {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        loadRevenueData();
      });
    }

    if (rechargePage) {
      rechargePage.addEventListener('click', function() {
        document.getElementById('startDate').value = '';
        document.getElementById('endDate').value = '';
        loadRevenueData(); // ou outra ação apropriada
      });
    }
    
    // Evento do botão Exportar Relatório
    const exportReportBtn = document.getElementById('exportReport');
    if (exportReportBtn) {
      exportReportBtn.addEventListener('click', async function() {
        try {
          const startDate = document.getElementById('startDate').value;
          const endDate = document.getElementById('endDate').value;
          
          // Construir a URL da API com os mesmos parâmetros
          let url = '/api/admin/revenue/export';
          const params = new URLSearchParams();
          
          if (startDate) params.append('start_date', startDate);
          if (endDate) params.append('end_date', endDate);
          
          if (params.toString()) url += `?${params.toString()}`;
          
          // Fazer a requisição para exportação
          const response = await fetch(url);
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao exportar relatório');
          }
          
          // Criar um blob com os dados e fazer download
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `relatorio-receitas-${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
          
        } catch (error) {
          console.error('Erro ao exportar relatório:', error);
          alert(`Erro ao exportar relatório: ${error.message}`);
        }
      });
    }
  }

  const exportPdfBtn = document.getElementById('exportPdf');
if (exportPdfBtn) {
  exportPdfBtn.addEventListener('click', function() {
    try {
      // Pegar os dados já carregados na página (da tabela)
      const periodText = document.getElementById('periodTitle').textContent;
      const totalAppointments = document.getElementById('totalAppointments').textContent;
      const totalRevenue = document.getElementById('totalRevenue').textContent;
      const totalCommissions = document.getElementById('totalCommissions').textContent;
      
      // Pegar os dados da tabela
      const tableRows = document.querySelectorAll('#revenueDetails tr');
      const details = [];
      
      tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
          details.push({
            name: cells[0].textContent,
            appointments: cells[1].textContent,
            revenue: cells[2].textContent,
            commissionRate: cells[3].textContent,
            commissionValue: cells[4].textContent,
            netProfit: cells[5].textContent
          });
        }
      });
      
      // Criar o PDF
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      // Configurações do PDF
      doc.setFont('helvetica');
      doc.setFontSize(18);
      doc.setTextColor(40);
      
      // Título
      doc.text('Relatório de Receitas', 105, 15, { align: 'center' });
      
      // Período
      doc.setFontSize(12);
      doc.text(periodText, 14, 25);
      
      // Informações resumidas
      doc.setFontSize(11);
      doc.text(`Total de Agendamentos: ${totalAppointments}`, 14, 35);
      doc.text(`Faturamento Total: ${totalRevenue}`, 14, 40);
      doc.text(`Total de Comissões: ${totalCommissions}`, 14, 45);
      
      // Cabeçalho da tabela
      const headers = [
        'Profissional',
        'Agendamentos',
        'Faturamento',
        'Comissão %',
        'Valor Comissão',
        'Lucro Líquido'
      ];
      
      // Dados da tabela
      const data = details.map(item => [
        item.name,
        item.appointments,
        item.revenue,
        item.commissionRate,
        item.commissionValue,
        item.netProfit
      ]);
      
      // Adicionar tabela ao PDF
      doc.autoTable({
        head: [headers],
        body: data,
        startY: 50,
        theme: 'grid',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        styles: {
          cellPadding: 3,
          fontSize: 9,
          valign: 'middle'
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 25 },
          2: { cellWidth: 30 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 }
        }
      });
      
      // Adicionar data de geração
      const date = new Date().toLocaleDateString('pt-BR');
      doc.setFontSize(10);
      doc.text(`Gerado em: ${date}`, 14, doc.lastAutoTable.finalY + 15);
      
      // Salvar o PDF
      doc.save(`relatorio-receitas-${date.replace(/\//g, '-')}.pdf`);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF: ' + error.message);
    }
  });
}

  // Evento do botão Exportar Relatório PDF

  // Inicializar quando o DOM estiver carregado
  document.addEventListener('DOMContentLoaded', initRevenuePage);