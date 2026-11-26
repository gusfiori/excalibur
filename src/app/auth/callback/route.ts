import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// O Google devolve o usuário para cá com um "code", que trocamos por uma sessão.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/app`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=1`);
}
