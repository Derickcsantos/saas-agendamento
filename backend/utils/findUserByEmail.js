import { supabase } from '../lib/supabase.js';

export default async function findUserByEmail(email, slug) {

  
  const {org, orgError} = await supabase
    .from('organizations')
    .select('id')
    .eq('slug_organization', slug)

  if (orgError) {
    console.error('Organização não encontrada pelo slug:', orgError)
    return null
  }
    

  const { data, error } = await supabase
    .from('users')
    .select('id, email, username')
    .eq('organization_id', org.id)
    .eq('email', email)
    .single();

  if (error) {
    console.error('Erro ao buscar usuário por email:', error);
    return null;
  }

  return data;
}