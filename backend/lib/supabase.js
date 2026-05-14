import 'dotenv/config';
import { createClient } from '@supabase/supabase-js'; 

// Configuração do Supabase com validação obrigatória
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("❌ SUPABASE_URL é obrigatório no .env");
}

if (!supabaseKey) {
  throw new Error("❌ SUPABASE_SERVICE_ROLE_KEY é obrigatório no .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

