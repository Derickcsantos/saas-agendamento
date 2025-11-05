import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';


export const swaggerOptions = {
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
      {
        url: 'https://ubiquitous-train-v6pw96wx6v64h664v-3000.app.github.dev',
        description: 'Servidor Codespaces (Public URL)'
      },
    ]
  },
  apis: [
    './server.js',
    './routes/*.js',
    './controllers/*.js',
    './schemas/*.js'
  ],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);

export default function setupSwagger(app) {
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