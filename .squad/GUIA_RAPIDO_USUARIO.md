# 🧭 Guia Rápido de Uso da Squad Multiagente v3.0
## Para Usuários, Product Owners e Engenheiros · Google Antigravity Agent Runtime

Bem-vindo à nova versão da **Squad Multiagente Doxologos**. Ela foi projetada para atuar com alto pensamento crítico, ceticismo técnico preventivo e validação empírica de regressão zero.

---

## 🎯 1. Como a Squad Pensa e se Comporta

1. **A Squad NÃO É um Executor Passivo:**
   - Diante de pedidos como *"delete este arquivo"*, *"refatore este serviço"* ou *"mude este fluxo"*, a squad não executará cegamente.
   - Ela fará uma **Análise Transversal de Impacto de Borda (*Blast Radius*)**, identificando se a mudança quebra o agendamento 24/7, o checkout Mercado Pago ou o sigilo dos prontuários.
   - Se houver riscos, a squad pausará, apresentará os prós/contras e proporá a alternativa mais segura antes de tocar no código.

2. **Trava Obrigatória de Decisão (*Gated Execution*):**
   - Mudanças estruturais exigem sua aprovação explícita caso haja ressalvas técnicas ou operacionais.

3. **Causa Raiz Forense em 3 Passos (Anti-Band-Aid):**
   - Diante de erros, a squad executa:
     - **Passo 1:** Isolar e provar a causa raiz (*Root Cause Discovery*).
     - **Passo 2:** Aplicar a correção estritamente atômica (*Immediate Fix*).
     - **Passo 3:** Criar a melhoria estrutural permanente (*Structural Evolution*) e teste automatizado de regressão.

4. **Regressão Zero por Comprovação Real:**
   - A squad não "acha" que o código funciona. Ela roda os testes no terminal do Antigravity (`npm test`, `npm run build`, `npm run squad:check`) e só entrega após status verde comprovado.

---

## 🚀 2. Guia de Interação no Dia a Dia (3 Cenários Práticos)

### Cenário A: Quero Refatorar ou Remover Algo Sensível
> **Prompt Recomendado:**  
> *"Orquestrador Doxologos, acione a **Trava Gated Execution**. Desejo [remover o arquivo X / refatorar o serviço de agendamentos Y]. Mapeie o Blast Radius, apresente o parecer crítico da squad e a alternativa mais segura antes de alterar qualquer código."*

### Cenário B: Um Erro Ocorreu em Produção ou no Atendimento
> **Prompt Recomendado:**  
> *"Orquestrador Doxologos, ative o **Bug Hunter** no protocolo forense de 3 passos. O paciente/psicólogo observou o erro [descreva] na URL [rota]. Seguem os logs [cole o erro/stack trace]. Descubra a causa raiz antes de propor código."*

### Cenário C: Quero Comprovar que Tudo Continua Funcionando
> **Prompt Recomendado:**  
> *"Orquestrador Doxologos, acione o **QA Automation** para validação dinâmica completa via terminal: execute `npm run squad:check` e comprove a ausência de regressões com status verde."*

---

## 👥 3. Quem Chamar para Cada Situação

| Necessidade | Agente Especialista | Como Acionar |
|---|---|---|
| **Investigação profunda de bug** | 🐛 `bug_hunter.md` | *"Ative o Bug Hunter..."* |
| **Testes automatizados e CI** | 🧪 `qa_automation.md` | *"Ative o QA Automation..."* |
| **Regras de negócio e ROI** | 🎯 `product_lead.md` | *"Ative o Product Lead..."* |
| **Segurança, RLS e LGPD** | 🛡️ `platform_security.md` | *"Ative o Platform Security..."* |
| **Cache, tokens e latência de IA** | 🤖 `llm_and_aiops_engineer.md` | *"Ative o AI & AIOps Engineer..."* |
| **Arquitetura e contratos Zod** | ⚙️ `tech_lead.md` | *"Ative o Tech Lead..."* |
| **Desenvolvimento React/Deno** | 💻 `fullstack_dev.md` | *"Ative o Fullstack Dev..."* |
| **Mobile UX e Acessibilidade** | 🎨 `ux_design.md` | *"Ative o UX Design..."* |
| **Métricas, SEO ético e GA4** | 📈 `data_growth_analyst.md` | *"Ative o Data Analyst..."* |

---

## 📚 4. Documentos de Apoio Rápido
- **Templates de Prompts Prontos:** Consulte [`.squad/PROMPT_TEMPLATES.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/PROMPT_TEMPLATES.md).
- **Playbook por Cenário Detalhado:** Consulte [`.squad/PLAYBOOK_PROMPTS.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/PLAYBOOK_PROMPTS.md).
- **Invariantes Ativas (< 1.500 tokens):** Consulte [`.squad/CORE_INVARIANTS.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/CORE_INVARIANTS.md).
- **Histórico de ADRs e Decisões:** Consulte [`.squad/03_SQUAD_MEMORY.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/03_SQUAD_MEMORY.md).
