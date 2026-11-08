// Acessos literais a process.env são necessários para o Next inlinar as variáveis no client.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Aceita o nome antigo (ANON_KEY) ou o novo (PUBLISHABLE_KEY) com o mesmo valor.
export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!;
