/* eslint-disable */
"use client";
import { useEffect, useState, useRef } from "react";
import { Sidebar } from "../../components/sidebar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Barcode, Trash2, FileText, CheckCircle, Plus, ArrowLeft } from "lucide-react";

interface Romaneio {
  id: number;
  numero: string;
  descricao: string;
  status: string;
  created_at: string;
  romaneio_items?: any[];
}

interface ItemPicking {
  produto_id: string;
  prateleira_id: string;
  produto_nome: string;
  produto_sku: string;
  prateleira_nome: string;
  quantidade: number; // boxes (bipes)
  quantidade_caixa?: number; // units per box
}

interface RotaOtimizada {
  prateleira: string;
  items: Array<{
    produto_id: string;
    produto_nome: string;
    produto_sku: string;
    boxes: number;
    units: number;
    insufficient?: boolean;
  }>;
}

export default function PickingPage() {
  const [tela, setTela] = useState<"selecao" | "bipagem" | "romaneio">("selecao");
  const [romaneios, setRomaneios] = useState<Romaneio[]>([]);
  const [romaneioAtual, setRomaneioAtual] = useState<Romaneio | null>(null);
  const [novoRomaneioNumero, setNovoRomaneioNumero] = useState("");
  const [novoRomaneioDescricao, setNovoRomaneioDescricao] = useState("");
  const [codBarras, setCodBarras] = useState("");
  const [items, setItems] = useState<ItemPicking[]>([]);
  const [loading, setLoading] = useState(false);
  const [rotaOtimizada, setRotaOtimizada] = useState<RotaOtimizada[]>([]);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [insufficientWarnings, setInsufficientWarnings] = useState<string[]>([]);
  const [showRomaneio, setShowRomaneio] = useState(false);
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar romaneios ao iniciar
  useEffect(() => {
    carregarRomaneios();
  }, []);

  // Focar input quando estiver na tela de bipagem
  useEffect(() => {
    if (tela === "bipagem" && !showRomaneio) {
      inputRef.current?.focus();
    }
  }, [tela, showRomaneio]);

  // Carregar lista de romaneios pendentes/em andamento
  async function carregarRomaneios() {
    try {
      const res = await fetch("/api/picking");
      const data = await res.json();
      const roms = (data.data || []).filter((r: Romaneio) => 
        r.status === "pendente" || r.status === "em_andamento"
      );
      setRomaneios(roms);
    } catch (err) {
      console.error("Erro ao carregar romaneios:", err);
    }
  }

  // Criar novo romaneio
  async function handleCriarRomaneio() {
    if (!novoRomaneioNumero.trim()) {
      alert("Informe o número do romaneio");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/picking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero: novoRomaneioNumero.trim(),
          descricao: novoRomaneioDescricao.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert("Erro ao criar romaneio: " + (error.error || "Erro desconhecido"));
        return;
      }

      const data = await res.json();
      setRomaneioAtual(data.romaneio);
      setItems([]);
      setTela("bipagem");
      setNovoRomaneioNumero("");
      setNovoRomaneioDescricao("");
      setMostrarFormNovo(false);
    } catch (err) {
      console.error("Erro ao criar romaneio:", err);
      alert("Erro ao criar romaneio");
    } finally {
      setLoading(false);
    }
  }

  // Selecionar romaneio existente
  async function handleSelecionarRomaneio(romaneio: Romaneio) {
    // navegar para a página do romaneio para bipagem e verificação
    window.location.href = `/picking/${romaneio.id}`;
  }

  // Buscar produto por código de barras
  async function handleScan() {
    if (!codBarras.trim() || !romaneioAtual) return;

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
      
      // Verificar se o produto já está na lista (mesma prateleira)
      const existingIndex = items.findIndex(
        (item) => item.produto_id === estoque.produto_id && item.prateleira_id === estoque.prateleira_id
      );

      if (existingIndex >= 0) {
        // Incrementar quantidade no banco
        const novaQuantidade = items[existingIndex].quantidade + 1;
        
        const updateRes = await fetch("/api/picking/item", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            romaneio_id: romaneioAtual.id,
            produto_id: estoque.produto_id,
            prateleira_id: estoque.prateleira_id,
            quantidade: novaQuantidade,
          }),
        });

        if (!updateRes.ok) {
          alert("Erro ao atualizar item");
          return;
        }

        // Atualizar estado local
        const updatedItems = [...items];
        updatedItems[existingIndex].quantidade = novaQuantidade;
        setItems(updatedItems);
      } else {
        // Adicionar novo item no banco
        const addRes = await fetch("/api/picking/item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            romaneio_id: romaneioAtual.id,
            produto_id: estoque.produto_id,
            prateleira_id: estoque.prateleira_id,
            quantidade: 1,
          }),
        });

        if (!addRes.ok) {
          alert("Erro ao adicionar item");
          return;
        }

        // Adicionar ao estado local
        const novoItem: ItemPicking = {
          produto_id: estoque.produto_id,
          prateleira_id: estoque.prateleira_id,
          produto_nome: estoque.produto?.nome || "Sem nome",
          produto_sku: estoque.produto?.SKU || "",
          prateleira_nome: estoque.prateleira?.nome || "Sem prateleira",
          quantidade: 1,
          quantidade_caixa: estoque.produto?.quantidade_caixa || 1,
        };
        setItems([...items, novoItem]);
      }

      setCodBarras("");
      inputRef.current?.focus();
    } catch (err) {
      console.error("Erro ao buscar produto:", err);
      alert("Erro ao buscar produto");
    } finally {
      setLoading(false);
    }
  }

  // Remover item da lista
  async function handleRemoveItem(index: number) {
    if (!romaneioAtual) return;

    const item = items[index];
    
    try {
      const res = await fetch(
        `/api/picking/item?romaneio_id=${romaneioAtual.id}&produto_id=${item.produto_id}&prateleira_id=${item.prateleira_id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        alert("Erro ao remover item");
        return;
      }

      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
    } catch (err) {
      console.error("Erro ao remover item:", err);
      alert("Erro ao remover item");
    }
  }

  // Função para otimizar a rota
  function otimizarRota(items: ItemPicking[]): RotaOtimizada[] {
    const grouped = items.reduce((acc, item) => {
      const key = item.prateleira_id;
      if (!acc[key]) {
        acc[key] = {
          prateleira: item.prateleira_nome,
          items: []
        } as RotaOtimizada;
      }
      acc[key].items.push({ produto_id: item.produto_id, produto_nome: item.produto_nome, produto_sku: item.produto_sku, boxes: item.quantidade, units: item.quantidade * (item.quantidade_caixa || 1) });
      return acc;
    }, {} as Record<string, RotaOtimizada>);

    const rotas = Object.values(grouped);
    
    rotas.sort((a, b) => {
      const nomeA = a.prateleira.toLowerCase();
      const nomeB = b.prateleira.toLowerCase();
      
      const letraA = nomeA.match(/[a-z]+/)?.[0] || '';
      const numeroA = parseInt(nomeA.match(/\d+/)?.[0] || '0');
      const letraB = nomeB.match(/[a-z]+/)?.[0] || '';
      const numeroB = parseInt(nomeB.match(/\d+/)?.[0] || '0');
      
      if (letraA !== letraB) {
        return letraA.localeCompare(letraB);
      }
      
      return numeroA - numeroB;
    });

    return rotas;
  }

  // Gerar romaneio
  function handleGerarRomaneio() {
    // generate allocations and rota considering quantidade_caixa and stock across prateleiras
    (async () => {
      if (items.length === 0) {
        alert("Nenhum item para gerar romaneio");
        return;
      }

      setLoading(true);
      try {
        const byProduct: Record<string, { boxes: number; produto_nome: string; produto_sku: string; quantidade_caixa: number }> = {};
        for (const it of items) {
          if (!byProduct[it.produto_id]) {
            byProduct[it.produto_id] = { boxes: 0, produto_nome: it.produto_nome, produto_sku: it.produto_sku, quantidade_caixa: it.quantidade_caixa || 1 };
          }
          byProduct[it.produto_id].boxes += it.quantidade;
        }

        const rotaMap: Record<string, { prateleira_nome: string; items: RotaOtimizada["items"] }> = {};
        const warnings: string[] = [];

        // For each product, fetch all estoque entries and allocate
        // priority: use prateleiras in the order they were scanned (items array)
        const prateleiraPriority = Array.from(new Set(items.map(i => i.prateleira_id)));
        function getPriorityIndex(prId: string) {
          const idx = prateleiraPriority.indexOf(prId);
          return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
        }

        for (const produtoId of Object.keys(byProduct)) {
          const info = byProduct[produtoId];
          const boxesNeeded = info.boxes;
          const unitsNeeded = boxesNeeded * (info.quantidade_caixa || 1);

          const params = new URLSearchParams({ searchField: "produto_id", search: String(produtoId), page: "1", limit: "100" });
          const res = await fetch(`/api/estoque?${params.toString()}`);
          const data = await res.json();
          const entries = data.estoque || [];

          // compute total available units
          let totalAvailable = entries.reduce((s: number, e: any) => s + (e.quantidade || 0), 0);

          let allocations: Array<{ prateleira_id: string; prateleira_nome: string; units: number }> = [];

          if (totalAvailable >= unitsNeeded) {
            // try to find a single prateleira that satisfies the need, prefer by scanned prateleira order
            const candidatesSingle = entries.filter((e: any) => (e.quantidade || 0) >= unitsNeeded)
              .sort((a: any, b: any) => getPriorityIndex(a.prateleira_id) - getPriorityIndex(b.prateleira_id));
            const single = candidatesSingle[0];
            if (single) {
              allocations.push({ prateleira_id: single.prateleira_id, prateleira_nome: single.prateleira?.nome || single.prateleira_nome || "Sem prateleira", units: unitsNeeded });
            } else {
              // combine: prefer prateleiras by scanned order (nearest first), then by larger quantity
              const sorted = [...entries].sort((a: any, b: any) => {
                const pa = getPriorityIndex(a.prateleira_id);
                const pb = getPriorityIndex(b.prateleira_id);
                if (pa !== pb) return pa - pb;
                return (b.quantidade || 0) - (a.quantidade || 0);
              });
              let remain = unitsNeeded;
              for (const e of sorted) {
                if (remain <= 0) break;
                const take = Math.min(remain, e.quantidade || 0);
                if (take > 0) allocations.push({ prateleira_id: e.prateleira_id, prateleira_nome: e.prateleira?.nome || e.prateleira_nome || "Sem prateleira", units: take });
                remain -= take;
              }
            }
          } else {
            // allocate all available (in priority order) and warn
            warnings.push(info.produto_nome + " (falta " + (unitsNeeded - totalAvailable) + " unidades)");
            const sorted = [...entries].sort((a: any, b: any) => {
              const pa = getPriorityIndex(a.prateleira_id);
              const pb = getPriorityIndex(b.prateleira_id);
              if (pa !== pb) return pa - pb;
              return (b.quantidade || 0) - (a.quantidade || 0);
            });
            let remain = totalAvailable;
            for (const e of sorted) {
              if (remain <= 0) break;
              const take = Math.min(remain, e.quantidade || 0);
              if (take > 0) allocations.push({ prateleira_id: e.prateleira_id, prateleira_nome: e.prateleira?.nome || e.prateleira_nome || "Sem prateleira", units: take });
              remain -= take;
            }
          }

          // convert allocations into rotaMap entries grouped by prateleira
          for (const a of allocations) {
            const boxesFromShelf = Math.ceil(a.units / (info.quantidade_caixa || 1));
            if (!rotaMap[a.prateleira_id]) rotaMap[a.prateleira_id] = { prateleira_nome: a.prateleira_nome, items: [] };
            rotaMap[a.prateleira_id].items.push({ produto_id: produtoId, produto_nome: info.produto_nome, produto_sku: info.produto_sku, boxes: boxesFromShelf, units: a.units, insufficient: totalAvailable < unitsNeeded });
          }
        }

        // Convert rotaMap to array and sort by prateleira name
        const rotas: RotaOtimizada[] = Object.keys(rotaMap).map((pid) => ({ prateleira: rotaMap[pid].prateleira_nome || pid, items: rotaMap[pid].items }));

        // As a fallback, if rotaMap empty (no estoque entries found), create simple grouping by scanned prateleira
        if (rotas.length === 0) {
          const fallback = otimizarRota(items);
          setRotaOtimizada(fallback);
        } else {
          setRotaOtimizada(rotas);
        }

        if (warnings.length > 0) {
          setInsufficientWarnings(warnings);
          setShowInsufficientModal(true);
        } else {
          setInsufficientWarnings([]);
        }

        setShowRomaneio(true);
      } catch (err) {
        console.error("Erro ao gerar romaneio:", err);
        alert("Erro ao gerar romaneio");
      } finally {
        setLoading(false);
      }
    })();
  }

  // Finalizar romaneio
  async function handleFinalizarRomaneio() {
    if (items.length === 0 || !romaneioAtual) {
      alert("Nenhum item para finalizar");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/picking", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: romaneioAtual.id, status: "concluido" }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert("Erro ao finalizar romaneio: " + (error.error || "Erro desconhecido"));
        return;
      }

      alert("Romaneio finalizado com sucesso!");
      
      setRomaneioAtual(null);
      setItems([]);
      setRotaOtimizada([]);
      setShowRomaneio(false);
      setTela("selecao");
      carregarRomaneios();
    } catch (err) {
      console.error("Erro ao finalizar romaneio:", err);
      alert("Erro ao finalizar romaneio");
    } finally {
      setLoading(false);
    }
  }

  // Voltar para seleção
  function handleVoltarParaSelecao() {
    setRomaneioAtual(null);
    setItems([]);
    setShowRomaneio(false);
    setTela("selecao");
    carregarRomaneios();
  }

  // Imprimir romaneio
  function handleImprimirRomaneio() {
    window.print();
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {showInsufficientModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-xl font-semibold mb-2">Aviso: Estoque insuficiente</h3>
                <p className="text-sm text-gray-700 mb-4">Os seguintes produtos estão com quantidade insuficiente para o romaneio:</p>
                <ul className="list-disc pl-5 mb-4">
                  {insufficientWarnings.map((w, i) => (
                    <li key={i} className="text-red-600">{w}</li>
                  ))}
                </ul>
                <div className="flex justify-end">
                  <Button onClick={() => setShowInsufficientModal(false)}>Fechar</Button>
                </div>
              </div>
            </div>
          )}
          <h1 className="text-3xl font-bold mb-6">Picking / Romaneio</h1>

          {/* TELA DE SELEÇÃO */}
          {tela === "selecao" && (
            <>
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4">Romaneios Ativos</h2>
                
                {romaneios.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum romaneio ativo. Crie um novo para começar.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {romaneios.map((rom) => (
                      <div
                        key={rom.id}
                        className="flex justify-between items-center p-4 border rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSelecionarRomaneio(rom)}
                      >
                        <div>
                          <div className="font-semibold">{rom.numero}</div>
                          {rom.descricao && <div className="text-sm text-gray-600">{rom.descricao}</div>}
                          <div className="text-xs text-gray-400">
                            {new Date(rom.created_at).toLocaleString("pt-BR")}
                          </div>
                        </div>
                        <div>
                          <span className={`px-3 py-1 rounded text-sm ${
                            rom.status === "pendente" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"
                          }`}>
                            {rom.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Formulário para criar novo romaneio */}
              <div className="bg-white p-6 rounded-lg shadow">
                {!mostrarFormNovo ? (
                  <Button onClick={() => setMostrarFormNovo(true)} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Novo Romaneio
                  </Button>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold mb-4">Novo Romaneio</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Número *</label>
                        <Input
                          type="text"
                          placeholder="Ex: ROM-001"
                          value={novoRomaneioNumero}
                          onChange={(e) => setNovoRomaneioNumero(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Descrição (opcional)</label>
                        <Input
                          type="text"
                          placeholder="Ex: Pedido Cliente A"
                          value={novoRomaneioDescricao}
                          onChange={(e) => setNovoRomaneioDescricao(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleCriarRomaneio} 
                          disabled={loading || !novoRomaneioNumero.trim()}
                          className="flex-1"
                        >
                          {loading ? "Criando..." : "Criar"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            setMostrarFormNovo(false);
                            setNovoRomaneioNumero("");
                            setNovoRomaneioDescricao("");
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* TELA DE BIPAGEM */}
          {tela === "bipagem" && !showRomaneio && (
            <>
              {/* Cabeçalho com informações do romaneio */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-lg">{romaneioAtual?.numero}</div>
                  {romaneioAtual?.descricao && (
                    <div className="text-sm text-gray-600">{romaneioAtual.descricao}</div>
                  )}
                </div>
                <Button variant="ghost" onClick={handleVoltarParaSelecao}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </div>

              {/* Seção de bipagem */}
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Barcode className="w-5 h-5" />
                  Bipar Produtos
                </h2>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Código de barras..."
                    value={codBarras}
                    onChange={(e) => setCodBarras(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleScan();
                      }
                    }}
                    className="flex-1"
                    disabled={loading}
                  />
                  <Button onClick={handleScan} disabled={loading || !codBarras.trim()}>
                    {loading ? "Buscando..." : "Adicionar"}
                  </Button>
                </div>
              </div>

              {/* Lista de itens */}
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    Itens ({items.length})
                  </h2>
                </div>

                {items.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum item adicionado. Bipe um produto para começar.
                  </p>
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
                            <td className="py-2 px-2">{item.produto_nome}</td>
                            <td className="py-2 px-2">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                                {item.prateleira_nome}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">{item.quantidade}</td>
                            <td className="py-2 px-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Botão para gerar romaneio */}
              {items.length > 0 && (
                <div className="flex justify-end gap-2">
                  <Button onClick={handleGerarRomaneio} className="bg-blue-600 hover:bg-blue-700">
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar Romaneio
                  </Button>
                </div>
              )}
            </>
          )}

          {/* TELA DE ROMANEIO */}
          {showRomaneio && (
            <>
              <div className="bg-white p-6 rounded-lg shadow mb-6 print:shadow-none">
                <div className="flex justify-between items-center mb-6 print:mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Romaneio: {romaneioAtual?.numero}</h2>
                    {romaneioAtual?.descricao && (
                      <p className="text-gray-600">{romaneioAtual.descricao}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 print:block">
                    Data: {new Date().toLocaleDateString("pt-BR")} - {new Date().toLocaleTimeString("pt-BR")}
                  </div>
                </div>

                <div className="mb-4 p-4 bg-blue-50 rounded print:bg-white print:border print:border-gray-300">
                  <h3 className="font-semibold mb-2">Rota Otimizada</h3>
                  <p className="text-sm text-gray-700">
                    Siga a ordem das prateleiras abaixo para otimizar o tempo de coleta:
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {rotaOtimizada.map((rota, index) => (
                      <span key={index} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">
                        {rota.prateleira}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Itens por prateleira */}
                {rotaOtimizada.map((rota, rotaIndex) => (
                  <div key={rotaIndex} className="mb-6 print:mb-4 print:break-inside-avoid">
                    <div className="bg-gray-100 px-4 py-2 rounded-t font-semibold print:bg-gray-200">
                      Prateleira: {rota.prateleira}
                    </div>
                    <table className="w-full border-x border-b">
                      <thead className="bg-gray-50 print:bg-gray-100">
                        <tr>
                          <th className="text-left py-2 px-4 border-b">SKU</th>
                          <th className="text-left py-2 px-4 border-b">Produto</th>
                            <th className="text-center py-2 px-4 border-b">Caixas (Unidades)</th>
                          <th className="text-center py-2 px-4 border-b print:hidden">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rota.items.map((item, itemIndex) => (
                          <tr key={itemIndex} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-4">{item.produto_sku}</td>
                              <td className={`py-2 px-4 ${item.insufficient ? 'text-red-600' : ''}`}>{item.produto_nome}</td>
                              <td className="py-2 px-4 text-center font-semibold">{item.boxes} ({item.units})</td>
                            <td className="py-2 px-4 text-center print:hidden">
                              <input type="checkbox" className="w-4 h-4" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}

                {/* Total */}
                <div className="mt-6 p-4 bg-green-50 rounded print:bg-white print:border print:border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total de Caixas:</span>
                    <span className="text-xl font-bold">{items.reduce((sum, item) => sum + item.quantidade, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-semibold">Total de Unidades:</span>
                    <span className="text-xl font-bold">{items.reduce((sum, item) => sum + item.quantidade * (item.quantidade_caixa || 1), 0)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-semibold">Produtos Diferentes:</span>
                    <span className="text-xl font-bold">{items.length}</span>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex justify-between gap-2 print:hidden">
                <Button variant="ghost" onClick={() => setShowRomaneio(false)}>
                  Voltar
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleImprimirRomaneio}>
                    <FileText className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button onClick={handleFinalizarRomaneio} disabled={loading} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {loading ? "Finalizando..." : "Finalizar Romaneio"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Estilos de impressão */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          main, main * {
            visibility: visible;
          }
          main {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 20px;
          }
          aside {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
