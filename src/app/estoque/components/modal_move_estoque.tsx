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

      const acao = tipo === "adicionar" ? "Adicionou Estoque" : "Removeu Estoque";

      const historicoRes = await fetch("/api/historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          entidade: "estoque",
          entidade_id: estoqueId,
          acao,
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
          {/* Seleção de prateleira */}
          <div>
            <label className="block text-sm font-medium mb-1">Prateleira</label>
            <select
              className="w-full border rounded px-3 py-2 bg-background text-foreground"
              value={prateleiraId}
              onChange={e => setPrateleiraId(e.target.value)}
            >
              {prateleiras.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome} (Qtd: {p.quantidade})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle adicionar/retirar */}
          <div className="flex w-full mb-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 gap-1">
            {[
              { label: "Adicionar", value: "adicionar" },
              { label: "Retirar", value: "retirar" }
            ].map(opt => (
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
