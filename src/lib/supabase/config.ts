// Valores vêm do arquivo .env.local (veja .env.example).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = SUPABASE_URL.startsWith("https://") && SUPABASE_KEY.length > 0;
