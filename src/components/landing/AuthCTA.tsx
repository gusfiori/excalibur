import Link from "next/link";
import GoogleButton from "@/components/GoogleButton";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type AuthCTAProps = {
  /** header = botão pequeno no topo; hero = chamada principal */
  variant: "header" | "hero";
};

const openAppClass = {
  header: "rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent hover:opacity-90",
  hero: "inline-flex w-full items-center justify-center rounded-lg bg-accent px-6 py-3.5 text-base font-medium text-on-accent hover:opacity-90",
};

/** Quem já entrou vê "Abrir meus quadros"; quem não entrou, o botão do Google. */
export default async function AuthCTA({ variant }: AuthCTAProps) {
  let loggedIn = false;
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    loggedIn = Boolean(data?.claims);
  }

  if (loggedIn) {
    return (
      <Link href="/app" className={openAppClass[variant]}>
        Abrir meus quadros →
      </Link>
    );
  }

  return variant === "hero" ? (
    <GoogleButton size="large" label="Começar grátis com Google" />
  ) : (
    <div className="w-44">
      <GoogleButton label="Entrar" />
    </div>
  );
}

/** Enquanto descobre se a pessoa está logada (é rápido). */
export function AuthCTAFallback({ variant }: AuthCTAProps) {
  return (
    <Link href="/login" className={openAppClass[variant]}>
      {variant === "hero" ? "Começar grátis" : "Entrar"}
    </Link>
  );
}
