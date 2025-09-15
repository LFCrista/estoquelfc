import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, role, status, created_at, name, email")
    .order("created_at", { ascending: true });

  if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 400 });

  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const users = profiles.map(profile => {
    const authUser = authUsers.users.find(u => u.id === profile.id);
    return {
      ...profile,
      email: profile.email || authUser?.email || "",
      last_sign_in_at: authUser?.last_sign_in_at ?? null
    };
  });

  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  const { id, role, status } = await req.json();
  const { error } = await supabase
    .from("profiles")
    .update({ role, status })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "Atualizado com sucesso" });
}

// POST /api/users → criar novo usuário
export async function POST(req: Request) {
  const { email, password, role, name } = await req.json();

  // Cria o usuário no Supabase Auth
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (userError) return NextResponse.json({ error: userError.message }, { status: 400 });

  // Cria o profile
  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: userData.user.id, role, name, email });

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  return NextResponse.json({ user: userData.user });
}
