import { createClient } from "@/lib/supabase/client";
import type { ThemeId } from "@/lib/themes";

/**
 * Salva o tema na conta (user_metadata do Supabase Auth), então ele vale em
 * qualquer computador. Não precisa de tabela nova no banco.
 */
export async function saveTheme(theme: ThemeId): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ data: { theme } });
  if (error) throw error;
  // Renova o token para o servidor já enxergar o tema novo no próximo carregamento
  await supabase.auth.refreshSession();
}
