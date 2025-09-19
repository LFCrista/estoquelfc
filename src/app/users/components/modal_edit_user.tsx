import React, { useState } from "react";
import { Button } from "../../../components/ui/button";

interface ModalEditUserProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    role: string;
    status: string;
    email: string;
  } | null;
  onSave: (user: { id: string; name: string; role: string; status: string }) => void;
}

export function ModalEditUser({ isOpen, onClose, user, onSave }: ModalEditUserProps) {
  const [name, setName] = useState(user?.name || "");
  const [role, setRole] = useState(user?.role || "user");
  const [status, setStatus] = useState(user?.status || "ativo");
  const [saving, setSaving] = useState(false);

  // Atualiza os campos quando o usuário muda
  React.useEffect(() => {
    setName(user?.name || "");
    setRole(user?.role || "user");
    setStatus(user?.status || "ativo");
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSave = async () => {
    setSaving(true);

    const changes: string[] = [];

    if (name !== user.name) changes.push("Alterou nome");
    if (role !== user.role) changes.push("Alterou cargo");
    if (status !== user.status) {
      if (status === "inativo") {
        changes.push("Desativou");
      } else {
        changes.push("Ativou");
      }
    }

    const action = changes.join(", ");

    await onSave({ id: user.id, name, role, status });

    try {
      const userId = localStorage.getItem("profileId");

      if (!userId) {
        console.error("User ID não encontrado no localStorage.");
        setSaving(false);
        return;
      }

      const historicoRes = await fetch("/api/historico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          entidade: "user",
          entidade_id: user.id,
          acao: action,
          quantidade: null,
        }),
      });

      const historicoData = await historicoRes.json();

      if (!historicoRes.ok) {
        console.error("Erro ao registrar histórico:", historicoData);
      }
    } catch (err) {
      console.error("Erro inesperado ao registrar histórico:", err);
    } finally {
      setSaving(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/8">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Editar Usuário</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Nome</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Cargo</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            <option value="user">Usuário</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
