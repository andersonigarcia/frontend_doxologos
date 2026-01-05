# 📝 Guia de Execução das Migrations - Sistema de Eventos

**Data:** 29/10/2025  
**Objetivo:** Executar migrations para adicionar campos Zoom e controle de status

---

## 🎯 Migrations Criadas

1. **`add_zoom_fields_to_eventos.sql`** - Adiciona campos Zoom na tabela eventos
2. **`add_status_to_inscricoes_eventos.sql`** - Adiciona status e pagamento nas inscrições
3. **`create_view_inscricoes_completas.sql`** - View para relatórios

---

## 🚀 Como Executar no Supabase

### Método 1: Dashboard Supabase (Recomendado)

1. **Acesse o Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Projeto: `ppwjtvzrhvjinsutrjwk`

2. **Vá para SQL Editor**
   - Menu lateral → **SQL Editor**
   - Clique em **New query**

3. **Execute cada migration na ordem:**

   #### ✅ Migration 1: Campos Zoom em Eventos
   
   ```sql
   -- Cole todo o conteúdo de: add_zoom_fields_to_eventos.sql
   -- Clique em RUN ou pressione Ctrl+Enter
   ```
   
   **Resultado esperado:** ✅ Success. No rows returned

   #### ✅ Migration 2: Status em Inscrições
   
   ```sql
   -- Cole todo o conteúdo de: add_status_to_inscricoes_eventos.sql
   -- Clique em RUN ou pressione Ctrl+Enter
   ```
   
   **Resultado esperado:** ✅ Success. 0 rows affected (ou número de inscrições atualizadas)

   #### ✅ Migration 3: View de Relatórios
   
   ```sql
   -- Cole todo o conteúdo de: create_view_inscricoes_completas.sql
   -- Clique em RUN ou pressione Ctrl+Enter
   ```
   
   **Resultado esperado:** ✅ Success. No rows returned

---

### Método 2: Via CLI Supabase (Opcional)

```bash
# 1. Login no Supabase
supabase login

# 2. Link ao projeto
supabase link --project-ref ppwjtvzrhvjinsutrjwk

# 3. Executar migrations
supabase db push

# 4. Verificar status
supabase db diff
```

---

## 🧪 Validar Migrations

Após executar, valide no SQL Editor:

### 1. Verificar campos da tabela `eventos`
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'eventos'
AND column_name IN ('meeting_link', 'meeting_password', 'meeting_id', 'meeting_start_url', 'vagas_disponiveis');
```

**Resultado esperado:** 5 linhas mostrando os novos campos

### 2. Verificar campos da tabela `inscricoes_eventos`
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'inscricoes_eventos'
AND column_name IN ('status', 'payment_status', 'payment_id', 'payment_date', 'zoom_link_sent', 'zoom_link_sent_at');
```

**Resultado esperado:** 6 linhas mostrando os novos campos

### 3. Verificar view criada
```sql
SELECT * FROM vw_inscricoes_completas LIMIT 5;
```

**Resultado esperado:** Linhas com dados completos de inscrições (se houver)

### 4. Verificar constraints
```sql
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'inscricoes_eventos'
AND constraint_name LIKE '%status%';
```

**Resultado esperado:** 2 constraints (status_check e payment_status_check)

---

## 🎨 Estrutura Resultante

### Tabela `eventos` (novos campos)
```
✅ meeting_link         TEXT           - Link Zoom para participantes
✅ meeting_password     TEXT           - Senha da sala
✅ meeting_id           TEXT           - ID da reunião
✅ meeting_start_url    TEXT           - Link para host iniciar
✅ vagas_disponiveis    INTEGER        - Limite de participantes (0 = ilimitado)
```

### Tabela `inscricoes_eventos` (novos campos)
```
✅ status               VARCHAR(20)    - pending/confirmed/cancelled
✅ payment_status       VARCHAR(20)    - pending/approved/rejected/cancelled
✅ payment_id           VARCHAR(100)   - ID do pagamento MP
✅ payment_date         TIMESTAMP      - Data aprovação
✅ zoom_link_sent       BOOLEAN        - Email enviado?
✅ zoom_link_sent_at    TIMESTAMP      - Quando enviado
```

### View `vw_inscricoes_completas`
```sql
-- Campos principais:
- Dados da inscrição (nome, email, telefone)
- Dados do evento (título, data, hora, valor)
- Status descritivo (Gratuito, Pago, Aguardando Pagamento)
- Contagem de vagas (vagas_ocupadas, tem_vagas)
- Links Zoom (meeting_link, meeting_password)
```

---

## ⚠️ Troubleshooting

### Erro: "column already exists"
```sql
-- Verificar se campo já existe:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'eventos' AND column_name = 'meeting_link';

-- Se existir, pular aquele ALTER TABLE específico
```

### Erro: "constraint already exists"
```sql
-- Dropar constraint antes de recriar:
ALTER TABLE inscricoes_eventos DROP CONSTRAINT IF EXISTS inscricoes_eventos_status_check;
ALTER TABLE inscricoes_eventos ADD CONSTRAINT inscricoes_eventos_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled'));
```

### Erro: "view already exists"
```sql
-- Usar CREATE OR REPLACE VIEW (já está no script)
CREATE OR REPLACE VIEW vw_inscricoes_completas AS ...
```

---

## ✅ Checklist de Execução

- [ ] Migration 1: `add_zoom_fields_to_eventos.sql` executada
- [ ] Migration 2: `add_status_to_inscricoes_eventos.sql` executada
- [ ] Migration 3: `create_view_inscricoes_completas.sql` executada
- [ ] Validação 1: Campos em `eventos` verificados
- [ ] Validação 2: Campos em `inscricoes_eventos` verificados
- [ ] Validação 3: View `vw_inscricoes_completas` funciona
- [ ] Validação 4: Constraints criadas corretamente

---

## 🎯 Próximos Passos

Após executar as migrations:

1. ✅ **Backend pronto** - Banco de dados atualizado
2. 🔄 **Implementar frontend** - Criar sala Zoom ao criar evento
3. 🔄 **Atualizar inscrição** - Validação de vagas
4. 🔄 **Webhook MP** - Lógica para eventos pagos
5. 🔄 **Templates Email** - Emails com Zoom

---

**✅ Pronto! Execute as migrations e me avise quando terminar.**
