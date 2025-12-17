import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params;

		const { data, error } = await supabase
			.from("romaneios")
			.select("*, romaneio_items(*, produtos(nome, SKU, codBarras, quantidade_caixa), prateleiras(nome))")
			.eq("id", id)
			.single();

		if (error) {
			console.error("Erro ao buscar romaneio:", error);
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ romaneio: data });
	} catch (err) {
		console.error("Erro inesperado no GET /api/picking/[id]:", err);
		return NextResponse.json({ error: "Erro interno" }, { status: 500 });
	}
}
