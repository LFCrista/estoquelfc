
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

	useEffect(() => {
		setNome(prateleira?.nome || "");
	}, [prateleira]);

	if (!isOpen || !prateleira) return null;

	return (
		<div className="fixed inset-0 bg-black/1 flex items-center justify-center z-50">
			<div className="bg-white p-6 rounded w-full max-w-md" onClick={e => e.stopPropagation()}>
				<h2 className="text-lg font-bold mb-4">Editar Prateleira</h2>
				<form onSubmit={e => { e.preventDefault(); onSave({ id: prateleira.id, nome }); }}>
					<input
						className="border rounded px-3 py-2 w-full mb-4"
						value={nome}
						onChange={e => setNome(e.target.value)}
					/>
					<div className="flex gap-2 justify-end">
						<button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
						<button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded">Salvar</button>
					</div>
				</form>
			</div>
		</div>
	);
}
