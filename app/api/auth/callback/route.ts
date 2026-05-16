import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Railway 내부 origin(localhost:8080) 대신 공개 도메인으로 리다이렉트
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mallang.hs0610.com";
  return NextResponse.redirect(`${siteUrl}/`);
}
