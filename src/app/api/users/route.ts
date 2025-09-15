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
  const { id, role, status, name } = await req.json();
  const { error } = await supabase
    .from("profiles")
    .update({ role, status, name })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "Atualizado com sucesso" });
}

export async function POST(req: Request) {
  const { email, password, role, name } = await req.json();

  // Cria o usuário no Auth
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (userError) return NextResponse.json({ error: userError.message }, { status: 400 });

  // Garante que o id foi retornado
  const userId = userData?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "ID do usuário não retornado pelo Auth." }, { status: 500 });
  }

  // Aguarda a trigger criar o registro na profiles e faz update
  let profileError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase
      .from("profiles")
      .update({ role, name, email, status: "ativo" })
      .eq("id", userId);
    if (!error) {
      profileError = null;
      break;
    }
    profileError = error;
    // Aguarda 500ms antes de tentar novamente
    await new Promise(res => setTimeout(res, 500));
  }
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  return NextResponse.json({ user: userData.user });
}
