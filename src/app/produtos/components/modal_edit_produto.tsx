import React, { useState } from "react";
import { Button } from "../../../components/ui/button";

interface Produto {
	id: string;
	nome: string;
	SKU: string;
	codBarras: string;
	estoque_baixo: number;
	quantidade_caixa?: number;
}

interface ModalEditProdutoProps {
	isOpen: boolean;
	onClose: () => void;
	produto: Produto | null;
	onSave: (produto: { id: string; nome: string; SKU: string; codBarras: string; estoque_baixo: number; quantidade_caixa?: number }) => void;
}

export function ModalEditProduto({ isOpen, onClose, produto, onSave }: ModalEditProdutoProps) {
	const [nome, setNome] = useState(produto?.nome || "");
	const [SKU, setSKU] = useState(produto?.SKU || "");
	const [codBarras, setCodBarras] = useState(produto?.codBarras || "");
	const [estoque_baixo, setEstoqueBaixo] = useState(produto?.estoque_baixo || 0);
	const [quantidade_caixa, setQuantidade_caixa] = useState(produto?.quantidade_caixa || 1);
	const [saving, setSaving] = useState(false);

	React.useEffect(() => {
		setNome(produto?.nome || "");
		setSKU(produto?.SKU || "");
		setCodBarras(produto?.codBarras || "");
		setEstoqueBaixo(produto?.estoque_baixo || 0);
		setQuantidade_caixa(produto?.quantidade_caixa || 1);
	}, [produto]);

	if (!isOpen || !produto) return null;

	const handleSave = async () => {
		setSaving(true);

		const changes: string[] = [];

		if (nome !== produto.nome) changes.push("Alterou nome do produto");
		if (SKU !== produto.SKU) changes.push("Alterou SKU do produto");
		if (codBarras !== produto.codBarras) changes.push("Alterou código de barras do produto");
		if (estoque_baixo !== produto.estoque_baixo) changes.push("Alterou estoque baixo do produto");
		if (quantidade_caixa !== (produto.quantidade_caixa || 1)) changes.push("Alterou quantidade por caixa do produto");

		const action = changes.join(", ");

		await onSave({ id: produto.id, nome, SKU, codBarras, estoque_baixo, quantidade_caixa });

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
					entidade: "produto",
					entidade_id: produto.id,
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
			<div className="fixed inset-0 bg-black/1 flex items-center justify-center z-50">
				<div className="bg-white dark:bg-zinc-900 rounded-lg p-8 w-full max-w-md relative">
					<button className="absolute top-2 right-2 text-xl" onClick={onClose}>&times;</button>
					<h2 className="text-2xl font-bold mb-4">Editar Produto</h2>
					<form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); handleSave(); }}>
						<div>
							<label className="block text-sm font-medium mb-1">Nome</label>
							<input
								className="w-full border rounded px-3 py-2"
								value={nome}
								onChange={e => setNome(e.target.value)}
								required
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">SKU</label>
							<input
								className="w-full border rounded px-3 py-2"
								value={SKU}
								onChange={e => setSKU(e.target.value)}
								required
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">Código de Barras</label>
							<input
								className="w-full border rounded px-3 py-2"
								value={codBarras}
								onChange={e => setCodBarras(e.target.value)}
								required
							/>
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
						<div>
							<label className="block text-sm font-medium mb-1">Quantidade por Caixa</label>
							<input
								type="number"
								min={1}
								className="w-full border rounded px-3 py-2"
								value={quantidade_caixa}
								onChange={e => setQuantidade_caixa(Number(e.target.value))}
								required
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
							<Button type="submit" disabled={saving}>
								{saving ? "Salvando..." : "Salvar"}
							</Button>
						</div>
					</form>
				</div>
			</div>
		);
}
