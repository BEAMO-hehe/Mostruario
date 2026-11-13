import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY 
    || process.env.SUPABASE_PUBLISHABLE_KEY 
    || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ [Supabase Config] Variáveis SUPABASE_URL ou SUPABASE_KEY não configuradas no ambiente (.env).');
}

// Inicializa o cliente do Supabase sobre HTTPS
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseKey || 'placeholder-key',
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

export default supabase;
