import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

interface ModalMoveEstoqueProps {
  isOpen: boolean;
  onClose: () => void;
  produtoId: string;
  prateleiraId: string;
  distribuidorId: string;
  quantidadeAtual: number;
  produtoNome: string;
  prateleiraNome: string;
  distribuidorNome: string;
  estoqueId?: string;
  onSubmit: (data: { tipo: "adicionar" | "retirar"; quantidade: number }) => void;
}


export function ModalMoveEstoque({
  isOpen,
  onClose,
  produtoId,
  prateleiraId,
  distribuidorId,
  quantidadeAtual,
  produtoNome,
  prateleiraNome,
  distribuidorNome,
  estoqueId,
  onSubmit,
}: ModalMoveEstoqueProps) {
  const [tipo, setTipo] = useState<"adicionar" | "retirar">("adicionar");
  const [quantidade, setQuantidade] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('[ModalMoveEstoque] useEffect isOpen', isOpen);
    if (isOpen) {
      setTipo("adicionar");
      setQuantidade(1);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    console.log('[ModalMoveEstoque] Modal fechado');
    return null;
  }

  async function handleSubmit() {
    console.log('[ModalMoveEstoque] handleSubmit called', { loading, tipo, quantidade, produtoId, prateleiraId, distribuidorId });
    if (loading) {
      console.warn('[ModalMoveEstoque] handleSubmit abort: loading is true');
      return;
    }
    setLoading(true);
    try {
      if (!quantidade || quantidade < 1) {
        console.warn('[ModalMoveEstoque] handleSubmit abort: quantidade inválida', quantidade);
        return;
      }

      console.log('[ModalMoveEstoque] Enviando fetch /api/estoque', { tipo, quantidade, produtoId, prateleiraId, distribuidorId, estoqueId });
      const res = await fetch("/api/estoque", {
        method: tipo === "adicionar" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: estoqueId,
          produto_id: produtoId,
          prateleira_id: prateleiraId,
          distribuidor_id: distribuidorId,
          tipo,
          quantidade,
        }),
      });

      const data = await res.json();
      console.log('[ModalMoveEstoque] Resposta /api/estoque', { status: res.status, data });

      if (!res.ok) {
        console.error("Erro ao criar/atualizar estoque:", data);
        setLoading(false);
        return;
      }

  // Usa o id retornado ou o já existente
  const tempEstoqueId = data.estoqueId || estoqueId;

      const userId = localStorage.getItem("profileId");
      console.log('[ModalMoveEstoque] userId do localStorage', userId);

      if (!userId) {
        console.error("User ID não encontrado no localStorage.");
        setLoading(false);
        return;
      }

      console.log('[ModalMoveEstoque] Enviando fetch /api/historico', { userId, tempEstoqueId, tipo, quantidade });
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
      console.log('[ModalMoveEstoque] Resposta /api/historico', { status: historicoRes.status, historicoData });

      if (!historicoRes.ok) {
        console.error("Erro ao registrar histórico:", historicoData);
      }

      console.log('[ModalMoveEstoque] Chamando onSubmit e onClose');
      onSubmit({ tipo, quantidade });
      onClose();
    } catch (err) {
      console.error("Erro inesperado ao movimentar estoque:", err);
    } finally {
      setLoading(false);
      console.log('[ModalMoveEstoque] handleSubmit finalizado, loading resetado');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-xl" onClick={onClose}>
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-2">Movimentar Estoque</h2>

        {/* Informações do produto, prateleira e distribuidor */}
        <div className="mb-4">
          <div className="text-lg font-bold text-amber-600">{produtoNome}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {prateleiraNome} - {distribuidorNome}
          </div>
        </div>

        {/* Toggle adicionar/retirar */}
        <div className="flex w-full mb-4 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 gap-1">
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

        {/* Quantidade */}
        {tipo === "adicionar" ? (
          <div>
            <label className="block text-sm font-medium mb-1">Quantidade a adicionar</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded px-3 py-2"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              required
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1">Quantidade a retirar</label>
            <input
              type="number"
              min={1}
              max={quantidadeAtual}
              className="w-full border rounded px-3 py-2 mb-2"
              value={quantidade}
              onChange={(e) => {
                let val = Number(e.target.value);
                if (isNaN(val)) val = 1;
                if (val < 1) val = 1;
                if (val > quantidadeAtual) val = quantidadeAtual;
                setQuantidade(val);
              }}
              required
            />
            <Slider
              min={1}
              max={quantidadeAtual}
              value={[quantidade]}
              onValueChange={(v: number[]) => setQuantidade(v[0])}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Selecionado: <span className="font-bold text-amber-600">{quantidade}</span> / {quantidadeAtual}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
            Cancelar
          </button>
          <button
            type="button"
            className={`px-4 py-2 bg-amber-600 text-white rounded${loading ? " opacity-60 cursor-not-allowed" : ""}`}
            onClick={() => {
              console.log('[ModalMoveEstoque] Botão Confirmar clicado');
              handleSubmit();
            }}
            disabled={loading}
          >
            {loading ? "Processando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}