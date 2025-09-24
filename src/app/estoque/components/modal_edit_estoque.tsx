import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

interface PrateleiraEstoque {
  id: string;
  nome: string;
  quantidade: number;
  estoqueId?: string; // id do registro de estoque (opcional)
}

interface Livro {
  id: string;
  nome: string;
}

interface ModalEditEstoqueProps {
  isOpen: boolean;
  onClose: () => void;
  livro: Livro;
  prateleiras: PrateleiraEstoque[];
  onSubmit?: (data: { tipo: "adicionar" | "retirar"; prateleiraId: string; quantidade: number; estoqueId?: string }) => void;
}

interface Distribuidor {
  id: string;
  nome: string;
}

export function ModalEditEstoque({ isOpen, onClose, livro, prateleiras, onSubmit }: ModalEditEstoqueProps) {
  const [tipo, setTipo] = useState<"adicionar" | "retirar">("adicionar");
  const [prateleiraId, setPrateleiraId] = useState(prateleiras[0]?.id || "");
  const [quantidade, setQuantidade] = useState(1);
  const [maxRetirar, setMaxRetirar] = useState(1);
  const [estoqueId, setEstoqueId] = useState<string | undefined>(prateleiras[0]?.estoqueId);
  // Remove tabs, só deixa não relacionadas
  const [prateleirasNaoRelacionadas, setPrateleirasNaoRelacionadas] = useState<PrateleiraEstoque[]>([]);
  const [prateleiraSearch, setPrateleiraSearch] = useState("");
  const [showPrateleiraDropdown, setShowPrateleiraDropdown] = useState(false);
  const [distribuidorId, setDistribuidorId] = useState("");
  const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);
  const [distribuidorSearch, setDistribuidorSearch] = useState("");
  const [showDistribuidorDropdown, setShowDistribuidorDropdown] = useState(false);

  // Sempre que o modal abrir, inicializa prateleiraId e estoqueId
  useEffect(() => {
    if (isOpen && prateleiras.length > 0) {
      setPrateleiraId(prateleiras[0].id);
    }
  }, [isOpen, prateleiras]);

  // Busca estoqueId e quantidade ao trocar prateleiraId
  useEffect(() => {
    async function fetchEstoque() {
      if (!prateleiraId || !livro.id) {
        setEstoqueId(undefined);
        setMaxRetirar(1);
        setQuantidade(tipo === "retirar" ? 0 : 1);
        return;
      }
      try {
        const res = await fetch(`/api/estoque?search=${encodeURIComponent(livro.id)}&searchField=produto_id`);
        const json = await res.json();
        if (json.estoque && Array.isArray(json.estoque)) {
          const found = json.estoque.find((e: { produto_id: string; prateleira_id: string; id: string; quantidade: number }) => String(e.produto_id) === String(livro.id) && String(e.prateleira_id) === String(prateleiraId));
          setEstoqueId(found?.id);
          setMaxRetirar(found?.quantidade ?? 1);
          if (tipo === "retirar") {
            setQuantidade(found?.quantidade > 0 ? 1 : 0);
          } else {
            setQuantidade(1);
          }
        } else {
          setEstoqueId(undefined);
          setMaxRetirar(1);
          setQuantidade(tipo === "retirar" ? 0 : 1);
        }
      } catch {
        setEstoqueId(undefined);
        setMaxRetirar(1);
        setQuantidade(tipo === "retirar" ? 0 : 1);
      }
    }
    if (isOpen && prateleiraId) {
      fetchEstoque();
    }
  }, [prateleiraId, livro.id, tipo, isOpen]);

  // Busca prateleiras que não têm relação com o produto atual
  useEffect(() => {
    async function fetchPrateleirasNaoRelacionadas() {
      if (!livro.id) return;
      try {
        const res = await fetch(`/api/prateleiras?produtoId=${livro.id}&relacionadas=false`);
        const data = await res.json();
        if (res.ok) {
          setPrateleirasNaoRelacionadas(data.prateleiras);
        }
      } catch (err) {
        console.error("Erro ao buscar prateleiras não relacionadas:", err);
      }
    }

    if (isOpen) {
      fetchPrateleirasNaoRelacionadas();
    }
  }, [isOpen, livro.id]);

  useEffect(() => {
    if (prateleiraSearch.trim().length < 2) {
      setPrateleirasNaoRelacionadas([]);
      setShowPrateleiraDropdown(false);
      return;
    }
    let ignore = false;
    async function fetchPrateleirasNaoRelacionadas() {
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
        search: prateleiraSearch.trim(),
        searchField: "nome",
      });
      const res = await fetch(`/api/prateleiras?${params}`);
      const data = await res.json();
      if (!ignore) {
        setPrateleirasNaoRelacionadas(data.prateleiras || []);
        setShowPrateleiraDropdown(true);
      }
    }
    fetchPrateleirasNaoRelacionadas();
    return () => {
      ignore = true;
    };
  }, [prateleiraSearch]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quantidade || quantidade < 1) return;

    try {
      const res = await fetch("/api/estoque", {
        method: tipo === "adicionar" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produto_id: livro.id,
          prateleira_id: prateleiraId,
          distribuidor_id: distribuidorId,
          tipo,
          quantidade,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Erro ao criar/atualizar estoque:", data);
        return;
      }

      const tempEstoqueId = data.estoqueId || estoqueId;
      setEstoqueId(tempEstoqueId);

      const userId = localStorage.getItem("profileId");

      if (!userId) {
        console.error("User ID não encontrado no localStorage.");
        return;
      }

      const historicoRes = await fetch("/api/historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          entidade: "estoque",
          entidade_id: tempEstoqueId,
          acao: tipo === "adicionar" ? "Adicionou Estoque" : "Removeu Estoque",
          quantidade,
        }),
      });

      const historicoData = await historicoRes.json();

      if (!historicoRes.ok) {
        console.error("Erro ao registrar histórico:", historicoData);
      }

      if (onSubmit) onSubmit({ tipo, prateleiraId, quantidade, estoqueId });
      onClose();
    } catch (err) {
      console.error("Erro inesperado ao movimentar estoque:", err);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-xl" onClick={onClose}>
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">Movimentar Estoque</h2>
        <div className="mb-4">
          <span className="text-muted-foreground text-sm">Livro:</span>
          <div className="font-bold text-lg text-amber-600">{livro.nome}</div>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Apenas prateleiras não relacionadas */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Prateleira</label>
            <input
              type="text"
              placeholder="Pesquisar por nome..."
              className="border border-border rounded px-3 py-2 bg-background text-foreground w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={prateleiraSearch}
              onChange={(e) => {
                setPrateleiraSearch(e.target.value);
                setShowPrateleiraDropdown(true);
              }}
              onFocus={() => {
                if (prateleirasNaoRelacionadas.length > 0) setShowPrateleiraDropdown(true);
              }}
              autoComplete="off"
            />
            {showPrateleiraDropdown && prateleirasNaoRelacionadas.length > 0 && (
              <ul className="absolute left-0 top-full mt-1 border rounded bg-white dark:bg-zinc-900 max-h-48 overflow-y-auto shadow z-[999] w-full">
                {prateleirasNaoRelacionadas.map((prat) => (
                  <li
                    key={prat.id}
                    className={`px-3 py-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-zinc-800 ${
                      prateleiraId === prat.id ? "bg-amber-50 dark:bg-zinc-800" : ""
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

          {/* Só permite adicionar em prateleiras não relacionadas */}
          <div className="flex w-full mb-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 gap-1">
            <button
              type="button"
              className="flex-1 py-2 rounded-lg font-semibold transition text-sm bg-amber-400 text-white shadow"
              onClick={() => setTipo("adicionar")}
            >
              Adicionar
            </button>
          </div>

          {/* Quantidade */}
          {tipo === "adicionar" ? (
            <div>
              <label className="block text-sm font-medium mb-1">Quantidade a adicionar</label>
              <input
                type="number"
                min={1}
                className="w-full border rounded px-3 py-2"
                value={quantidade}
                onChange={e => setQuantidade(Number(e.target.value))}
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Quantidade a retirar</label>
              <input
                type="number"
                min={1}
                max={maxRetirar}
                className="w-full border rounded px-3 py-2 mb-2"
                value={quantidade}
                onChange={e => {
                  let val = Number(e.target.value);
                  if (isNaN(val)) val = 1;
                  if (val < 1) val = 1;
                  if (val > maxRetirar) val = maxRetirar;
                  setQuantidade(val);
                }}
                required
              />
              <Slider
                min={1}
                max={maxRetirar}
                value={[quantidade]}
                onValueChange={v => setQuantidade(v[0])}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Selecionado: <span className="font-bold text-amber-600">{quantidade}</span> / {maxRetirar}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded">
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
