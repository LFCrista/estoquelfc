import { useState } from "react";

interface ModalCreateDistribuidorProps {
	isOpen: boolean;
	onClose: () => void;
	onDistribuidorCreated: (data: { nome: string }) => Promise<{ distribuidorId: string }>;
}

export function ModalCreateDistribuidor({ isOpen, onClose, onDistribuidorCreated }: ModalCreateDistribuidorProps) {
	const [nome, setNome] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
			<div className="bg-white p-6 rounded shadow w-full max-w-md">
				<h2 className="text-lg font-bold mb-4">Cadastrar Distribuidor</h2>
				<form
					onSubmit={async e => {
						e.preventDefault();
						setLoading(true);
						setError(null);

						try {
							const { distribuidorId } = await onDistribuidorCreated({ nome });
							setNome("");
							onClose();
						} catch (err) {
							console.error("Erro inesperado ao cadastrar distribuidor:", err);
							setError("Erro inesperado ao cadastrar distribuidor");
						} finally {
							setLoading(false);
						}
					}}
				>
					<input
						className="border rounded px-3 py-2 w-full mb-4"
						value={nome}
						onChange={e => setNome(e.target.value)}
						placeholder="Nome do distribuidor"
					/>
					{error && <div className="text-red-600 text-sm mb-4">{error}</div>}
					<div className="flex gap-2 justify-end">
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
							disabled={loading}
						>
							{loading ? "Salvando..." : "Salvar"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}