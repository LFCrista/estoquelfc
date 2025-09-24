import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { search } = Object.fromEntries(new URL(req.url).searchParams);

  let query = supabase
    .from("distribuidores")
    .select("id, nome")
    .order("nome", { ascending: true });

  if (search) {
    query = query.ilike("nome", `%${search}%`);
  }

  const { data: distribuidores, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ distribuidores });
}

export async function POST(req: Request) {
  const { nome } = await req.json();

  const { data, error } = await supabase
    .from("distribuidores")
    .insert({ nome })
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ distribuidor: data });
}

export async function PATCH(req: Request) {
  const { id, nome } = await req.json();

  const { error } = await supabase
    .from("distribuidores")
    .update({ nome })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: "Distribuidor atualizado com sucesso" });
}