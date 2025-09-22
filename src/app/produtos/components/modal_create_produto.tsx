import React, { useState } from "react";
import { Button } from "../../../components/ui/button";

interface ModalCreateProdutoProps {
	isOpen: boolean;
	onClose: () => void;
	onProdutoCreated: () => void;
}

export function ModalCreateProduto({ isOpen, onClose, onProdutoCreated }: ModalCreateProdutoProps) {
	const [nome, setNome] = useState("");
	const [SKU, setSKU] = useState("");
	const [codBarras, setCodBarras] = useState("");
	const [estoque_baixo, setEstoqueBaixo] = useState(0);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
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

			const res = await fetch("/api/produtos", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ nome, SKU, codBarras, estoque_baixo })
			});
			const data = await res.json();

			if (!res.ok) {
				setError(data.error || "Erro ao cadastrar produto");
				setSaving(false);
				return;
			}

			const produtoId = data.produtoId;

			const historicoRes = await fetch("/api/historico", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					user_id: userId,
					entidade: "produto",
					entidade_id: produtoId,
					acao: "Criou Produto",
					quantidade: null
				})
			});
			const historicoData = await historicoRes.json();

			if (!historicoRes.ok) {
				console.error("Erro ao registrar histórico:", historicoData);
				setError(historicoData.error || "Erro ao registrar histórico");
				setSaving(false);
				return;
			}

			setNome("");
			setSKU("");
			setCodBarras("");
			setEstoqueBaixo(0);
			onProdutoCreated();
			onClose();
		} catch (err) {
			console.error("Erro inesperado ao cadastrar produto:", err);
			setError("Erro inesperado ao cadastrar produto");
		} finally {
			setSaving(false);
		}
	}

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
			<div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 w-full max-w-md relative">
				<button className="absolute top-2 right-2 text-xl" onClick={onClose}>&times;</button>
				<h2 className="text-2xl font-bold mb-4">Cadastrar Produto</h2>
				<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
					<div>
						<label className="block text-sm font-medium mb-1">Nome</label>
						<input className="w-full border rounded px-3 py-2" value={nome} onChange={e => setNome(e.target.value)} required />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1">SKU</label>
						<input className="w-full border rounded px-3 py-2" value={SKU} onChange={e => setSKU(e.target.value)} required />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1">Código de Barras</label>
						<input className="w-full border rounded px-3 py-2" value={codBarras} onChange={e => setCodBarras(e.target.value)} required />
					</div>
					<div>
						<label className="block text-sm font-medium mb-1">Estoque Baixo</label>
						<input
							type="number"
							className="w-full border rounded px-3 py-2"
							value={estoque_baixo}
							onChange={e => setEstoqueBaixo(Number(e.target.value))}
							required
						/>
					</div>
					{error && <div className="text-red-600 text-sm">{error}</div>}
					<Button type="submit" disabled={saving}>{saving ? "Cadastrando..." : "Cadastrar"}</Button>
				</form>
			</div>
		</div>
	);
}
