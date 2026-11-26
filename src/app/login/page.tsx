import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import GoogleButton from "./GoogleButton";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">My Excalidraw</h1>
        <p className="mt-1 mb-6 text-sm text-zinc-500">Seus quadros de desenho, organizados em pastas.</p>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            O login ainda não está configurado. Preencha o arquivo <code>.env.local</code> com os dados do
            Supabase e reinicie o servidor.
          </div>
        )}

        <Suspense>
          <LoginError searchParams={searchParams} />
        </Suspense>

        <GoogleButton disabled={!isSupabaseConfigured} />
      </div>
    </div>
  );
}

async function LoginError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      Não foi possível entrar. Tente novamente.
    </div>
  );
}
