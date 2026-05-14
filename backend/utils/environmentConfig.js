/**
 * Configuração de ambiente - URLs e domínios dinâmicos
 * Usado para adaptar a aplicação a diferentes ambientes (dev, staging, prod)
 */

export const getEnvironmentConfig = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  return {
    nodeEnv,
    isProduction,
    
    // URLs de callback e frontend
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
    
    // URLs de redirect OAuth (usadas para callbacks)
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-calendar/callback',
    googleCallbackUrl: process.env.CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
    
    // CORS origins - combina hardcoded com ambiente
    corsOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3003',
      ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
    ].filter(Boolean),
    
    // Verifica se as URLs estão corretamente configuradas para produção
    validateProductionUrls() {
      if (!isProduction) return { valid: true };
      
      const errors = [];
      
      if (!this.frontendUrl || this.frontendUrl.includes('localhost')) {
        errors.push('FRONTEND_URL deve ser um domínio real em produção');
      }
      
      if (!this.backendUrl || this.backendUrl.includes('localhost')) {
        errors.push('BACKEND_URL deve ser um domínio real em produção');
      }
      
      if (!this.googleRedirectUri || this.googleRedirectUri.includes('localhost')) {
        errors.push('GOOGLE_REDIRECT_URI deve usar domínio real em produção');
      }
      
      if (!this.googleCallbackUrl || this.googleCallbackUrl.includes('localhost')) {
        errors.push('CALLBACK_URL deve usar domínio real em produção');
      }
      
      if (errors.length > 0) {
        console.warn('\n⚠️  AVISO: Possíveis configurações incorretas para produção:');
        errors.forEach(e => console.warn(`   - ${e}`));
      }
      
      return { valid: errors.length === 0, errors };
    }
  };
};
