/**
 * Normaliza números de telefone brasileiros para diferentes formatos
 * 
 * Aceita: +55 11 999999999, +5511999999999, 11999999999, 55 11 999999999, 
 *         (11) 99999-9999, 11 99999-9999, etc.
 * 
 * Retorna: Objeto com múltiplos formatos para compatibilidade máxima
 * 
 * @param {string} phone - Número de telefone a normalizar
 * @returns {Object|null} Objeto com formatos diferentes ou null se inválido
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    console.warn('❌ normalizePhone: Telefone inválido (não é string ou está vazio)');
    return null;
  }

  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');

  // Valida se tem pelo menos 10 dígitos (2 de área + 8 de número mínimo)
  // ou 11 dígitos (2 de área + 9 de número com 9º dígito)
  if (cleaned.length < 10) {
    console.warn(`❌ normalizePhone: Telefone muito curto após limpeza: "${cleaned}" (${cleaned.length} dígitos)`);
    return null;
  }

  // Remove o 55 se estiver no início (código do Brasil)
  let numberOnly = cleaned;
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    numberOnly = cleaned.substring(2);
  } else if (cleaned.startsWith('55') && cleaned.length === 11) {
    // Caso especial: pode ser +5511999999999 (com 55)
    numberOnly = cleaned.substring(2);
  }

  // Valida se tem 10 ou 11 dígitos após remover 55
  if (numberOnly.length < 10 || numberOnly.length > 11) {
    console.warn(`❌ normalizePhone: Número de dígitos inválido: "${numberOnly}" (${numberOnly.length} dígitos)`);
    return null;
  }

  // Valida DDD (2 primeiros dígitos entre 11 e 99)
  const ddd = parseInt(numberOnly.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) {
    console.warn(`❌ normalizePhone: DDD inválido: ${ddd}`);
    return null;
  }

  return {
    // Formato com código do país
    whatsapp: numberOnly,                    // 11999999999
    whatsappPlus: `+55${numberOnly}`,       // +5511999999999
    whatsappAt: `55${numberOnly}@c.us`,     // 5511999999999@c.us (para versões antigas)
    
    // Formato com espaços e parênteses (para exibição)
    formatted: `(${ddd}) ${numberOnly.substring(2, 7)}-${numberOnly.substring(7)}`,
    
    // Formato sem formatação extra
    clean: numberOnly,
    
    // Apenas DDD
    ddd: numberOnly.substring(0, 2),
    
    // Apenas número (sem DDD)
    number: numberOnly.substring(2),
  };
}

/**
 * Normaliza e valida múltiplos telefones
 * @param {string[]} phones - Array de telefones
 * @returns {Object} { valid: [], invalid: [] }
 */
export function normalizePhones(phones) {
  const valid = [];
  const invalid = [];

  if (!Array.isArray(phones)) {
    return { valid: [], invalid: phones ? [phones] : [] };
  }

  phones.forEach((phone, index) => {
    const normalized = normalizePhone(phone);
    if (normalized) {
      valid.push(normalized);
    } else {
      invalid.push({ original: phone, index });
    }
  });

  return { valid, invalid };
}

/**
 * Tenta normalizar telefone e retorna o formato mais apropriado para WAsender
 * Se falhar, retorna null (seguro)
 * @param {string} phone - Telefone bruto
 * @returns {string|null} Telefone normalizado para WAsender ou null
 */
export function normalizePhoneForWasender(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  
  // WAsender prefere com +55
  return normalized.whatsappPlus;
}

export default normalizePhone;
