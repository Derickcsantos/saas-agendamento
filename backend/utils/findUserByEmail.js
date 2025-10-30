import { supabase } from '../lib/supabase.js';

export default async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, username')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Erro ao buscar usuário por email:', error);
    return null;
  }

  return data;
}