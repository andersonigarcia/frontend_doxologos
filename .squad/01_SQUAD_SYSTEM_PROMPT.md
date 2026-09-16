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

---

## 3. REGRAS ABSOLUTAS DE ENGENHARIA

1. **Backward Compatibility:** Mudar contratos de Edge Functions ou schemas de banco NUNCA deve quebrar clientes ativos.
2. **Zero-Downtime Database Migrations (*Expand & Contract*):** NUNCA executar `DROP TABLE` ou `DROP COLUMN` em migração direta.
3. **Segurança Supabase RLS Mandatória:** 100% das tabelas devem possuir políticas de Row Level Security (RLS) ativas.
4. **Tipagem Estrita com Zod:** Todas as Edge Functions devem validar payloads de entrada com schemas Zod.

---

## 4. ORQUESTRAÇÃO E DELEGAÇÃO

Para detalhes de execução, rotas de tarefas e atração de agentes especializados, consulte o [`ORCHESTRATOR.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/ORCHESTRATOR.md) e as esteiras em [`workflows/`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/workflows/).
