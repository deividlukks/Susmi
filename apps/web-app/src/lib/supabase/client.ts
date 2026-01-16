import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Durante o build/prerender, retornar um cliente mock se as variáveis não estiverem definidas
  if (!supabaseUrl || !supabaseAnonKey) {
    // Em runtime do cliente, as variáveis devem estar disponíveis
    if (typeof window !== 'undefined') {
      console.error('Supabase environment variables are not set');
    }
    // Retornar um cliente com URLs placeholder que será substituído em runtime
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
