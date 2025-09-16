
import { useState } from "react";

interface ModalCreatePrateleiraProps {
	isOpen: boolean;
	onClose: () => void;
	onPrateleiraCreated: (data: { nome: string }) => Promise<void>;
}

export function ModalCreatePrateleira({ isOpen, onClose, onPrateleiraCreated }: ModalCreatePrateleiraProps) {
	const [nome, setNome] = useState("");
	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
			<div className="bg-white p-6 rounded shadow w-full max-w-md">
				<h2 className="text-lg font-bold mb-4">Cadastrar Prateleira</h2>
				<form onSubmit={async e => {
					e.preventDefault();
					await onPrateleiraCreated({ nome });
					setNome("");
				}}>
					<input
						className="border rounded px-3 py-2 w-full mb-4"
						value={nome}
						onChange={e => setNome(e.target.value)}
						placeholder="Nome da prateleira"
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
