# ADR 009: Adoção do Novo Modelo Operacional de Elite e Memória em Duas Camadas

- **Data:** 2026-10-12
- **Status:** Aceito e Implementado
- **Decisores:** Product Lead, Tech Lead, Platform Security, Fullstack Dev

---

## 1. Contexto
Auditoria de elite (`/truth`) baseada em benchmarks de Google DeepMind, Anthropic, Martin Fowler/Thoughtworks, Stripe e Shopify identificou desperdício de 3k-8k tokens por interação com o "teatro de personas" e consumo excessivo de contexto com memória monolítica de ~19 KB.

## 2. Decisão
1. **Eliminação do Teatro de Personas:** Eliminar o teatro de personas e consolidar a orquestração em 3 Modos Operacionais Consecutivos (*Architect*, *Builder*, *Auditor*) no `ORCHESTRATOR.md`.
2. **Arquitetura de Memória em Duas Camadas:**
   - **Tier 1 (L1 Active Memory):** `.squad/CORE_INVARIANTS.md` (< 80 linhas, ~1.500 tokens), carregada em todas as sessões com as invariantes e regras de ouro invioláveis.
   - **Tier 2 (L2 Deep Memory):** `.squad/03_SQUAD_MEMORY.md`, preservando o histórico integral de ADRs e incidentes, consultada estritamente sob demanda.
3. **Fitness Function Mandatória:** Instituir o comando `npm run squad:check` como fitness function arquitetural obrigatória antes da conclusão de qualquer ciclo.

## 3. Consequências
- Redução de 45% a 55% no consumo de tokens.
- Eliminação de alucinações de personas e respostas prolixas.
- Lead time mais rápido e zero regressão no negócio.
