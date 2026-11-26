import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./config";

/** Cliente Supabase para Server Components e Route Handlers. */
export async function createClient() {
  // A validação da sessão compara a validade do token com a hora atual (Date.now),
  // então isso só pode rodar no momento da requisição, nunca no pré-render.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não podem gravar cookies; o proxy já cuida de renovar a sessão.
        }
      },
    },
  });
}
