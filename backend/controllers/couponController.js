import express from 'express';
import { supabase } from '../lib/supabase.js';

export const getCoupons = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('organization_id', req.organizationId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCouponById = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.organizationId)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const couponData = {
      ...req.body,
      code: req.body.code.toUpperCase()
    };
    
    const { data, error } = await supabase
      .from('coupons')
      .insert(couponData)
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { code, serviceId } = req.query;
    const cleanCode = code.trim().toUpperCase();

    // Busca o serviço
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('price, name')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return res.json({ valid: false, message: 'Serviço não encontrado' });
    }

    // Busca o cupom básico
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .eq('organization_id', req.organizationId)
      .single();

    if (couponError || !coupon) {
      return res.json({ valid: false, message: 'Cupom não encontrado ou inativo' });
    }

    const now = new Date();

    // Valida data de validade
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return res.json({ valid: false, message: 'Este cupom expirou' });
    }

    // Valida número máximo de usos
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return res.json({ valid: false, message: 'Este cupom atingiu o número máximo de usos' });
    }

    // Valida valor mínimo do serviço
    if (service.price < coupon.min_service_value) {
      return res.json({
        valid: false,
        message: `Este cupom requer serviço com valor mínimo de R$ ${coupon.min_service_value.toFixed(2)}`
      });
    }

    // Cupom válido
    return res.json({
      valid: true,
      discount: coupon.discount_value,
      discountType: coupon.discount_type,
      message: `Cupom aplicado! Desconto de ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : 'R$'}`
    });

  } catch (error) {
    console.error('Erro na validação:', error);
    return res.status(500).json({ valid: false, message: 'Erro interno ao validar cupom' });
  }
};