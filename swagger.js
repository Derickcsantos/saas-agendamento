const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// ... (todo o seu código de options permanece o mesmo)
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sistema de Agendamentos Online',
      version: '1.0.0',
      description: 'Documentação das rotas da API de agendamentos',
      // ... etc
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor local'
      },
      // ... etc
    ]
  },
  apis: ['./server.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// 👇 ALTERAÇÃO AQUI: A função recebe 'app' diretamente
function setupSwagger(app) {
  // O swaggerUiOptions pode ficar aqui dentro ou fora, tanto faz
  const swaggerUiOptions = {
    customSiteTitle: "Sistema de Agendamentos Online - Documentação",
    customCss: `
      .topbar { display: none }
      .swagger-ui .information-container { background-color: #f5f5f5 }
    `,
    customfavIcon: '/favicon.ico'
  };

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
}

module.exports = { setupSwagger };
