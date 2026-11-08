import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export async function createClient() {
  // O auth-js usa Date.now() ao validar a sessão; com Cache Components isso só é permitido
  // depois de um acesso dinâmico explícito (a requisição real).
  await connection();
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // chamado de Server Component: o proxy já renova a sessão
        }
      },
    },
  });
}
