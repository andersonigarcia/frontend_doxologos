# 🔍 Diagnóstico: Zoom Não Criou Sala

## ⚡ Teste Rápido (FAÇA AGORA)

### **1. Verifique se o servidor foi reiniciado**
```bash
# Pare o servidor com Ctrl+C
# Inicie novamente:
npm run dev
```

⚠️ **IMPORTANTE:** Mudanças nas variáveis de ambiente só funcionam após reiniciar o servidor!

---

### **2. Abra o Console do Navegador**
1. Pressione **F12** no navegador
2. Vá na aba **Console**
3. Procure por mensagens do Zoom

**O que você DEVE ver ao carregar a página:**
```
🎥 ZoomService inicializado { hasClientId: true, hasClientSecret: true, hasAccountId: true }
```

**Se aparecer `false` em algum:**
- O servidor não foi reiniciado OU
- As variáveis de ambiente estão incorretas

---

### **3. Teste Manual da Autenticação**

**Copie e cole no Console do navegador (F12):**

```javascript
// Teste rápido das credenciais
const clientId = import.meta.env.VITE_ZOOM_CLIENT_ID;
const clientSecret = import.meta.env.VITE_ZOOM_CLIENT_SECRET;
const accountId = import.meta.env.VITE_ZOOM_ACCOUNT_ID;

console.log('Client ID:', clientId);
console.log('Client Secret:', clientSecret ? 'Configurado' : 'FALTANDO');
console.log('Account ID:', accountId);

// Se todos estiverem preenchidos, teste a autenticação:
if (clientId && clientSecret && accountId) {
    const credentials = btoa(`${clientId}:${clientSecret}`);
    
    fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    .then(response => {
        console.log('Status:', response.status);
        return response.text();
    })
    .then(text => {
        console.log('Resposta:', text);
        try {
            const json = JSON.parse(text);
            if (json.access_token) {
                console.log('✅ ZOOM FUNCIONANDO!');
            }
        } catch (e) {
            console.error('❌ Erro:', text);
        }
    });
} else {
    console.error('❌ Credenciais incompletas!');
}
```

---

## 🔍 Diagnóstico dos Resultados

### **Cenário A: "Account ID: undefined"**
**Problema:** Servidor não reiniciado ou variável não carregada

**Solução:**
1. Pare o servidor (Ctrl+C)
2. Verifique se `config/local.env` tem as 3 variáveis:
   ```env
   VITE_ZOOM_CLIENT_ID=sua_zoom_client_id_aqui
   VITE_ZOOM_CLIENT_SECRET=sua_zoom_client_secret_aqui
   VITE_ZOOM_ACCOUNT_ID=sua_zoom_account_id_aqui
   ```
3. Inicie o servidor: `npm run dev`
4. Teste novamente

---

### **Cenário B: Status 400 ou 401**
**Problema:** Credenciais incorretas

**Possíveis causas:**
- Account ID errado
- Client ID ou Secret incorretos
- App Zoom não ativado

**Solução:**
1. Acesse: https://marketplace.zoom.us/
2. Vá em **Develop** → **Build App**
3. Localize seu app **Server-to-Server OAuth**
4. Verifique:
   - ✅ App está **Activated**
   - ✅ Copie o **Account ID** correto
   - ✅ Copie o **Client ID** correto
   - ✅ Copie o **Client Secret** correto

---

### **Cenário C: Status 200 mas "Invalid grant_type"**
**Problema:** Tipo de app errado

**Solução:**
Você precisa de um app **Server-to-Server OAuth**, não OAuth 2.0 tradicional.

1. Acesse: https://marketplace.zoom.us/
2. **Create** → **Server-to-Server OAuth**
3. Configure o app
4. Copie as novas credenciais

---

### **Cenário D: Erro de CORS**
**Problema:** Tentando chamar API do Zoom diretamente do frontend

**Isso é esperado!** O zoomService deve funcionar normalmente apesar do CORS, pois:
- Vite faz proxy das requisições
- As credenciais são enviadas corretamente

Se o erro de CORS bloquear, precisamos criar uma Edge Function no Supabase.

---

## 📊 Verificar no Banco de Dados

Execute este SQL no Supabase:

```sql
-- Verificar se os campos do Zoom existem
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name LIKE 'meeting%';

-- Verificar último agendamento
SELECT 
    id,
    patient_name,
    booking_date,
    booking_time,
    meeting_link,
    meeting_password,
    meeting_id,
    created_at
FROM bookings
ORDER BY created_at DESC
LIMIT 1;
```

**Se os campos `meeting_link`, `meeting_password` não existirem:**
Execute a migration: `database/migrations/add_zoom_fields_to_bookings.sql`

---

## 🎯 Ação Imediata

**Execute AGORA nesta ordem:**

1. ✅ **Reinicie o servidor** (Ctrl+C → `npm run dev`)
2. ✅ **Abra F12 e vá no Console**
3. ✅ **Faça um novo agendamento**
4. ✅ **Observe as mensagens no Console**

**Mensagens que DEVEM aparecer:**
```
🎥 ZoomService inicializado
🎥 Criando sala do Zoom...
🎥 Dados do agendamento: {...}
🔑 Obtendo novo token de acesso do Zoom...
🔑 Account ID: PKU_...
🔑 Response status: 200
✅ Token obtido com sucesso
🎥 Criando reunião no Zoom: {...}
✅ Reunião criada com sucesso
✅ Sala do Zoom criada com sucesso!
🔗 Link: https://zoom.us/j/...
🔑 Senha: ...
```

**Se alguma mensagem NÃO aparecer, me envie as mensagens que aparecem!**

---

## 📞 Precisa de Ajuda?

Me envie:
1. **Console completo** (todas as mensagens)
2. **Resultado do teste manual** (colando o código JavaScript acima)
3. **Confirmação:** Servidor foi reiniciado? (Sim/Não)
