import { useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

interface ModalCreateUserProps {
	isOpen: boolean;
	onClose: () => void;
	onUserCreated: () => void;
}

export function ModalCreateUser({ isOpen, onClose, onUserCreated }: ModalCreateUserProps) {
		const [email, setEmail] = useState("");
		const [password, setPassword] = useState("");
		const [name, setName] = useState("");
		const [role, setRole] = useState("user");
		const [loading, setLoading] = useState(false);
		const [error, setError] = useState<string | null>(null);


		async function handleSubmit(e: React.FormEvent) {
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

				const res = await fetch("/api/users", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, password, name, role })
				});
				const data = await res.json();

				if (!res.ok) {
					setError(data.error || "Erro ao cadastrar usuário");
					setLoading(false);
					return;
				}

				// Usa o ID do perfil criado como entidade_id
				const profileId = data.user?.profileId;

				if (!profileId) {
					setError("ID do perfil não retornado pela API.");
					setLoading(false);
					return;
				}

				
				const historicoRes = await fetch("/api/historico", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ user_id: userId, entidade: "user", entidade_id: profileId, acao: "Criou Usuário", quantidade: null }),
				});

				const historicoData = await historicoRes.json();

				if (!historicoRes.ok) {
					console.error("Erro ao registrar histórico:", historicoData);
					setError(historicoData.error || "Erro ao registrar histórico");
					setLoading(false);
					return;
				}

				setEmail("");
				setPassword("");
				setName("");
				setRole("user");
				onUserCreated();
				onClose();
			} catch (err) {
				console.error("Erro inesperado ao cadastrar usuário:", err);
				setError("Erro inesperado ao cadastrar usuário");
			} finally {
				setLoading(false);
			}
		}

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
			<div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-8 w-full max-w-md relative">
				<button className="absolute top-2 right-2 text-xl" onClick={onClose}>&times;</button>
				<h2 className="text-2xl font-bold mb-4">Adicionar Usuário</h2>
				<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
					<div>
						<Label htmlFor="name">Nome</Label>
						<Input id="name" value={name} onChange={e => setName(e.target.value)} required />
					</div>
					<div>
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
					</div>
					<div>
						<Label htmlFor="password">Senha</Label>
						<Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
					</div>
					<div>
						<Label htmlFor="role">Função</Label>
						<select id="role" className="w-full border rounded px-2 py-1" value={role} onChange={e => setRole(e.target.value)}>
							<option value="user">Usuário</option>
							<option value="admin">Administrador</option>
						</select>
					</div>
					{error && <div className="text-red-600 text-sm">{error}</div>}
					<Button type="submit" disabled={loading}>{loading ? "Cadastrando..." : "Cadastrar"}</Button>
				</form>
			</div>
		</div>
	);
}
