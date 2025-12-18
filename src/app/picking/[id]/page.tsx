"use client";
import React, { useCallback, useEffect, useState, useRef } from "react";
import { Sidebar } from "../../../components/sidebar";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { useParams, useRouter } from "next/navigation";
import { Barcode, Trash2, FileText, CheckCircle, ArrowLeft, ChevronUp, ChevronDown } from "lucide-react";

interface ItemPicking {
  produto_id: string;
  prateleira_id: string;
  produto_nome: string;
  produto_sku: string;
  prateleira_nome: string;
  quantidade: number; // boxes
  quantidade_caixa?: number; // units per box
}

interface RomaneioItem {
  produto_id: string;
  prateleira_id: string;
  quantidade: number;
  produtos?: { nome?: string; SKU?: string; quantidade_caixa?: number };
  prateleiras?: { nome?: string };
}

interface Romaneio {
  id: string;
  numero?: string;
  descricao?: string;
  romaneio_items?: RomaneioItem[];
}

interface StockEntry {
  produto_id: string;
  prateleira_id: string;
  prateleira?: { nome?: string; id?: string };
  prateleira_nome?: string;
  quantidade?: number;
  produto?: { nome?: string; SKU?: string; quantidade_caixa?: number };
  distribuidor_id?: number | string;
}

interface Allocation {
  prateleira_id: string;
  prateleira_nome: string;
  boxes: number;
  units: number;
  insufficient?: boolean;
  distribuidor_id?: number | string;
}

interface RotaOtimizadaItem {
  produto_id: string;
  produto_nome: string;
  produto_sku: string;
  boxes: number;
  units: number;
  insufficient?: boolean;
}

export default function RomaneioPage() {
  const params = useParams() as { id?: string };
  const id = params?.id;
  const router = useRouter();

  const [romaneio, setRomaneio] = useState<Romaneio | null>(null);
  const [items, setItems] = useState<ItemPicking[]>([]);
  const itemsRef = useRef<ItemPicking[]>(items);
  const [codBarras, setCodBarras] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRomaneio, setShowRomaneio] = useState(false);
  const [rotaOtimizada, setRotaOtimizada] = useState<Array<{ prateleira: string; items: RotaOtimizadaItem[] }>>([]);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [insufficientWarnings, setInsufficientWarnings] = useState<string[]>([]);
  const [allocationsMap, setAllocationsMap] = useState<Record<string, Allocation[]>>({});

  const inputRef = useRef<HTMLInputElement>(null);
  const computingRef = useRef(false);
  // removed unused isSyncingRef

  function scheduleFocus() {
    try {
      const doFocus = () => {
        try { (document.activeElement as HTMLElement | null)?.blur(); } catch { /* ignore */ }
        try { inputRef.current?.focus(); inputRef.current?.select(); } catch { /* ignore */ }
      };
      if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(doFocus);
      else setTimeout(doFocus, 50);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // comparator implementing rules: A asc, B desc, C asc, D desc. Use scan order as tie-breaker, then quantity
  const makeShelfComparator = useCallback((scanOrder: string[]) => {
    const groupOrder: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
    const scanIndex = (id: string) => {
      const idx = scanOrder.indexOf(id);
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };
    return (a: StockEntry | { prateleira_nome?: string; prateleira_id?: string; quantidade?: number }, b: StockEntry | { prateleira_nome?: string; prateleira_id?: string; quantidade?: number }) => {
      const nameA = ("prateleira" in a ? (a.prateleira?.nome || a.prateleira_nome || '') : (a.prateleira_nome || '')).toString();
      const nameB = ("prateleira" in b ? (b.prateleira?.nome || b.prateleira_nome || '') : (b.prateleira_nome || '')).toString();
      const parsedA = parseShelfName(nameA);
      const parsedB = parseShelfName(nameB);
      const orderA = groupOrder[parsedA.group] ?? 99;
      const orderB = groupOrder[parsedB.group] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      const asc = parsedA.group === 'A' || parsedA.group === 'C';
      if (parsedA.num !== parsedB.num) return asc ? parsedA.num - parsedB.num : parsedB.num - parsedA.num;
      const pa = scanIndex(a.prateleira_id || ("prateleira" in a ? a.prateleira?.id || '' : ''));
      const pb = scanIndex(b.prateleira_id || ("prateleira" in b ? b.prateleira?.id || '' : ''));
      if (pa !== pb) return pa - pb;
      return (b.quantidade || 0) - (a.quantidade || 0);
    };
  }, []);

  // Generate romaneio allocations (same logic used earlier)
  const computeAllocations = useCallback(async (currentItems?: ItemPicking[]) => {
    const itemsToUse = currentItems || itemsRef.current;
    if (!itemsToUse || itemsToUse.length === 0) {
      setRotaOtimizada([]);
      setInsufficientWarnings([]);
      return;
    }

    if (computingRef.current) return; // avoid concurrent computations
    computingRef.current = true;
    setLoading(true);
    try {
      const byProduct: Record<string, { boxes: number; produto_nome: string; produto_sku: string; quantidade_caixa: number }> = {};
      for (const it of itemsToUse) {
        if (!byProduct[it.produto_id]) byProduct[it.produto_id] = { boxes: 0, produto_nome: it.produto_nome, produto_sku: it.produto_sku, quantidade_caixa: it.quantidade_caixa || 1 };
        byProduct[it.produto_id].boxes += it.quantidade;
      }

      const prateleiraPriority = Array.from(new Set(itemsToUse.map(i => i.prateleira_id)));
      const shelfComparator = makeShelfComparator(prateleiraPriority);

      const rotaMap: Record<string, { prateleira_nome: string; items: RotaOtimizadaItem[] }> = {};
      const warnings: string[] = [];

      // fetch estoque for all products in parallel
      const produtoIds = Object.keys(byProduct);
      const entriesResults = await Promise.all(produtoIds.map((produtoId) => {
        const params = new URLSearchParams({ searchField: "produto_id", search: String(produtoId), page: "1", limit: "100" });
        return fetch(`/api/estoque?${params.toString()}`).then(r => r.json()).catch(() => ({ estoque: [] }));
      }));

      for (let i = 0; i < produtoIds.length; i++) {
        const produtoId = produtoIds[i];
        const info = byProduct[produtoId];
        const boxesNeeded = info.boxes;
        const unitsNeeded = boxesNeeded * (info.quantidade_caixa || 1);

        const data: { estoque?: StockEntry[] } = entriesResults[i] || { estoque: [] };
        const entries: StockEntry[] = data.estoque || [];

        const totalAvailable = entries.reduce((s: number, e: StockEntry) => s + (e.quantidade || 0), 0);

        const allocations: Array<{ prateleira_id: string; prateleira_nome: string; units: number; distribuidor_id?: number | string }> = [];

        if (totalAvailable >= unitsNeeded) {
          const candidatesSingle = entries.filter((e: StockEntry) => (e.quantidade || 0) >= unitsNeeded)
            .sort(shelfComparator);
          const single = candidatesSingle[0];
          if (single) {
            allocations.push({ prateleira_id: single.prateleira_id, prateleira_nome: single.prateleira?.nome || single.prateleira_nome || "Sem prateleira", units: unitsNeeded, distribuidor_id: single.distribuidor_id });
          } else {
            const sorted = [...entries].sort(shelfComparator);
            let remain = unitsNeeded;
            for (const e of sorted) {
              if (remain <= 0) break;
              const take = Math.min(remain, e.quantidade || 0);
              if (take > 0) allocations.push({ prateleira_id: e.prateleira_id, prateleira_nome: e.prateleira?.nome || e.prateleira_nome || "Sem prateleira", units: take, distribuidor_id: e.distribuidor_id });
              remain -= take;
            }
          }
        } else {
          warnings.push(info.produto_nome + " (falta " + (unitsNeeded - totalAvailable) + " unidades)");
          const sorted = [...entries].sort(shelfComparator);
          let remain = totalAvailable;
          for (const e of sorted) {
            if (remain <= 0) break;
            const take = Math.min(remain, e.quantidade || 0);
            if (take > 0) allocations.push({ prateleira_id: e.prateleira_id, prateleira_nome: e.prateleira?.nome || e.prateleira_nome || "Sem prateleira", units: take, distribuidor_id: e.distribuidor_id });
            remain -= take;
          }
        }

        for (const a of allocations) {
          const boxesFromShelf = Math.ceil(a.units / (info.quantidade_caixa || 1));
          if (!rotaMap[a.prateleira_id]) rotaMap[a.prateleira_id] = { prateleira_nome: a.prateleira_nome, items: [] };
          rotaMap[a.prateleira_id].items.push({ produto_id: produtoId, produto_nome: info.produto_nome, produto_sku: info.produto_sku, boxes: boxesFromShelf, units: a.units, insufficient: totalAvailable < unitsNeeded });
        }
      }

      const rotas = Object.keys(rotaMap).map((pid) => ({ prateleira: rotaMap[pid].prateleira_nome || pid, items: rotaMap[pid].items }));
      // sort rotas according to shelf rules A asc, B desc, C asc, D desc
      function parseShelfNameLocal(name?: string) {
        if (!name) return { group: '', num: 0 };
        const trimmed = name.trim().toUpperCase();
        const match = trimmed.match(/^([A-Z])(\d+)?/);
        if (!match) return { group: '', num: 0 };
        return { group: match[1], num: match[2] ? parseInt(match[2], 10) : 0 };
      }
      const groupOrder: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
      rotas.sort((a, b) => {
        const pa = parseShelfNameLocal(a.prateleira);
        const pb = parseShelfNameLocal(b.prateleira);
        const oa = groupOrder[pa.group] ?? 99;
        const ob = groupOrder[pb.group] ?? 99;
        if (oa !== ob) return oa - ob;
        const asc = pa.group === 'A' || pa.group === 'C';
        if (pa.num !== pb.num) return asc ? pa.num - pb.num : pb.num - pa.num;
        return a.prateleira.localeCompare(b.prateleira);
      });

      if (rotas.length === 0) {
        setRotaOtimizada(otimizarRota(itemsToUse));
      } else {
        setRotaOtimizada(rotas);
      }

      const allocationsByProd: Record<string, Allocation[]> = {};
      for (const prId of Object.keys(rotaMap)) {
        const pr = rotaMap[prId];
        for (const it of pr.items) {
          const prodId = it.produto_id;
          if (!allocationsByProd[prodId]) allocationsByProd[prodId] = [];
          // try to find distribuidor from entriesResults
          const allocFromEntries = entriesResults.flatMap((r: { estoque?: StockEntry[] }) => r.estoque || []).find((e: StockEntry) => String(e.produto_id) === String(prodId) && String(e.prateleira_id) === String(prId));
          allocationsByProd[prodId].push({ prateleira_id: prId, prateleira_nome: pr.prateleira_nome, boxes: it.boxes, units: it.units, insufficient: !!it.insufficient, distribuidor_id: allocFromEntries ? allocFromEntries.distribuidor_id : undefined });
        }
      }

      setAllocationsMap(allocationsByProd);

      setRotaOtimizada(rotas.length === 0 ? otimizarRota(itemsToUse) : rotas);

      if (warnings.length > 0) {
        // dedupe warnings
        const uniqueWarnings = Array.from(new Set(warnings));
        setInsufficientWarnings(uniqueWarnings);
        setShowInsufficientModal(true);
      } else {
        setInsufficientWarnings([]);
        setShowInsufficientModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      computingRef.current = false;
    }
  }, [makeShelfComparator]);

  const carregarRomaneio = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/picking/${id}`);
      const data = await res.json();
      setRomaneio(data.romaneio || null);
      if (data.romaneio?.romaneio_items) {
        const loaded = (data.romaneio.romaneio_items as RomaneioItem[]).map((item) => ({
          produto_id: item.produto_id,
          prateleira_id: item.prateleira_id,
          produto_nome: item.produtos?.nome || "Sem nome",
          produto_sku: item.produtos?.SKU || "",
          prateleira_nome: item.prateleiras?.nome || "Sem prateleira",
          quantidade: item.quantidade,
          quantidade_caixa: item.produtos?.quantidade_caixa || 1,
        }));
        setItems(loaded);
        // compute allocations/validation immediately after loading
        await computeAllocations(loaded);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, computeAllocations]);

  useEffect(() => {
    if (!id) return;
    void carregarRomaneio();
  }, [id, carregarRomaneio]);

  // Add / increment item by scanning
  async function handleScan() {
    if (!codBarras.trim() || !romaneio) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/estoque?searchField=produto.codBarras&search=${encodeURIComponent(codBarras.trim())}&page=1&limit=1`
      );
      if (!res.ok) {
        alert("Erro ao buscar produto");
        return;
      }
      const data = await res.json();
      if (!data.estoque || data.estoque.length === 0) {
        alert("Produto não encontrado");
        setCodBarras("");
        inputRef.current?.focus();
        return;
      }
      const estoque = data.estoque[0];

      const existingIndex = items.findIndex(
        (it) => it.produto_id === estoque.produto_id && it.prateleira_id === estoque.prateleira_id
      );

      if (existingIndex >= 0) {
        const novaQuantidade = items[existingIndex].quantidade + 1;
        const updateRes = await fetch("/api/picking/item", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ romaneio_id: romaneio.id, produto_id: estoque.produto_id, prateleira_id: estoque.prateleira_id, quantidade: novaQuantidade }),
        });
        if (!updateRes.ok) {
          alert("Erro ao atualizar item");
          return;
        }
        const updated = [...items];
        updated[existingIndex].quantidade = novaQuantidade;
        setItems(updated);
        // recompute allocations immediately
        await computeAllocations(updated);
      } else {
        const addRes = await fetch("/api/picking/item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ romaneio_id: romaneio.id, produto_id: estoque.produto_id, prateleira_id: estoque.prateleira_id, quantidade: 1 }),
        });
        if (!addRes.ok) {
          alert("Erro ao adicionar item");
          return;
        }
        const novoItem: ItemPicking = {
          produto_id: estoque.produto_id,
          prateleira_id: estoque.prateleira_id,
          produto_nome: estoque.produto?.nome || "Sem nome",
          produto_sku: estoque.produto?.SKU || "",
          prateleira_nome: estoque.prateleira?.nome || "Sem prateleira",
          quantidade: 1,
          quantidade_caixa: estoque.produto?.quantidade_caixa || 1,
        };
        setItems((s) => [...s, novoItem]);
        // recompute allocations immediately
        await computeAllocations([...items, novoItem]);
      }

      setCodBarras("");
    } catch (err) {
      console.error(err);
      alert("Erro ao buscar produto");
    } finally {
      setLoading(false);
      try {
        const doFocus = () => {
          try { (document.activeElement as HTMLElement | null)?.blur(); } catch { /* ignore */ }
          try { inputRef.current?.focus(); inputRef.current?.select(); } catch { /* ignore */ }
        };
        if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(doFocus);
        else setTimeout(doFocus, 50);
      } catch { /* ignore */ }
    }
  }

  // Remove item
  async function handleRemoveItem(index: number) {
    if (!romaneio) return;
    const item = items[index];
    try {
      const res = await fetch(`/api/picking/item?romaneio_id=${romaneio.id}&produto_id=${item.produto_id}&prateleira_id=${item.prateleira_id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Erro ao remover item");
        return;
      }
      setItems(items.filter((_, i) => i !== index));
      // recompute allocations after removal
      await computeAllocations(items.filter((_, i) => i !== index));
    } catch (err) {
      console.error(err);
      alert("Erro ao remover item");
    }
  }

  async function handleQuantityChange(index: number, newQty: number) {
    if (!romaneio) return;
    const item = items[index];
    if (!item) return;
    const qty = Math.max(1, Math.floor(newQty));
    // optimistic update
    const updated = [...items];
    updated[index] = { ...updated[index], quantidade: qty };
    setItems(updated);
    // persist change
    try {
      const res = await fetch("/api/picking/item", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ romaneio_id: romaneio.id, produto_id: item.produto_id, prateleira_id: item.prateleira_id, quantidade: qty }),
      });
      if (!res.ok) {
        console.error("Erro ao atualizar quantidade");
      }
    } catch (err) {
      console.error(err);
    }
    // recompute allocations after change
    await computeAllocations(updated);
  }

  function otimizarRota(items: ItemPicking[]) {
    const grouped = items.reduce<Record<string, { prateleira: string; items: RotaOtimizadaItem[] }>>((acc, item) => {
      const key = item.prateleira_id;
      if (!acc[key]) acc[key] = { prateleira: item.prateleira_nome, items: [] };
      acc[key].items.push({ produto_id: item.produto_id, produto_nome: item.produto_nome, produto_sku: item.produto_sku, boxes: item.quantidade, units: item.quantidade * (item.quantidade_caixa || 1) });
      return acc;
    }, {});
    return Object.values(grouped) as Array<{ prateleira: string; items: RotaOtimizadaItem[] }>;
  }

  // removed unused formatPrateleiraName

  // parse shelf name like "A40" -> { group: 'A', num: 40 }
  function parseShelfName(name?: string) {
    if (!name) return { group: '', num: 0 };
    const trimmed = name.trim().toUpperCase();
    const match = trimmed.match(/^([A-Z])(\d+)?/);
    if (!match) return { group: '', num: 0 };
    return { group: match[1], num: match[2] ? parseInt(match[2], 10) : 0 };
  }
  
  
  // Trigger allocation recomputation and open romaneio view
  async function handleGerarRomaneio() {
    await computeAllocations();
    setShowRomaneio(true);
  }

  async function handleFinalizarRomaneio() {
    if (items.length === 0 || !romaneio) {
      alert("Nenhum item para finalizar");
      return;
    }
    setLoading(true);
    try {
      // Retirar itens do estoque conforme allocationsMap
      for (const prodId of Object.keys(allocationsMap)) {
        const alList = allocationsMap[prodId] || [];
        for (const alloc of alList) {
          try {
            const body: { produto_id: string; prateleira_id: string; tipo: string; quantidade: number; distribuidor_id?: number | string } = { produto_id: prodId, prateleira_id: alloc.prateleira_id, tipo: 'retirar', quantidade: alloc.units };
            if (alloc.distribuidor_id) {
              body.distribuidor_id = alloc.distribuidor_id;
            } else {
              // try to find distribuidor_id from estoque
              const r = await fetch(`/api/estoque?searchField=produto_id&search=${encodeURIComponent(String(prodId))}&page=1&limit=100`);
              if (r.ok) {
                const d = await r.json();
                const found = (d.estoque || []).find((e: StockEntry) => String(e.prateleira_id) === String(alloc.prateleira_id));
                if (found) body.distribuidor_id = found.distribuidor_id;
              }
            }

            if (!body.distribuidor_id) {
              console.warn('Distribuidor não encontrado para retirada', prodId, alloc.prateleira_id);
              continue;
            }

            const r2 = await fetch('/api/estoque', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!r2.ok) {
              console.warn('Falha ao retirar estoque para', prodId, alloc.prateleira_id, await r2.text());
            }
          } catch (err) {
            console.error('Erro ao processar retirada de estoque', err);
          }
        }
      }
      const res = await fetch("/api/picking", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: romaneio.id, status: "concluido" }) });
      if (!res.ok) {
        const err = await res.json();
        alert("Erro ao finalizar romaneio: " + (err.error || "Erro desconhecido"));
        return;
      }
      alert("Romaneio finalizado com sucesso!");
      router.push('/picking');
    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar romaneio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Romaneio: {romaneio?.numero}</h1>
              {romaneio?.descricao && <p className="text-sm text-gray-600">{romaneio.descricao}</p>}
            </div>
            <div>
              <Button variant="ghost" onClick={() => router.push('/picking')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Barcode className="w-5 h-5" /> Bipar Produtos</h2>
            <div className="flex gap-2">
              <Input ref={inputRef} type="text" placeholder="Código de barras..." value={codBarras} onChange={(e) => setCodBarras(e.target.value)} onKeyDown={async (e) => { if (e.key === 'Enter') { e.preventDefault(); await handleScan(); scheduleFocus(); } }} className="flex-1" disabled={loading} />
              <Button onMouseDown={(e) => e.preventDefault()} onClick={async () => { await handleScan(); scheduleFocus(); }} disabled={loading || !codBarras.trim()}>{loading ? 'Buscando...' : 'Adicionar'}</Button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Itens ({items.length})</h2>
            {items.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum item adicionado. Bipe um produto para começar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">SKU</th>
                      <th className="text-left py-2 px-2">Produto</th>
                      <th className="text-left py-2 px-2">Prateleira</th>
                      <th className="text-center py-2 px-2">Quantidade</th>
                      <th className="text-center py-2 px-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{item.produto_sku}</td>
                        <td className={`py-2 px-2 ${allocationsMap[item.produto_id]?.some(a => a.insufficient) ? 'text-red-600' : ''}`}>{item.produto_nome}</td>
                        <td className="py-2 px-2">
                          {allocationsMap[item.produto_id] && allocationsMap[item.produto_id].length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {allocationsMap[item.produto_id].map((a, ai) => (
                                <span key={ai} className={`px-2 py-1 rounded text-sm ${a.insufficient ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'}`}>
                                  {a.prateleira_nome}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{item.prateleira_nome}</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <div className="inline-flex items-center border rounded">
                            <Button variant="ghost" size="sm" onClick={() => handleQuantityChange(index, item.quantidade - 1)} disabled={item.quantidade <= 1}>
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            <div className="px-3">{item.quantidade}</div>
                            <Button variant="ghost" size="sm" onClick={() => handleQuantityChange(index, item.quantidade + 1)}>
                              <ChevronUp className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-center"><Button variant="ghost" size="sm" onClick={() => handleRemoveItem(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {items.length > 0 && <div className="flex justify-end gap-2"><Button onClick={handleGerarRomaneio} disabled={loading} className="bg-blue-600 hover:bg-blue-700">{loading ? <><FileText className="w-4 h-4 mr-2" /> Gerando...</> : <><FileText className="w-4 h-4 mr-2" /> Gerar Romaneio</>}</Button></div>}

          {showRomaneio && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Romaneio: {romaneio?.numero}</h2>
                  {romaneio?.descricao && <p className="text-gray-600">{romaneio.descricao}</p>}
                </div>
              </div>

              <div className="mb-4 p-4 bg-blue-50 rounded">
                <h3 className="font-semibold mb-2">Rota Otimizada</h3>
                <div className="mt-2 flex flex-wrap gap-2">{rotaOtimizada.map((r, i) => (<span key={i} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">{r.prateleira}</span>))}</div>
              </div>

              {rotaOtimizada.map((rota, idx) => (
                <div key={idx} className="mb-6">
                  <div className="bg-gray-100 px-4 py-2 rounded-t font-semibold">Prateleira: {rota.prateleira}</div>
                  <table className="w-full border-x border-b">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-4 border-b">SKU</th>
                        <th className="text-left py-2 px-4 border-b">Produto</th>
                        <th className="text-center py-2 px-4 border-b">Caixas (Unidades)</th>
                        <th className="text-center py-2 px-4 border-b">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rota.items.map((it, iit) => (
                        <tr key={iit} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-4">{it.produto_sku}</td>
                          <td className={`py-2 px-4 ${it.insufficient ? 'text-red-600' : ''}`}>{it.produto_nome}</td>
                          <td className="py-2 px-4 text-center font-semibold">{it.boxes} ({it.units})</td>
                          <td className="py-2 px-4 text-center">{it.insufficient ? 'Insuficiente' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <div className="mt-6 p-4 bg-green-50 rounded">
                <div className="flex justify-between items-center"><span className="font-semibold">Total de Caixas:</span><span className="text-xl font-bold">{items.reduce((sum, item) => sum + item.quantidade, 0)}</span></div>
                <div className="flex justify-between items-center mt-2"><span className="font-semibold">Total de Unidades:</span><span className="text-xl font-bold">{items.reduce((sum, item) => sum + item.quantidade * (item.quantidade_caixa || 1), 0)}</span></div>
                <div className="flex justify-between items-center mt-2"><span className="font-semibold">Produtos Diferentes:</span><span className="text-xl font-bold">{items.length}</span></div>
              </div>

              <div className="flex justify-between gap-2 mt-4">
                <Button variant="ghost" onClick={() => setShowRomaneio(false)}>Voltar</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.print()}><FileText className="w-4 h-4 mr-2" />Imprimir</Button>
                  <Button onClick={handleFinalizarRomaneio} disabled={loading} className="bg-green-600 hover:bg-green-700"><CheckCircle className="w-4 h-4 mr-2" />{loading ? 'Finalizando...' : 'Finalizar Romaneio'}</Button>
                </div>
              </div>
            </div>
          )}

          {showInsufficientModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-xl font-semibold mb-2">Aviso: Estoque insuficiente</h3>
                <p className="text-sm text-gray-700 mb-4">Os seguintes produtos estão com quantidade insuficiente para o romaneio:</p>
                <ul className="list-disc pl-5 mb-4">{insufficientWarnings.map((w, i) => (<li key={i} className="text-red-600">{w}</li>))}</ul>
                <div className="flex justify-end"><Button onClick={() => setShowInsufficientModal(false)}>Fechar</Button></div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
