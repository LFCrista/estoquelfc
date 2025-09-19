import { useState, useEffect } from "react";

interface Prateleira {
	id: string;
	nome: string;
}

interface ModalEditPrateleiraProps {
	isOpen: boolean;
	onClose: () => void;
	prateleira: Prateleira | null;
	onSave: (data: { id: string; nome: string }) => Promise<void>;
}

export function ModalEditPrateleira({ isOpen, onClose, prateleira, onSave }: ModalEditPrateleiraProps) {
	const [nome, setNome] = useState(prateleira?.nome || "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setNome(prateleira?.nome || "");
	}, [prateleira]);

	if (!isOpen || !prateleira) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);

		try {
			const userId = localStorage.getItem("profileId");

			if (!userId) {
				setError("User ID não encontrado no localStorage.");
				setSaving(false);
				return;
			}

			await onSave({ id: prateleira.id, nome });

			const historicoRes = await fetch("/api/historico", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					user_id: userId,
					entidade: "prateleira",
					entidade_id: prateleira.id,
					acao: "Editou Prateleira",
					quantidade: null,
				}),
			});

			const historicoData = await historicoRes.json();

			if (!historicoRes.ok) {
				console.error("Erro ao registrar histórico:", historicoData);
				setError(historicoData.error || "Erro ao registrar histórico");
			}

			onClose();
		} catch (err) {
			console.error("Erro inesperado ao editar prateleira:", err);
			setError("Erro inesperado ao editar prateleira");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/1 flex items-center justify-center z-50">
			<div className="bg-white p-6 rounded w-full max-w-md" onClick={e => e.stopPropagation()}>
				<h2 className="text-lg font-bold mb-4">Editar Prateleira</h2>
				<form onSubmit={handleSubmit}>
					<input
						className="border rounded px-3 py-2 w-full mb-4"
						value={nome}
						onChange={e => setNome(e.target.value)}
					/>
					{error && <div className="text-red-600 text-sm mb-4">{error}</div>}
					<div className="flex gap-2 justify-end">
						<button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded" disabled={saving}>Cancelar</button>
						<button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded" disabled={saving}>
							{saving ? "Salvando..." : "Salvar"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
