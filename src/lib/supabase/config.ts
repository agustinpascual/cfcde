/* Configuração do Supabase.
   A chave anon é pública POR DESENHO — ela só funciona dentro do que a RLS
   permite. Nossas tabelas não têm policy de escrita para anon nem leitura
   pública, então ela sozinha não lê nem grava nada de pedido. */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hsepvodzygwaeizxbdmo.supabase.co";

export const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const temSupabase = () => Boolean(SUPABASE_URL && SUPABASE_ANON);
