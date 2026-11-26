import { Suspense } from "react";
import { redirect } from "next/navigation";
import Workspace from "@/components/Workspace";
import { createClient } from "@/lib/supabase/server";
import { isThemeId } from "@/lib/themes";
import type { UserInfo } from "@/lib/types";

export default function Home() {
  // A leitura da sessão acontece por requisição, então fica atrás de um <Suspense>.
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-ink-faint">Carregando…</div>}>
      <AuthedWorkspace />
    </Suspense>
  );
}

async function AuthedWorkspace() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/login");

  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const user: UserInfo = {
    id: claims.sub,
    theme: isThemeId(meta.theme) ? meta.theme : null,
    email: claims.email ?? "",
    name: (meta.full_name as string) || (meta.name as string) || claims.email || "Usuário",
    avatarUrl: (meta.avatar_url as string) || (meta.picture as string) || null,
  };

  return <Workspace user={user} />;
}
