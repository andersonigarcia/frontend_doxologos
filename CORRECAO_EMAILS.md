# 🔧 CORREÇÃO: URLs Dinâmicas nos Emails

**Data:** 28/10/2025  
**Problema:** Links nos emails estavam fixos em `http://localhost:3000`  
**Solução:** URLs agora são dinâmicas baseadas no domínio da aplicação

---

## ✅ O QUE FOI CORRIGIDO

### **Antes (❌ Problema):**
```javascript
// E-mails enviados com links fixos
<a href="http://localhost:3000/area-do-paciente">Acessar Minha Área</a>
```

### **Depois (✅ Corrigido):**
```javascript
// E-mails agora usam URL dinâmica
<a href="https://novo.doxologos.com.br/area-do-paciente">Acessar Minha Área</a>
```

---

## 📝 ARQUIVOS MODIFICADOS

### **1. `.env.production`** - Adicionado
```env
# URL da Aplicação (usado em emails e links externos)
VITE_APP_URL=https://novo.doxologos.com.br
```

### **2. `.env.development`** - Adicionado
```env
# URL da Aplicação (usado em emails e links externos)
VITE_APP_URL=http://localhost:5173
```

### **3. `src/lib/emailTemplates.js`** - Melhorado
```javascript
constructor() {
  this.brandColor = "#2d8659";
  // ✅ Usa variável de ambiente ou URL atual como fallback
  this.baseUrl = import.meta.env.VITE_APP_URL || 
                 (typeof window !== 'undefined' ? window.location.origin : 'https://doxologos.com.br');
  this.supportEmail = "doxologos@doxologos.com.br";
}
```

---

## 📧 EMAILS AFETADOS (Todos corrigidos)

Todos os emails agora usam `${this.baseUrl}` ao invés de URL fixa:

1. **Confirmação de Agendamento** → `/area-do-paciente`
2. **Novo Agendamento para Profissional** → `/area-do-paciente`
3. **Lembrete de Consulta (24h antes)** → `/area-do-paciente`
4. **Confirmação de Pagamento** → `/area-do-paciente`
5. **Cancelamento de Agendamento** → `/area-do-paciente`
6. **Reagendamento** → `/area-do-paciente`

---

## 🚀 COMO ATUALIZAR NO SERVIDOR

### **Opção A: Upload Manual (Recomendado)**

1. **Delete os arquivos antigos** em `/public_html/novo/` (EXCETO `.htaccess`)
2. **Faça upload** do novo `deploy-novo-doxologos.zip` (260 KB)
3. **Extraia** o ZIP no servidor
4. **Delete** o arquivo ZIP
5. **Teste** acessando https://novo.doxologos.com.br

### **Opção B: Upload Seletivo (Mais Rápido)**

Se você já tem tudo funcionando e só quer atualizar o JavaScript:

1. **Entre** em `/public_html/novo/assets/`
2. **Delete** o arquivo JS antigo (`index-7678b182.js` ou similar)
3. **Upload** do novo JS: `dist/assets/index-dbf0f7c3.js`
4. **Atualize** o `index.html` para referenciar o novo JS

**⚠️ ATENÇÃO:** Opção B requer edição manual do `index.html`. Recomendo **Opção A** para evitar erros.

---

## ✅ COMO VALIDAR A CORREÇÃO

### **1. Testar em Desenvolvimento (Local)**
```bash
npm run dev
# Acesse: http://localhost:5173
# Faça um agendamento de teste
# Verifique o e-mail recebido
# Links devem apontar para: http://localhost:5173/area-do-paciente
```

### **2. Testar em Produção**
```
1. Acesse: https://novo.doxologos.com.br
2. Faça um agendamento real (ou teste com seu e-mail)
3. Verifique o e-mail recebido
4. Links devem apontar para: https://novo.doxologos.com.br/area-do-paciente
```

### **3. Verificar Código-Fonte do Email**
```html
<!-- Procure por estas linhas no HTML do e-mail recebido -->
<a href="https://novo.doxologos.com.br/area-do-paciente" class="btn">
  Acessar Minha Área
</a>

<!-- ✅ Correto se começar com https://novo.doxologos.com.br -->
<!-- ❌ Errado se começar com http://localhost:3000 -->
```

---

## 🔄 QUANDO MIGRAR PARA DOMÍNIO FINAL

Quando você mover para `https://doxologos.com.br`:

1. **Edite** `.env.production`:
   ```env
   VITE_APP_URL=https://doxologos.com.br
   ```

2. **Gere novo build**:
   ```bash
   npm run build
   ```

3. **Faça novo deploy** com o build atualizado

**Os e-mails automaticamente usarão o novo domínio!** 🎉

---

## 🐛 TROUBLESHOOTING

### **Problema: E-mails ainda chegam com localhost**

**Solução:**
1. Verifique se o novo build foi gerado: `npm run build`
2. Confirme que o arquivo `dist/assets/index-dbf0f7c3.js` existe
3. Certifique-se de que fez upload do **novo ZIP**
4. Limpe cache do navegador (Ctrl+Shift+Delete)

### **Problema: Variável VITE_APP_URL não está sendo lida**

**Solução:**
1. Variáveis VITE_* só funcionam no **build time** (não runtime)
2. Certifique-se de **gerar novo build** após alterar `.env.production`
3. Reinicie o servidor de desenvolvimento se estiver testando localmente

### **Problema: Link funciona mas aponta para lugar errado**

**Solução:**
1. Verifique se o subdomínio está correto no `.env.production`
2. Confirme que o DNS está resolvendo corretamente
3. Teste a URL manualmente no navegador primeiro

---

## 📊 RESUMO DA CORREÇÃO

| Item | Antes | Depois |
|------|-------|--------|
| **URL nos emails** | `http://localhost:3000/...` | `https://novo.doxologos.com.br/...` |
| **Configuração** | Hardcoded no código | Variável de ambiente |
| **Flexibilidade** | ❌ Manual | ✅ Automático |
| **Dev vs Prod** | ❌ Mesmo valor | ✅ Valores diferentes |
| **Build gerado** | `index-7678b182.js` | `index-dbf0f7c3.js` |

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ **Upload do novo build** para o servidor
2. ⏳ **Teste de agendamento** para validar e-mails
3. ⏳ **Monitorar** e-mails enviados nas próximas 24h
4. ⏳ **Atualizar documentação** se necessário

---

**✅ CORREÇÃO CONCLUÍDA**

Todos os links nos e-mails agora são **dinâmicos** e se adaptam automaticamente ao domínio onde a aplicação está rodando!

🚀 Pronto para deploy em **novo.doxologos.com.br**

---

**Preparado por:** GitHub Copilot  
**Data:** 28/10/2025  
**Versão:** 1.1 (URLs Dinâmicas)
