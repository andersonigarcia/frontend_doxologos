# 📝 Checklist de Deploy

> **Use este checklist antes de cada deploy para produção**

---

## ✅ Pré-Deploy

### Código

- [ ] Todas as features testadas localmente
- [ ] Sem erros no console (F12)
- [ ] Sem warnings críticos no build
- [ ] Code review completo (se em equipe)
- [ ] Testes automatizados passando (se houver)

### Configuração

- [ ] `.env.production` atualizado
- [ ] `VITE_APP_URL=https://novo.doxologos.com.br`
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Secrets do Supabase atualizados

### Edge Functions

- [ ] Todas as functions deployadas
- [ ] Logs verificados (sem erros recentes)
- [ ] Secrets configurados
- [ ] Webhook do MP configurado

### Banco de Dados

- [ ] Migrations executadas
- [ ] RLS (Row Level Security) habilitado
- [ ] Backup recente disponível
- [ ] Índices criados (performance)

---

## 🚀 Deploy

### Build

```powershell
# 1. Limpar
Remove-Item -Recurse -Force dist

# 2. Build
npm run build

# 3. Verificar tamanho
Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum
```

- [ ] Build gerado sem erros
- [ ] Tamanho razoável (< 5MB ideal)
- [ ] Assets otimizados

### Upload

```powershell
# 1. Criar ZIP
Compress-Archive -Path dist\* -DestinationPath deploy-$(Get-Date -Format 'yyyyMMdd-HHmm').zip -Force

# 2. Verificar ZIP
Get-Item deploy-*.zip | Select-Object Name, Length
```

- [ ] ZIP criado com sucesso
- [ ] Nome com timestamp (fácil identificar versão)

### Hostinger

- [ ] Login em https://hpanel.hostinger.com
- [ ] Navegado até `/public_html/novo/`
- [ ] ZIP uploaded
- [ ] ZIP extraído
- [ ] Arquivos antigos sobrescritos
- [ ] `.htaccess` verificado/atualizado

---

## ✅ Pós-Deploy

### Testes Funcionais

#### Autenticação
- [ ] Login funciona
- [ ] Logout funciona
- [ ] Recuperação de senha funciona
- [ ] Registro de novo usuário funciona

#### Agendamento
- [ ] Criar agendamento
- [ ] Verificar disponibilidade
- [ ] Reagendar consulta
- [ ] Cancelar consulta

#### Pagamentos
- [ ] PIX: QR Code gerado
- [ ] PIX: Polling detecta pagamento
- [ ] Cartão: Formulário carrega
- [ ] Cartão: Pagamento processado
- [ ] Redirect MP funciona (débito/boleto)

#### Emails
- [ ] Email de confirmação enviado
- [ ] Link do email aponta para produção (não localhost)
- [ ] Email de pagamento aprovado enviado
- [ ] Link do Zoom presente no email

#### Zoom
- [ ] Sala criada automaticamente
- [ ] Link da sala funciona
- [ ] Senha correta

### Testes Técnicos

#### Performance
- [ ] Tempo de carregamento < 3s
- [ ] Assets com cache configurado
- [ ] Gzip habilitado

#### Segurança
- [ ] HTTPS forçado
- [ ] Nenhum secret exposto no frontend
- [ ] CORS configurado corretamente

#### SEO
- [ ] Meta tags presentes
- [ ] Título da página correto
- [ ] Robots.txt configurado

### Monitoramento

- [ ] Google Analytics funcionando
- [ ] Logs do Supabase sem erros
- [ ] Webhook MP recebendo notificações

---

## 🐛 Rollback (Se Necessário)

Se algo der errado:

### Opção 1: Reverter no Hostinger

1. Acesse hPanel → Gerenciador de Arquivos
2. Navegue até `/public_html/novo/`
3. Faça upload do ZIP anterior
4. Extraia

### Opção 2: Reverter Edge Functions

```bash
# Listar versões
supabase functions list

# Reverter função específica
supabase functions deploy mp-process-card-payment --version VERSAO_ANTERIOR
```

### Opção 3: Reverter Migration

```sql
-- Se migration quebrou algo
-- Executar migration de rollback
```

---

## 📊 Checklist de Versão

**Versão**: _____  
**Data**: _____  
**Deploy por**: _____

### Mudanças nesta versão:
- [ ] ______________________
- [ ] ______________________
- [ ] ______________________

### Testado por:
- [ ] ______________ (Desenvolvedor)
- [ ] ______________ (Cliente/Usuário)

### Status Final:
- [ ] ✅ Deploy bem-sucedido
- [ ] ⚠️ Deploy com problemas menores (detalhar abaixo)
- [ ] ❌ Rollback necessário

**Observações:**
_________________________________________
_________________________________________

---

**Última atualização**: 28/01/2025 | [Voltar ao Índice](../README.md)
