import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
	try {
		const { produto_id, prateleira_id, quantidade } = await req.json();
		console.log("POST /api/estoque", { produto_id, prateleira_id, quantidade });
		// Verifica se já existe estoque para o mesmo produto e prateleira
		const { data: existing, error: findError } = await supabase
			.from("estoque")
			.select("id, quantidade")
			.eq("produto_id", produto_id)
			.eq("prateleira_id", prateleira_id)
			.maybeSingle();

		if (findError) {
			console.error("Erro ao buscar estoque existente:", findError);
			return NextResponse.json({ error: findError.message }, { status: 400 });
		}

		if (existing) {
			// Atualiza a quantidade somando
			const { error: updateError } = await supabase
				.from("estoque")
				.update({ quantidade: existing.quantidade + quantidade })
				.eq("id", existing.id);
			if (updateError) {
				console.error("Erro ao atualizar estoque:", updateError);
				return NextResponse.json({ error: updateError.message }, { status: 400 });
			}
			console.log("Estoque atualizado com sucesso");
			return NextResponse.json({ message: "Estoque atualizado com sucesso", estoqueId: existing.id });
		} else {
			// Cria novo item
			const { data: newEstoque, error } = await supabase
				.from("estoque")
				.insert([{ produto_id, prateleira_id, quantidade }])
				.select("id")
				.single();
			if (error) {
				console.error("Erro ao criar novo estoque:", error);
				return NextResponse.json({ error: error.message }, { status: 400 });
			}
			console.log("Estoque cadastrado com sucesso");
			return NextResponse.json({ message: "Estoque cadastrado com sucesso", estoqueId: newEstoque.id });
		}
	} catch (err) {
		console.error("Erro inesperado no POST /api/estoque:", err);
		return NextResponse.json({ error: "Erro interno" }, { status: 500 });
	}
}

export async function PATCH(req: Request) {
	try {
		const { id, produto_id, prateleira_id, tipo, quantidade } = await req.json();
		console.log("PATCH /api/estoque", { id, produto_id, prateleira_id, tipo, quantidade });

		// Se for movimentação de estoque (adicionar/retirar)
		if (tipo && quantidade !== undefined && produto_id && prateleira_id) {
			// Busca o estoque atual
			const { data: estoque, error: findError } = await supabase
				.from("estoque")
				.select("id, quantidade")
				.eq("produto_id", produto_id)
				.eq("prateleira_id", prateleira_id)
				.maybeSingle();

			if (findError) {
				console.error("Erro ao buscar estoque para movimentação:", findError);
				return NextResponse.json({ error: findError.message }, { status: 400 });
			}
			if (!estoque) {
				if (tipo === "adicionar") {
					// Cria novo estoque
					const { error } = await supabase
						.from("estoque")
						.insert([{ produto_id, prateleira_id, quantidade }]);
					if (error) {
						console.error("Erro ao criar novo estoque na movimentação:", error);
						return NextResponse.json({ error: error.message }, { status: 400 });
					}
					console.log("Estoque criado com sucesso na movimentação");
					return NextResponse.json({ message: "Estoque criado com sucesso" });
				} else {
					console.warn("Tentativa de retirar estoque inexistente");
					return NextResponse.json({ error: "Não há estoque para retirar" }, { status: 400 });
				}
			}

			let novaQuantidade = estoque.quantidade;
			if (tipo === "adicionar") {
				novaQuantidade += quantidade;
			} else if (tipo === "retirar") {
				if (quantidade > estoque.quantidade) {
					console.warn("Quantidade a retirar maior que o estoque disponível", { quantidade, estoque: estoque.quantidade });
					return NextResponse.json({ error: "Quantidade a retirar maior que o estoque disponível" }, { status: 400 });
				}
				novaQuantidade -= quantidade;
			}

			const { error: updateError } = await supabase
				.from("estoque")
				.update({ quantidade: novaQuantidade })
				.eq("id", estoque.id);
			if (updateError) {
				console.error("Erro ao atualizar estoque na movimentação:", updateError);
				return NextResponse.json({ error: updateError.message }, { status: 400 });
			}
			console.log("Movimentação realizada com sucesso");
			return NextResponse.json({ message: "Movimentação realizada com sucesso" });
		}

		// Caso contrário, apenas edita produto/prateleira
		if (id && (produto_id || prateleira_id)) {
			const updateData: Record<string, string | number> = {};
			if (produto_id) updateData.produto_id = produto_id;
			if (prateleira_id) updateData.prateleira_id = prateleira_id;
			const { error } = await supabase
				.from("estoque")
				.update(updateData)
				.eq("id", id);
			if (error) {
				console.error("Erro ao atualizar produto/prateleira:", error);
				return NextResponse.json({ error: error.message }, { status: 400 });
			}
			console.log("Estoque atualizado com sucesso (produto/prateleira)");
			return NextResponse.json({ message: "Estoque atualizado com sucesso" });
		}

		console.warn("Requisição inválida no PATCH /api/estoque");
		return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
	} catch (err) {
		console.error("Erro inesperado no PATCH /api/estoque:", err);
		return NextResponse.json({ error: "Erro interno" }, { status: 500 });
	}
}

export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const page = parseInt(searchParams.get("page") || "1", 10);
		const limit = parseInt(searchParams.get("limit") || "100", 10);
		const from = (page - 1) * limit;
		const to = from + limit - 1;

		// Filtros opcionais
		const search = searchParams.get("search")?.trim() || "";
		const searchField = searchParams.get("searchField") || "produto_id";

		let query = supabase
			.from("estoque")
			.select("id, produto_id, quantidade, prateleira_id, produto:produto_id(nome), prateleira:prateleira_id(nome)", { count: "exact" })
			.order("id", { ascending: true });

		if (search) {
			if (["produto_id", "prateleira_id"].includes(searchField)) {
				// Busca exata para campos numéricos
				query = query.eq(searchField, isNaN(Number(search)) ? search : Number(search));
			} else {
				// Busca textual para outros campos
				query = query.ilike(searchField, `%${search}%`);
			}
		}

		query = query.range(from, to);

		const { data, error, count } = await query;

		if (error) {
			console.error("Erro ao buscar estoque (GET):", error);
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		console.log("GET /api/estoque", { total: count, dataLength: data?.length });
		return NextResponse.json({ estoque: data, total: count });
	} catch (err) {
		console.error("Erro inesperado no GET /api/estoque:", err);
		return NextResponse.json({ error: "Erro interno" }, { status: 500 });
	}
}
