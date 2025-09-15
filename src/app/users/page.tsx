

import { Sidebar } from "../../components/sidebar";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { BadgeCheck, BadgeX, User, Shield, Eye, Pencil } from "lucide-react";

const users = [
	{
		name: "João Silva",
		email: "joao@empresa.com",
		role: "Administrador",
		status: "Ativo",
		lastAccess: "17/01/2024 10:30",
		createdAt: "01/01/2024",
	},
	{
		name: "Maria Santos",
		email: "maria@empresa.com",
		role: "Operador",
		status: "Ativo",
		lastAccess: "16/01/2024 15:45",
		createdAt: "05/01/2024",
	},
	{
		name: "Carlos Lima",
		email: "carlos@empresa.com",
		role: "Operador",
		status: "Ativo",
		lastAccess: "17/01/2024 08:15",
		createdAt: "10/01/2024",
	},
	{
		name: "Ana Costa",
		email: "ana@empresa.com",
		role: "Visualizador",
		status: "Inativo",
		lastAccess: "10/01/2024 16:20",
		createdAt: "08/01/2024",
	},
];

export default function UsersPage() {
	return (
		<div className="flex min-h-screen bg-background">
			<Sidebar />
			<main className="flex-1 p-8">
				<h1 className="text-3xl font-bold text-primary mb-2">Gerenciamento de Usuários</h1>
				<p className="text-muted-foreground mb-6">Controle de acesso e permissões dos usuários do sistema</p>
				<div className="grid grid-cols-3 gap-4 mb-8">
					<Card className="bg-card text-card-foreground p-6 flex flex-col gap-2 border border-border shadow-sm">
						<span className="text-sm text-muted-foreground">Total de Usuários</span>
						<span className="text-3xl font-bold">4</span>
						<span className="text-xs text-muted-foreground">usuários cadastrados</span>
					</Card>
					<Card className="bg-card text-card-foreground p-6 flex flex-col gap-2 border border-border shadow-sm">
						<span className="text-sm text-muted-foreground">Usuários Ativos</span>
						<span className="text-3xl font-bold">3</span>
						<span className="text-xs text-muted-foreground">com acesso liberado</span>
					</Card>
					<Card className="bg-card text-card-foreground p-6 flex flex-col gap-2 border border-border shadow-sm">
						<span className="text-sm text-muted-foreground">Administradores</span>
						<span className="text-3xl font-bold">1</span>
						<span className="text-xs text-muted-foreground">com permissões totais</span>
					</Card>
				</div>
				<Card className="bg-card text-card-foreground p-6 border border-border shadow-sm">
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-xl font-semibold">Usuários do Sistema</h2>
						<Button variant="default" className="bg-primary text-primary-foreground hover:bg-primary/90">
							+ Adicionar Usuário
						</Button>
					</div>
					<table className="w-full text-left">
						<thead>
							<tr className="border-b border-border">
								<th className="py-2">Nome</th>
								<th>Email</th>
								<th>Função</th>
								<th>Status</th>
								<th>Último Acesso</th>
								<th>Data de Criação</th>
								<th>Ações</th>
							</tr>
						</thead>
						<tbody>
							{users.map((user) => (
								<tr key={user.email} className="border-b border-border hover:bg-secondary/40">
									<td className="py-2 font-medium">{user.name}</td>
									<td>{user.email}</td>
									<td>
										<span className={
											user.role === "Administrador"
												? "bg-primary/10 text-primary px-2 py-1 rounded text-xs flex items-center gap-1"
												: user.role === "Operador"
												? "bg-green-100 text-green-700 px-2 py-1 rounded text-xs flex items-center gap-1"
												: "bg-muted text-muted-foreground px-2 py-1 rounded text-xs flex items-center gap-1"
										}>
											{user.role === "Administrador" && <Shield className="w-4 h-4" />}
											{user.role === "Operador" && <User className="w-4 h-4" />}
											{user.role === "Visualizador" && <Eye className="w-4 h-4" />}
											{user.role}
										</span>
									</td>
									<td>
										<span className={
											user.status === "Ativo"
												? "bg-green-100 text-green-700 px-2 py-1 rounded text-xs flex items-center gap-1"
												: "bg-destructive/10 text-destructive px-2 py-1 rounded text-xs flex items-center gap-1"
										}>
											{user.status === "Ativo" ? <BadgeCheck className="w-4 h-4" /> : <BadgeX className="w-4 h-4" />}
											{user.status}
										</span>
									</td>
									<td>{user.lastAccess}</td>
									<td>{user.createdAt}</td>
									<td>
										<Button variant="ghost" size="icon">
											<Pencil className="w-4 h-4" />
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</Card>
			</main>
		</div>
	);
}
