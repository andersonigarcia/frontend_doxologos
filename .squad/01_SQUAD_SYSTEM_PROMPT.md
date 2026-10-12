# 🏛️ CONSTITUIÇÃO E GUARDRAILS GLOBAIS DO SQUAD (DOXOLOGOS HEALTH-TECH)

Esta é a Constituição do Squad Multiagente. Ela estabelece os princípios invioláveis de arquitetura, segurança, privacidade e negócios que regem a plataforma **Doxologos Psicologia**.

---

## 1. PRINCÍPIOS FUNDAMENTAIS

1. **Visão de Dono (CEO / Investidor):** Toda funcionalidade ou refatoração deve ter ROI claro, impacto na margem por consulta e custo de infraestrutura (Supabase/Hostinger) sustentável. Eliminar burocracia genérica e "teatro de software".
2. **Princípio Boring Tech:** Prefira soluções consolidadas, maduras e simples (React + Supabase + Deno Edge Functions) em vez de complexidade desnecessária.
3. **Privacidade Rigorosa (LGPD / HIPAA / CFP):** Proibido expor ou salvar CPF, senhas, dados de cartão ou prontuários de pacientes em logs de produção, console do navegador ou prompts de IA.
4. **Zero Regressão em Produção:** O fluxo de checkout Mercado Pago (PIX inline, Cartão Direto) e agendamento 24/7 é o núcleo do negócio. Exige validação de testes antes de qualquer release.

---

## 2. STACK TECNOLÓGICA OFICIAL

- **Frontend:** React 18.2 + Vite 4.4 + TailwindCSS + Radix UI (shadcn/ui) + TanStack React Query + Lucide React.
- **Backend Serverless:** Supabase (PostgreSQL + Auth + Storage + RLS) + Deno Runtime (`supabase/functions/`).
- **Integrações:** Mercado Pago API v1/v2 (Checkout Transparente e Webhook idempotente) + Zoom OAuth API + SMTP Hostinger / Nodemailer.
- **Qualidade:** Jest (unitários/integração) + Playwright (E2E).
- **Arquitetura Documentada:** [`ARCH.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/ARCH.md) é a **fonte única de verdade** para ERD, RLS, Edge Functions e fluxos de negócio. Deve ser consultado antes de qualquer decisão de banco, contrato de API ou criação de Edge Function.

---

## 3. REGRAS ABSOLUTAS DE ENGENHARIA

1. **Backward Compatibility:** Mudar contratos de Edge Functions ou schemas de banco NUNCA deve quebrar clientes ativos.
2. **Zero-Downtime Database Migrations (*Expand & Contract*):** NUNCA executar `DROP TABLE` ou `DROP COLUMN` em migração direta.
3. **Segurança Supabase RLS Mandatória:** 100% das tabelas devem possuir políticas de Row Level Security (RLS) ativas.
4. **Tipagem Estrita com Zod:** Todas as Edge Functions devem validar payloads de entrada com schemas Zod.
5. **Systemic RCA & Blast Radius Analysis Mandatório (Anti-Band-Aid):** Proibido aplicar correções pontuais isoladas que apenas silenciem o sintoma em uma tela. Qualquer alteração em um domínio exige mapear 100% dos consumidores no código e aplicar a correção de forma transversal.
6. **Camada de Serviço Centralizada (Single Source of Truth):** Componentes de UI NUNCA devem conter lógica de persistência ou queries de domínio acopladas. Devem consumir exclusivamente a camada de serviços canônicos em `src/services/`.
7. **Sincronia Mandatória de ARCH.md com o Banco Real:** É expressamente proibido haver divergência entre os modelos documentados em `ARCH.md` e a estrutura real do PostgreSQL. Toda tarefa que identificar discrepância deve retificar a documentação no mesmo commit.

---

## 4. ORQUESTRAÇÃO E GOVERNANÇA (MODELO DE ELITE v2.0)

- **Invariantes Ativas (Tier 1):** Consulte [`.squad/CORE_INVARIANTS.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/CORE_INVARIANTS.md) (<80 linhas) em todo início de sessão para carregar as regras inegociáveis.
- **Orquestrador Central:** Consulte o [`ORCHESTRATOR.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/ORCHESTRATOR.md) para os 3 Modos Operacionais (*Architect*, *Builder*, *Auditor*).
- **Memória Histórica (Tier 2):** Registros detalhados de ADRs em [`.squad/03_SQUAD_MEMORY.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/03_SQUAD_MEMORY.md).
- **Validação Automatizada:** Todo ciclo deve ser validado via `npm run squad:check`.
