# 🧠 Squad Multiagente - Doxologos Psicologia (Antigravity & IDE Mode)

Esta pasta (`.squad/`) é a memória externa e o ecossistema de inteligência do **Squad End-to-End do Doxologos Psicologia**.

---

## 🏛️ Nova Arquitetura Modular (Alta Eficiência de Tokens)

O Squad foi reestruturado de uma especificação monolítica para uma **Arquitetura Modular Dinâmica**, composta por:

1. **`ORCHESTRATOR.md`**: O Roteador Central magro que analisa o pedido e ativa a esteira correta.
2. **`agents/`**: Sub-prompts focados por persona (`product_lead`, `tech_lead`, `fullstack_dev`, `platform_security`, `qa_automation`).
3. **`workflows/`**: Esteiras de execução ajustadas ao risco da tarefa (`fast_track`, `standard_track`, `full_track`).
4. **`02_PROJECT_CONTEXT.md`**: Estado atual do projeto, jornada do paciente e SLAs de produção.
5. **`03_SQUAD_MEMORY.md`**: Diário de bordo com ADRs ativas vigentes.

---

## 📋 Como utilizar no dia a dia no Antigravity / IDE

Sempre que iniciar uma **nova sessão ou tarefa**, o Orquestrador entrará em ação automaticamente:

1. **Para tarefas simples (layout, textos, hotfixes):** O Squad usará o [`fast_track.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/workflows/fast_track.md) consumindo até **75% menos tokens**.
2. **Para novas features de frontend/componentes:** O Squad usará o [`standard_track.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/workflows/standard_track.md).
3. **Para checkout, Mercado Pago, Zoom, RLS ou LGPD:** O Squad ativará o [`full_track.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/workflows/full_track.md) acionando os 6 Gatekeepers de Validação Cruzada.

---

## ⚡ Comandos Úteis de Automação via CLI

No terminal da IDE, você pode rodar os gatekeepers automatizados:
```bash
npm run squad:check
```
Este comando executa a compilação do projeto (`npm run build`) e a suíte de testes (`npm test`) com diagnóstico no console.
