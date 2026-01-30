import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-32-chars-min-required';
const ALGORITHM = 'aes-256-cbc';

/**
 * Valida se o secret_code tem exatamente 4 dígitos
 */
export function validateSecretCode(code) {
  const codeStr = String(code).trim();
  const regex = /^\d{4}$/;
  return regex.test(codeStr);
}

/**
 * Criptografa um secret_code de 4 dígitos
 */
export function encryptSecretCode(code) {
  if (!validateSecretCode(code)) {
    throw new Error('Secret code deve ter exatamente 4 dígitos');
  }

  // Normalizar a chave para 32 bytes
  const key = crypto
    .createHash('sha256')
    .update(String(ENCRYPTION_KEY))
    .digest();

  // Gerar IV aleatório
  const iv = crypto.randomBytes(16);

  // Criptografar
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(String(code), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Retornar IV + encrypted como uma string única
  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Descriptografa um secret_code
 */
export function decryptSecretCode(encryptedCode) {
  try {
    const [ivHex, encryptedHex] = encryptedCode.split(':');

    if (!ivHex || !encryptedHex) {
      throw new Error('Formato de código inválido');
    }

    const key = crypto
      .createHash('sha256')
      .update(String(ENCRYPTION_KEY))
      .digest();

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Falha ao descriptografar código');
  }
}

/**
 * Compara um código em texto plano com um código criptografado
 */
export function verifySecretCode(plainCode, encryptedCode) {
  try {
    if (!validateSecretCode(plainCode)) {
      return false;
    }

    const decrypted = decryptSecretCode(encryptedCode);
    return plainCode === decrypted;
  } catch (error) {
    console.error('Erro ao verificar código:', error);
    return false;
  }
}
