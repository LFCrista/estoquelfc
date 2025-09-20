"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Sidebar } from "@/components/sidebar";
import { FaArrowUp, FaArrowDown } from "react-icons/fa"; // Importa os ícones de seta

interface HistoricoItem {
  id: number;
  created_at: string;
  acao: string;
  quem: string; // Novo campo para o nome do usuário
  atualizacao: string; // Novo campo para detalhes da atualização
  quantidade: number; // Novo campo para quantidade
}

interface Filters {
  startDate: string;
  endDate: string;
  user: string;
  entidade: string;
  page: number;
  limit: number;
}

interface User {
  id: string;
  name: string;
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    startDate: "",
    endDate: "",
    user: "",
    entidade: "",
    page: 1,
    limit: 10,
  });
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    async function fetchHistorico() {
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        entidade: filters.entidade,
        user_id: filters.user,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      const response = await fetch(`/api/historico?${queryParams.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setHistorico(data.historico);
        setTotal(data.total);
      }
    }

    fetchHistorico();
  }, [filters]);

  useEffect(() => {
    async function fetchUsers() {
      const response = await fetch(`/api/users`);
      const data = await response.json();

      if (response.ok) {
        setUsers(data.users);
      }
    }

    fetchUsers();
  }, []);

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  
  function renderQuantidade(acao: string, quantidade: number) {
    if (acao === "Adicionou Estoque") {
      return (
        <span className="text-green-500 flex items-center gap-1">
          <FaArrowUp /> {quantidade}
        </span>
      );
    } else if (acao === "Removeu Estoque") {
      return (
        <span className="text-red-500 flex items-center gap-1">
          <FaArrowDown /> {quantidade}
        </span>
      );
    }
    return <span>{quantidade}</span>;
  }

  function renderAtualizacao(atualizacao: string) {
    const [produto, prateleira] = atualizacao.split(" - "); // Separar produto e prateleira
    return (
      <span className="flex items-center gap-2">
        {produto && (
          <span className="bg-orange-100 text-orange-600 border border-orange-500 px-2 py-1 rounded-full text-sm">{produto}</span>
        )}
        
        {prateleira && (
          <>
            <span>-</span>
            <span className="bg-purple-100 text-purple-600 border border-purple-500 px-2 py-1 rounded-full text-sm">{prateleira}</span>
          </>
        )}
      </span>
    );
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="p-6 w-full ml-64">{/* Ajuste para ocupar a largura total */}
        <h1 className="text-2xl font-bold mb-4">Histórico de Movimentações</h1>

        <Card className="p-4 mb-6 w-full">{/* Ajuste para largura total */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{/* Alteração para 4 colunas */}
            <div>
              <Label htmlFor="date">Data</Label>
              <Input
                type="date"
                id="date"
                name="startDate" // Corrigido para corresponder ao estado
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>
            <div>
              <Label htmlFor="user">Usuário</Label>
              <select
                id="user"
                name="user"
                value={filters.user}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">Todos</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="entidade">Onde</Label>
              <select
                id="entidade"
                name="entidade"
                value={filters.entidade}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">Todos</option>
                <option value="produto">Produtos</option>
                <option value="prateleira">Prateleiras</option>
                <option value="estoque">Estoque</option>
                <option value="user">Usuários</option>
              </select>
            </div>
          </div>
          {(filters.startDate || filters.user || filters.entidade) && (
            <Button
              className="mt-4"
              onClick={() => setFilters({ startDate: "", endDate: "", user: "", entidade: "", page: 1, limit: 10 })}
            >
              Limpar Filtros
            </Button>
          )}
        </Card>

        <Card className="p-4 w-full">{/* Ajuste para largura total */}
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2">Quem</th>
                <th className="border border-gray-300 p-2">Ação</th>
                <th className="border border-gray-300 p-2">Atualização</th>
                <th className="border border-gray-300 p-2">Quantidade</th>
                <th className="border border-gray-300 p-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 p-2">{item.quem}</td>
                  <td className="border border-gray-300 p-2">{item.acao}</td>
                  <td className="border border-gray-300 p-2">{renderAtualizacao(item.atualizacao)}</td>
                  <td className="border border-gray-300 p-2">{renderQuantidade(item.acao, item.quantidade)}</td>
                  <td className="border border-gray-300 p-2">
                    {format(new Date(item.created_at), "dd/MM/yyyy HH:mm")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={filters.page}
            total={total}
            perPage={filters.limit}
            onPageChange={(page: number) => setFilters((prev) => ({ ...prev, page }))}
          />
        </Card>
      </div>
    </div>
  );
}