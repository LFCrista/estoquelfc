import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

interface PrateleiraEstoque {
  id: string;
  nome: string;
  quantidade: number;
  estoqueId?: string; // id do registro de estoque (opcional)
}

interface ModalMoveEstoqueProps {
  isOpen: boolean;
  onClose: () => void;
  livro: { id: string; nome: string };
  prateleiras: PrateleiraEstoque[];
  onSubmit?: (data: { tipo: "adicionar" | "retirar"; prateleiraId: string; quantidade: number; estoqueId?: string }) => void;
}

export function ModalMoveEstoque({ isOpen, onClose, livro, prateleiras, onSubmit }: ModalMoveEstoqueProps) {
  const [tipo, setTipo] = useState<"adicionar" | "retirar">("adicionar");
  const [prateleiraId, setPrateleiraId] = useState(prateleiras[0]?.id || "");
  const [quantidade, setQuantidade] = useState(1);
  const [maxRetirar, setMaxRetirar] = useState(1);
  const [estoqueId, setEstoqueId] = useState<string | undefined>(prateleiras[0]?.estoqueId);
  const [activeTab, setActiveTab] = useState("relacionadas"); // Nova aba para prateleiras não relacionadas
  const [prateleirasNaoRelacionadas, setPrateleirasNaoRelacionadas] = useState<PrateleiraEstoque[]>([]);
  const [prateleiraSearch, setPrateleiraSearch] = useState("");
  const [showPrateleiraDropdown, setShowPrateleiraDropdown] = useState(false);

  // Sempre que o modal abrir ou as prateleiras mudarem, inicializa prateleiraId e estoqueId
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

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quantidade || quantidade < 1) return;

    try {
      const userId = localStorage.getItem("profileId");

      if (!userId) {
        console.error("User ID não encontrado no localStorage.");
        return;
      }

      if (tipo === "adicionar") {
        const response = await fetch("/api/estoque", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            produto_id: livro.id,
            prateleira_id: prateleiraId,
            quantidade,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("Erro ao criar estoque:", data);
          return;
        }

        const estoqueId = data.estoqueId; // EstoqueId retornado pelo POST

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
          console.error("Erro ao registrar histórico para nova prateleira:", historicoData);
        }
      } else {
        await fetch("/api/estoque", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: estoqueId,
            produto_id: livro.id,
            prateleira_id: prateleiraId,
            tipo,
            quantidade,
          }),
        });

        const acaoHistorico = tipo === "retirar" ? "Removeu Estoque" : ""; 

        if (!acaoHistorico) {
          console.error("Tipo inválido para movimentação de estoque.");
          return;
        }

        if (activeTab === "relacionadas") {
          const historicoRes = await fetch("/api/historico", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              entidade: "estoque",
              entidade_id: estoqueId,
              acao: acaoHistorico, // Usa a variável de escopo
              quantidade,
            }),
          });

          const historicoData = await historicoRes.json();

          if (!historicoRes.ok) {
            console.error("Erro ao registrar histórico:", historicoData);
          }
        } else if (activeTab === "naoRelacionadas") {
          const historicoRes = await fetch("/api/historico", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: userId,
              entidade: "estoque",
              entidade_id: prateleiraId, // Usar o ID da nova prateleira
              acao: "Adicionou Estoque",
              quantidade,
            }),
          });

          const historicoData = await historicoRes.json();

          if (!historicoRes.ok) {
            console.error("Erro ao registrar histórico para nova prateleira:", historicoData);
          }
        }
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
          {/* Seleção de prateleira */}
          <div className="flex w-full mb-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 gap-1">
            {[{ label: "Relacionadas", value: "relacionadas" }, { label: "Não Relacionadas", value: "naoRelacionadas" }].map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`flex-1 py-2 rounded-lg font-semibold transition text-sm ${
                  activeTab === tab.value
                    ? "bg-amber-400 text-white shadow"
                    : "bg-transparent text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
                onClick={() => setActiveTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "relacionadas" && (
            <div>
              {/* Conteúdo para prateleiras relacionadas */}
              <label className="block text-sm font-medium mb-1">Prateleira</label>
              <select
                className="w-full border rounded px-3 py-2 bg-background text-foreground"
                value={prateleiraId}
                onChange={(e) => setPrateleiraId(e.target.value)}
              >
                {prateleiras.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} (Qtd: {p.quantidade})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === "naoRelacionadas" && (
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
          )}

          {/* Toggle adicionar/retirar */}
          {activeTab === "relacionadas" && (
            <div className="flex w-full mb-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 gap-1">
              {[{ label: "Adicionar", value: "adicionar" }, { label: "Retirar", value: "retirar" }].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`flex-1 py-2 rounded-lg font-semibold transition text-sm ${
                    tipo === opt.value
                      ? "bg-amber-400 text-white shadow"
                      : "bg-transparent text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                  onClick={() => setTipo(opt.value as "adicionar" | "retirar")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === "naoRelacionadas" && (
            <div className="flex w-full mb-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 gap-1">
              <button
                type="button"
                className="flex-1 py-2 rounded-lg font-semibold transition text-sm bg-amber-400 text-white shadow"
                onClick={() => setTipo("adicionar")}
              >
                Adicionar
              </button>
            </div>
          )}

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
