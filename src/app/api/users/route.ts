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

  // Verifica se o registro já existe na tabela profiles
  const { data: existingProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("id, user_id")
    .eq("user_id", userId)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") { // Ignora erro de registro não encontrado
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  let profileId;

  if (existingProfile) {
    // Atualiza o registro existente
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ name, role })
      .eq("user_id", userId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    profileId = existingProfile.id;
  } else {
    // Insere um novo registro
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({ user_id: userId, name, role })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    profileId = newProfile.id;
  }

  return NextResponse.json({
    user: {
      ...userData.user,
      profileId, // Inclui o ID do perfil na resposta
    },
  });
}
