/**
 * Valida variáveis de ambiente obrigatórias
 * Deve ser importado no início do server.js
 */

const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_SECRET_KEY',
  'JWT_SECRET',
  'FRONTEND_URL',
  'GOOGLE_REDIRECT_URI',
  'CALLBACK_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
];

const OPTIONAL_ENV_VARS = [
  'PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'STRIPE_SECRET_KEY',
  'PAGARME_API_KEY',
  'GEMINI_API_KEY',
];

export function validateEnvironment() {
  const missingVars = [];
  const missingRecommended = [];

  // Verifica variáveis obrigatórias
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  // Verifica variáveis recomendadas
  for (const varName of OPTIONAL_ENV_VARS) {
    if (!process.env[varName]) {
      missingRecommended.push(varName);
    }
  }

  // Se faltar obrigatórias, lança erro
  if (missingVars.length > 0) {
    console.error(
      '\n❌ ERRO: Variáveis de ambiente obrigatórias ausentes:\n',
      missingVars.map(v => `   - ${v}`).join('\n')
    );
    process.exit(1);
  }

  // Avisa sobre recomendadas
  if (missingRecommended.length > 0) {
    console.warn(
      '\n⚠️  AVISO: Variáveis de ambiente recomendadas ausentes:\n',
      missingRecommended.map(v => `   - ${v}`).join('\n')
    );
  }

  // Validações adicionais de formato/conteúdo
  const validationErrors = [];

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 20) {
    validationErrors.push('JWT_SECRET deve ter pelo menos 20 caracteres');
  }

  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.startsWith('http')) {
    validationErrors.push('FRONTEND_URL deve começar com http:// ou https://');
  }

  if (validationErrors.length > 0) {
    console.error(
      '\n❌ ERRO: Validação de conteúdo de variáveis falhou:\n',
      validationErrors.map(e => `   - ${e}`).join('\n')
    );
    process.exit(1);
  }

  console.log('✅ Todas as variáveis de ambiente obrigatórias estão configuradas');
}
