

import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { Home, Box, Clock, FileText, Users, Settings, Menu } from "lucide-react";
import Link from "next/link";

const menuItems = [
	{ label: "Estoque", icon: Home, href: "/estoque" },
	{ label: "Produtos", icon: Box, href: "/produtos" },
	{ label: "Prateleiras", icon: Box, href: "/prateleiras" },
	{ label: "Histórico", icon: Clock },
	{ label: "Relatórios", icon: FileText },
	{ label: "Usuários", icon: Users, href: "/users" },
	{ label: "Configurações", icon: Settings },
];

export function Sidebar() {
	return (
		<aside className="fixed top-0 left-0 h-screen w-64 bg-sidebar text-sidebar-foreground p-4 border-r border-sidebar-border z-40">
			<div className="flex items-center gap-2 mb-8">
				<Menu className="w-6 h-6 text-sidebar-primary" />
				<span className="font-bold text-lg">BookStock</span>
			</div>
			<nav className="flex-1">
				<ul className="space-y-2">
					{menuItems.map((item) => (
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
		</aside>
	);
}
