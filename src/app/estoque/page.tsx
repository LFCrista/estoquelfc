"use client";
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState } from "react";
import { Sidebar } from "../../components/sidebar";
import { Pagination } from "../../components/ui/pagination";
import { ModalCreateEstoque } from "./components/modal_create_estoque";
import { ModalMoveEstoque } from "./components/modal_move_estoque";

interface Estoque {
  id: string;
  produto_id: string;
  prateleira_id: string;
  quantidade: number;
  produto?: {
    nome: string;
    SKU?: string;
    codBarras?: string;
    estoque_baixo?: number;
  };
  prateleira?: {
    nome: string;
  };
}

export default function EstoquePage() {
  const [estoque, setEstoque] = useState<Estoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<
    "produto.nome" | "produto.SKU" | "produto.codBarras" | "produto_id" | "prateleira_id"
  >("produto.nome");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 100;
  const [modalCreateOpen, setModalCreateOpen] = useState(false);
  const [modalMoveOpen, setModalMoveOpen] = useState(false);
  const [moveLivro, setMoveLivro] = useState<{ id: string; nome: string } | null>(null);
  const [movePrateleiras, setMovePrateleiras] = useState<{ id: string; nome: string; quantidade: number }[]>([]);
  const [totalLivros, setTotalLivros] = useState(0);
  const [baixoEstoque, setBaixoEstoque] = useState(0);
  const [semEstoque, setSemEstoque] = useState(0);
  const [stockFilter, setStockFilter] = useState("Todos");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Função para criar estoque
  async function handleCreateEstoque(data: { produto_id: string; prateleira_id: string; quantidade: number }) {
    await fetch("/api/estoque", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    setModalCreateOpen(false);
    await fetchEstoque({ page, search, searchField, stockFilter });
  }

  // Função para buscar estoque
  async function fetchEstoque({
    page,
    search,
    searchField,
    stockFilter
  }: {
    page: number;
    search: string;
    searchField: string;
    stockFilter: string;
  }) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      search: search.trim(),
      searchField,
      stockFilter
    });
    const res = await fetch(`/api/estoque?${params}`);
    const data = await res.json();

    if (!data.estoque) {
      setEstoque([]);
      setTotal(0);
      setTotalLivros(0);
      setBaixoEstoque(0);
      setSemEstoque(0);
      setLoading(false);
      return;
    }

    // Agrupa quantidades por produto
    const produtoQuantidades = data.estoque.reduce((acc: Record<string, { quantidadeTotal: number; estoqueBaixo: number }>, item: Estoque) => {
      if (!acc[item.produto_id]) {
        acc[item.produto_id] = {
          quantidadeTotal: 0,
          estoqueBaixo: item.produto?.estoque_baixo || 0,
        };
      }
      acc[item.produto_id].quantidadeTotal += item.quantidade;
      return acc;
    }, {});

    // Calcula valores dos cards
    const produtosComEstoque = Object.keys(produtoQuantidades);
    const baixoEstoqueCount = produtosComEstoque.filter((id) => {
      const { quantidadeTotal, estoqueBaixo } = produtoQuantidades[id];
      return quantidadeTotal > 0 && quantidadeTotal <= estoqueBaixo;
    }).length;
    const semEstoqueCount = produtosComEstoque.filter((id) => produtoQuantidades[id].quantidadeTotal === 0).length;

    setTotalLivros(produtosComEstoque.length);
    setBaixoEstoque(baixoEstoqueCount);
    setSemEstoque(semEstoqueCount);

    // Aplica filtro de estoque
    let filteredEstoque = data.estoque;
    if (stockFilter === "Baixo Estoque") {
      filteredEstoque = data.estoque.filter((item: Estoque) => {
        const total = produtoQuantidades[item.produto_id]?.quantidadeTotal || 0;
        const baixo = produtoQuantidades[item.produto_id]?.estoqueBaixo || 0;
        return total > 0 && total <= baixo;
      });
    } else if (stockFilter === "Sem Estoque") {
      filteredEstoque = data.estoque.filter((item: Estoque) => {
        const total = produtoQuantidades[item.produto_id]?.quantidadeTotal || 0;
        return total === 0;
      });
    }

    setEstoque(filteredEstoque);
    setTotal(data.total || 0);
    setLoading(false);
  }

  useEffect(() => setPage(1), [search, searchField, stockFilter]);
  useEffect(() => {
    const fetchData = async () => {
      await fetchEstoque({ page, search, searchField, stockFilter });
    };
    fetchData();
  }, [page, search, searchField, stockFilter]);

  // Agrupa estoque por produto
  const agrupado = estoque.reduce((acc, item) => {
    const key = item.produto_id;
    if (!acc[key]) {
      acc[key] = {
        id: item.id,
        produto_id: item.produto_id,
        nome: item.produto?.nome || item.produto_id,
        prateleiras: [],
        quantidadeTotal: 0,
        estoqueBaixo: item.produto?.estoque_baixo || 0
      };
    }
    acc[key].prateleiras.push({ nome: item.prateleira?.nome || item.prateleira_id, quantidade: item.quantidade });
    acc[key].quantidadeTotal += item.quantidade;
    return acc;
  }, {} as Record<string, any>);
  const agrupadoArr = Object.values(agrupado);

  // Função para definir cor do nome e quantidade
  const getCorEstoque = (item: typeof agrupadoArr[0]) => {
    if (item.quantidadeTotal === 0) return "text-red-500";
    if (item.quantidadeTotal > 0 && item.quantidadeTotal <= item.estoqueBaixo) return "text-yellow-500";
    return "text-black";
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8" style={{ paddingLeft: 256 }}>
        <h1 className="text-3xl font-bold mb-1 text-amber-500">Controle de Estoque</h1>
        <p className="text-muted-foreground mb-6">Gerencie o estoque de livros e suas localizações nas prateleiras</p>

        {/* Cards de resumo */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 rounded-lg border border-border bg-card p-6 flex flex-col justify-center shadow">
            <span className="text-sm text-muted-foreground">Total de Produtos com Estoque</span>
            <span className="text-3xl font-bold text-amber-400">{totalLivros}</span>
          </div>
          <div className="flex-1 rounded-lg border border-yellow-900 bg-card p-6 flex flex-col justify-center shadow">
            <span className="text-sm text-muted-foreground">Baixo Estoque</span>
            <span className="text-3xl font-bold text-yellow-400">{baixoEstoque}</span>
          </div>
          <div className="flex-1 rounded-lg border border-red-900 bg-card p-6 flex flex-col justify-center shadow">
            <span className="text-sm text-muted-foreground">Sem Estoque</span>
            <span className="text-3xl font-bold text-red-400">{semEstoque}</span>
          </div>
        </div>

        {/* Barra de busca e filtro */}
        <div className="flex items-center gap-4 mb-6">
          <select
            className="border border-gray-300 rounded px-3 py-2"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as any)}
          >
            <option value="produto.nome">Nome</option>
            <option value="produto.SKU">SKU</option>
            <option value="produto.codBarras">Código de Barras</option>
          </select>
          <input
            ref={searchInputRef}
            type="text"
            className="flex-1 border border-gray-300 rounded px-3 py-2"
            placeholder="Digite sua busca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border border-gray-300 rounded px-3 py-2"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="Todos">Todos</option>
            <option value="Baixo Estoque">Baixo Estoque</option>
            <option value="Sem Estoque">Sem Estoque</option>
          </select>
        </div>

        {/* Tabela de estoque */}
        <div className="rounded-lg shadow bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Controle de Estoque</h2>
            <button
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded flex items-center gap-2 transition"
              onClick={() => setModalCreateOpen(true)}
            >
              <span className="text-lg font-bold">+</span> Adicionar Estoque
            </button>
            {modalCreateOpen && (
              <ModalCreateEstoque
                isOpen={modalCreateOpen}
                onClose={() => setModalCreateOpen(false)}
                onEstoqueCreated={handleCreateEstoque}
              />
            )}
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-2 text-left font-semibold">ID</th>
                <th className="p-2 text-left font-semibold">Nome do Livro</th>
                <th className="p-2 text-left font-semibold">Prateleiras</th>
                <th className="p-2 text-left font-semibold">Qtd. em cada</th>
                <th className="p-2 text-left font-semibold">Qtd. Total</th>
                <th className="p-2 text-left font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-4 text-center">Carregando...</td></tr>
              ) : agrupadoArr.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center">Nenhum item de estoque encontrado.</td></tr>
              ) : (
                agrupadoArr.map(item => (
                  <tr key={item.produto_id} className="border-b border-border hover:bg-secondary/40 transition">
                    <td className="p-2 font-mono text-xs font-bold">{item.id}</td>
                    <td className={`p-2 ${getCorEstoque(item)}`}>{item.nome}</td>
                    <td className="p-2">
                      {item.prateleiras.map((p: { nome: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }, idx: Key | null | undefined) => (
                        <div key={idx} className="mb-1">
                          <span className="inline-block px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold mr-1">{p.nome}</span>
                        </div>
                      ))}
                    </td>
                    <td className="p-2">
                      {item.prateleiras.map((p: { quantidade: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }, idx: Key | null | undefined) => (
                        <div key={idx} className="mb-1">
                          <span className="inline-block px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold mr-1">{p.quantidade}</span>
                        </div>
                      ))}
                    </td>
                    <td className={`p-2 font-bold text-lg ${getCorEstoque(item)}`}>{item.quantidadeTotal}</td>
                    <td className="p-2">
                      <span
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold text-xs cursor-pointer hover:bg-amber-200 transition"
                        onClick={() => {
                          setMoveLivro({ id: item.produto_id, nome: item.nome });
                          setMovePrateleiras(
                            estoque.filter(e => e.produto_id === item.produto_id).map(e => ({
                              id: e.prateleira_id,
                              nome: e.prateleira?.nome || e.prateleira_id,
                              quantidade: e.quantidade
                            }))
                          );
                          setModalMoveOpen(true);
                        }}
                      >
                        Movimentar
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <Pagination page={page} total={total} perPage={perPage} onPageChange={setPage} />
        </div>

        {modalMoveOpen && moveLivro && (
          <ModalMoveEstoque
            isOpen={modalMoveOpen}
            onClose={() => setModalMoveOpen(false)}
            livro={moveLivro}
            prateleiras={movePrateleiras}
            onSubmit={async () => {
              setModalMoveOpen(false);
              await fetchEstoque({ page, search, searchField, stockFilter });
            }}
          />
        )}
      </main>
    </div>
  );
}
