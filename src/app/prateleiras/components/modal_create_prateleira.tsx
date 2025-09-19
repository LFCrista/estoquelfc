import { useState } from "react";

interface ModalCreatePrateleiraProps {
	isOpen: boolean;
	onClose: () => void;
	onPrateleiraCreated: (data: { nome: string }) => Promise<{ prateleiraId: string }>;// Atualizado para retornar o ID da prateleira criada
}

export function ModalCreatePrateleira({ isOpen, onClose, onPrateleiraCreated }: ModalCreatePrateleiraProps) {
	const [nome, setNome] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
			<div className="bg-white p-6 rounded shadow w-full max-w-md">
				<h2 className="text-lg font-bold mb-4">Cadastrar Prateleira</h2>
				<form
					onSubmit={async e => {
						e.preventDefault();
						setLoading(true);
						setError(null);

						try {
							const userId = localStorage.getItem("profileId");

							if (!userId) {
								setError("User ID não encontrado no localStorage.");
								setLoading(false);
								return;
							}

							const { prateleiraId } = await onPrateleiraCreated({ nome });

							const historicoRes = await fetch("/api/historico", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									user_id: userId,
									entidade: "prateleira",
									entidade_id: prateleiraId,
									acao: "Criou Prateleira",
									quantidade: null,
								}),
							});

							const historicoData = await historicoRes.json();

							if (!historicoRes.ok) {
								console.error("Erro ao registrar histórico:", historicoData);
								setError(historicoData.error || "Erro ao registrar histórico");
								setLoading(false);
								return;
							}

							setNome("");
							onClose();
						} catch (err) {
							console.error("Erro inesperado ao cadastrar prateleira:", err);
							setError("Erro inesperado ao cadastrar prateleira");
						} finally {
							setLoading(false);
						}
					}}
				>
					<input
						className="border rounded px-3 py-2 w-full mb-4"
						value={nome}
						onChange={e => setNome(e.target.value)}
						placeholder="Nome da prateleira"
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
