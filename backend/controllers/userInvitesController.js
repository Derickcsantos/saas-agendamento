import express from 'express';
import { supabase } from '../lib/supabase.js';
import crypto from 'crypto';

/**
 * Gera um código de convite único e seguro
 */
function generateInviteCode() {
  return crypto.randomBytes(20).toString('hex').toUpperCase();
}

/**
 * POST /api/user-invites/:slug
 * Cria um novo convite para um usuário
 */
export const createUserInvite = async (req, res) => {
  try {
    const { slug } = req.params;
    const { invited_name, invited_type } = req.body;
    const userId = req.user?.id; // Assumindo que middleware de auth passa o user

    if (!slug || !invited_name || !invited_type) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    if (!['comum', 'funcionario', 'admin'].includes(invited_type)) {
      return res.status(400).json({ error: 'Tipo de usuário inválido' });
    }

    // 1️⃣ Buscar organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 2️⃣ Verificar se o usuário autenticado é admin da organização
    if (userId) {
      const { data: userOrg } = await supabase
        .from('users')
        .select('tipo')
        .eq('id', userId)
        .eq('organization_id', org.id)
        .single();

      if (!userOrg || userOrg.tipo !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores podem criar convites' });
      }
    }

    // 3️⃣ Gerar código de convite
    const invite_code = generateInviteCode();
    const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // 4️⃣ Inserir convite no banco
    const { data: invite, error: inviteError } = await supabase
      .from('user_invites')
      .insert([
        {
          organization_id: org.id,
          invited_by_user_id: userId,
          invited_name,
          invited_type,
          invite_code,
          expires_at: expires_at.toISOString(),
        },
      ])
      .select('*')
      .single();

    if (inviteError) {
      console.error('Erro ao criar convite:', inviteError);
      return res.status(500).json({ error: 'Erro ao criar convite' });
    }

    console.log('✅ Convite criado:', {
      code: invite.invite_code,
      for: invited_name,
      type: invited_type,
      expires_at,
    });

    res.status(201).json({
      success: true,
      invite: {
        id: invite.id,
        invite_code: invite.invite_code,
        invited_name: invite.invited_name,
        invited_type: invite.invited_type,
        created_at: invite.created_at,
        expires_at: invite.expires_at,
      },
      invite_url: `${process.env.FRONTEND_URL}/${slug}/cadastro?invite=${invite.invite_code}`,
    });
  } catch (error) {
    console.error('Erro ao criar convite:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * GET /api/user-invites/:slug/validate/:code
 * Valida um código de convite
 */
export const validateInvite = async (req, res) => {
  try {
    const { slug, code } = req.params;

    if (!slug || !code) {
      return res.status(400).json({ error: 'Slug e código são obrigatórios' });
    }

    // 1️⃣ Buscar organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug_organization')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 2️⃣ Buscar convite
    const { data: invite, error: inviteError } = await supabase
      .from('user_invites')
      .select('*')
      .eq('organization_id', org.id)
      .eq('invite_code', code)
      .eq('is_used', false)
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Convite não encontrado' });
    }

    // 3️⃣ Verificar se expirou
    const expiresAt = new Date(invite.expires_at);
    if (expiresAt < new Date()) {
      return res.status(410).json({ error: 'Convite expirado' });
    }

    console.log('✅ Convite validado:', {
      code: invite.invite_code,
      for: invite.invited_name,
      type: invite.invited_type,
    });

    res.json({
      valid: true,
      invite: {
        name: invite.invited_name,
        type: invite.invited_type,
        organization_name: org.name,
        organization_slug: org.slug_organization,
      },
    });
  } catch (error) {
    console.error('Erro ao validar convite:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * GET /api/user-invites/:slug
 * Lista convites da organização (apenas para admins)
 */
export const getUserInvites = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    if (!slug) {
      return res.status(400).json({ error: 'Slug é obrigatório' });
    }

    // 1️⃣ Buscar organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 2️⃣ Verificar se é admin
    if (userId) {
      const { data: userOrg } = await supabase
        .from('users')
        .select('tipo')
        .eq('id', userId)
        .eq('organization_id', org.id)
        .single();

      if (!userOrg || userOrg.tipo !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    // 3️⃣ Buscar convites
    const { data: invites, error: invitesError } = await supabase
      .from('user_invites')
      .select(`
        id,
        invited_name,
        invited_type,
        invite_code,
        created_at,
        expires_at,
        is_used,
        used_at,
        invited_by_user_id
      `)
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false });

    if (invitesError) {
      throw invitesError;
    }

    res.json(invites || []);
  } catch (error) {
    console.error('Erro ao buscar convites:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * POST /api/user-invites/:slug/redeem/:code
 * Resgata um convite durante o cadastro
 */
export const redeemInvite = async (req, res) => {
  try {
    const { slug, code } = req.params;
    const { username, email, password, phone } = req.body;

    if (!slug || !code) {
      return res.status(400).json({ error: 'Slug e código são obrigatórios' });
    }

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }

    // 1️⃣ Buscar organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 2️⃣ Buscar e validar convite
    const { data: invite, error: inviteError } = await supabase
      .from('user_invites')
      .select('*')
      .eq('organization_id', org.id)
      .eq('invite_code', code)
      .eq('is_used', false)
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Convite não encontrado' });
    }

    // 3️⃣ Verificar se expirou
    const expiresAt = new Date(invite.expires_at);
    if (expiresAt < new Date()) {
      return res.status(410).json({ error: 'Convite expirou' });
    }

    // 4️⃣ Verificar se email/username já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', org.id)
      .or(`username.eq.${username},email.eq.${email}`)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'Usuário ou email já cadastrado' });
    }

    // 5️⃣ Hash da senha (importar função)
    const { hashPassword } = await import('../utils/password.js');
    const password_hash = await hashPassword(password);

    // 6️⃣ Criar usuário com tipo do convite
    const { data: newUser, error: createUserError } = await supabase
      .from('users')
      .insert([
        {
          organization_id: org.id,
          username,
          email,
          phone,
          password: password_hash,
          tipo: invite.invited_type, // ✅ Usar tipo do convite
          created_at: new Date().toISOString(),
        },
      ])
      .select('id, username, email, tipo, created_at')
      .single();

    if (createUserError) {
      console.error('Erro ao criar usuário:', createUserError);
      return res.status(500).json({ error: 'Erro ao criar usuário' });
    }

    // 7️⃣ Marcar convite como usado
    const { error: updateInviteError } = await supabase
      .from('user_invites')
      .update({
        is_used: true,
        used_by_user_id: newUser.id,
        used_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (updateInviteError) {
      console.error('Erro ao atualizar convite:', updateInviteError);
    }

    console.log('✅ Convite resgatado e usuário criado:', {
      username: newUser.username,
      tipo: newUser.tipo,
      invite_code: code,
    });

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso através do convite!',
      user: newUser,
    });
  } catch (error) {
    console.error('Erro ao resgatar convite:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * DELETE /api/user-invites/:slug/:inviteId
 * Remove um convite não usado
 */
export const deleteUserInvite = async (req, res) => {
  try {
    const { slug, inviteId } = req.params;
    const userId = req.user?.id;

    if (!slug || !inviteId) {
      return res.status(400).json({ error: 'Slug e ID do convite são obrigatórios' });
    }

    // 1️⃣ Buscar organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 2️⃣ Verificar se é admin
    if (userId) {
      const { data: userOrg } = await supabase
        .from('users')
        .select('tipo')
        .eq('id', userId)
        .eq('organization_id', org.id)
        .single();

      if (!userOrg || userOrg.tipo !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }
    }

    // 3️⃣ Buscar e deletar convite
    const { error: deleteError } = await supabase
      .from('user_invites')
      .delete()
      .eq('id', inviteId)
      .eq('organization_id', org.id)
      .eq('is_used', false);

    if (deleteError) {
      throw deleteError;
    }

    res.json({ success: true, message: 'Convite removido' });
  } catch (error) {
    console.error('Erro ao deletar convite:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
