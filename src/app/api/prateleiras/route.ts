export async function POST(req: Request) {
	const { nome } = await req.json();
	const { error } = await supabase
		.from("prateleiras")
		.insert([{ nome }]);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ message: "Prateleira cadastrada com sucesso" });
}

export async function PATCH(req: Request) {
	const { id, nome } = await req.json();
	const { error } = await supabase
		.from("prateleiras")
		.update({ nome })
		.eq("id", id);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ message: "Prateleira atualizada com sucesso" });
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
	const { searchParams } = new URL(req.url);
	const page = parseInt(searchParams.get("page") || "1", 10);
	const limit = parseInt(searchParams.get("limit") || "100", 10);
	const from = (page - 1) * limit;
	const to = from + limit - 1;

	const search = searchParams.get("search")?.trim() || "";
	const searchField = searchParams.get("searchField") || "nome";

	let query = supabase
		.from("prateleiras")
		.select("id, nome", { count: "exact" })
		.order("nome", { ascending: true });

	if (search) {
		if (["nome"].includes(searchField)) {
			query = query.ilike(searchField, `%${search}%`);
		}
	}

	query = query.range(from, to);

	const { data, error, count } = await query;

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ prateleiras: data, total: count });
}
