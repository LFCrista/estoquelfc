// app/api/logout/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Invalida sessão no Supabase
  await supabase.auth.signOut();

  // Remove cookies do navegador (auth-token e role)
  const response = NextResponse.json({ success: true });
  response.cookies.set("auth-token", "", {
    expires: new Date(0),
    path: "/",
  });
  response.cookies.set("role", "", {
    expires: new Date(0),
    path: "/",
  });

  return response;
}
