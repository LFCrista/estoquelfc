"use client";
import { useEffect, useState } from "react";
import { Sidebar } from "../../components/sidebar";
import { Pagination } from "../../components/ui/pagination";
import { ModalCreateEstoque } from "./components/modal_create_estoque";
import { ModalMoveEstoque } from "./components/modal_move_estoque";

interface Estoque {
	id: string;
	produto_id: string;
	prateleira_id: string;
	quantidade: number;
	produto?: {
		nome: string;
		SKU?: string;
		codBarras?: string;
		estoque_baixo?: number;
	};
	prateleira?: {
		nome: string;
	};
}

export default function EstoquePage() {
	const [estoque, setEstoque] = useState<Estoque[]>([]);
	const [loading, setLoading] = useState(true);
	const [search] = useState("");
	const [searchField] = useState<"produto_id" | "prateleira_id">("produto_id");
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const perPage = 100;
	const [modalCreateOpen, setModalCreateOpen] = useState(false);
	// Modal de movimentação
	const [modalMoveOpen, setModalMoveOpen] = useState(false);
	const [moveLivro, setMoveLivro] = useState<{ id: string; nome: string } | null>(null);
	const [movePrateleiras, setMovePrateleiras] = useState<{ id: string; nome: string; quantidade: number }[]>([]);
	const [totalLivros, setTotalLivros] = useState(0);
	const [baixoEstoque, setBaixoEstoque] = useState(0);
	const [semEstoque, setSemEstoque] = useState(0);

	async function handleCreateEstoque(data: { produto_id: string; prateleira_id: string; quantidade: number }) {
		await fetch("/api/estoque", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data)
		});
		setModalCreateOpen(false);
		await fetchEstoque({ page, search, searchField });
	}

	async function fetchEstoque({ page, search, searchField }: { page: number; search: string; searchField: string }) {
		setLoading(true);
		const params = new URLSearchParams({
			page: String(page),
			limit: String(perPage),
			search: search.trim(),
			searchField
		});
		const res = await fetch(`/api/estoque?${params}`);
		const data = await res.json();
		console.log("Dados retornados pela API:", data);
		setEstoque(data.estoque || []);
		setTotal(data.total || 0);

		// Group quantities by product
		const produtoQuantidades = data.estoque.reduce((acc: Record<string, { quantidadeTotal: number; estoqueBaixo: number }>, item: Estoque) => {
			if (!acc[item.produto_id]) {
				acc[item.produto_id] = {
					quantidadeTotal: 0,
					estoqueBaixo: item.produto?.estoque_baixo || 0,
				};
			}
			acc[item.produto_id].quantidadeTotal += item.quantidade;
			return acc;
		}, {});

		console.log("Produto Quantidades:", produtoQuantidades);

		// Calculate dynamic card values
		const produtosComEstoque = Object.keys(produtoQuantidades);
		const baixoEstoque = produtosComEstoque.filter((produtoId) => {
			const { quantidadeTotal, estoqueBaixo } = produtoQuantidades[produtoId];
			console.log(`Produto ID: ${produtoId}, Quantidade Total: ${quantidadeTotal}, Estoque Baixo: ${estoqueBaixo}`);
			if (estoqueBaixo === undefined || estoqueBaixo === null) {
				console.warn(`Produto ${produtoId} não possui estoque_baixo definido.`);
				return false;
			}
			if (quantidadeTotal <= estoqueBaixo) {
				console.log(`Produto ${produtoId} é considerado baixo estoque.`);
				return true;
			}
			return false;
		}).length;
		const semEstoque = produtosComEstoque.filter((produtoId) => produtoQuantidades[produtoId].quantidadeTotal === 0).length;

		setTotalLivros(produtosComEstoque.length);
		setBaixoEstoque(baixoEstoque);
		setSemEstoque(semEstoque);

		setLoading(false);
	}

	useEffect(() => {
		setPage(1);
	}, [search, searchField]);

	useEffect(() => {
		fetchEstoque({ page, search, searchField });
	}, [page, search, searchField]);

		// Agrupar estoques por produto
		const agrupado = estoque.reduce((acc, item) => {
			const key = item.produto_id;
			if (!acc[key]) {
				acc[key] = {
					id: item.id,
					produto_id: item.produto_id,
					nome: item.produto?.nome || item.produto_id,
					prateleiras: [],
					quantidadeTotal: 0,
				};
			}
			acc[key].prateleiras.push({
				nome: item.prateleira?.nome || item.prateleira_id,
				quantidade: item.quantidade,
			});
			acc[key].quantidadeTotal += item.quantidade;
			return acc;
		}, {} as Record<string, {
			id: string;
			produto_id: string;
			nome: string;
			prateleiras: { nome: string; quantidade: number }[];
			quantidadeTotal: number;
		}>);
		const agrupadoArr = Object.values(agrupado);

		return (
			<div className="min-h-screen bg-background">
				<Sidebar />
				<main className="flex-1 p-8" style={{ paddingLeft: 256 }}>
					<h1 className="text-3xl font-bold mb-1 text-amber-500">Controle de Estoque</h1>
					<p className="text-muted-foreground mb-6">Gerencie o estoque de livros e suas localizações nas prateleiras</p>
					{/* Cards de resumo */}
					<div className="flex gap-4 mb-8">
						<div className="flex-1 rounded-lg border border-border bg-card p-6 flex flex-col justify-center shadow">
							<span className="text-sm text-muted-foreground">Total de Produtos com Estoque</span>
							<span className="text-3xl font-bold text-amber-400">{totalLivros}</span>
							<span className="text-xs text-muted-foreground mt-1">produtos com estoque criado</span>
						</div>
						<div className="flex-1 rounded-lg border border-yellow-900 bg-card p-6 flex flex-col justify-center shadow">
							<span className="text-sm text-muted-foreground">Baixo Estoque</span>
							<span className="text-3xl font-bold text-yellow-400">{baixoEstoque}</span>
							<span className="text-xs text-muted-foreground mt-1">produtos com estoque abaixo do limite</span>
						</div>
						<div className="flex-1 rounded-lg border border-red-900 bg-card p-6 flex flex-col justify-center shadow">
							<span className="text-sm text-muted-foreground">Sem Estoque</span>
							<span className="text-3xl font-bold text-red-400">{semEstoque}</span>
							<span className="text-xs text-muted-foreground mt-1">produtos sem estoque</span>
						</div>
					</div>
					<div className="rounded-lg shadow bg-card p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-semibold">Controle de Estoque</h2>
							<button
								className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded flex items-center gap-2 transition"
								onClick={() => setModalCreateOpen(true)}
							>
								<span className="text-lg font-bold">+</span> Adicionar Estoque
							</button>
							{modalCreateOpen && (
								<ModalCreateEstoque
									isOpen={modalCreateOpen}
									onClose={() => setModalCreateOpen(false)}
									onEstoqueCreated={handleCreateEstoque}
								/>
							)}
						</div>
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr className="border-b border-border text-muted-foreground">
									<th className="p-2 text-left font-semibold">ID</th>
									<th className="p-2 text-left font-semibold">Nome do Livro</th>
									<th className="p-2 text-left font-semibold">Prateleiras</th>
									<th className="p-2 text-left font-semibold">Qtd. em cada</th>
									<th className="p-2 text-left font-semibold">Qtd. Total</th>
									<th className="p-2 text-left font-semibold">Ação</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr><td colSpan={5} className="p-4 text-center">Carregando...</td></tr>
								) : agrupadoArr.length === 0 ? (
									<tr><td colSpan={5} className="p-4 text-center">Nenhum item de estoque encontrado.</td></tr>
								) : (
									agrupadoArr.map(item => (
										<tr key={item.produto_id} className="border-b border-border hover:bg-secondary/40 transition">
											<td className="p-2 font-mono text-xs font-bold">{item.id}</td>
											<td className="p-2">{item.nome}</td>
											<td className="p-2">
												{item.prateleiras.map((p, idx) => (
													<div key={idx} className="mb-1">
														<span className="inline-block px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold mr-1">{p.nome}</span>
													</div>
												))}
											</td>
											<td className="p-2">
												{item.prateleiras.map((p, idx) => (
													<div key={idx} className="mb-1">
														<span className="inline-block px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold mr-1">{p.quantidade}</span>
													</div>
												))}
											</td>
											<td className="p-2 font-bold text-lg">{item.quantidadeTotal}</td>
											<td className="p-2">
												<span
													className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold text-xs cursor-pointer hover:bg-amber-200 transition"
													onClick={() => {
														setMoveLivro({ id: item.produto_id, nome: item.nome });
														// Buscar todas as prateleiras reais desse produto
														setMovePrateleiras(
															estoque
																.filter(e => e.produto_id === item.produto_id)
																.map(e => ({
																	id: e.prateleira_id, // id real do banco
																	nome: e.prateleira?.nome || e.prateleira_id,
																	quantidade: e.quantidade
																}))
														);
														setModalMoveOpen(true);
													}}
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.13-.31 2.19-.85 3.09l1.46 1.46A7.963 7.963 0 0 0 20 12c0-4.42-3.58-8-8-8Zm-6.41.59L4.99 6.05A7.963 7.963 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3c-3.31 0-6-2.69-6-6 0-1.13.31-2.19.85-3.09l-1.46-1.46Z"/></svg>
													Movimentar
												</span>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
						<Pagination
							page={page}
							total={total}
							perPage={perPage}
							onPageChange={setPage}
						/>
					</div>
					{/* Modal de movimentação de estoque */}
					{modalMoveOpen && moveLivro && (
						<ModalMoveEstoque
							isOpen={modalMoveOpen}
							onClose={() => setModalMoveOpen(false)}
							livro={moveLivro}
							prateleiras={movePrateleiras}
							onSubmit={async () => {
								setModalMoveOpen(false);
								await fetchEstoque({ page, search, searchField });
							}}
						/>
					)}
				</main>
			</div>
		);
}
