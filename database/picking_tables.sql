-- Script SQL para criar as tabelas de Picking/Romaneio no Supabase
-- Execute este script no SQL Editor do Supabase

-- Tabela de romaneios
CREATE TABLE IF NOT EXISTS romaneios (
  id BIGSERIAL PRIMARY KEY,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar colunas se não existirem
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='romaneios' AND column_name='numero') THEN
    ALTER TABLE romaneios ADD COLUMN numero VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='romaneios' AND column_name='descricao') THEN
    ALTER TABLE romaneios ADD COLUMN descricao TEXT;
  END IF;
END $$;

-- Adicionar constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'romaneios_numero_key') THEN
    ALTER TABLE romaneios ADD CONSTRAINT romaneios_numero_key UNIQUE (numero);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'romaneios_numero_not_null') THEN
    ALTER TABLE romaneios ALTER COLUMN numero SET NOT NULL;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Tabela de itens do romaneio
CREATE TABLE IF NOT EXISTS romaneio_items (
  id BIGSERIAL PRIMARY KEY,
  romaneio_id BIGINT NOT NULL REFERENCES romaneios(id) ON DELETE CASCADE,
  produto_id BIGINT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  prateleira_id BIGINT NOT NULL REFERENCES prateleiras(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  coletado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_romaneios_status ON romaneios(status);
CREATE INDEX IF NOT EXISTS idx_romaneios_created_at ON romaneios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_romaneio_items_romaneio_id ON romaneio_items(romaneio_id);
CREATE INDEX IF NOT EXISTS idx_romaneio_items_produto_id ON romaneio_items(produto_id);
CREATE INDEX IF NOT EXISTS idx_romaneio_items_prateleira_id ON romaneio_items(prateleira_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE romaneios ENABLE ROW LEVEL SECURITY;
ALTER TABLE romaneio_items ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Permitir leitura de romaneios para usuários autenticados" ON romaneios;
DROP POLICY IF EXISTS "Permitir inserção de romaneios para usuários autenticados" ON romaneios;
DROP POLICY IF EXISTS "Permitir atualização de romaneios para usuários autenticados" ON romaneios;
DROP POLICY IF EXISTS "Permitir exclusão de romaneios para usuários autenticados" ON romaneios;
DROP POLICY IF EXISTS "Permitir leitura de romaneio_items para usuários autenticados" ON romaneio_items;
DROP POLICY IF EXISTS "Permitir inserção de romaneio_items para usuários autenticados" ON romaneio_items;
DROP POLICY IF EXISTS "Permitir atualização de romaneio_items para usuários autenticados" ON romaneio_items;
DROP POLICY IF EXISTS "Permitir exclusão de romaneio_items para usuários autenticados" ON romaneio_items;

-- Políticas de acesso (ajuste conforme suas necessidades de segurança)
-- Para permitir acesso completo a todos os usuários autenticados:

CREATE POLICY "Permitir leitura de romaneios para usuários autenticados"
ON romaneios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir inserção de romaneios para usuários autenticados"
ON romaneios FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualização de romaneios para usuários autenticados"
ON romaneios FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Permitir exclusão de romaneios para usuários autenticados"
ON romaneios FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Permitir leitura de romaneio_items para usuários autenticados"
ON romaneio_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir inserção de romaneio_items para usuários autenticados"
ON romaneio_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir atualização de romaneio_items para usuários autenticados"
ON romaneio_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Permitir exclusão de romaneio_items para usuários autenticados"
ON romaneio_items FOR DELETE
TO authenticated
USING (true);

-- Função para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS update_romaneios_updated_at ON romaneios;

-- Trigger para atualizar updated_at em romaneios
CREATE TRIGGER update_romaneios_updated_at
BEFORE UPDATE ON romaneios
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Comentários nas tabelas
COMMENT ON TABLE romaneios IS 'Tabela para armazenar os romaneios de picking';
COMMENT ON TABLE romaneio_items IS 'Tabela para armazenar os itens de cada romaneio';
COMMENT ON COLUMN romaneios.numero IS 'Número único do romaneio (ex: ROM-001, ROM-002)';
COMMENT ON COLUMN romaneios.descricao IS 'Descrição opcional do romaneio';
COMMENT ON COLUMN romaneios.status IS 'Status do romaneio: pendente, em_andamento, concluido, cancelado';
COMMENT ON COLUMN romaneio_items.coletado IS 'Indica se o item já foi coletado/bipado';
