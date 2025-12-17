import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Adicionar item ao romaneio
export async function POST(req: Request) {
	try {
		const { romaneio_id, produto_id, prateleira_id, quantidade } = await req.json();

		if (!romaneio_id || !produto_id || !prateleira_id || !quantidade) {
			return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
		}

		const { data, error } = await supabase
			.from("romaneio_items")
			.insert([{ romaneio_id, produto_id, prateleira_id, quantidade }])
			.select()
			.single();

		if (error) {
			console.error("Erro ao adicionar item ao romaneio:", error);
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ message: "Item adicionado com sucesso", item: data });
	} catch (err) {
		console.error("Erro inesperado no POST /api/picking/item:", err);
		return NextResponse.json({ error: "Erro interno" }, { status: 500 });
	}
}

// PATCH - Atualizar quantidade do item
export async function PATCH(req: Request) {
	try {
		const { romaneio_id, produto_id, prateleira_id, quantidade } = await req.json();

		if (!romaneio_id || !produto_id || !prateleira_id || quantidade === undefined) {
			return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
		}

		const { error } = await supabase
			.from("romaneio_items")
			.update({ quantidade })
			.eq("romaneio_id", romaneio_id)
			.eq("produto_id", produto_id)
			.eq("prateleira_id", prateleira_id);

		if (error) {
			console.error("Erro ao atualizar item do romaneio:", error);
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ message: "Item atualizado com sucesso" });
	} catch (err) {
		console.error("Erro inesperado no PATCH /api/picking/item:", err);
		return NextResponse.json({ error: "Erro interno" }, { status: 500 });
	}
}

// DELETE - Remover item do romaneio
export async function DELETE(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const romaneio_id = searchParams.get("romaneio_id");
		const produto_id = searchParams.get("produto_id");
		const prateleira_id = searchParams.get("prateleira_id");

		if (!romaneio_id || !produto_id || !prateleira_id) {
			return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
		}

		const { error } = await supabase
			.from("romaneio_items")
			.delete()
			.eq("romaneio_id", romaneio_id)
			.eq("produto_id", produto_id)
			.eq("prateleira_id", prateleira_id);

		if (error) {
			console.error("Erro ao remover item do romaneio:", error);
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ message: "Item removido com sucesso" });
	} catch (err) {
		console.error("Erro inesperado no DELETE /api/picking/item:", err);
		return NextResponse.json({ error: "Erro interno" }, { status: 500 });
	}
}
