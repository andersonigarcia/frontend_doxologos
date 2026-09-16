# 🔍 Diagnóstico: Dados do Zoom não salvos no banco

## Problema Identificado
Os dados de acesso ao Zoom (meeting_link, meeting_password) não estão sendo salvos na tabela `bookings` após criar um agendamento.

## Possíveis Causas

### 1. ❌ Colunas não existem no banco de dados
**Sintoma:** A migration não foi executada no Supabase  
**Solução:** Execute a migration SQL

### 2. ❌ Credenciais do Zoom incorretas/não configuradas
**Sintoma:** `createBookingMeeting()` retorna `null`  
**Solução:** Verificar variáveis de ambiente

### 3. ❌ Erro na API do Zoom
**Sintoma:** Erro 401, 404 ou timeout ao criar reunião  
**Solução:** Verificar logs do console

---

## 🔧 Passo a Passo para Resolver

### PASSO 1: Verificar se as colunas existem no banco

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione seu projeto: **ppwjtvzrhvjinsutrjwk**
3. Vá em **SQL Editor**
4. Execute este SQL:

\`\`\`sql
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'bookings'
    AND column_name IN ('meeting_link', 'meeting_password', 'meeting_id', 'meeting_start_url');
\`\`\`

**Resultado esperado:** 4 linhas (uma para cada coluna)

**Se retornar 0 linhas:**
- ❌ As colunas NÃO existem
- ✅ **SOLUÇÃO:** Execute a migration abaixo

---

### PASSO 2: Executar a Migration (se necessário)

Se as colunas não existem, execute este SQL no **SQL Editor do Supabase**:

\`\`\`sql
-- Adicionar campos para integração com Zoom na tabela bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS meeting_link TEXT,
ADD COLUMN IF NOT EXISTS meeting_password VARCHAR(50),
ADD COLUMN IF NOT EXISTS meeting_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS meeting_start_url TEXT;

-- Criar índice para busca rápida por meeting_id
CREATE INDEX IF NOT EXISTS idx_bookings_meeting_id ON bookings(meeting_id);

-- Comentários para documentação
COMMENT ON COLUMN bookings.meeting_link IS 'Link da sala Zoom para o paciente entrar';
COMMENT ON COLUMN bookings.meeting_password IS 'Senha da sala Zoom';
COMMENT ON COLUMN bookings.meeting_id IS 'ID único da reunião no Zoom';
COMMENT ON COLUMN bookings.meeting_start_url IS 'Link para o host iniciar a reunião';
\`\`\`

Após executar, **confirme** que as colunas foram criadas executando novamente o SELECT do PASSO 1.

---

### PASSO 3: Verificar credenciais do Zoom

1. Abra o arquivo: `config/local.env`
2. Verifique se estas linhas existem e têm valores:

\`\`\`env
VITE_ZOOM_CLIENT_ID=sua_zoom_client_id_aqui
VITE_ZOOM_CLIENT_SECRET=sua_zoom_client_secret_aqui
VITE_ZOOM_ACCOUNT_ID=sua_zoom_account_id_aqui
\`\`\`

**Se alguma estiver vazia ou incorreta:**
- Acesse: https://marketplace.zoom.us/user/build
- Vá em seu app OAuth
- Copie as credenciais corretas

---

### PASSO 4: Testar criação de agendamento com logs

1. **Abra o Console do Navegador** (F12 → Console)
2. **Limpe o console** (ícone 🚫 ou Ctrl+L)
3. **Faça um novo agendamento** normalmente
4. **Observe os logs** que aparecem:

**Logs esperados (SUCESSO):**
\`\`\`
🎥 Criando sala do Zoom...
🎥 Dados do agendamento: {...}
🎥 [createBookingMeeting] Iniciando criação de sala...
🔑 Obtendo novo token de acesso do Zoom...
🔑 Account ID: PKU_EuxmTgGnwsKHzxhn4A
🔑 Response status: 200
✅ Token obtido com sucesso
🎥 Criando reunião no Zoom: {...}
✅ Reunião criada com sucesso
✅ Sala do Zoom criada com sucesso!
🔗 Link: https://zoom.us/j/...
🔑 Senha: xxxxxxx
💾 Dados do agendamento antes de inserir no banco: {
    ...
    has_meeting_link: true,
    has_meeting_password: true,
    has_meeting_id: true,
    has_meeting_start_url: true
}
💾 Resultado do insert: {
    success: true,
    meeting_link_saved: "https://zoom.us/j/...",
    meeting_password_saved: "xxxxxxx"
}
\`\`\`

**Logs de ERRO (verifique qual aparece):**

❌ **Credenciais incompletas:**
\`\`\`
❌ Credenciais do Zoom incompletas: ClientID=false, ClientSecret=false, AccountID=false
\`\`\`
→ Solução: Configurar variáveis de ambiente (PASSO 3)

❌ **Erro 401 (não autorizado):**
\`\`\`
❌ Erro ao obter token: 401 - Unauthorized
\`\`\`
→ Solução: Credenciais incorretas, verifique CLIENT_ID e CLIENT_SECRET

❌ **Erro 404 (conta não encontrada):**
\`\`\`
❌ Falha ao criar reunião Zoom: 404
\`\`\`
→ Solução: ACCOUNT_ID incorreto

❌ **Colunas não existem no banco:**
\`\`\`
💾 Resultado do insert: {
    success: false,
    error: { message: "column 'meeting_link' does not exist" }
}
\`\`\`
→ Solução: Executar migration (PASSO 2)

---

### PASSO 5: Verificar no banco se foi salvo

Após fazer um agendamento, execute no **SQL Editor do Supabase**:

\`\`\`sql
SELECT 
    id,
    patient_name,
    booking_date,
    booking_time,
    status,
    meeting_link,
    meeting_password,
    meeting_id
FROM 
    bookings
WHERE
    meeting_link IS NOT NULL
ORDER BY 
    created_at DESC
LIMIT 5;
\`\`\`

**Se retornar resultados:**
- ✅ Os dados estão sendo salvos corretamente
- Problema pode estar na exibição na área do paciente

**Se retornar vazio:**
- ❌ Os dados não estão sendo salvos
- Volte ao PASSO 4 e verifique os logs de erro

---

## 🎯 Checklist Final

- [ ] Colunas do Zoom existem no banco (PASSO 1)
- [ ] Migration executada se necessário (PASSO 2)
- [ ] Credenciais do Zoom configuradas (PASSO 3)
- [ ] Servidor reiniciado após configurar credenciais
- [ ] Logs do console mostram criação bem-sucedida (PASSO 4)
- [ ] Dados aparecem no banco após agendamento (PASSO 5)
- [ ] Área do paciente exibe link e senha corretamente

---

## 🆘 Ainda não funciona?

Se após seguir todos os passos ainda não funcionar:

1. **Envie os logs do console** (do PASSO 4)
2. **Envie o resultado do SQL** (do PASSO 1 e PASSO 5)
3. **Confirme** se reiniciou o servidor após configurar as credenciais

---

## 📝 Notas Importantes

- **Sempre reinicie o servidor** (`npm run dev`) após alterar variáveis de ambiente
- **Limpe o cache do navegador** se a área do paciente não atualizar
- **Verifique se o agendamento tem status** `confirmed` ou `paid` (só esses mostram o Zoom)
- **O Zoom só é criado para novos agendamentos**, não atualiza os antigos automaticamente
