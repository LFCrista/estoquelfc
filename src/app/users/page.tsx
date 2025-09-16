'use client'

import { useEffect, useState } from "react";
import { ModalEditUser } from "./components/modal_edit_user";
import { Sidebar } from "../../components/sidebar";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { BadgeCheck, BadgeX, Shield, User, Pencil } from "lucide-react";
import { ModalCreateUser } from "./components/modal_create_user";

interface User {
  id: string;
  role: string;
  status: string;
  created_at: string;
  name: string;
  email: string;
  last_sign_in_at: string | null;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalCreateOpen, setModalCreateOpen] = useState(false);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    if (data.users) {
      setUsers(
        data.users.map((u: any) => ({
          id: u.id,
          role: u.role,
          status: u.status,
          created_at: u.created_at,
          name: u.name,
          email: u.email,
          last_sign_in_at: u.last_sign_in_at ?? null
        }))
      );
    }
    setLoading(false);
  }

  async function handleSaveEditUser(updated: { id: string; name: string; role: string; status: string }) {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated)
    });
    await loadUsers();
  }

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-8" style={{ paddingLeft: 256 }}>
        <h1 className="text-3xl font-bold mb-2">Gerenciamento de Usuários</h1>
        <p className="text-muted-foreground mb-6">Controle de acesso e permissões dos usuários do sistema</p>

        {/* Contadores */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-6 flex flex-col gap-2">
            <span>Total de Usuários</span>
            <span className="text-3xl font-bold">{users.length}</span>
          </Card>
          <Card className="p-6 flex flex-col gap-2">
            <span>Usuários Ativos</span>
            <span className="text-3xl font-bold">{users.filter(u => u.status === "ativo").length}</span>
          </Card>
          <Card className="p-6 flex flex-col gap-2">
            <span>Administradores</span>
            <span className="text-3xl font-bold">{users.filter(u => u.role === "admin").length}</span>
          </Card>
        </div>

        {/* Tabela */}
        <Card className="p-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-semibold">Usuários do Sistema</h2>
            <Button onClick={() => setModalCreateOpen(true)}>+ Adicionar Usuário</Button>
          </div>

          {loading ? (
            <p>Carregando...</p>
          ) : (
            <>
              <ModalCreateUser
                isOpen={modalCreateOpen}
                onClose={() => setModalCreateOpen(false)}
                onUserCreated={loadUsers}
              />
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Função</th>
                    <th>Status</th>
                    <th>Último Acesso</th>
                    <th>Data de Criação</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b hover:bg-secondary/40">
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${user.role === "admin" ? "bg-primary/10 text-primary" : "bg-green-100 text-green-700"}`}>
                          {user.role === "admin" ? <Shield className="w-4 h-4"/> : <User className="w-4 h-4"/>} {user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${user.status === "ativo" ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"}`}>
                          {user.status === "ativo" ? <BadgeCheck className="w-4 h-4"/> : <BadgeX className="w-4 h-4"/>} {user.status}
                        </span>
                      </td>
                      <td>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "-"}</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="w-4 h-4"/>
                        </Button>
                        <ModalEditUser
                          isOpen={modalOpen}
                          onClose={() => setModalOpen(false)}
                          user={selectedUser}
                          onSave={handleSaveEditUser}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
