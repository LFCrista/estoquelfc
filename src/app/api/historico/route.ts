import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { user_id, entidade, entidade_id, acao, quantidade } = await req.json();

    // Validação básica
    if (!user_id || !entidade || !entidade_id || !acao) {
      return NextResponse.json({ error: "Campos obrigatórios estão faltando." }, { status: 400 });
    }

    // Inserir no histórico
    const { error } = await supabase
      .from("historico")
      .insert([{ user_id, entidade, entidade_id, acao, quantidade }]);

    if (error) {
      console.error("Erro ao inserir no histórico:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Histórico registrado com sucesso." });
  } catch (err) {
    console.error("Erro inesperado no POST /api/historico:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const date = searchParams.get("startDate") || "";
    const userId = searchParams.get("user_id") || "";
    const entidade = searchParams.get("entidade") || "";
    const acao = searchParams.get("acao") || "";

    let query = supabase
      .from("historico")
      .select("id, user_id, entidade, entidade_id, acao, quantidade, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00`).toISOString();
      const endOfDay = new Date(`${date}T23:59:59`).toISOString();
      query = query.gte("created_at", startOfDay).lte("created_at", endOfDay); // Ajusta para considerar o fuso horário corretamente
    }

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (entidade) {
      query = query.eq("entidade", entidade);
    }

    if (acao) {
      query = query.eq("acao", acao);
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Erro ao buscar histórico:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Buscar dados adicionais para cada entidade
    const historicoComDetalhes = await Promise.all(
      data.map(async (item) => {
        let quem = "";
        let atualizacao = "";

        // Buscar nome do usuário (Quem)
        const { data: userData } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", item.user_id)
          .single();
        quem = userData?.name || "";

        // Buscar detalhes da atualização
        if (item.entidade === "user") {
          const { data: userDetail } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", item.entidade_id)
            .single();
          atualizacao = userDetail?.name || "";
        } else if (item.entidade === "produto") {
          const { data: produtoData } = await supabase
            .from("produtos")
            .select("nome")
            .eq("id", item.entidade_id)
            .single();
          atualizacao = produtoData?.nome || "";
        } else if (item.entidade === "prateleira") {
          const { data: prateleiraData } = await supabase
            .from("prateleiras")
            .select("nome")
            .eq("id", item.entidade_id)
            .single();
          atualizacao = prateleiraData?.nome || "";
        } else if (item.entidade === "estoque") {
          const { data: estoqueData } = await supabase
            .from("estoque")
            .select("produto_id, prateleira_id")
            .eq("id", item.entidade_id)
            .single();

          if (estoqueData) {
            const { data: produtoData } = await supabase
              .from("produtos")
              .select("nome")
              .eq("id", estoqueData.produto_id)
              .single();

            const { data: prateleiraData } = await supabase
              .from("prateleiras")
              .select("nome")
              .eq("id", estoqueData.prateleira_id)
              .single();

            atualizacao = `${produtoData?.nome || ""} - ${prateleiraData?.nome || ""}`;
          }
        }

        return {
          ...item,
          quem,
          atualizacao,
        };
      })
    );

    return NextResponse.json({ historico: historicoComDetalhes, total: count });
  } catch (err) {
    console.error("Erro inesperado no GET /api/historico:", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}