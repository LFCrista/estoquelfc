import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Formato inválido. Envie um arquivo CSV." }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const csvText = Buffer.from(arrayBuffer).toString("utf-8");

    let records;
    try {
      records = parse(csvText, {
        columns: header => header.map((h: string) => h.trim().toLowerCase().replace(/\s+/g, "")),
        skip_empty_lines: true,
        delimiter: csvText.includes(';') ? ';' : ',',
        trim: true
      });
    } catch (err) {
      return NextResponse.json({ error: "Erro ao ler o CSV: " + (err as Error).message }, { status: 400 });
    }

    const estoqueToInsert = [];
    for (const rRaw of records) {
      const r = rRaw as { sku?: string; distribuidor?: string; quantidade?: string | number };
      // Busca produto pelo SKU
      let produtoId = null;
      if (r.sku) {
        const { data: produto } = await supabase
          .from("produtos")
          .select("id")
          .eq("SKU", r.sku)
          .single();
        produtoId = produto?.id || null;
      }
      if (!produtoId) continue; // pula se não achou produto

      // Busca distribuidor pelo nome
      let distribuidorId = 3; // padrão
      if (r.distribuidor) {
        const { data: dist } = await supabase
          .from("distribuidores")
          .select("id")
          .ilike("nome", r.distribuidor)
          .single();
        if (dist?.id) distribuidorId = dist.id;
      }

      estoqueToInsert.push({
        produto_id: produtoId,
        prateleira_id: 825,
        distribuidor_id: distribuidorId,
        quantidade: Number(r.quantidade || 0)
      });
    }

    if (estoqueToInsert.length === 0) {
      return NextResponse.json({ error: "Nenhum item válido para importar." }, { status: 400 });
    }

    const { error } = await supabase
      .from("estoque")
      .insert(estoqueToInsert);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: `Importação concluída. ${estoqueToInsert.length} itens importados.` });
  } catch (err: unknown) {
    let message = "Erro desconhecido.";
    if (err instanceof Error) message = err.message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
