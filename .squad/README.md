# 🧠 Squad Multiagente v2.0 — Doxologos Psicologia
### Antigravity & IDE Mode · Alta Eficiência de Tokens · Zero Burocracia

Esta pasta (`.squad/`) é a **memória externa e ecossistema de inteligência** do Squad End-to-End do Doxologos Psicologia. Arquitetura modular dinâmica com 8 agentes especializados, 5 esteiras de risco e qualificação automática antes de cada decisão.

---

## 🏛️ Arquitetura Modular v2.0

```
.squad/
├── ORCHESTRATOR.md           → Roteador Central: qualifica e ativa a esteira correta
├── 01_SQUAD_SYSTEM_PROMPT.md → Constituição e Guardrails globais invioláveis
├── 02_PROJECT_CONTEXT.md     → Contexto do negócio, SLAs e roadmap atual
├── 03_SQUAD_MEMORY.md        → ADRs + Seção 6: Bugs Conhecidos / RCA Log
├── PROMPT_TEMPLATES.md       → 7 templates prontos para uso imediato
├── PLAYBOOK_PROMPTS.md       → 🆕 Guia completo de prompts por cenário
│
├── agents/                   → 8 personas especializadas (ativadas sob demanda)
│   ├── product_lead.md       → ROI, Unit Economics, Regras de Negócio
│   ├── tech_lead.md          → Arquitetura, ARCH.md, Zod, Contracts
│   ├── fullstack_dev.md      → React, Vite, Tailwind, Edge Functions Deno
│   ├── platform_security.md  → SRE, RLS, OWASP, LGPD/HIPAA
│   ├── qa_automation.md      → Jest, Playwright, Edge Functions, Smoke Tests
│   ├── data_growth_analyst.md→ GA4, CRO, SEO Clínico, Churn, LTV
│   ├── bug_hunter.md         → 🆕 Diagnóstico RCA por camada (Silent First)
│   └── ux_design.md          → 🆕 WCAG 2.1, CRO Visual, Mobile-First, Microcopy
│
└── workflows/                → 5 esteiras ajustadas ao nível de risco
    ├── fast_track.md         → Hotfixes, UI, bugs simples (2 agentes)
    ├── standard_track.md     → Features médias, componentes (4 agentes)
    ├── full_track.md         → Pagamentos, RLS, LGPD (6 agentes + 6 gatekeepers)
    ├── growth_experiment.md  → CRO, SEO, A/B Tests, Retenção (4 agentes)
    └── incident_response.md  → Emergências em produção (5 agentes, Bug Hunter lidera)
```

---

## 🔍 Qualificação Automática (Antes de Qualquer Tarefa)

O Orquestrador responde 3 perguntas antes de selecionar a esteira:

| Pergunta | Sim → |
|---|---|
| Altera tabela Supabase, RLS ou Edge Function? | Standard-Track no mínimo |
| Toca em pagamento MP ou dados de saúde LGPD? | Full-Track obrigatório |
| Risco de regressão em produção > 0%? | Escalar uma esteira acima |

---

## 🚀 Como Usar no Dia a Dia

### Escolha a esteira pelo risco da tarefa:

| Situação | Esteira | Agentes Ativos |
|---|---|---|
| Layout, CSS, textos, microcopy | ⚡ Fast-Track | Tech Lead + Dev |
| Nova tela, componente, hook Supabase | 📦 Standard-Track | Product + Tech Lead + Dev + QA |
| Checkout MP, webhook, RLS, LGPD | 🛡️ Full-Track | Todos (6 gatekeepers) |
| Analytics, CRO, SEO, A/B test | 📈 Growth-Track | Data Analyst + Product + UX + Dev |
| Bug em produção, incidente, queda | 🚨 Incident-Track | Bug Hunter + SRE + Tech Lead + Dev + QA |

### Para cada cenário, use o [`PLAYBOOK_PROMPTS.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/PLAYBOOK_PROMPTS.md) — guia completo com prompts otimizados prontos para copiar.

---

## 👥 Os 8 Agentes do Squad

| # | Agente | Papel | Ativado em |
|---|---|---|---|
| 1 | 🎯 Product Lead | ROI, critérios de aceite, anti-burocracia | Standard / Full / Growth |
| 2 | ⚙️ Tech Lead | Arquitetura, ARCH.md, Zod, ADRs | Fast / Standard / Full / Incident |
| 3 | 💻 Fullstack Dev | Código React + Edge Functions Deno | Todas |
| 4 | 🛡️ Platform & Security | RLS, OWASP, LGPD, SRE | Full / Incident |
| 5 | 🧪 QA Automation | Jest, Playwright, Smoke Tests Deno | Standard / Full / Incident |
| 6 | 📈 Data & Growth | GA4, CRO, SEO Clínico, Churn | Growth |
| 7 | 🐛 Bug Hunter | Diagnóstico RCA por camada — Silent First | Incident |
| 8 | 🎨 UX Design | WCAG 2.1, CRO Visual, Mobile > 80% | Full / Growth |

---

## 🔒 Guardrails Globais Invioláveis (Todas as Esteiras)

1. **Zero PII em Logs:** Proibido CPF, senhas, cartão ou prontuários em logs/prompts.
2. **RLS Mandatório:** Toda tabela nova exige políticas Row Level Security ativas.
3. **Pre-flight Real:** `npm test` + `npm run build` confirmados antes de declarar "Concluído".
4. **Silent Diagnosis First:** Em incidentes, Root Cause confirmada ANTES de propor código.
5. **ARCH.md como Verdade:** Qualquer decisão de banco/API/Edge Function valida contra `ARCH.md`.

---

## ⚡ Comandos de Automação via CLI

```bash
# Gatekeeper automático: compilação + testes
npm run squad:check

# Testar Edge Function localmente (substitua pelo nome da função)
supabase functions serve mp-webhook --env-file .env

# Rodar testes E2E Playwright
npx playwright test

# Rodar apenas testes unitários Jest
npm test
```

---

## 📚 Documentos de Referência Rápida

| Documento | Propósito |
|---|---|
| [`ARCH.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/ARCH.md) | Arquitetura, ERD, RLS, Edge Functions — fonte de verdade |
| [`ORCHESTRATOR.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/ORCHESTRATOR.md) | Roteamento de esteiras e qualificação |
| [`PLAYBOOK_PROMPTS.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/PLAYBOOK_PROMPTS.md) | Prompts prontos para todos os cenários |
| [`PROMPT_TEMPLATES.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/PROMPT_TEMPLATES.md) | Templates rápidos (7 formatos) |
| [`03_SQUAD_MEMORY.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/03_SQUAD_MEMORY.md) | ADRs + RCA Log de bugs conhecidos |
