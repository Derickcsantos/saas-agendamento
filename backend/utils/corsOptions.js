

export const corsOptions = {
  origin: ['http://localhost:3000', 'https://ubiquitous-train-v6pw96wx6v64h664v-3000.app.github.dev'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'organization-id', 'organization_id', 'Accept'],
  credentials: true,
};