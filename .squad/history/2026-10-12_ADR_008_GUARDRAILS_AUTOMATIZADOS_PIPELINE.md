# ADR 008: Guardrails Automatizados de Pipeline e Prevenção de Schema Drift

- **Data:** 2026-10-12
- **Status:** Aceito e Implementado
- **Decisores:** Tech Lead, Platform Security, QA Automation

---

## 1. Contexto
Necessidade de garantir que nenhuma regressão, correção paliativa ("band-aid") ou schema drift volte a acontecer com o passar do tempo ou com alterações de múltiplos desenvolvedores/agentes de IA.

## 2. Decisão
1. **Script de Guardrails:** Criar script de validação estática `scripts/check-architecture-guardrails.js` que audita integridade de serviços, ausência de colunas fantasmas e proibição de mutações diretas em componentes de UI.
2. **Integração ao CI/CLI:** Integrar ao comando `npm run check:architecture` e ao script mestre de CI `npm run squad:check`.
3. **Suíte Automatizada Jest:** Criar suíte automatizada de testes Jest `src/services/__tests__/architectureGuardrails.test.js` que roda automaticamente no pipeline de testes (`npm test`).

## 3. Consequências
- 100% de cobertura contra schema drift e violações arquiteturais no ciclo de vida do código.
- Falhas bloqueiam builds antes de atingir o ambiente de staging ou produção.
- Estabilidade financeira e operacional garantida por automação contínua.
