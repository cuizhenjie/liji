import { NextResponse } from "next/server";

import { createSupabaseServerClient, ensureUserProfile } from "@/lib/liji/supabase-server";

function safeRedirectPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase?.auth.exchangeCodeForSession(code) ?? {};
    if (!error && supabase) {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await ensureUserProfile(supabase, data.user);
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
