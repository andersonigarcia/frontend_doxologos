# 🚀 Guia de Deploy - Hostinger (Produção)

**Data:** 28/10/2025  
**Projeto:** Doxologos Frontend (Nova Versão)  
**Domínio Temporário:** A definir  
**Domínio Final:** doxologos.com.br (migração futura)

---

## ⚠️ AVISOS IMPORTANTES

### **🔒 Segurança**
- ✅ Banco de dados de TESTES não será usado em produção
- ✅ Nova base de dados limpa será criada
- ✅ Aplicação atual (doxologos.com.br) NÃO será impactada
- ✅ Deploy será feito em domínio temporário primeiro

### **📋 Pré-requisitos**
- [ ] Conta Hostinger ativa
- [ ] Acesso ao painel de controle
- [ ] Domínio temporário definido
- [ ] Backup da aplicação atual (precaução)

---

## 🎯 ESTRATÉGIA DE DEPLOY

### **Opção 1: Deploy Manual (Recomendado para Primeira Vez)**
**Vantagens:**
- ✅ Controle total do processo
- ✅ Aprendizado para futuros deploys
- ✅ Sem compartilhamento de credenciais
- ✅ Validação passo a passo

**Desvantagens:**
- ⏱️ Mais tempo (1-2 horas)
- 📚 Requer seguir documentação

### **Opção 2: Deploy Assistido (Com Acesso)**
**Vantagens:**
- ⚡ Mais rápido (30-45 min)
- 🎯 Garantia de configuração correta
- 🔧 Troubleshooting imediato

**Desvantagens:**
- 🔑 Compartilhamento temporário de acesso
- ⚠️ Requer confiança

---

## 📦 PREPARAÇÃO DO PROJETO

### **1. Verificação de Arquivos Essenciais**

Vou verificar se tudo está pronto:

```bash
✅ package.json - Configurado
✅ vite.config.js - Otimizado
✅ .env.production - Variáveis de ambiente
✅ index.html - SEO e Analytics
✅ robots.txt - Configurado
✅ sitemap.xml - Pronto
✅ Supabase configurado
✅ Google Analytics configurado
```

### **2. Build de Produção**

Antes do deploy, vamos gerar o build otimizado:

```bash
# Instalar dependências (se necessário)
npm install

# Gerar build de produção
npm run build

# Testar localmente
npm run preview
```

**O que será gerado:**
- Pasta `dist/` com arquivos otimizados
- HTML/CSS/JS minificados
- Assets otimizados
- Source maps (opcional)

---

## 🏗️ ARQUITETURA DE DEPLOY NA HOSTINGER

### **Estrutura Recomendada**

```
Hostinger
├── doxologos.com.br (ATUAL - NÃO TOCAR)
│   └── public_html/
│       └── [aplicação atual]
│
└── novo-doxologos.temp-domain.com (NOVO)
    └── public_html/
        └── dist/ (conteúdo do build)
            ├── index.html
            ├── assets/
            ├── robots.txt
            └── sitemap.xml
```

---

## 📝 PASSO A PASSO - DEPLOY MANUAL

### **FASE 1: Preparação Local (15 min)**

#### **1.1. Configurar Variáveis de Ambiente**

Edite `.env.production` com valores reais:

```env
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon

# Google Analytics
VITE_GA_MEASUREMENT_ID=G-1RMKGB754J

# Ambiente
VITE_ENVIRONMENT=production
VITE_LOG_LEVEL=ERROR

# Email (Supabase Edge Function)
VITE_EMAIL_ENABLED=true

# Performance
VITE_ENABLE_PERFORMANCE_MONITORING=true
VITE_ERROR_TRACKING_ENABLED=true
```

#### **1.2. Gerar Build**

```bash
# Limpar build anterior (se existir)
rm -rf dist

# Gerar novo build
npm run build

# Verificar tamanho
du -sh dist
# Esperado: ~2-5 MB
```

#### **1.3. Testar Localmente**

```bash
npm run preview
# Acessar: http://localhost:4173

# Verificar:
# ✅ Página carrega
# ✅ Navegação funciona
# ✅ Google Analytics no console
# ✅ Sem erros no console
```

---

### **FASE 2: Configuração Hostinger (20 min)**

#### **2.1. Acessar Painel Hostinger**

1. Login em: https://hpanel.hostinger.com
2. Ir para **Hospedagem** → Seu plano
3. Ir para **Gerenciador de Arquivos** ou **File Manager**

#### **2.2. Criar Novo Domínio/Subdomínio**

**Opção A: Subdomínio Temporário**
```
Criar: novo.doxologos.com.br
Pasta: public_html/novo/
```

**Opção B: Domínio Temporário da Hostinger**
```
Usar: seu-site.hostingersite.com
Pasta: public_html/novo/
```

**Como criar:**
1. Painel → **Domínios**
2. **Adicionar Subdomínio** ou usar temporário
3. Definir pasta raiz (ex: `public_html/novo`)

#### **2.3. Configurar SSL (HTTPS)**

1. Painel → **SSL**
2. Ativar **SSL Grátis** (Let's Encrypt)
3. Aguardar ativação (5-15 min)

---

### **FASE 3: Upload dos Arquivos (15 min)**

#### **3.1. Conectar via FTP/SFTP**

**Credenciais Hostinger:**
- **Host:** ftp.seu-dominio.com
- **Usuário:** Seu usuário FTP
- **Senha:** Sua senha FTP
- **Porta:** 21 (FTP) ou 22 (SFTP)

**Ferramentas Recomendadas:**
- FileZilla (Windows/Mac/Linux)
- WinSCP (Windows)
- Cyberduck (Mac)

#### **3.2. Upload via FileZilla**

```
1. Conectar no servidor
2. Navegar até: /public_html/novo/
3. Selecionar TODO conteúdo da pasta dist/
4. Arrastar para a pasta remota
5. Aguardar upload (2-10 min)
```

**Estrutura após upload:**
```
/public_html/novo/
├── index.html
├── assets/
│   ├── index-abc123.js
│   ├── index-def456.css
│   └── [outros assets]
├── robots.txt
├── sitemap.xml
└── [outros arquivos]
```

---

### **FASE 4: Configuração do Servidor (10 min)**

#### **4.1. Criar arquivo .htaccess**

Criar `/public_html/novo/.htaccess`:

```apache
# Habilitar compressão GZIP
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache de recursos estáticos
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
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType application/font-woff "access plus 1 year"
    ExpiresByType application/font-woff2 "access plus 1 year"
</IfModule>

# Forçar HTTPS
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

# SPA - Redirecionar todas as rotas para index.html
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# Segurança
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
```

#### **4.2. Verificar Permissões**

```bash
# Arquivos: 644
chmod 644 index.html
chmod 644 robots.txt

# Pastas: 755
chmod 755 assets/

# .htaccess: 644
chmod 644 .htaccess
```

---

### **FASE 5: Banco de Dados (30 min)**

#### **5.1. Criar Nova Base de Dados**

**No Painel Hostinger:**
1. **Banco de Dados** → **MySQL**
2. **Criar novo banco**
   - Nome: `doxologos_prod` (ou similar)
   - Usuário: Criar novo
   - Senha: Gerar senha forte
3. Anotar credenciais

#### **5.2. Configurar Supabase (Recomendado)**

**Opção A: Novo Projeto Supabase**
```
1. Acessar: https://supabase.com
2. Criar novo projeto
3. Nome: Doxologos Produção
4. Região: South America (São Paulo)
5. Aguardar criação (2-5 min)
6. Copiar URL e chaves
```

**Opção B: Migrar Schema Atual**

```sql
-- Exportar schema do projeto de testes
-- Importar no novo projeto
-- Sem dados (base limpa)
```

#### **5.3. Atualizar Variáveis de Ambiente**

Editar `.env.production` no servidor:

```env
VITE_SUPABASE_URL=https://novo-projeto-prod.supabase.co
VITE_SUPABASE_ANON_KEY=nova-chave-prod
```

⚠️ **IMPORTANTE:** Gerar novo build após alterar .env!

---

### **FASE 6: Testes em Produção (20 min)**

#### **6.1. Checklist de Validação**

Acessar: `https://novo.doxologos.com.br` ou domínio temporário

**Funcionalidades:**
- [ ] Página inicial carrega
- [ ] Navegação entre páginas
- [ ] Formulários funcionam
- [ ] Agendamento funciona
- [ ] Login/Logout funciona
- [ ] Área do paciente
- [ ] Checkout PIX/Cartão
- [ ] Upload de currículo

**Performance:**
- [ ] PageSpeed > 85
- [ ] Lighthouse > 85
- [ ] Imagens carregam
- [ ] Sem erros no console

**SEO:**
- [ ] Google Analytics funcionando
- [ ] Meta tags corretas
- [ ] robots.txt acessível
- [ ] sitemap.xml acessível

**Segurança:**
- [ ] HTTPS ativo
- [ ] Certificado SSL válido
- [ ] Headers de segurança

---

## 🗃️ MIGRAÇÃO DO BANCO DE DADOS

### **Preparação da Base Limpa**

#### **Schema a ser criado (via Supabase)**

```sql
-- Tabelas principais
✅ profiles (usuários)
✅ professionals (profissionais)
✅ services (serviços)
✅ bookings (agendamentos)
✅ payments (pagamentos)
✅ reviews (avaliações)
✅ testimonials (depoimentos)

-- Dados iniciais necessários
❓ Profissionais (migrar?)
❓ Serviços (migrar?)
❓ Configurações (migrar?)
```

#### **Estratégia de Migração**

**Opção 1: Base 100% Limpa**
- Criar schema vazio
- Adicionar apenas 1-2 profissionais para testes
- Sem histórico de agendamentos/pagamentos

**Opção 2: Migração Seletiva**
- Migrar profissionais ativos
- Migrar serviços ativos
- NÃO migrar: bookings, payments, reviews de teste

#### **Script de Migração (Exemplo)**

```sql
-- 1. Copiar profissionais ativos
INSERT INTO professionals_prod (...)
SELECT ... FROM professionals_test
WHERE status = 'active';

-- 2. Copiar serviços
INSERT INTO services_prod (...)
SELECT ... FROM services_test
WHERE active = true;

-- 3. NÃO copiar dados de teste
-- (bookings, payments, etc ficam vazios)
```

---

## 🔐 SEGURANÇA E BACKUP

### **Antes do Deploy**

```bash
# 1. Backup da aplicação atual
Hostinger → Backups → Criar backup manual

# 2. Backup do banco de dados atual
Supabase → Settings → Database → Backup

# 3. Documentar credenciais
- Anotar todas as senhas em local seguro
- Guardar chaves de API
```

### **Após o Deploy**

```bash
# 1. Configurar backups automáticos
Hostinger → Backups → Agendar backups diários

# 2. Monitorar logs
Supabase → Logs → Verificar erros

# 3. Configurar alertas
Google Analytics → Admin → Alertas personalizados
```

---

## 📊 MONITORAMENTO PÓS-DEPLOY

### **Primeiras 24h**

- [ ] Verificar Google Analytics (usuários reais?)
- [ ] Verificar logs de erro (Supabase)
- [ ] Testar fluxo completo de agendamento
- [ ] Testar pagamento real (valor mínimo)
- [ ] Monitorar performance (PageSpeed)

### **Primeira Semana**

- [ ] Analisar taxa de conversão
- [ ] Verificar emails sendo enviados
- [ ] Conferir WhatsApp funcionando
- [ ] Validar Zoom integration
- [ ] Revisar feedback de usuários

---

## 🚦 MIGRAÇÃO PARA DOMÍNIO FINAL

### **Quando estiver pronto para o lançamento oficial:**

```
1. Testar tudo no domínio temporário
2. Configurar DNS do domínio final
3. Atualizar variáveis de ambiente (URLs)
4. Gerar novo build
5. Upload para domínio final
6. Ativar SSL
7. Redirecionar domínio antigo (se aplicável)
```

---

## 📞 SUPORTE E TROUBLESHOOTING

### **Problemas Comuns**

**Página em branco:**
- Verificar console do navegador
- Conferir .htaccess (regras SPA)
- Validar variáveis de ambiente

**Assets não carregam:**
- Verificar permissões (644/755)
- Conferir paths no build
- Limpar cache do navegador

**Rotas não funcionam:**
- Verificar .htaccess
- Confirmar mod_rewrite ativo
- Testar URL manual

**SSL não funciona:**
- Aguardar propagação (até 48h)
- Forçar renovação no painel
- Verificar DNS

---

## ✅ CHECKLIST FINAL

### **Antes de Considerar Deploy Completo**

- [ ] Build de produção gerado sem erros
- [ ] Testado localmente com `npm run preview`
- [ ] Variáveis de ambiente configuradas
- [ ] Domínio/subdomínio criado
- [ ] SSL ativado e funcionando
- [ ] Arquivos uploadados via FTP
- [ ] .htaccess configurado
- [ ] Banco de dados criado (limpo)
- [ ] Supabase configurado (novo projeto ou limpo)
- [ ] Testes funcionais completos
- [ ] Google Analytics validado
- [ ] Performance aceitável (>85)
- [ ] Backup da aplicação atual feito
- [ ] Documentação atualizada
- [ ] Credenciais documentadas e seguras

---

## 🤝 PRÓXIMOS PASSOS

### **Escolha sua abordagem:**

**Opção A: Deploy Manual (Eu te guio)**
- Sigo este guia passo a passo
- Te auxilio em cada etapa
- Você mantém controle total

**Opção B: Deploy Assistido (Com acesso temporário)**
- Você me fornece acesso FTP + Painel
- Eu realizo o deploy
- Você acompanha e valida
- Removo meu acesso após conclusão

**Opção C: Deploy Híbrido**
- Você faz upload dos arquivos
- Eu te auxilio com configurações
- Validamos juntos

---

## 📋 INFORMAÇÕES NECESSÁRIAS

Para qualquer opção, vou precisar saber:

1. **Domínio/Subdomínio escolhido** para deploy temporário
2. **Estratégia de banco de dados**: novo Supabase ou migração?
3. **Dados a migrar**: profissionais? serviços? ou 100% limpo?
4. **Preferência de abordagem**: Manual, Assistido ou Híbrido?

---

**Preparado por:** GitHub Copilot  
**Data:** 28/10/2025  
**Versão:** 1.0  
**Status:** ✅ Pronto para deploy
