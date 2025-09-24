import { useEffect, useState, useRef } from "react";

interface Produto {
  id: string;
  nome: string;
  SKU: string;
  codBarras: string;
}

interface Prateleira {
  id: string;
  nome: string;
}

interface Distribuidor {
  id: string;
  nome: string;
}

interface ModalCreateEstoqueProps {
  isOpen: boolean;
  onClose: () => void;
  onEstoqueCreated: (data: {
    produto_id: string;
    prateleira_id: string;
    quantidade: number;
  }) => Promise<void>;
}

export function ModalCreateEstoque({
  isOpen,
  onClose,
  onEstoqueCreated,
}: ModalCreateEstoqueProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [prateleiras, setPrateleiras] = useState<Prateleira[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [prateleiraId, setPrateleiraId] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [distribuidorId, setDistribuidorId] = useState("");
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);

  // Produto search
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState<"nome" | "SKU" | "codBarras">(
    "nome"
  );
  const [showProdutoDropdown, setShowProdutoDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Prateleira search
  const [prateleiraSearch, setPrateleiraSearch] = useState("");
  const [showPrateleiraDropdown, setShowPrateleiraDropdown] = useState(false);
  const prateleiraInputRef = useRef<HTMLInputElement>(null);

  // Distribuidor search
  const [distribuidorSearch, setDistribuidorSearch] = useState("");
  const [showDistribuidorDropdown, setShowDistribuidorDropdown] = useState(false);
  const distribuidorInputRef = useRef<HTMLInputElement>(null);

  // Busca produtos
  useEffect(() => {
    if (search.trim().length < 2) {
      setProdutos([]);
      setShowProdutoDropdown(false);
      return;
    }
    let ignore = false;
    async function fetchProdutos() {
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
        search: search.trim(),
        searchField: searchField,
      });
      const res = await fetch(`/api/produtos?${params}`);
      const data = await res.json();
      if (!ignore) {
        setProdutos(data.produtos || []);
        setShowProdutoDropdown(true);
      }
    }
    fetchProdutos();
    return () => {
      ignore = true;
    };
  }, [search, searchField]);

  // Reset ao mudar campo
  useEffect(() => {
    setSearch("");
    setProdutos([]);
    setShowProdutoDropdown(false);
  }, [searchField]);

  // Busca prateleiras
  useEffect(() => {
    if (prateleiraSearch.trim().length < 2) {
      setPrateleiras([]);
      setShowPrateleiraDropdown(false);
      return;
    }
    let ignore = false;
    async function fetchPrateleiras() {
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
        search: prateleiraSearch.trim(),
        searchField: "nome",
      });
      const res = await fetch(`/api/prateleiras?${params}`);
      const data = await res.json();
      if (!ignore) {
        setPrateleiras(data.prateleiras || []);
        setShowPrateleiraDropdown(true);
      }
    }
    fetchPrateleiras();
    return () => {
      ignore = true;
    };
  }, [prateleiraSearch]);

  // Busca distribuidores
  useEffect(() => {
    if (distribuidorSearch.trim().length < 2) {
      setDistribuidores([]);
      setShowDistribuidorDropdown(false);
      return;
    }
    let ignore = false;
    async function fetchDistribuidores() {
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
        search: distribuidorSearch.trim(),
      });
      const res = await fetch(`/api/distribuidores?${params}`);
      const data = await res.json();
      if (!ignore) {
        setDistribuidores(data.distribuidores || []);
        setShowDistribuidorDropdown(true);
      }
    }
    fetchDistribuidores();
    return () => {
      ignore = true;
    };
  }, [distribuidorSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">Adicionar Estoque</h2>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const res = await fetch("/api/estoque", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  produto_id: produtoId,
                  prateleira_id: prateleiraId,
                  distribuidor_id: distribuidorId,
                  quantidade,
                }),
              });
              const data = await res.json();

              if (!res.ok) {
                alert(data.error || "Erro ao criar estoque");
                return;
              }

              const estoqueId = data.estoqueId;

              if (!estoqueId) {
                alert("ID do estoque não retornado pela API.");
                return;
              }

              const userId = localStorage.getItem("profileId");

              if (!userId) {
                alert("User ID não encontrado no localStorage.");
                return;
              }

              const historicoRes = await fetch("/api/historico", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: userId,
                  entidade: "estoque",
                  entidade_id: estoqueId,
                  acao: "Adicionou Estoque",
                  quantidade,
                }),
              });

              const historicoData = await historicoRes.json();

              if (!historicoRes.ok) {
                console.error("Erro ao registrar histórico:", historicoData);
                alert(historicoData.error || "Erro ao registrar histórico");
                return;
              }

              setProdutoId("");
              setPrateleiraId("");
              setDistribuidorId("");
              setQuantidade(1);
              onEstoqueCreated({ produto_id: produtoId, prateleira_id: prateleiraId, quantidade });
              onClose();
            } catch (err) {
              console.error("Erro inesperado ao criar estoque:", err);
              alert("Erro inesperado ao criar estoque");
            }
          }}
        >
          {/* Produto */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Produto</label>
            {/* Toggle Switch */}
            <div className="flex w-full mb-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 gap-1">
              {[
                { label: "Nome", value: "nome" },
                { label: "SKU", value: "SKU" },
                { label: "Código de Barras", value: "codBarras" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`flex-1 py-2 rounded-lg font-semibold transition text-sm
                    ${searchField === item.value
                      ? "bg-amber-400 text-white shadow"
                      : "bg-transparent text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"}
                  `}
                  onClick={() => setSearchField(item.value as typeof searchField)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {/* Input de pesquisa */}
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Pesquisar por ${
                searchField === "nome"
                  ? "nome"
                  : searchField === "SKU"
                  ? "SKU"
                  : "código de barras"
              }...`}
              className="border border-border rounded px-3 py-2 bg-background text-foreground w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowProdutoDropdown(true);
              }}
              onFocus={() => {
                if (produtos.length > 0) setShowProdutoDropdown(true);
              }}
              autoComplete="off"
            />
            {showProdutoDropdown && produtos.length > 0 && (
              <ul className="absolute left-0 top-full mt-1 border rounded bg-white dark:bg-zinc-900 max-h-48 overflow-y-auto shadow z-[999] w-full">
                {produtos.map((prod) => (
                  <li
                    key={prod.id}
                    className={`px-3 py-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-zinc-800 ${
                      produtoId === prod.id
                        ? "bg-amber-50 dark:bg-zinc-800"
                        : ""
                    }`}
                    onClick={() => {
                      setProdutoId(prod.id);
                      if (searchField === "nome") setSearch(prod.nome);
                      else if (searchField === "SKU") setSearch(prod.SKU);
                      else setSearch(prod.codBarras);
                      setShowProdutoDropdown(false);
                    }}
                  >
                    <span className="font-semibold">{prod.nome}</span>{" "}
                    <span className="text-xs text-muted-foreground">
                      ({prod.SKU})
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <input type="hidden" value={produtoId} required readOnly />
          </div>

          {/* Prateleira */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Prateleira</label>
            <input
              ref={prateleiraInputRef}
              type="text"
              placeholder="Pesquisar por nome..."
              className="border border-border rounded px-3 py-2 bg-background text-foreground w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={prateleiraSearch}
              onChange={(e) => {
                setPrateleiraSearch(e.target.value);
                setShowPrateleiraDropdown(true);
              }}
              onFocus={() => {
                if (prateleiras.length > 0) setShowPrateleiraDropdown(true);
              }}
              autoComplete="off"
            />
            {showPrateleiraDropdown && prateleiras.length > 0 && (
              <ul className="absolute left-0 top-full mt-1 border rounded bg-white dark:bg-zinc-900 max-h-48 overflow-y-auto shadow z-[999] w-full">
                {prateleiras.map((prat) => (
                  <li
                    key={prat.id}
                    className={`px-3 py-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-zinc-800 ${
                      prateleiraId === prat.id
                        ? "bg-amber-50 dark:bg-zinc-800"
                        : ""
                    }`}
                    onClick={() => {
                      setPrateleiraId(prat.id);
                      setPrateleiraSearch(prat.nome);
                      setShowPrateleiraDropdown(false);
                    }}
                  >
                    <span className="font-semibold">{prat.nome}</span>
                  </li>
                ))}
              </ul>
            )}
            <input type="hidden" value={prateleiraId} required readOnly />
          </div>

          {/* Distribuidor */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Distribuidor</label>
            <input
              ref={distribuidorInputRef}
              type="text"
              placeholder="Pesquisar distribuidor..."
              className="border border-border rounded px-3 py-2 bg-background text-foreground w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={distribuidorSearch}
              onChange={(e) => {
                setDistribuidorSearch(e.target.value);
                setShowDistribuidorDropdown(true);
              }}
              onFocus={() => {
                if (distribuidores.length > 0) setShowDistribuidorDropdown(true);
              }}
              autoComplete="off"
            />
            {showDistribuidorDropdown && distribuidores.length > 0 && (
              <ul className="absolute left-0 top-full mt-1 border rounded bg-white dark:bg-zinc-900 max-h-48 overflow-y-auto shadow z-[999] w-full">
                {distribuidores.map((dist) => (
                  <li
                    key={dist.id}
                    className={`px-3 py-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-zinc-800 ${
                      distribuidorId === dist.id ? "bg-amber-50 dark:bg-zinc-800" : ""
                    }`}
                    onClick={() => {
                      setDistribuidorId(dist.id);
                      setDistribuidorSearch(dist.nome);
                      setShowDistribuidorDropdown(false);
                    }}
                  >
                    {dist.nome}
                  </li>
                ))}
              </ul>
            )}
            <input type="hidden" value={distribuidorId} required readOnly />
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium mb-1">Quantidade</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded px-3 py-2"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 text-white rounded"
            >
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
