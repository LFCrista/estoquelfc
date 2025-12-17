import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar romaneios
export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get("page") || "1");
		const perPage = 50;
		const from = (page - 1) * perPage;
		const to = from + perPage - 1;
		const status = searchParams.get("status");

		let query = supabase
			.from("romaneios")
			.select("*, romaneio_items(*, produtos(nome, SKU, codBarras), prateleiras(nome))", { count: "exact" })
			.order("created_at", { ascending: false });

		// Filtrar por status se fornecido (pode ser múltiplos separados por vírgula)
		if (status) {
			const statusList = status.split(",");
			if (statusList.length === 1) {
				query = query.eq("status", statusList[0]);
			} else {
				query = query.in("status", statusList);
			}
		}

		const { data, error, count } = await query.range(from, to);

		if (error) {
			console.error("Erro ao buscar romaneios:", error);
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ data, total: count || 0 });
	} catch (err) {
		console.error("Erro inesperado no GET /api/picking:", err);
		return NextResponse.json({ error: "Erro interno" }, { status: 500 });
	}
}

// POST - Criar novo romaneio
export async function POST(req: Request) {
	try {
		const { numero, descricao } = await req.json();
		
		if (!numero) {
			return NextResponse.json({ error: "Número do romaneio é obrigatório" }, { status: 400 });
		}

		const { data: romaneio, error: romaneioError } = await supabase
			.from("romaneios")
			.insert([{ numero, descricao: descricao || "", status: "pendente" }])
			.select("id, numero, descricao, status, created_at, updated_at")
			.single();

		if (romaneioError || !romaneio) {
			console.error("Erro ao criar romaneio:", romaneioError);
			return NextResponse.json({ error: romaneioError?.message || "Erro ao criar romaneio" }, { status: 400 });
		}

		return NextResponse.json({ 
			message: "Romaneio criado com sucesso", 
			romaneio: { ...romaneio, romaneio_items: [] }
		});
	} catch (err) {
		console.error("Erro inesperado no POST /api/picking:", err);
		return NextResponse.json({ error: "Erro interno" }, { status: 500 });
	}
}

// PATCH - Atualizar status do romaneio
export async function PATCH(req: Request) {
	try {
		const { id, status } = await req.json();

		if (!id || !status) {
			return NextResponse.json({ error: "ID e status são obrigatórios" }, { status: 400 });
		}

		const { error } = await supabase
			.from("romaneios")
			.update({ status, updated_at: new Date().toISOString() })
			.eq("id", id);

		if (error) {
			console.error("Erro ao atualizar romaneio:", error);
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ message: "Romaneio atualizado com sucesso" });
	} catch (err) {
		console.error("Erro inesperado no PATCH /api/picking:", err);
		return NextResponse.json({ error: "Erro interno" }, { status: 500 });
	}
}

// DELETE - Deletar romaneio
export async function DELETE(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json({ error: "ID é obrigatório" }, { status: 400 });
		}

		// Deletar itens do romaneio primeiro (cascade deve fazer isso automaticamente, mas por segurança)
		await supabase.from("romaneio_items").delete().eq("romaneio_id", id);

		// Deletar o romaneio
		const { error } = await supabase
			.from("romaneios")
			.delete()
			.eq("id", id);

		if (error) {
			console.error("Erro ao deletar romaneio:", error);
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json({ message: "Romaneio deletado com sucesso" });
	} catch (err) {
		console.error("Erro inesperado no DELETE /api/picking:", err);
		return NextResponse.json({ error: "Erro interno" }, { status: 500 });
	}
}
