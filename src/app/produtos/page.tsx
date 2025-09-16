"use client";
import { useEffect, useState } from "react";

import { Sidebar } from "../../components/sidebar";
import { Pencil } from "lucide-react";
import { Pagination } from "../../components/ui/pagination";
import { ModalEditProduto } from "./components/modal_edit_produto";
import { ModalCreateProduto } from "./components/modal_create_produto";

interface Produto {
  id: string;
  nome: string;
  SKU: string;
  codBarras: string;
}



export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<"nome" | "SKU" | "codBarras">("nome");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 100;

  // Modal edição produto
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  // Modal criar produto
  const [modalCreateOpen, setModalCreateOpen] = useState(false);

  async function handleSaveEditProduto(updated: { id: string; nome: string; SKU: string; codBarras: string }) {
    await fetch("/api/produtos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    await fetchProdutos({ page, search, searchField });
  }

  async function fetchProdutos({ page, search, searchField }: { page: number; search: string; searchField: string }) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
      search: search.trim(),
      searchField
    });
    const res = await fetch(`/api/produtos?${params}`);
    const data = await res.json();
    setProdutos(data.produtos || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  // Sempre que search ou searchField mudar, volta para página 1 e faz busca global
  useEffect(() => {
    setPage(1);
  }, [search, searchField]);

  useEffect(() => {
    fetchProdutos({ page, search, searchField });
  }, [page, search, searchField]);

  // Cálculos para os cards de resumo
  const totalProdutos = total;
  // Os cálculos de comEstoque/semEstoque só fazem sentido se vierem da API, aqui deixo como 0
  const comEstoque = 0;
  const semEstoque = 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8" style={{ paddingLeft: 256 }}>
        <h1 className="text-3xl font-bold mb-1 text-amber-500">Produtos Cadastrados</h1>
        <p className="text-muted-foreground mb-6">Gerencie os produtos disponíveis no sistema</p>

        {/* Cards de resumo */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1 rounded-lg border border-border bg-card p-6 flex flex-col justify-center shadow">
            <span className="text-sm text-muted-foreground">Total de Produtos</span>
            <span className="text-3xl font-bold text-amber-400">{totalProdutos}</span>
            <span className="text-xs text-muted-foreground mt-1">produtos cadastrados</span>
          </div>
          <div className="flex-1 rounded-lg border border-green-900 bg-card p-6 flex flex-col justify-center shadow">
            <span className="text-sm text-muted-foreground">Com Estoque</span>
            <span className="text-3xl font-bold text-green-400">{comEstoque}</span>
            <span className="text-xs text-muted-foreground mt-1">produtos disponíveis</span>
          </div>
          <div className="flex-1 rounded-lg border border-red-900 bg-card p-6 flex flex-col justify-center shadow">
            <span className="text-sm text-muted-foreground">Sem Estoque</span>
            <span className="text-3xl font-bold text-red-400">{semEstoque}</span>
            <span className="text-xs text-muted-foreground mt-1">produtos esgotados</span>
          </div>
        </div>

        {/* Barra de pesquisa */}
  <div className="mb-4 flex flex-col sm:flex-row gap-2 justify-start items-end">
          <select
            className="border border-border rounded px-3 py-2 h-[40px] bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={searchField}
            onChange={e => setSearchField(e.target.value as "nome" | "SKU" | "codBarras")}
          >
            <option value="nome">Nome</option>
            <option value="SKU">SKU</option>
            <option value="codBarras">Código de Barras</option>
          </select>
          <input
            type="text"
            placeholder={`Pesquisar por ${searchField === "nome" ? "nome" : searchField === "SKU" ? "SKU" : "código de barras"}...`}
            className="border border-border rounded px-3 py-2 bg-background text-foreground w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-lg shadow bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Lista de Produtos</h2>
            <button
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded flex items-center gap-2 transition"
              onClick={() => setModalCreateOpen(true)}
            >
              <span className="text-lg font-bold">+</span> Cadastrar Produto
            </button>
            <ModalCreateProduto
              isOpen={modalCreateOpen}
              onClose={() => setModalCreateOpen(false)}
              onProdutoCreated={() => fetchProdutos({ page, search, searchField })}
            />
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-2 text-left font-semibold">ID</th>
                <th className="p-2 text-left font-semibold">Nome</th>
                <th className="p-2 text-left font-semibold">SKU</th>
                <th className="p-2 text-left font-semibold">Código de Barras</th>
                <th className="p-2 text-left font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center">Carregando...</td></tr>
              ) : produtos.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center">Nenhum produto encontrado.</td></tr>
              ) : (
                produtos.map(produto => (
                  <tr key={produto.id} className="border-b border-border hover:bg-secondary/40 transition">
                    <td className="p-2 font-mono text-xs font-bold">{produto.id}</td>
                    <td className="p-2">{produto.nome}</td>
                    <td className="p-2">{produto.SKU}</td>
                    <td className="p-2">{produto.codBarras}</td>
                    <td className="p-2">
                      <button
                        className="hover:text-amber-400 transition"
                        title="Editar"
                        onClick={() => {
                          setSelectedProduto(produto);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <ModalEditProduto
                        isOpen={modalOpen}
                        onClose={() => setModalOpen(false)}
                        produto={selectedProduto}
                        onSave={handleSaveEditProduto}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Paginação */}
          <Pagination
            page={page}
            total={total}
            perPage={perPage}
            onPageChange={setPage}
          />
        </div>
      </main>
    </div>
  );
}
