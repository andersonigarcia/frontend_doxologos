# 🚀 DEPLOY MANUAL - PASSO A PASSO

**Data:** 28/10/2025  
**Domínio:** novo.doxologos.com.br  
**Arquivo preparado:** ✅ `deploy-novo-doxologos.zip` (260 KB)

---

## 📦 PASSO 1: ACESSAR PAINEL HOSTINGER

1. Abra seu navegador
2. Acesse: **https://hpanel.hostinger.com**
3. Faça login com suas credenciais
4. Localize o domínio **doxologos.com.br** na lista de hospedagens

---

## 📁 PASSO 2: ABRIR GERENCIADOR DE ARQUIVOS

### **Opção A: Via Menu Lateral**
```
Painel → Arquivos → Gerenciador de Arquivos
```

### **Opção B: Via Card do Site**
```
Websites → doxologos.com.br → Gerenciador de Arquivos
```

**O que você verá:**
- Interface similar ao Windows Explorer
- Pasta `/public_html/` (raiz do site)
- Outras pastas do sistema

---

## 📂 PASSO 3: NAVEGAR PARA O DIRETÓRIO CORRETO

1. **Clique** em `/public_html/`
2. **Procure** a pasta `/novo/` (deve estar vazia após a limpeza)
3. **Entre** na pasta `/novo/`

**Estrutura esperada:**
```
/public_html/
└── novo/           ← Você deve estar AQUI (vazia)
```

---

## ⬆️ PASSO 4: FAZER UPLOAD DO ZIP

### **4.1. Localizar Botão de Upload**

No Gerenciador de Arquivos, procure:
- Botão **"Upload"** ou **"Enviar Arquivos"** (geralmente no topo)
- Ícone de **seta para cima** ⬆️

### **4.2. Selecionar o Arquivo**

1. Clique em **Upload** ou **Enviar**
2. Janela de seleção abrirá
3. Navegue até: `C:\Users\ander\source\repos\frontend_doxologos\`
4. Selecione: **`deploy-novo-doxologos.zip`**
5. Clique em **Abrir**

### **4.3. Aguardar Upload**

- Progresso: 0% → 100% (5-20 segundos)
- Arquivo aparecerá na lista: `deploy-novo-doxologos.zip (260 KB)`

---

## 📦 PASSO 5: EXTRAIR O ZIP

### **5.1. Selecionar o Arquivo**

1. **Clique com botão direito** em `deploy-novo-doxologos.zip`
   - OU: **Selecione** o arquivo e procure menu de ações

### **5.2. Extrair Conteúdo**

2. Procure opção: **"Extract"** / **"Extrair"** / **"Descompactar"**
3. Clique em **Extract**
4. Confirme extração para: `/public_html/novo/` (pasta atual)
5. Aguarde extração (5-10 segundos)

### **5.3. Verificar Arquivos Extraídos**

Após extração, você deve ver:
```
/public_html/novo/
├── index.html                    ← Principal
├── assets/                       ← Pasta
│   ├── index-7678b182.js        ← JavaScript
│   └── index-ad8a34e0.css       ← CSS
├── favicon.svg
├── robots.txt
├── sitemap.xml
├── site.webmanifest
└── llms.txt
```

### **5.4. Deletar o ZIP**

- Selecione `deploy-novo-doxologos.zip`
- Clique com botão direito → **Delete** / **Excluir**
- Confirme exclusão

---

## 📝 PASSO 6: CRIAR ARQUIVO .htaccess

### **6.1. Criar Novo Arquivo**

1. Estando em `/public_html/novo/`
2. Clique em **"New File"** / **"Novo Arquivo"**
3. Nome do arquivo: **`.htaccess`** (com o ponto no início!)
4. Clique em **Create** / **Criar**

### **6.2. Editar o Arquivo**

1. **Clique com botão direito** em `.htaccess`
2. Selecione **"Edit"** / **"Editar"**
3. Cole o conteúdo abaixo:

```apache
# Compressao GZIP
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache de recursos estaticos
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>

# Forcar HTTPS
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

# SPA - Redirecionar rotas para index.html
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# Headers de seguranca
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
```

4. Clique em **"Save"** / **"Salvar"**
5. Feche o editor

---

## ✅ PASSO 7: VERIFICAR ESTRUTURA FINAL

### **Checklist Visual no Gerenciador:**

Você deve ver em `/public_html/novo/`:

- [ ] `.htaccess` (arquivo oculto, pode ter que ativar "Mostrar arquivos ocultos")
- [ ] `index.html` (~12 KB)
- [ ] `assets/` (pasta)
  - [ ] `index-7678b182.js` (~906 KB)
  - [ ] `index-ad8a34e0.css` (~58 KB)
- [ ] `favicon.svg`
- [ ] `robots.txt`
- [ ] `sitemap.xml`
- [ ] `site.webmanifest`
- [ ] `llms.txt`

**Total:** 9 arquivos + 1 pasta

---

## 🌐 PASSO 8: TESTAR NO NAVEGADOR

### **8.1. Abrir o Site**

1. Abra uma **nova aba anônima** no navegador (Ctrl+Shift+N no Chrome)
2. Acesse: **https://novo.doxologos.com.br**
3. Aguarde carregamento (5-10 segundos)

### **8.2. Verificar se Carregou**

✅ **SUCESSO se você ver:**
- Logo "Doxologos"
- Menu de navegação
- Conteúdo da página inicial
- Sem página padrão do Hostinger

❌ **PROBLEMA se você ver:**
- Página em branco
- Erro 404
- Página padrão do Hostinger
- Erro de certificado SSL

### **8.3. Testar Navegação**

Se carregou, teste:
- [ ] Clicar em **"Serviços"**
- [ ] Clicar em **"Sobre"**
- [ ] Clicar em **"Contato"**
- [ ] Verificar se rotas funcionam (URL muda)

---

## 🔧 TROUBLESHOOTING

### **Problema 1: Página em Branco**

**Solução:**
1. Abra console do navegador (F12)
2. Vá para aba **"Console"**
3. Procure erros vermelhos
4. Copie e me envie os erros

### **Problema 2: Página Padrão Hostinger**

**Possíveis causas:**

**A) Document Root não configurado**
1. Painel Hostinger → **Domínios**
2. Procure **novo.doxologos.com.br**
3. Clique em **Configurações** ou **Gerenciar**
4. Verifique **"Document Root"** ou **"Pasta Raiz"**
5. Deve estar: `/public_html/novo`
6. Se diferente, corrija e salve

**B) Cache do navegador**
1. Limpe cache (Ctrl+Shift+Delete)
2. Selecione "Últimas 24 horas"
3. Marque "Imagens e arquivos em cache"
4. Clique em "Limpar dados"
5. Recarregue a página (Ctrl+F5)

**C) DNS não propagado**
1. Aguarde 15-30 minutos
2. Teste em: https://dnschecker.org
3. Digite: `novo.doxologos.com.br`
4. Verifique se resolve para IP correto

### **Problema 3: Assets Não Carregam (CSS/JS)**

**Solução:**
1. Verificar permissões dos arquivos:
   - No Gerenciador, clique com direito em `index.html`
   - **Permissões** → Deve ser **644** (ou rw-r--r--)
   - Mesma coisa para arquivos em `/assets/`
   - Pasta `/assets/` deve ser **755** (ou rwxr-xr-x)

### **Problema 4: Rotas Não Funcionam**

**Solução:**
1. Verificar se `.htaccess` foi criado corretamente
2. No Gerenciador, ativar "Mostrar arquivos ocultos"
3. Confirmar que `.htaccess` existe
4. Abrir e verificar conteúdo

---

## 📞 PRÓXIMOS PASSOS APÓS SUCESSO

Quando o site carregar corretamente:

1. ✅ **Validar funcionalidades:**
   - Navegação entre páginas
   - Formulários
   - Login/Logout (se aplicável)

2. 🔍 **Verificar Google Analytics:**
   - Abrir console do navegador (F12)
   - Procurar por: `"GA4"` ou `"gtag"`
   - Deve aparecer mensagens de tracking

3. 🚀 **Testar Performance:**
   - Acessar: https://pagespeed.web.dev
   - Testar: `https://novo.doxologos.com.br`
   - Meta: Score > 85

4. 📱 **Testar no Mobile:**
   - Abrir site no celular
   - Verificar responsividade
   - Testar funcionalidades principais

---

## ✅ CHECKLIST DE CONCLUSÃO

- [ ] ZIP uploadado para `/public_html/novo/`
- [ ] Arquivos extraídos corretamente
- [ ] `.htaccess` criado e salvo
- [ ] 9 arquivos + assets/ presentes
- [ ] Site carrega em https://novo.doxologos.com.br
- [ ] Navegação funciona
- [ ] Sem erros no console
- [ ] SSL ativo (cadeado verde)

---

## 🎉 DEPLOY CONCLUÍDO!

Quando tudo estiver funcionando:

1. **Documente as credenciais** usadas
2. **Tire screenshots** da estrutura final
3. **Teste todas as funcionalidades** principais
4. **Monitore** por 24-48h

**Próxima etapa:** Migração do banco de dados (se necessário)

---

**Preparado por:** GitHub Copilot  
**Data:** 28/10/2025  
**Arquivo ZIP:** `deploy-novo-doxologos.zip` (260 KB)  
**Status:** ✅ Pronto para executar
