"use client";
import { useEffect, useState } from "react";

import { Sidebar } from "../../components/sidebar";
import { Pencil } from "lucide-react";
import { Pagination } from "../../components/ui/pagination";
import { ModalCreatePrateleira } from "./components/modal_create_prateleira";
import { ModalEditPrateleira } from "./components/modal_edit_prateleira";

interface Prateleira {
	id: string;
	nome: string;
}

export default function PrateleirasPage() {
	const [prateleiras, setPrateleiras] = useState<Prateleira[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [searchField] = useState<"nome">("nome");
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const perPage = 100;

	// Modal edição prateleira
	const [modalOpen, setModalOpen] = useState(false);
	const [selectedPrateleira, setSelectedPrateleira] = useState<Prateleira | null>(null);
	// Modal criar prateleira
	const [modalCreateOpen, setModalCreateOpen] = useState(false);

	async function handleSaveEditPrateleira(updated: { id: string; nome: string }) {
		await fetch("/api/prateleiras", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(updated)
		});
		setModalOpen(false);
		await fetchPrateleiras({ page, search, searchField });
	}

	async function handleCreatePrateleira(newPrateleira: { nome: string }): Promise<{ prateleiraId: string }> {
		const res = await fetch("/api/prateleiras", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(newPrateleira)
		});
		const data = await res.json();

		if (!res.ok) {
			console.error("Erro ao criar prateleira:", data);
			throw new Error(data.error || "Erro ao criar prateleira");
		}

		const userId = localStorage.getItem("profileId");
		if (!userId) {
			console.error("User ID não encontrado no localStorage.");
			throw new Error("User ID não encontrado no localStorage.");
		}

		const historicoRes = await fetch("/api/historico", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				user_id: userId,
				entidade: "prateleira",
				entidade_id: data.prateleiraId,
				acao: "Criou Prateleira",
				quantidade: null
			})
		});
		const historicoData = await historicoRes.json();

		if (!historicoRes.ok) {
			console.error("Erro ao registrar histórico:", historicoData);
			throw new Error(historicoData.error || "Erro ao registrar histórico");
		}

		setModalCreateOpen(false);
		await fetchPrateleiras({ page, search, searchField });

		return { prateleiraId: data.prateleiraId };
	}

	async function fetchPrateleiras({ page, search, searchField }: { page: number; search: string; searchField: string }) {
		setLoading(true);
		const params = new URLSearchParams({
			page: String(page),
			limit: String(perPage),
			search: search.trim(),
			searchField
		});
		const res = await fetch(`/api/prateleiras?${params}`);
		const data = await res.json();
		setPrateleiras(data.prateleiras || []);
		setTotal(data.total || 0);
		setLoading(false);
	}

	useEffect(() => {
		setPage(1);
	}, [search, searchField]);

	useEffect(() => {
		fetchPrateleiras({ page, search, searchField });
	}, [page, search, searchField]);

	const totalPrateleiras = total;

	return (
		<div className="min-h-screen bg-background">
			<Sidebar />
			<main className="flex-1 p-8" style={{ paddingLeft: 256 }}>
				<h1 className="text-3xl font-bold mb-1 text-amber-500">Prateleiras Cadastradas</h1>
				<p className="text-muted-foreground mb-6">Gerencie as prateleiras disponíveis no sistema</p>

				{/* Cards de resumo */}
				<div className="flex gap-4 mb-8">
					<div className="flex-1 rounded-lg border border-border bg-card p-6 flex flex-col justify-center shadow">
						<span className="text-sm text-muted-foreground">Total de Prateleiras</span>
						<span className="text-3xl font-bold text-amber-400">{totalPrateleiras}</span>
						<span className="text-xs text-muted-foreground mt-1">prateleiras cadastradas</span>
					</div>
				</div>

				{/* Barra de pesquisa */}
				<div className="mb-4 flex flex-col sm:flex-row gap-2 justify-start items-end">
					<input
						type="text"
						placeholder="Pesquisar por nome..."
						className="border border-border rounded px-3 py-2 bg-background text-foreground w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
						value={search}
						onChange={e => setSearch(e.target.value)}
					/>
				</div>

				<div className="rounded-lg shadow bg-card p-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-semibold">Lista de Prateleiras</h2>
						<button
							className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded flex items-center gap-2 transition"
							onClick={() => setModalCreateOpen(true)}
						>
							<span className="text-lg font-bold">+</span> Cadastrar Prateleira
						</button>
						{modalCreateOpen && (
							<ModalCreatePrateleira
								isOpen={modalCreateOpen}
								onClose={() => setModalCreateOpen(false)}
								onPrateleiraCreated={handleCreatePrateleira}
							/>
						)}
					</div>
					<table className="w-full border-collapse text-sm">
						<thead>
							<tr className="border-b border-border text-muted-foreground">
								<th className="p-2 text-left font-semibold">ID</th>
								<th className="p-2 text-left font-semibold">Nome</th>
								<th className="p-2 text-left font-semibold">Ações</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr><td colSpan={3} className="p-4 text-center">Carregando...</td></tr>
							) : prateleiras.length === 0 ? (
								<tr><td colSpan={3} className="p-4 text-center">Nenhuma prateleira encontrada.</td></tr>
							) : (
								prateleiras.map(prateleira => (
									<tr key={prateleira.id} className="border-b border-border hover:bg-secondary/40 transition">
										<td className="p-2 font-mono text-xs font-bold">{prateleira.id}</td>
										<td className="p-2">{prateleira.nome}</td>
										<td className="p-2">
											<button
												className="hover:text-amber-400 transition"
												title="Editar"
												onClick={() => {
													setSelectedPrateleira(prateleira);
													setModalOpen(true);
												}}
											>
												<Pencil className="w-4 h-4" />
											</button>
											{modalOpen && selectedPrateleira && (
												<ModalEditPrateleira
													isOpen={modalOpen}
													onClose={() => setModalOpen(false)}
													prateleira={selectedPrateleira}
													onSave={handleSaveEditPrateleira}
												/>
											)}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
					{/* Paginação */}
					<Pagination
						page={page}
						total={total}
						perPage={perPage}
						onPageChange={setPage}
					/>
				</div>
			</main>
		</div>
	);
}
