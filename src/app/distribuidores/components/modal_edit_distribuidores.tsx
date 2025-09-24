import { useState, useEffect } from "react";

interface Distribuidor {
	id: string;
	nome: string;
}

interface ModalEditDistribuidorProps {
	isOpen: boolean;
	onClose: () => void;
	distribuidor: Distribuidor | null;
	onSave: (data: { id: string; nome: string }) => Promise<void>;
}

export function ModalEditDistribuidor({ isOpen, onClose, distribuidor, onSave }: ModalEditDistribuidorProps) {
	const [nome, setNome] = useState(distribuidor?.nome || "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setNome(distribuidor?.nome || "");
	}, [distribuidor]);

	if (!isOpen || !distribuidor) return null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError(null);

		try {
			await onSave({ id: distribuidor.id, nome });
			onClose();
		} catch (err) {
			console.error("Erro inesperado ao editar distribuidor:", err);
			setError("Erro inesperado ao editar distribuidor");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
			<div className="bg-white p-6 rounded w-full max-w-md" onClick={e => e.stopPropagation()}>
				<h2 className="text-lg font-bold mb-4">Editar Distribuidor</h2>
				<form onSubmit={handleSubmit}>
					<input
						className="border rounded px-3 py-2 w-full mb-4"
						value={nome}
						onChange={e => setNome(e.target.value)}
						placeholder="Nome do distribuidor"
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