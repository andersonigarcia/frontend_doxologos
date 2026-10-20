# ADR 022 — Governança Operacional, Retenção Clínica, No-Show e Coortes (Fase 3)

**Status:** APROVADA & IMPLEMENTADA  
**Data:** 2026-10-19  
**Autor:** Antigravity AI Orchestrator  
**Escopo:** Módulo Administrativo / Governança Clínica & Operacional (Fase 3)

---

## 1. Contexto e Motivação
Na Fase 1 e 2, consolidamos a governança financeira, métricas de faturamento e o Cockpit Executivo com IA.

Contudo, clínicas de psicologia e telemedicina sustentam sua viabilidade em **fidelização clínica e regularidade de agenda**. As principais carências diagnosticadas (Fase 0) eram:
1. **Falta de visibilidade de No-Show (faltas):** Não comparecimentos e cancelamentos ficavam dispersos ou mascarados sem análise agregada por profissional e dia da semana.
2. **Taxa de Retorno à 2ª Sessão:** A métrica padrão-ouro de CRO clínico em saúde mental (quantos pacientes continuam após a sessão inicial de avaliação) não existia de forma canônica.
3. **Prevenção de Abandono (Churn Clínico):** Pacientes que realizaram sessões no passado mas estavam sem agendamento há semanas não eram identificados de forma preventiva.
4. **Capacidade vs Demanda por Turnos:** O gestor não sabia se a clínica tinha escassez ou excesso de slots em turnos específicos (Manhã, Tarde, Noite).
5. **Conformidade Ética & Zero PII:** Toda análise operacional deve respeitar o Art. 9º do Código de Ética do Psicólogo e a LGPD, jamais expondo notas de evolução, hipóteses diagnósticas ou prontuários na área administrativa.

---

## 2. Decisões Arquiteturais e Fórmulas Canônicas

### 2.1. Extensão de `adminMetrics.js`
Foram adicionadas 5 funções testáveis e puras:
1. **`anonymizePatientName(name)`**: Converte nomes completos para padrão seguro de gestão (`Mariana Silva Santos` -> `Mariana S.`), eliminando PII da interface do gestor.
2. **`computeNoShowAndCancellationMetrics(bookings)`**:
   - Totaliza consultas concluídas, faltas (`no_show`, `no_show_unjustified`, `session_status === 'no_show'`) e cancelamentos.
   - Taxa de No-Show: `(noShowCount / (completedCount + noShowCount)) * 100`.
   - Taxa de Cancelamento: `(cancelledCount / total) * 100`.
   - Agrupamento analítico por profissional e por dia da semana (0-6).
3. **`computePatientRetentionMetrics(bookings)`**:
   - Agrupa atendimentos concluídos por paciente.
   - Categoriza em coortes de frequência: 1 Consulta (Sessão Inicial), 2 a 4 Consultas (Acompanhamento em curso), 5+ Consultas (Tratamento fidelizado).
   - Calcula a **Taxa de Retorno à 2ª Consulta** e o **Tempo Médio de Retorno** (dias entre a primeira e a segunda sessão).
4. **`identifyDisengagedPatients(bookings, daysThreshold, referenceDate)`**:
   - Mapeia pacientes cuja última consulta concluída foi há mais de `daysThreshold` dias (default 30d) e que **não possuem agendamento futuro marcado**.
   - Fornece link de contato via WhatsApp com mensagem de acolhimento ético pré-configurada.
5. **`computeCapacityAndDemandByDay(bookings, availability)`**:
   - Cruza a grade semanal de disponibilidade aberta com os agendamentos realizados, discriminando turnos: Manhã (08h-12h), Tarde (12h-18h) e Noite (18h-22h).

### 2.2. Criação do Módulo `OperationalRetentionModule.jsx`
- Componente de gestão clínica operacional contendo 4 sub-abas:
  1. **Retenção & Coortes:** Gráfico de distribuição de pacientes e indicadores de fidelização.
  2. **No-Show & Cancelamentos:** Tabela de faltas por psicólogo e distribuição por dia da semana.
  3. **Prevenção de Abandono:** Tabela de pacientes inativos anonimizados com atalhos de acolhimento.
  4. **Capacidade vs Demanda:** Visão de turnos (Manhã, Tarde, Noite) de segunda a sábado.
- Integrado na `AdminSidebar` (Módulo 2: Operação da Clínica) sob a aba `retention-ops` e em `AdminPage.jsx`.

---

## 3. Arquivos Modificados / Criados
- `src/lib/adminMetrics.js` (5 novas funções canônicas de operação e retenção).
- `src/lib/__tests__/adminMetrics.test.js` (21 testes passando).
- `src/components/admin/OperationalRetentionModule.jsx` (Módulo operacional interativo).
- `src/components/admin/__tests__/OperationalRetentionModule.test.jsx` (4 testes unitários).
- `src/config/tabsConfig.js` (Inclusão da aba `retention-ops`).
- `src/components/admin/AdminSidebar.jsx` (Inclusão da aba `retention-ops`).
- `src/pages/AdminPage.jsx` (Renderização de `OperationalRetentionModule`).

---

## 4. Resultados da Validação
- **Suíte de Testes:** 27 suítes / 285 testes Jest verdes (`npm test`).
- **Guardrails de Arquitetura:** 100% aprovado (`npm run check:architecture`).
- **Build de Produção:** Concluído com sucesso em 25.7s (`npm run build`).
