# 🗄️ Estrutura do Banco de Dados Supabase

## ⚠️ Problema Identificado

O erro `PGRST200` indica que há um problema na estrutura das tabelas do Supabase. O sistema tentava fazer JOIN entre `reviews` e `users_public`, mas essa relação não existe.

## ✅ Soluções Aplicadas

### 1. **Queries Corrigidas**
As queries foram ajustadas para não depender de tabelas inexistentes:

```sql
-- ANTES (com erro)
SELECT *, patient:users_public(full_name) FROM reviews

-- DEPOIS (corrigido)  
SELECT * FROM reviews
```

### 2. **Interface Adaptada**
Os componentes foram atualizados para usar campos diretos da tabela:
- `review.patient.full_name` → `review.patient_name`
- `booking.user.full_name` → `booking.patient_name`

## 🏗️ Estrutura Recomendada para o Supabase

### Tabelas Principais:

#### 1. **professionals**
```sql
CREATE TABLE professionals (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    specialty TEXT,
    mini_curriculum TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. **services**
```sql
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL(10,2),
    duration_minutes INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. **bookings**
```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES professionals(id),
    service_id UUID REFERENCES services(id),
    patient_name TEXT NOT NULL,
    patient_email TEXT NOT NULL,
    patient_phone TEXT,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. **reviews**
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES professionals(id),
    patient_name TEXT NOT NULL,
    patient_email TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. **availability**
```sql
CREATE TABLE availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES professionals(id),
    day_of_week TEXT NOT NULL,
    available_times JSONB,
    UNIQUE(professional_id, day_of_week)
);
```

#### 6. **blocked_dates**
```sql
CREATE TABLE blocked_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES professionals(id),
    blocked_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7. **eventos**
```sql
CREATE TABLE eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    tipo_evento TEXT DEFAULT 'Workshop',
    data_inicio TIMESTAMPTZ NOT NULL,
    data_fim TIMESTAMPTZ,
    professional_id UUID REFERENCES professionals(id),
    limite_participantes INTEGER,
    data_limite_inscricao TIMESTAMPTZ,
    link_slug TEXT UNIQUE,
    status TEXT DEFAULT 'aberto',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 Como Implementar no Supabase

### Opção 1: **SQL Editor** (Recomendado)
1. Acesse o Supabase Dashboard
2. Vá em "SQL Editor"
3. Execute os scripts SQL acima

### Opção 2: **Table Editor**
1. Vá em "Table Editor"
2. Crie cada tabela manualmente
3. Configure as relações (Foreign Keys)

### Opção 3: **Migrations** (Avançado)
1. Configure o Supabase CLI
2. Crie migrations para cada tabela
3. Execute `supabase db push`

## 🔒 Configurações de Segurança (RLS)

### Habilitar RLS nas Tabelas:
```sql
-- Exemplo para tabela professionals
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

-- Política para admins lerem tudo
CREATE POLICY "Admins can read all professionals" ON professionals
    FOR SELECT USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- Política para profissionais lerem próprios dados
CREATE POLICY "Professionals can read own data" ON professionals
    FOR SELECT USING (
        auth.uid() = id
    );
```

## 🎯 Estado Atual do Sistema

✅ **Queries corrigidas** - não há mais erro PGRST200  
✅ **Interface adaptada** - usa campos diretos das tabelas  
⚠️ **Tabelas podem precisar ser criadas** no Supabase  
⚠️ **RLS pode precisar configuração** para segurança  

## 📋 Próximos Passos

1. **Verificar estrutura atual** no Supabase Dashboard
2. **Criar tabelas faltantes** se necessário
3. **Configurar RLS** para segurança
4. **Testar funcionalidades** com dados reais

## 🆘 Comandos de Verificação

```sql
-- Verificar se tabelas existem
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar estrutura de uma tabela
\d professionals

-- Verificar foreign keys
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint WHERE contype = 'f';
```