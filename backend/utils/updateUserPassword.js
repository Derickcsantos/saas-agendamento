import { supabase } from '../lib/supabase.js';

export default async function updateUserPassword(userId, newPassword) {
  const { error } = await supabase
    .from('users')
    .update({ password_plaintext: newPassword })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}