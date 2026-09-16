-- ================================================================
-- Doxologos Book Companion — Script de Migração SQL
-- Executar no SQL Editor do Supabase
-- ================================================================

-- 1. Tipos de licença
DO $$ BEGIN
  CREATE TYPE book_download_type AS ENUM ('free', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE book_license_type AS ENUM ('personal', 'clinical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- 2. Tabela principal de recursos do livro
-- ================================================================
CREATE TABLE IF NOT EXISTS book_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,           -- ex: 'cap04-ansiedade' (imutável, vai para o QR Code)
    chapter_number INT,                  -- número do capítulo (opcional, para ordenação)
    book_title TEXT NOT NULL DEFAULT 'Livro Doxologos', -- título do livro
    title TEXT NOT NULL,                 -- ex: 'Mapa Mental da Reestruturação Cognitiva'
    description TEXT,                    -- descrição exibida na landing page
    chapter_context TEXT,                -- "No capítulo X, você aprendeu que..."
    bridge_text TEXT,                    -- ponte para a plataforma

    -- Arquivo Gratuito (bucket público)
    free_file_url TEXT NOT NULL,         -- URL pública no Supabase Storage
    free_file_label TEXT DEFAULT 'Baixar Material Gratuito',

    -- Oferta Paga (opcional)
    has_paid_version BOOLEAN DEFAULT FALSE,
    paid_title TEXT,
    paid_description TEXT,
    paid_price_brl NUMERIC(10,2) DEFAULT 0,
    paid_file_url TEXT,
    paid_license_type book_license_type DEFAULT 'clinical',
    paid_file_label TEXT DEFAULT 'Desbloquear Versão Clínica',

    -- Controle e Analytics
    is_active BOOLEAN DEFAULT TRUE,
    view_count INT DEFAULT 0,
    download_count INT DEFAULT 0,
    purchase_count INT DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE book_resources IS 'Recursos digitais complementares ao livro físico/digital, acessados via QR Code';
COMMENT ON COLUMN book_resources.slug IS 'Identificador único e imutável do QR Code. Não alterar após impressão do livro.';

-- ================================================================
-- 3. Tabela de downloads e licenças do usuário
-- ================================================================
CREATE TABLE IF NOT EXISTS user_book_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resource_id UUID NOT NULL REFERENCES book_resources(id) ON DELETE CASCADE,
    download_type book_download_type NOT NULL,

    -- Lead capture (para downloads gratuitos sem login)
    lead_name TEXT,
    lead_email TEXT,

    -- Dados da compra
    payment_status TEXT DEFAULT 'completed',
    payment_id TEXT,
    paid_amount_brl NUMERIC(10,2),
    license_type book_license_type DEFAULT 'personal',

    -- UTM / Rastreabilidade
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE user_book_downloads IS 'Histórico de downloads gratuitos e licenças pagas por usuário/lead';

-- ================================================================
-- 4. Índices de Performance
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_book_resources_slug ON book_resources(slug) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_book_resources_active ON book_resources(is_active, chapter_number);
CREATE INDEX IF NOT EXISTS idx_user_book_downloads_user ON user_book_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_book_downloads_resource ON user_book_downloads(resource_id);
CREATE INDEX IF NOT EXISTS idx_user_book_downloads_email ON user_book_downloads(lead_email);
CREATE INDEX IF NOT EXISTS idx_user_book_downloads_payment ON user_book_downloads(payment_id) WHERE payment_id IS NOT NULL;

-- ================================================================
-- 5. Trigger de updated_at automático
-- ================================================================
CREATE OR REPLACE FUNCTION update_book_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_book_resources_updated_at ON book_resources;
CREATE TRIGGER trg_book_resources_updated_at
    BEFORE UPDATE ON book_resources
    FOR EACH ROW EXECUTE FUNCTION update_book_resources_updated_at();

-- ================================================================
-- 6. Funções auxiliares (atomic counters)
-- ================================================================
CREATE OR REPLACE FUNCTION increment_book_resource_views(p_slug TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE book_resources SET view_count = view_count + 1 WHERE slug = p_slug AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_book_resource_downloads(p_resource_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE book_resources SET download_count = download_count + 1 WHERE id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_book_resource_purchases(p_resource_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE book_resources SET purchase_count = purchase_count + 1 WHERE id = p_resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 7. Row Level Security (RLS)
-- ================================================================
ALTER TABLE book_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_book_downloads ENABLE ROW LEVEL SECURITY;

-- book_resources: público pode ler recursos ativos
DROP POLICY IF EXISTS "book_resources_public_read" ON book_resources;
CREATE POLICY "book_resources_public_read"
    ON book_resources FOR SELECT
    USING (is_active = TRUE);

-- book_resources: apenas admins podem gerenciar
DROP POLICY IF EXISTS "book_resources_admin_all" ON book_resources;
CREATE POLICY "book_resources_admin_all"
    ON book_resources FOR ALL
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- user_book_downloads: usuário vê apenas os seus
DROP POLICY IF EXISTS "user_book_downloads_own_read" ON user_book_downloads;
CREATE POLICY "user_book_downloads_own_read"
    ON user_book_downloads FOR SELECT
    USING (user_id = auth.uid());

-- user_book_downloads: qualquer um pode inserir (lead anonimo + logado)
DROP POLICY IF EXISTS "user_book_downloads_insert" ON user_book_downloads;
CREATE POLICY "user_book_downloads_insert"
    ON user_book_downloads FOR INSERT
    WITH CHECK (true);

-- user_book_downloads: admins podem ler tudo
DROP POLICY IF EXISTS "user_book_downloads_admin_read" ON user_book_downloads;
CREATE POLICY "user_book_downloads_admin_read"
    ON user_book_downloads FOR SELECT
    USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );

-- user_book_downloads: sistema pode atualizar (confirmar pagamento)
DROP POLICY IF EXISTS "user_book_downloads_system_update" ON user_book_downloads;
CREATE POLICY "user_book_downloads_system_update"
    ON user_book_downloads FOR UPDATE
    USING (true);
