import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { Home, Box, Clock, Users, Menu, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const menuItems = [
	{ label: "Estoque", icon: Home, href: "/estoque" },
	{ label: "Picking", icon: FileText, href: "/picking" },
	{ label: "Produtos", icon: Box, href: "/produtos" },
	{ label: "Prateleiras", icon: Box, href: "/prateleiras" },
	{ label: "Histórico", icon: Clock, href: "/historico", adminOnly: true },
	{ label: "Usuários", icon: Users, href: "/users", adminOnly: true },
	{ label: "Distribuidores", icon: Box, href: "/distribuidores" },
];

export function Sidebar() {
	const router = useRouter();
	const [isAdmin, setIsAdmin] = useState(false);

	useEffect(() => {
		const role = document.cookie
			.split("; ")
			.find((row) => row.startsWith("role="))
			?.split("=")[1];
		setIsAdmin(role === "admin");
	}, []);

	const handleLogout = async () => {
		try {
			await fetch("/api/logout", { method: "POST" });
		} catch (err) {
			console.error("Erro ao deslogar:", err);
		} finally {
			localStorage.clear();
			sessionStorage.clear();
			router.push("/login");
		}
	};

	return (
		<aside className="fixed top-0 left-0 h-screen w-64 bg-sidebar text-sidebar-foreground p-4 border-r border-sidebar-border z-40">
			<div className="flex items-center gap-2 mb-8">
				<Menu className="w-6 h-6 text-sidebar-primary" />
				<span className="font-bold text-lg">LFC Estoque</span>
			</div>
			<nav className="flex-1">
				<ul className="space-y-2">
					{menuItems
						.filter((item) => !item.adminOnly || isAdmin)
						.map((item) => (
							<li key={item.label}>
								{item.href ? (
									<Button
										asChild
										variant="ghost"
										className={cn("w-full justify-start gap-2 text-left")}
									>
										<Link href={item.href}>
											<item.icon className="w-5 h-5" />
											{item.label}
										</Link>
									</Button>
								) : (
									<Button variant="ghost" className="w-full justify-start gap-2 text-left">
										<item.icon className="w-5 h-5" />
										{item.label}
									</Button>
								)}
							</li>
						))}
				</ul>
			</nav>
			<div className="mt-8">
				<Button
					variant="ghost"
					className="w-full justify-start gap-2 text-left text-red-500"
					onClick={handleLogout}
				>
					Logout
				</Button>
			</div>
		</aside>
	);
}
