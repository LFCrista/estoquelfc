# Módulo de Picking/Romaneio

## Descrição

Este módulo permite que o estoquista faça a bipagem de produtos por código de barras para criar romaneios de picking otimizados. Cada bipagem representa 1 unidade de caixa do produto.

## Funcionalidades

### 1. Bipagem de Produtos
- O estoquista bipa o código de barras do produto
- O sistema automaticamente busca o produto no estoque
- Cada bipagem adiciona 1 unidade à lista
- Se o mesmo produto for bipado novamente, incrementa a quantidade

### 2. Geração de Romaneio
- Quando o estoquista termina de bipar todos os produtos
- O sistema gera um romaneio com rota otimizada
- A rota é organizada por ordem alfabética das prateleiras (A, B, C, D...)
- Dentro de cada letra, os números são ordenados crescentemente

### 3. Otimização de Rota

**Exemplo de rota otimizada:**
```
Prateleira A: a21, a56
Prateleira B: b21, b59
Prateleira C: c21, c67
Prateleira D: d44, d76
```

O sistema garante que o estoquista percorra o menor caminho possível seguindo a ordem lógica do armazém.

## Como Usar

### 1. Configurar o Banco de Dados

Execute o script SQL no Supabase:
```bash
# Acesse o SQL Editor no Supabase e execute o arquivo:
database/picking_tables.sql
```

### 2. Acessar o Módulo

1. Faça login no sistema
2. Clique em "Picking" no menu lateral
3. A página de bipagem será aberta

### 3. Bipar Produtos

1. Digite ou escaneie o código de barras no campo de entrada
2. Pressione Enter ou clique em "Adicionar"
3. O produto será adicionado à lista com quantidade 1
4. Continue bipando todos os produtos necessários
5. Se bipar o mesmo produto novamente, a quantidade será incrementada

### 4. Gerar Romaneio

1. Após bipar todos os produtos, clique em "Gerar Romaneio"
2. O sistema mostrará a rota otimizada
3. Os produtos serão agrupados por prateleira
4. As prateleiras serão ordenadas alfabeticamente

### 5. Finalizar

Você pode:
- **Imprimir**: Gera uma versão para impressão do romaneio
- **Finalizar**: Salva o romaneio no banco de dados
- **Voltar**: Retorna para adicionar mais produtos

## Estrutura de Dados

### Tabela: romaneios
- `id`: UUID único
- `status`: pendente | em_andamento | concluido | cancelado
- `created_at`: Data de criação
- `updated_at`: Data de atualização

### Tabela: romaneio_items
- `id`: UUID único
- `romaneio_id`: Referência ao romaneio
- `produto_id`: Referência ao produto
- `prateleira_id`: Referência à prateleira
- `quantidade`: Quantidade de caixas
- `coletado`: Se foi coletado (para controle futuro)
- `created_at`: Data de criação

## API Endpoints

### GET /api/picking
Lista todos os romaneios com paginação

**Parâmetros:**
- `page`: Número da página (padrão: 1)

**Resposta:**
```json
{
  "data": [...],
  "total": 100
}
```

### POST /api/picking
Cria um novo romaneio com itens

**Body:**
```json
{
  "items": [
    {
      "produto_id": "uuid",
      "prateleira_id": "uuid",
      "quantidade": 1
    }
  ]
}
```

### PATCH /api/picking
Atualiza o status de um romaneio

**Body:**
```json
{
  "id": "uuid",
  "status": "concluido"
}
```

### DELETE /api/picking
Deleta um romaneio

**Parâmetros:**
- `id`: UUID do romaneio

## Lógica de Otimização

A função `otimizarRota()` em [src/app/picking/page.tsx](src/app/picking/page.tsx) realiza:

1. **Agrupamento por prateleira**: Todos os produtos da mesma prateleira são agrupados
2. **Extração de letra e número**: De cada nome de prateleira (ex: "a21" → letra="a", número=21)
3. **Ordenação alfabética**: Primeiro por letra (a, b, c, d...)
4. **Ordenação numérica**: Dentro de cada letra, por número crescente (21, 56, 59...)

## Próximas Melhorias Sugeridas

- [ ] Histórico de romaneios finalizados
- [ ] Relatórios de performance de picking
- [ ] Scanner de código de barras via câmera (para mobile)
- [ ] Status de coleta em tempo real
- [ ] Integração com impressora térmica
- [ ] Assinatura digital do conferente
- [ ] Tempo médio de picking por produto
