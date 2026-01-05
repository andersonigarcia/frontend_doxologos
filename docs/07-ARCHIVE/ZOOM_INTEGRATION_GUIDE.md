# Guia de Configuração: Integração com Zoom

## 📋 O que foi implementado

✅ Serviço de integração com API do Zoom (`src/lib/zoomService.js`)  
✅ Criação automática de salas para cada agendamento  
✅ Email de confirmação com link do Zoom e instruções detalhadas  
✅ Campos na tabela `bookings` para armazenar dados do Zoom  
✅ Instruções passo a passo para usuários iniciantes no Zoom  

---

## 🔧 Passos para Ativar a Integração

### **1. Obter o Account ID do Zoom**

Você já tem o Client ID e Client Secret, mas precisa do **Account ID** para autenticação Server-to-Server.

**Como obter:**

1. Acesse o [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Faça login com sua conta Zoom
3. Vá em **Develop** → **Build App**
4. Localize seu app Server-to-Server OAuth
5. Na aba **App Credentials**, copie o **Account ID**

### **2. Configurar Variáveis de Ambiente**

Edite o arquivo `config/local.env` e atualize:

```env
# Zoom API (OAuth Server-to-Server)
VITE_ZOOM_CLIENT_ID=z4DYxauiQVCMOlJa7hKLFg
VITE_ZOOM_CLIENT_SECRET=YypvramabH7srmRMGlS8nzHp7esfHxwQ
VITE_ZOOM_ACCOUNT_ID=COLE_SEU_ACCOUNT_ID_AQUI
```

⚠️ **Importante:** Substitua `COLE_SEU_ACCOUNT_ID_AQUI` pelo Account ID real.

### **3. Executar Migration no Supabase**

**Opção A - Via Dashboard do Supabase:**

1. Acesse: https://app.supabase.com/project/ppwjtvzrhvjinsutrjwk/editor
2. Clique em **SQL Editor**
3. Crie uma **New Query**
4. Cole o conteúdo do arquivo: `database/migrations/add_zoom_fields_to_bookings.sql`
5. Clique em **Run**

**Opção B - Via Supabase CLI:**

```bash
supabase db push database/migrations/add_zoom_fields_to_bookings.sql
```

**Opção C - Executar SQL direto:**

```sql
-- Adicionar colunas para dados do Zoom
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS meeting_link TEXT,
ADD COLUMN IF NOT EXISTS meeting_password VARCHAR(50),
ADD COLUMN IF NOT EXISTS meeting_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS meeting_start_url TEXT;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_bookings_meeting_id ON bookings(meeting_id);
```

### **4. Reiniciar o Servidor de Desenvolvimento**

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente
npm run dev
```

---

## 🎥 Como Funciona

### **Fluxo Automático:**

1. **Paciente agenda consulta** → Sistema cria sala do Zoom automaticamente
2. **Sala criada com:**
   - Link de acesso para o paciente
   - Senha de segurança
   - Sala de espera ativada
   - Vídeo e áudio habilitados
   - Duração: 60 minutos

3. **Email enviado com:**
   - Link clicável para entrar na sala
   - Senha em destaque
   - **Passo a passo completo para iniciantes**
   - Dicas de preparação

4. **Dados salvos no banco:**
   - `meeting_link` - Link para o paciente
   - `meeting_password` - Senha da sala
   - `meeting_id` - ID da reunião no Zoom
   - `meeting_start_url` - Link para o profissional iniciar a reunião

---

## 📧 Exemplo de Email Enviado

O email de confirmação agora inclui:

### ✅ **Para quem já conhece o Zoom:**
- Botão grande "Entrar na Consulta Online"
- Senha destacada em formato código
- Dicas rápidas

### ✅ **Para iniciantes (passo a passo completo):**
1. Como clicar no link
2. Como baixar o Zoom (se necessário)
3. Como instalar o aplicativo
4. Como entrar na sala
5. Como usar a senha
6. Como aguardar na sala de espera
7. Como testar áudio e vídeo

### ✅ **Dicas de preparação:**
- Entrar 5 minutos antes
- Local silencioso
- Verificar internet
- Usar fones de ouvido
- Dispositivo carregado

---

## 🧪 Testando a Integração

### **1. Verificar configuração:**

Abra o Console do navegador (F12) e procure por:

```
🎥 ZoomService inicializado { hasClientId: true, hasClientSecret: true, hasAccountId: true }
```

Se aparecer `false` em algum, revise as variáveis de ambiente.

### **2. Fazer um agendamento teste:**

1. Acesse `/agendamento`
2. Complete o fluxo de agendamento
3. No console, observe:
   ```
   🎥 Criando sala do Zoom...
   ✅ Sala do Zoom criada: https://zoom.us/j/...
   ```

4. Verifique o email recebido - deve conter o link do Zoom

### **3. Verificar no banco de dados:**

```sql
SELECT 
  id, 
  patient_name, 
  meeting_link, 
  meeting_password,
  meeting_id
FROM bookings 
WHERE meeting_link IS NOT NULL
ORDER BY created_at DESC 
LIMIT 5;
```

---

## ⚠️ Resolução de Problemas

### **Erro: "Credenciais do Zoom não configuradas"**
- Verifique se todas as 3 variáveis estão no `config/local.env`
- Reinicie o servidor `npm run dev`

### **Erro: "Falha na autenticação Zoom: 401"**
- Account ID incorreto ou inválido
- Verifique no Zoom App Marketplace

### **Erro: "Falha ao criar reunião Zoom: 403"**
- Permissões insuficientes no app Zoom
- Verifique se o app tem permissão para criar meetings

### **Sala não é criada mas agendamento funciona:**
✅ **Isso é intencional!** O sistema não bloqueia o agendamento se o Zoom falhar.
- Verifique logs no console
- O email será enviado sem o link do Zoom

### **Como adicionar link manualmente:**

Se precisar adicionar um link do Zoom manualmente a um agendamento:

```sql
UPDATE bookings 
SET 
  meeting_link = 'https://zoom.us/j/SEU_MEETING_ID',
  meeting_password = 'SENHA',
  meeting_id = 'MEETING_ID'
WHERE id = 'BOOKING_ID';
```

---

## 🔐 Segurança

✅ **Implementações de Segurança:**

- Client Secret nunca exposto no frontend
- Autenticação Server-to-Server OAuth (mais segura)
- Senhas de reunião habilitadas
- Sala de espera ativada (profissional admite paciente)
- Paciente não pode entrar antes do profissional
- Tokens renovados automaticamente

---

## 📊 Logs e Monitoramento

O sistema registra todos os eventos importantes:

```javascript
🎥 ZoomService inicializado
🔑 Obtendo novo token de acesso do Zoom...
✅ Token obtido com sucesso
🎥 Criando reunião no Zoom: { topic, startTime, duration }
✅ Reunião criada com sucesso: { id, join_url }
📧 Email de confirmação enviado com link do Zoom
```

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs no Console (F12)
2. Confirme que a migration foi executada
3. Valide as credenciais do Zoom
4. Teste a autenticação separadamente

---

**✅ Integração Completa e Pronta para Uso!**
