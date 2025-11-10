# ✅ Checklist Rápido - Deploy Hostinger

**Versão Resumida** | [Guia Completo](./DEPLOY_HOSTINGER_GUIDE.md)

---

## 🎯 DECISÕES NECESSÁRIAS

Antes de começar, preciso saber:

### **1. Domínio Temporário**
- [ ] Subdomínio: `novo.doxologos.com.br`
- [ ] Ou domínio temporário Hostinger: `seu-site.hostingersite.com`
- [x] Outro: doxologos.com.br

### **2. Banco de Dados**
- [x] **Opção A:** Criar novo projeto Supabase (100% limpo) ✅ Recomendado
- [ ] **Opção B:** Limpar banco atual e reutilizar
- [ ] **Opção C:** Migrar profissionais/serviços apenas

### **3. Abordagem de Deploy**
- [ ] **Manual:** Você faz seguindo o guia (1-2h)
- [ ] **Assistido:** Compartilha acesso temporário (30-45min) 
- [ ] **Híbrido:** Divide tarefas entre nós

---

## 📦 PRÉ-DEPLOY (15 min)

### **No seu computador:**

```powershell
# 1. Instalar dependências
npm install

# 2. Gerar build de produção
npm run build

# 3. Testar localmente
npm run preview
# Acessar: http://localhost:4173

# 4. Verificar se tudo funciona
# ✅ Página carrega
# ✅ Navegação funciona
# ✅ Sem erros no console
```

**Build OK?** → Prosseguir para deploy ✅

---

## 🚀 DEPLOY RÁPIDO (30 min)

### **PASSO 1: Hostinger - Criar Domínio (5 min)**

1. Login: https://hpanel.hostinger.com
2. **Domínios** → **Adicionar Subdomínio/Domínio**
3. Nome: `novo` (ou seu escolhido)
4. Pasta: `public_html/novo`
5. Salvar

### **PASSO 2: Ativar SSL (5 min)**

1. **SSL** → Selecionar domínio
2. **Ativar SSL Grátis**
3. Aguardar 5-15 min

### **PASSO 3: Upload via FTP (10 min)**

**Conectar no FileZilla:**
- Host: `ftp.doxologos.com.br`
- Usuário: (seu usuário FTP)
- Senha: (sua senha FTP)
- Porta: 21

**Upload:**
1. Navegar para `/public_html/novo/`
2. Selecionar **TODO** conteúdo da pasta `dist/`
3. Arrastar para servidor
4. Aguardar upload

### **PASSO 4: Criar .htaccess (5 min)**

Criar arquivo `.htaccess` em `/public_html/novo/.htaccess`:

```apache
# SPA - Redirecionar rotas para index.html
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Forçar HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Cache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
```

### **PASSO 5: Banco de Dados (5 min)**

**Opção A: Novo Supabase (Recomendado)**
1. Criar novo projeto: https://supabase.com
2. Nome: `Doxologos Produção`
3. Região: `South America (São Paulo)`
4. Copiar URL e Anon Key
5. Importar schema (sem dados)

**Opção B: MySQL Hostinger**
1. **Banco de Dados** → **Criar Novo**
2. Nome: `doxologos_prod`
3. Anotar credenciais

---

## 🧪 VALIDAÇÃO (10 min)

Acessar: `https://novo.doxologos.com.br`

### **Checklist Rápido:**
- [ ] Site carrega
- [ ] Navegação funciona
- [ ] Formulários funcionam
- [ ] Sem erros no console
- [ ] HTTPS ativo (cadeado verde)
- [ ] Google Analytics funcionando
- [ ] Performance OK

**Tudo OK?** → Deploy concluído! ✅

---

## ⚠️ PROBLEMAS COMUNS

### **Página em branco**
```
Solução: Verificar .htaccess e console do navegador
```

### **Assets não carregam**
```
Solução: Verificar permissões (755 pastas, 644 arquivos)
```

### **Rotas 404**
```
Solução: Verificar regras do .htaccess (RewriteRule)
```

### **SSL não funciona**
```
Solução: Aguardar propagação (até 48h) ou forçar renovação
```

---

## 🔄 SE PRECISAR DE AJUDA COM ACESSO

### **Informações para Deploy Assistido:**

**FTP:**
- Host: ftp.doxologos.com.br
- Usuário: _______________
- Senha: _______________

**Painel Hostinger:**
- Email: _______________
- Senha: _______________

**Supabase (se existir):**
- Email: _______________
- Senha: _______________

⚠️ **Remover acesso após deploy completo!**

---

## 📞 PRÓXIMOS PASSOS

Após decidir a abordagem, me informe:

1. ✅ Domínio escolhido
2. ✅ Estratégia de banco de dados
3. ✅ Se vai fazer manual ou precisa de ajuda

Estou pronto para te guiar! 🚀

---

**Última Atualização:** 28/10/2025
