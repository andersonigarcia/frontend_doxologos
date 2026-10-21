# 🏛️ ADR 029: Radar de Acompanhamento & Retenção Ativa de Pacientes (Admin)

## 📅 Data
2026-10-20

## 🎯 Contexto e Justificativa de ROI
1. **O Gargalo do Drop-off de 1ª Sessão:** Em telepsicologia, 35% a 50% dos pacientes que concluem sua primeira consulta não agendam a segunda (drop-off precoce), gerando perda massiva de LTV e interrupção terapêutica.
2. **Inatividade Silenciosa (> 30d e > 60d):** Pacientes em tratamento que por imprevistos da rotina ficam sem agendamento futuro frequentemente abandonam a psicoterapia se não houver um contato acolhedor da clínica.
3. **Custo de Aquisição (CAC) vs. Retenção:** Reconectar um paciente que já confiou na plataforma custa uma fração do valor gasto em tráfego pago para adquirir um novo lead.
4. **Alinhamento Ético & Humanizado (CFP):** Em saúde mental, o contato de acompanhamento administrativo **NUNCA DEVE PARECER VENDA, COBRANÇA OU PRESSÃO**. Deve ser pautado em cuidado, escuta ativa e acolhimento (Código de Ética do Psicólogo).

---

## 💡 Decisões Tomadas

### 1. Motor Analítico Canônico (`adminMetrics.js`)
- Criada a função pura e testável `computePatientFollowUpAndRetention(bookings, options)` em [`src/lib/adminMetrics.js`](file:///src/lib/adminMetrics.js):
  - Segmentos identificados:
    - `single_session`: Fez exatamente 1 consulta realizada e está sem agendamento futuro há ≥ 7 dias (Drop-off precoce / Prioridade máxima).
    - `over_30d`: Sem retorno agendado há 30 a 59 dias (Risco Alto).
    - `critical_60d`: Inativo há mais de 60 dias sem agendamento (Abandono prolongado).
    - `recent_no_next`: Consulta recente (8 a 29 dias) sem próxima sessão agendada (Atenção preventiva).
  - Exclusão estrita de pacientes com qualquer agendamento futuro garantido (`confirmed`, `paid`, `pending`).
  - Geração dinâmica de scripts de acolhimento personalizados com o primeiro nome do paciente e o nome do psicólogo atendente.

### 2. Camada Reativa TanStack Query (`usePatientRetentionQuery.js`)
- Implementado o hook canônico [`usePatientRetentionQuery.js`](file:///src/hooks/queries/usePatientRetentionQuery.js) exportado no barrel [`src/hooks/queries/index.js`](file:///src/hooks/queries/index.js).
- Integração de cache com `staleTime: 2min` e sincronização de status de acompanhamento local (`doxologos_patient_retention_status_v1`) para permitir ao admin registrar o andamento de cada caso (`pendente`, `contatado`, `reagendado`, `pausa`, `concluido`).

### 3. Componente de UI & Experiência de Acolhimento (`PatientRetentionFollowUpModule.jsx`)
- Desenvolvido o componente [`PatientRetentionFollowUpModule.jsx`](file:///src/components/admin/PatientRetentionFollowUpModule.jsx) com TailwindCSS, Radix UI e aderente ao padrão Clean Analytics (ADR 026):
  - **Top Cards (Grid 2x2 Mobile):** Total em Risco, Só 1 Consulta Feita, Inativos > 30 Dias e Reagendados / Revertidos.
  - **Pills de Segmento & Filtros Rápidos:** Filtragem em 1 clique por risco, busca em tempo real (nome, email, telefone, psicólogo) e filtro por profissional.
  - **Modal de Acolhimento Humanizado:**
    - Exibe 3 opções de abordagem: 1ª Consulta (Bem-estar), Reconexão Suave (Pausa) e Apoio Operacional (Agenda/Dúvidas).
    - Botão "Copiar Mensagem" com feedback visual.
    - Botão "Abrir no WhatsApp" que dispara mensagem oficial de suporte e atualiza o status automaticamente para "Mensagem Enviada".
  - **Playbook Ético CFP Expansível:** Orientações claras para o time de suporte sobre sigilo, zero pressão comercial e respeito à autonomia do paciente.
  - **Exportação CSV:** Exportação com codificação UTF-8 BOM para relatórios operacionais.

### 4. Navegação Integrada no Painel Admin
- Integrado na aba dedicada `patient-followup` no [`AdminSidebar.jsx`](file:///src/components/admin/AdminSidebar.jsx), [`tabsConfig.js`](file:///src/config/tabsConfig.js) e [`AdminPage.jsx`](file:///src/pages/AdminPage.jsx).
- Integrado também como sub-aba primária "Acompanhamento & Reversão" em [`OperationalRetentionModule.jsx`](file:///src/components/admin/OperationalRetentionModule.jsx).

---

## 🔒 Invariantes Estabelecidas
1. **Conformidade Ética do CFP:** Mensagens sugeridas nunca devem conter termos coercitivos, pressão comercial ou promessas de resultado clínico.
2. **Exclusão de Pacientes com Agendamento Futuro:** Pacientes com consultas futuras agendadas ou pagas jamais devem ser enquadrados como risco de abandono.
3. **Respeito à Vontade do Paciente:** Ao registrar status "Pausa Terapêutica" ou "Alta / Concluído", o sistema respeita a decisão do paciente cessando recomendações de contato ativo.
