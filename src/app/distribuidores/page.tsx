"use client";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";

import { Sidebar } from "../../components/sidebar";
import { Pagination } from "../../components/ui/pagination";
import { ModalCreateDistribuidor } from "./components/modal_create_distribuidores";
import { ModalEditDistribuidor } from "./components/modal_edit_distribuidores";

interface Distribuidor {
	id: string;
	nome: string;
}

export default function DistribuidoresPage() {
	const [distribuidores, setDistribuidores] = useState<Distribuidor[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [searchField] = useState<"nome">("nome");
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const perPage = 100;

	// Modal edição distribuidor
	const [modalOpen, setModalOpen] = useState(false);
	const [selectedDistribuidor, setSelectedDistribuidor] = useState<Distribuidor | null>(null);
	// Modal criar distribuidor
	const [modalCreateOpen, setModalCreateOpen] = useState(false);

	async function handleSaveEditDistribuidor(updated: { id: string; nome: string }) {
		await fetch("/api/distribuidores", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(updated)
		});
		setModalOpen(false);
		await fetchDistribuidores({ page, search, searchField });
	}

	async function handleCreateDistribuidor(newDistribuidor: { nome: string }): Promise<{ distribuidorId: string }> {
		const res = await fetch("/api/distribuidores", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(newDistribuidor)
		});
		const data = await res.json();

		if (!res.ok) {
			console.error("Erro ao criar distribuidor:", data);
			throw new Error(data.error || "Erro ao criar distribuidor");
		}

		setModalCreateOpen(false);
		await fetchDistribuidores({ page, search, searchField });

		return { distribuidorId: data.distribuidorId };
	}

	async function fetchDistribuidores({ page, search, searchField }: { page: number; search: string; searchField: string }) {
		setLoading(true);
		const params = new URLSearchParams({
			page: String(page),
			limit: String(perPage),
			search: search.trim(),
			searchField
		});
		const res = await fetch(`/api/distribuidores?${params}`);
		const data = await res.json();
		setDistribuidores(data.distribuidores || []);
		setTotal(data.total || 0);
		setLoading(false);
	}

	useEffect(() => {
		setPage(1);
	}, [search, searchField]);

	useEffect(() => {
		fetchDistribuidores({ page, search, searchField });
	}, [page, search, searchField]);

	const totalDistribuidores = total;

	return (
		<div className="min-h-screen bg-background">
			<Sidebar />
			<main className="flex-1 p-8" style={{ paddingLeft: 256 }}>
				<h1 className="text-3xl font-bold mb-1 text-amber-500">Distribuidores Cadastrados</h1>
				<p className="text-muted-foreground mb-6">Gerencie os distribuidores disponíveis no sistema</p>

				{/* Cards de resumo */}
				<div className="flex gap-4 mb-8">
					<div className="flex-1 rounded-lg border border-border bg-card p-6 flex flex-col justify-center shadow">
						<span className="text-sm text-muted-foreground">Total de Distribuidores</span>
						<span className="text-3xl font-bold text-amber-400">{totalDistribuidores}</span>
						<span className="text-xs text-muted-foreground mt-1">distribuidores cadastrados</span>
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
						<h2 className="text-xl font-semibold">Lista de Distribuidores</h2>
						<button
							className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded flex items-center gap-2 transition"
							onClick={() => setModalCreateOpen(true)}
						>
							<span className="text-lg font-bold">+</span> Cadastrar Distribuidor
						</button>
						{modalCreateOpen && (
							<ModalCreateDistribuidor
								isOpen={modalCreateOpen}
								onClose={() => setModalCreateOpen(false)}
								onDistribuidorCreated={handleCreateDistribuidor}
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
							) : distribuidores.length === 0 ? (
								<tr><td colSpan={3} className="p-4 text-center">Nenhum distribuidor encontrado.</td></tr>
							) : (
								distribuidores.map(distribuidor => (
									<tr key={distribuidor.id} className="border-b border-border hover:bg-secondary/40 transition">
										<td className="p-2 font-mono text-xs font-bold">{distribuidor.id}</td>
										<td className="p-2">{distribuidor.nome}</td>
										<td className="p-2">
											<button
												className="hover:text-amber-400 transition"
												title="Editar"
												onClick={() => {
													setSelectedDistribuidor(distribuidor);
													setModalOpen(true);
												}}
											>
												<Pencil className="w-4 h-4" />
											</button>
											{modalOpen && selectedDistribuidor && (
												<ModalEditDistribuidor
													isOpen={modalOpen}
													onClose={() => setModalOpen(false)}
													distribuidor={selectedDistribuidor}
													onSave={handleSaveEditDistribuidor}
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