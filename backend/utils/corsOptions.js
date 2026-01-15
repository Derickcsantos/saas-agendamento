

export const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'https://ubiquitous-train-v6pw96wx6v64h664v-3000.app.github.dev', 
    'https://marcafy.com.br', 
    'https://www.marcafy.com.br', 
    'https://www.marcafy.com.br', 
    'http://localhost:3001',
    'https://marcafy.vercel.app'
  ], 
  methods: [
    'GET', 
    'POST', 
    'PUT', 
    'DELETE', 
    'OPTIONS'
  ],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'organization-id', 
    'organization_id', 
    'Accept'
  ],
  exposedHeaders: [
    'Authorization'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
