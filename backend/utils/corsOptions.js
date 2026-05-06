

export const corsOptions = {
  origin: [
    'http://localhost:3000', 
    'http://localhost:3003',
    'http://192.168.1.55:3003',
    'https://reimagined-zebra-r47wq4wj4ggq3p5jj-3000.app.github.dev', 
    'https://marcafy.com.br', 
    'https://www.marcafy.com.br', 
    'https://www.marcafy.com.br', 
    'http://localhost:3001',
    'https://marcafy.vercel.app',
    'https://reimagined-zebra-r47wq4wj4ggq3p5jj-3001.app.github.dev'
  ], 
  methods: [
    'GET', 
    'POST', 
    'PUT', 
    'PATCH',
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
