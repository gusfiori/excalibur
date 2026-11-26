import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from "./config";

// "/" é a página inicial pública; o app fica em /app
const PUBLIC_PATHS = ["/login", "/auth"];

function isPublic(pathname: string) {
  return pathname === "/" || PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

/**
 * Roda antes de cada página: renova a sessão (cookies) e manda quem não está
 * logado para /login.
 */
export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return isPublic(request.nextUrl.pathname) ? NextResponse.next() : redirectToLogin(request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Não coloque código entre createServerClient e getClaims: é aqui que a sessão é renovada.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!loggedIn && !isPublic(pathname)) {
    return redirectToLogin(request);
  }

  if (loggedIn && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
