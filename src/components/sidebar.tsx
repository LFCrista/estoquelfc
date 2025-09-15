

import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { Home, Box, Clock, FileText, Users, Settings, Menu } from "lucide-react";

const menuItems = [
	{ label: "Estoque", icon: Home },
	{ label: "Produtos", icon: Box },
	{ label: "Histórico", icon: Clock },
	{ label: "Relatórios", icon: FileText },
	{ label: "Usuários", icon: Users, active: true },
	{ label: "Configurações", icon: Settings },
];

export function Sidebar() {
	return (
		<aside className="flex flex-col h-screen w-64 bg-sidebar text-sidebar-foreground p-4 border-r border-sidebar-border">
			<div className="flex items-center gap-2 mb-8">
				<Menu className="w-6 h-6 text-sidebar-primary" />
				<span className="font-bold text-lg">BookStock</span>
			</div>
			<nav className="flex-1">
				<ul className="space-y-2">
					{menuItems.map((item) => (
						<li key={item.label}>
							<Button
								variant={item.active ? "secondary" : "ghost"}
								className={cn(
									"w-full justify-start gap-2 text-left",
									item.active && "bg-sidebar-primary/10 text-sidebar-primary"
								)}
							>
								<item.icon className="w-5 h-5" />
								{item.label}
							</Button>
						</li>
					))}
				</ul>
			</nav>
		</aside>
	);
}
