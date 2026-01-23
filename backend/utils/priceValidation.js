import { supabase } from '../lib/supabase.js';

/**
 * Valida e calcula o preço final do agendamento
 * Garante que valores enviados pelo frontend não sejam fraudados
 * 
 * @param {string} serviceId - ID do serviço
 * @param {string|null} couponCode - Código do cupom (opcional)
 * @param {string} organizationId - ID da organização
 * @returns {Promise<{originalPrice: number, finalPrice: number, couponApplied: boolean, discountAmount: number}>}
 * @throws {Error} Se serviço não existir, cupom inválido, etc.
 */
export async function validateAndCalculatePrice(serviceId, couponCode, organizationId) {
  try {
    console.log('💰 Validando preço do agendamento:', { serviceId, couponCode, organizationId });

    // 1️⃣ Buscar preço original do serviço
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, price, organization_id')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      console.error('❌ Serviço não encontrado:', serviceError);
      throw new Error(`Serviço não encontrado: ${serviceId}`);
    }

    // Validar se o serviço pertence à organização
    if (service.organization_id !== organizationId) {
      console.error('❌ Serviço não pertence à organização');
      throw new Error('Serviço não pertence a esta organização');
    }

    const originalPrice = parseFloat(service.price);

    if (isNaN(originalPrice) || originalPrice < 0) {
      console.error('❌ Preço do serviço inválido:', service.price);
      throw new Error('Preço do serviço inválido');
    }

    console.log(`✅ Preço original do serviço "${service.name}": R$ ${originalPrice.toFixed(2)}`);

    // 2️⃣ Se não tiver cupom, retornar preço original
    if (!couponCode || couponCode.trim() === '') {
      console.log('✅ Sem cupom aplicado, retornando preço original');
      return {
        originalPrice,
        finalPrice: originalPrice,
        couponApplied: false,
        discountAmount: 0,
        couponCode: null,
      };
    }

    // 3️⃣ Validar cupom
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.trim().toUpperCase())
      .single();

    if (couponError || !coupon) {
      console.error('❌ Cupom não encontrado:', couponCode);
      throw new Error(`Cupom inválido: ${couponCode}`);
    }

    console.log('🎟️ Cupom encontrado:', {
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      valid_from: coupon.valid_from,
      valid_until: coupon.valid_until,
    });

    // 4️⃣ Validar vigência do cupom
    const now = new Date();
    
    if (coupon.valid_from) {
      const validFrom = new Date(coupon.valid_from);
      if (now < validFrom) {
        console.error('❌ Cupom ainda não está válido');
        throw new Error('Cupom ainda não está válido');
      }
    }

    if (coupon.valid_until) {
      const validUntil = new Date(coupon.valid_until);
      if (now > validUntil) {
        console.error('❌ Cupom expirado');
        throw new Error('Cupom expirado');
      }
    }

    // 5️⃣ Calcular desconto
    let discountAmount = 0;
    const discountValue = parseFloat(coupon.discount_value);

    if (isNaN(discountValue) || discountValue < 0) {
      console.error('❌ Valor de desconto inválido:', coupon.discount_value);
      throw new Error('Cupom com valor de desconto inválido');
    }

    if (coupon.discount_type === 'percentage' || coupon.discount_type === 'porcentagem') {
      // Desconto percentual
      if (discountValue > 100) {
        console.error('❌ Desconto percentual maior que 100%');
        throw new Error('Desconto inválido: não pode ser maior que 100%');
      }
      discountAmount = (originalPrice * discountValue) / 100;
      console.log(`🎯 Desconto de ${discountValue}%: R$ ${discountAmount.toFixed(2)}`);
    } else if (coupon.discount_type === 'fixed' || coupon.discount_type === 'fixo') {
      // Desconto fixo
      discountAmount = discountValue;
      console.log(`🎯 Desconto fixo: R$ ${discountAmount.toFixed(2)}`);
    } else {
      console.error('❌ Tipo de desconto inválido:', coupon.discount_type);
      throw new Error(`Tipo de desconto inválido: ${coupon.discount_type}`);
    }

    // 6️⃣ Calcular preço final (não pode ser negativo)
    let finalPrice = originalPrice - discountAmount;
    
    if (finalPrice < 0) {
      console.warn('⚠️ Desconto maior que preço original, ajustando para R$ 0.00');
      finalPrice = 0;
      discountAmount = originalPrice; // Ajustar desconto para não exceder o preço
    }

    console.log(`✅ Preço final calculado: R$ ${finalPrice.toFixed(2)} (desconto de R$ ${discountAmount.toFixed(2)})`);

    return {
      originalPrice,
      finalPrice,
      couponApplied: true,
      discountAmount,
      couponCode: coupon.code,
    };
  } catch (error) {
    console.error('❌ Erro ao validar preço:', error.message);
    throw error;
  }
}

/**
 * Valida se o preço enviado pelo frontend está correto
 * Lança erro se houver divergência
 * 
 * @param {string} serviceId - ID do serviço
 * @param {string|null} couponCode - Código do cupom (opcional)
 * @param {string} organizationId - ID da organização
 * @param {number} frontendFinalPrice - Preço final enviado pelo frontend
 * @param {number} frontendOriginalPrice - Preço original enviado pelo frontend
 * @throws {Error} Se houver divergência de valores
 */
export async function validateFrontendPrice(serviceId, couponCode, organizationId, frontendFinalPrice, frontendOriginalPrice) {
  try {
    const calculated = await validateAndCalculatePrice(serviceId, couponCode, organizationId);

    const frontendFinal = parseFloat(frontendFinalPrice) || 0;
    const frontendOriginal = parseFloat(frontendOriginalPrice) || 0;

    // Tolerância de 0.01 para arredondamentos
    const tolerance = 0.01;

    if (Math.abs(calculated.originalPrice - frontendOriginal) > tolerance) {
      console.error('❌ Preço original divergente:', {
        backend: calculated.originalPrice,
        frontend: frontendOriginal,
      });
      throw new Error('Preço original divergente. Possível fraude detectada.');
    }

    if (Math.abs(calculated.finalPrice - frontendFinal) > tolerance) {
      console.error('❌ Preço final divergente:', {
        backend: calculated.finalPrice,
        frontend: frontendFinal,
      });
      throw new Error('Preço final divergente. Possível fraude detectada.');
    }

    console.log('✅ Validação de preço do frontend: OK');
    return calculated;
  } catch (error) {
    console.error('❌ Erro na validação de preço do frontend:', error.message);
    throw error;
  }
}
