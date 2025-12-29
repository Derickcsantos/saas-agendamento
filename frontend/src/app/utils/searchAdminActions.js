export const SEARCH_ACTIONS = [
  { 
    name: "Visão Geral (Dashboard)", 
    path: "overview", 
    keywords: "inicio home resumo estatisticas graficos metricas faturamento painel indicadores relatorio" 
  },
  { 
    name: "Categorias", 
    path: "categories", 
    keywords: "listar grupos organizar editar excluir atualizar novo criar adicionar tipo secao" 
  },
  { 
    name: "Serviços", 
    path: "services", 
    keywords: "procedimentos tratamentos preco valor duracao ofertados editar novo criar deletar catalogo" 
  },
  { 
    name: "Funcionários", 
    path: "employees", 
    keywords: "equipe colaboradores profissionais agenda barbeiros cabeleireiros esteticistas permissao acesso cadastro turno" 
  },
  { 
    name: "Agendamentos", 
    path: "appointments", 
    keywords: "calendario reservas clientes marcacoes confirmar cancelar horario histórico check-in status pauta" 
  },
  { 
    name: "Agendamento Rápido", 
    path: "faster-schedule", 
    keywords: "marcar agora encaixe urgente express lancar rapido agendar balcao direto novo" 
  },
  { 
    name: "Receitas", 
    path: "revenues", 
    keywords: "faturamento financeiro dinheiro entradas caixa lucro ganhos pagamentos extrato vendas balanço" 
  },
  { 
    name: "Cupons", 
    path: "coupons", 
    keywords: "desconto promocao oferta voucher fidelidade brinde reduzir preço marketing codigo validade" 
  },
  { 
    name: "Usuários", 
    path: "users", 
    keywords: "clientes cadastrados publico perfis contatos leads base pessoas logins administrativo membros" 
  },
  { 
    name: "Galeria", 
    path: "gallery", 
    keywords: "fotos imagens portifolio antes depois midia upload albuns visual fotos trabalhos fotos-servicos" 
  },
  { 
    name: "Site", 
    path: "site", 
    keywords: "landin-page customizar aparencia banner links redes-sociais ver-meu-site online vitrine web layout" 
  },
  { 
    name: "Calendário do Google", 
    path: "calendar-google", 
    keywords: "sincronizar integrar gcal agenda-externa conectar automacao api google-agenda sincronizacao eventos horarios" 
  },
  { 
    name: "Configurações", 
    path: "settings", 
    keywords: "ajustes perfil conta senha cores logo empresa dados suporte assinatura plano preferencias" 
  },
  // Ações de atalho direto (Exemplos de sub-páginas ou ações rápidas)
  { 
    name: "Criar Novo Serviço", 
    path: "services?action=new", 
    keywords: "adicionar-procedimento cadastrar-valor novo-item-catalogo criar-servico novo-tratamento incluir lancar" 
  },
  { 
    name: "Novo Cupom de Desconto", 
    path: "coupons?action=new", 
    keywords: "gerar-promocao dar-desconto criar-voucher nova-campanha ofertar baixar-preco lancar-promo" 
  }
];