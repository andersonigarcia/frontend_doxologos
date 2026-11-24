# 🏛️ ADR 034: Migração do Provedor de E-mail para Resend & Resiliência em Recuperação de Senha

* **Data:** 2026-11-19
* **Status:** Aprovada e Aplicada em Produção
* **Domínio:** Autenticação / Notificações / Infraestrutura de E-mail (Resend & Cloudflare)

---

## 🎯 1. Contexto e Motivação
Com a desativação da hospedagem legada Hostinger e a migração da infraestrutura DNS e web para a **Cloudflare**, o servidor SMTP de saída anterior (`smtp.hostinger.com`) passou a recusar requisições com erro `535 5.7.8 Authentication failed.` (HTTP 500 em `/auth/v1/recover` e na Edge Function `send-email`). Como o Cloudflare Email Routing gerencia apenas recebimento/encaminhamento de entrada, fazia-se necessária uma solução de envio transacional profissional de alta entregabilidade.

Adicionalmente, na camada frontend (`SupabaseAuthContext.jsx`), falhas `5xx` de infraestrutura estavam consumindo prematuramente a trava de segurança de rate limit do usuário (`passwordResetRateLimiter.recordAttempt(email)`), impedindo novas tentativas mesmo quando nenhum e-mail havia sido disparado.

---

## 💡 2. Decisão Arquitetural

1. **Adoção do Resend como Provedor SSOT de E-mails Transacionais:**
   - Registros de DNS de autenticação (**DKIM** `resend._domainkey` e **CNAMEs** `send` e `rsend`) configurados no Cloudflare com proxy desativado (*DNS only*).
   - Credenciais do Resend integradas no **Supabase Secrets** (`RESEND_API_KEY`, `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_USER=resend`, `SMTP_PASSWORD=<key>`, `FROM_EMAIL=doxologos@doxologos.com.br`).
   - Configuração do **Supabase Auth SMTP** (`ppwjtvzrhvjinsutrjwk/auth/smtp`) sincronizada para garantir recuperação de senha via `/auth/v1/recover` e magic links.

2. **Evolução da Edge Function `send-email`:**
   - Suporte prioritário à **API REST do Resend** (`https://api.resend.com/emails`), reduzindo latência de conexão SMTP e overhead de sockets TCP.
   - Fallback defensivo mantido para SMTP seguro com suporte isomórfico a `VITE_SUPABASE_ANON_KEY`.

3. **Blindagem de UX e Resiliência na Recuperação de Senha:**
   - Extração da função pura `classifyResetPasswordError(error)` para categorizar falhas `5xx` (serviço indisponível), `429` (rate limit de segurança com contagem de minutos/horas) e erros de rede.
   - `passwordResetRateLimiter.recordAttempt(email)` agora só é consumido em caso de sucesso ou erro 429 comprovado do servidor, blindando o usuário contra bloqueios decorrentes de instabilidades passageiras.

---

## 🛡️ 3. Consequências e Validação Empírica
- **Eliminação de Erros 500:** Recuperação de senha e e-mails transacionais (boas-vindas, confirmações, pós-consulta) normalizados com entrega garantida e SPF/DKIM válidos.
- **Testes Automatizados:** Testes adicionados em `src/contexts/__tests__/SupabaseAuthContext.test.jsx` cobrindo cenários de erro 500 e 429.
- **Pipeline:** 100% de conformidade comprovada por `npm run squad:check` (35 suítes / 388 testes passando, compilação de produção e guardrails arquiteturais verdes).

