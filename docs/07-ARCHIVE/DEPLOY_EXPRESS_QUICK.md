# 🚀 Deploy Express Registration - Guia Rápido

## O Que Mudou?

✅ **ANTES:** Inscrição em 4 etapas (Preencher dados → Criar conta → Fazer login → Confirmar → Pagar)  
✅ **AGORA:** Inscrição em 1 etapa (Preencher tudo → Confirmar e Pagar)

## Novo Formulário

```
┌─────────────────────────────────────────────┐
│  📝 Confirme seus dados para inscrição      │
│                                             │
│  👤 Nome Completo *                         │
│  ├─ "Digite seu nome completo"              │
│                                             │
│  📧 Email *                                  │
│  ├─ "seu@email.com"                         │
│  └─ Validação em tempo real                 │
│                                             │
│  📱 Telefone (opcional)                     │
│  ├─ "(00) 00000-0000"                       │
│  └─ Máscara automática                      │
│                                             │
│  🔒 Senha *                                  │
│  ├─ "Mínimo 6 caracteres"                   │
│  └─ Validação de comprimento                │
│                                             │
│  ☑️ Li e aceito os termos e condições *     │
│                                             │
│  [Confirmar Inscrição e Pagar] ✅           │
└─────────────────────────────────────────────┘
```

## Como Funciona?

1. **Usuário preenche o formulário** (incluindo senha agora)
2. **Sistema verifica se email existe**
   - Não existe → Cria conta automaticamente + faz login
   - Existe → Usa conta existente e prossegue
3. **Registra inscrição no evento**
4. **Mostra confirmação** com próximos passos

## Deploy Hostinger

### 1️⃣ Arquivo para Upload
```
📦 deploy-express-registration.zip (0.26 MB)
📍 Localização: C:\Users\ander\source\repos\frontend_doxologos\
```

### 2️⃣ Passos no File Manager

```bash
1. Login: painel.hostinger.com
2. File Manager → public_html
3. Backup (Download todos arquivos)
4. Delete tudo em public_html
5. Upload: deploy-express-registration.zip
6. Extrair ZIP em public_html
7. Verificar: index.html + pasta assets/
```

### 3️⃣ Testar Após Deploy

```
✅ Acesse: https://appsite.doxologos.com.br
✅ Vá em um evento (ex: /eventos/palestra-saude-mental)
✅ Teste inscrição com email novo
✅ Teste inscrição com email existente
✅ Verifique se chegam emails
```

## Validações Implementadas

| Campo | Validação | Feedback |
|-------|-----------|----------|
| Nome | Obrigatório | Toast de erro |
| Email | Formato válido | Borda vermelha + mensagem |
| Telefone | Opcional | Máscara (XX) XXXXX-XXXX |
| Senha | Mínimo 6 caracteres | Mensagem abaixo do campo |
| Termos | Deve aceitar | Toast de erro |

## Arquivos Modificados

```
✏️  src/pages/EventoDetalhePage.jsx
    ├─ Removido: Step 2 (login/cadastro)
    ├─ Adicionado: Campo senha
    ├─ Adicionado: Checkbox termos
    ├─ Modificado: handleRegistration (auto-registro)
    └─ Modificado: Botão "Confirmar Inscrição e Pagar"

📦 dist/
    ├─ index.html
    ├─ assets/index-49d8b481.js (novo)
    └─ assets/index-fde5a4b5.css
```

## Troubleshooting Rápido

### ❌ "Email já cadastrado" mas não funciona
**Solução:** Verifique se a conta existe no Supabase Auth

### ❌ Senha não aceita
**Solução:** Mínimo 6 caracteres, sem espaços

### ❌ Email não chega
**Solução:** Verificar spam, configurar SMTP no Supabase

### ❌ Inscrição não salva
**Solução:** Verificar políticas RLS da tabela `inscricoes_eventos`

## Próximos Passos (Futuro)

1. ⏭️ Integrar pagamento direto após inscrição
2. 📧 Atualizar template de email com senha
3. 🔐 Implementar "Esqueci minha senha"
4. 📊 Adicionar Google Analytics tracking

## Status: ✅ PRONTO PARA DEPLOY

- ✅ Código testado
- ✅ Build gerado
- ✅ ZIP criado
- ⏳ Aguardando upload Hostinger

---

**Build:** `index-49d8b481.js`  
**Data:** 28/01/2025  
**Documentação Completa:** Ver `INSCRICAO_EXPRESS_IMPLEMENTADA.md`
