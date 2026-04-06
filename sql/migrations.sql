-- ============================================================
-- LUCASCAR — Migração Completa
-- Execute no Supabase SQL Editor
-- Seguro para re-executar: remove tabelas antigas antes de criar
-- ============================================================

-- ============================================================
-- DROP (ordem inversa para respeitar FKs)
-- ============================================================
DROP TABLE IF EXISTS orcamento_itens  CASCADE;
DROP TABLE IF EXISTS orcamentos       CASCADE;
DROP TABLE IF EXISTS veiculos         CASCADE;
DROP TABLE IF EXISTS clientes         CASCADE;
DROP TABLE IF EXISTS servicos         CASCADE;
DROP TABLE IF EXISTS config           CASCADE;

DROP FUNCTION IF EXISTS update_updated_at CASCADE;

-- ============================================================
-- CONFIG
-- Configurações globais do sistema (single row)
-- ============================================================
CREATE TABLE config (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_hash     text        NOT NULL DEFAULT '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
  nome_empresa text        NOT NULL DEFAULT 'LUCASCAR',
  logo_url     text,
  telefone     text,
  endereco     text,
  cnpj         text,
  email        text,
  cores_marca  jsonb       NOT NULL DEFAULT '{"primaria": "#00ff00", "secundaria": "#111111"}',
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Registro padrão (PIN = 1234)
INSERT INTO config (pin_hash, nome_empresa, telefone)
VALUES (
  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
  'LUCASCAR',
  '27 99884-2656'
);

-- ============================================================
-- SERVIÇOS
-- ============================================================
CREATE TABLE servicos (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         text          NOT NULL,
  descricao    text,
  valor_padrao numeric(10,2) NOT NULL DEFAULT 0,
  prazo_dias   integer       NOT NULL DEFAULT 1,
  ativo        boolean       NOT NULL DEFAULT true,
  created_at   timestamptz   NOT NULL DEFAULT now()
);

-- ============================================================
-- CLIENTES
-- ============================================================
CREATE TABLE clientes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text        NOT NULL,
  telefone   text,
  email      text,
  endereco   text,
  cpf_cnpj   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- VEÍCULOS
-- ============================================================
CREATE TABLE veiculos (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid        REFERENCES clientes(id) ON DELETE SET NULL,
  marca      text        NOT NULL,
  modelo     text        NOT NULL,
  ano        text,
  cor        text,
  placa      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX veiculos_cliente_id_idx ON veiculos (cliente_id);

-- ============================================================
-- ORÇAMENTOS
-- ============================================================
CREATE TABLE orcamentos (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    uuid          REFERENCES clientes(id) ON DELETE SET NULL,
  veiculo_id    uuid          REFERENCES veiculos(id) ON DELETE SET NULL,
  status        text          NOT NULL DEFAULT 'pendente'
                                CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'concluido')),
  observacoes   text,
  validade_dias integer       NOT NULL DEFAULT 15,
  desconto      numeric(10,2) NOT NULL DEFAULT 0,
  valor_total   numeric(10,2) NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX orcamentos_cliente_id_idx ON orcamentos (cliente_id);
CREATE INDEX orcamentos_veiculo_id_idx ON orcamentos (veiculo_id);
CREATE INDEX orcamentos_status_idx     ON orcamentos (status);
CREATE INDEX orcamentos_created_at_idx ON orcamentos (created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orcamentos_updated_at
  BEFORE UPDATE ON orcamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ITENS DO ORÇAMENTO
-- ============================================================
CREATE TABLE orcamento_itens (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id   uuid          NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  servico_id     uuid          REFERENCES servicos(id) ON DELETE SET NULL,
  descricao      text          NOT NULL,
  quantidade     integer       NOT NULL DEFAULT 1,
  valor_unitario numeric(10,2) NOT NULL DEFAULT 0,
  valor_total    numeric(10,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  created_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX orcamento_itens_orcamento_id_idx ON orcamento_itens (orcamento_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- Sistema single-user: permite tudo para anon key
-- ============================================================
ALTER TABLE config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamento_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON config          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON servicos        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON clientes        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON veiculos        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON orcamentos      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON orcamento_itens FOR ALL TO anon USING (true) WITH CHECK (true);
