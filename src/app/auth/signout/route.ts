import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303 faz o navegador seguir o redirecionamento com GET.
  return NextResponse.redirect(`${request.nextUrl.origin}/login`, { status: 303 });
}
