# 📦 ESTEIRA 2: STANDARD-TRACK (Features Médias & Telas)
> **Grafo Dirigido de Estados (DAG) | Execução Determinística | Zero Loops Infinitos**

---

## 🎯 1. Aplicabilidade & Critérios de Entrada
Esta esteira é ativada para funcionalidades de **médio porte**, tais como:
- Criação ou evolução de telas, modais ou abas na Área do Paciente ou Painel do Profissional.
- Criação de novos hooks de leitura no Supabase via TanStack Query.
- Novos componentes de interface reutilizáveis (Radix UI / shadcn/ui).
- Validação de novos formulários clínicos ou cadastrais com Zod.

**Agentes Ativos:** `Product Lead` + `Tech Lead` + `Fullstack Dev` + `QA Automation`.

---

## 🧭 2. Grafo Dirigido de Estados (DAG)

```mermaid
flowchart TD
    S0["[S0] Entrada: Especificação da Feature"] --> S1["[S1] Product Lead: Critérios de Aceite & ROI Clínico"]
    S1 --> S2["[S2] Tech Lead: Contratos Zod, Tipagens & Blast Radius"]
    S2 --> S3{"Impacto Estrutural / Refatoração Pesada?"}
    S3 -- Sim --> S_GATE["[GATE] Trava Gated Execution (Aprovação do Usuário)"]
    S_GATE --> S4["[S3] Fullstack Dev: Construção Canônica (src/services/)"]
    S3 -- Não --> S4
    S4 --> S5["[S4] QA Automation: Validação Empírica (npm run check:architecture && npm test)"]
    S5 --> S6{"Testes e Guardrails Verdes?"}
    S6 -- Sim --> S_BUILD["[S5] Build de Produção (npm run build)"]
    S_BUILD --> S_DONE["[S6] TÉRMINO: Feature Concluída & ADR Indexada"]
    S6 -- Não (Falha) --> S_FIX["[S_FIX] 1 Correção Atômica pelo Dev"]
    S_FIX --> S5
```

---

## ⚙️ 3. Transições de Estado & Critérios Determinísticos

### Estado S0: Entrada
- Recebe a especificação da feature média.

### Estado S1: Alinhamento de Negócio & Ética (Product Lead)
- Valida os critérios de aceite focados na jornada do paciente/psicólogo.
- Assegura linguagem acolhedora e conformidade com o CFP (sem promessas falsas).

### Estado S2: Arquitetura & Contratos (Tech Lead)
- Define os contratos Zod e os hooks TanStack Query necessários em `src/hooks/queries/`.
- Mapeia o Blast Radius. Se houver deleção ou mudança em contratos existentes, aciona a **Trava Gated Execution**.

### Estado S3: Construção Canônica (Fullstack Dev)
- Constrói a feature consumindo estritamente os serviços canônicos sob `src/services/`.
- Aplica whitelists de campos (`ALLOWED_FIELDS`) validados contra `databaseCatalog.json`.

### Estado S4 & S5: Validação de Qualidade & Build (QA Automation)
- Executa no terminal:
  ```bash
  npm run check:architecture && npm test && npm run build
  ```
- *Condição de Término:* Status verde em todas as etapas conclui a esteira (**S_DONE**).
- *Condição Anti-Loop:* No máximo 1 ciclo de reparo atômico (**S_FIX**). Persistindo falha, pausa a execução com relatório forense.

---

## 🏁 4. Estado Terminal (Definição de Pronto - DoD)
- [ ] Componente ou tela conectado exclusivamente aos serviços canônicos.
- [ ] Whitelist de campos aplicada contra schema drift.
- [ ] Guardrails de arquitetura, testes e build 100% verdes no terminal.
- [ ] Registro resumido no Lightweight ADR Index de `03_SQUAD_MEMORY.md` caso novo padrão tenha sido introduzido.
