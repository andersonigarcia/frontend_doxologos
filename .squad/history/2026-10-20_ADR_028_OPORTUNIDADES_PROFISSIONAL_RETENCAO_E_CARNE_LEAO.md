# 🏛️ ADR 028: Oportunidades do Profissional — Reagendamento Imediato, Carnê-Leão, Link da Bio/QR Code, Triagem GAD-7 e Timer de Sessão

## 📅 Data
2026-10-20

## 🎯 Contexto e Diagnóstico
A análise aprofundada da jornada do psicólogo clínico no ecossistema Doxologos identificou oportunidades estratégicas para transformar a plataforma no ERP clínico e parceiro definitivo da carreira do profissional:
1. **Drop-off e Abandono de Tratamento (LTV):** O psicólogo encerrava a sessão e dependia do paciente lembrar de acessar o site dias depois para agendar a próxima consulta, gerando interrupção do processo terapêutico.
2. **Carga Burocrática e Fiscal (Carnê-Leão):** Psicólogos autônomos no Brasil perdem horas ou pagam contabilidades onerosas mensalmente para organizar CPFs e valores recebidos para o Carnê-Leão da Receita Federal.
3. **Divulgação Orgânica e Aquisição (CAC Zero):** Psicólogos queriam divulgar sua agenda em redes sociais (Instagram/WhatsApp) e cartões impressos, mas não tinham link direto ou QR Code próprio.
4. **Triagem Prévia & GAD-7:** Pacientes que respondem a autoavaliações psicométricas geravam dados valiosos que não chegavam ao terapeuta antes da 1ª sessão; ao mesmo tempo, a administração da plataforma necessitava de governança centralizada (toggle) para ativar/desativar esse recurso.
5. **Pontualidade Clínica:** Necessidade de gerenciar a duração da sessão (50 min) com alerta discreto de fechamento (45 min) sem causar ansiedade ou distração no paciente.

---

## 💡 Decisões Tomadas

### 1. Reagendamento Imediato da Próxima Sessão (`ScheduleNextSessionModal.jsx`)
- Criado o modal [`ScheduleNextSessionModal.jsx`](file:///src/components/professional/ScheduleNextSessionModal.jsx) acessível pelo Prontuário ([`PatientDetailsModal.jsx`](file:///src/components/admin/PatientDetailsModal.jsx)), pelo Cockpit da Agenda ([`ProfessionalScheduleCockpit.jsx`](file:///src/components/professional/ProfessionalScheduleCockpit.jsx)) e pelo Card Imediato ([`ImmediateCareCard.jsx`](file:///src/components/professional/ImmediateCareCard.jsx)).
- Sugere automaticamente +7 dias no mesmo horário da sessão anterior.
- Registra diretamente o agendamento oficial na Doxologos, preservando a governança e faturamento da plataforma (sem atalhos para WhatsApp particular).

### 2. Exportação Fiscal para Carnê-Leão & Livro-Caixa (`FinancialDashboard.jsx`)
- Desenvolvida a função `handleExportCarneLeao` em [`FinancialDashboard.jsx`](file:///src/components/admin/FinancialDashboard.jsx) com botão dedicado no toolbar financeiro.
- Gera arquivo CSV formatado com BOM UTF-8 (`\uFEFF`) e separador `;` brasileiro, contendo Data, CBO 2515-10 (Psicólogo Clínico), Nome do Paciente, CPF, Discriminação do Atendimento e Valor Recebido pelo Regime de Caixa.

### 3. Link da Bio & QR Code Próprio (`ProfessionalShareCard.jsx`) — Opção 2 Adotada
- Criado o componente [`ProfessionalShareCard.jsx`](file:///src/components/professional/ProfessionalShareCard.jsx) integrado à aba "Meu Perfil" do painel.
- Expõe o link canônico oficial `${origin}/agendamento?professional=${id}` com 1 clique para copiar para a bio de redes sociais e gera/baixa imagem QR Code de alta resolução para cartões impressos e materiais institucionais.
- **Proteção Anti-Desintermediação:** Botões e gatilhos diretos para WhatsApp foram deliberadamente excluídos para evitar contato fora da plataforma e garantir que todos os fluxos de agendamento ocorram exclusivamente no ambiente auditado e com checkout Doxologos.

### 4. Triagem Emocional Prévia (GAD-7) com Toggle de Governança Admin
- Em [`SystemSettingsManager.jsx`](file:///src/components/admin/SystemSettingsManager.jsx):
  - Adicionado o parâmetro `prontuario_show_emotional_triage: true` em `DEFAULT_SYSTEM_PARAMETERS` e `PARAMETER_METADATA`.
  - Inserido switch no Bloco 4 (Operação & Comunicação) para que o administrador da plataforma ative ou desative o recurso globalmente.
- Em [`PatientDetailsModal.jsx`](file:///src/components/admin/PatientDetailsModal.jsx):
  - Consulta `useSystemSettings()`. Se ativo, busca em `assessment_leads` por e-mail/telefone e renderiza card clínico com badges de gravidade (Mínima, Leve, Moderada, Severa), escore (ex: 15/21), data e detalhes das respostas autodeclaradas.

### 5. Timer Discreto de Sessão (50 min / Alerta 45 min)
- Em [`ImmediateCareCard.jsx`](file:///src/components/professional/ImmediateCareCard.jsx):
  - Timer minimalista `⏱️ MM:SS / 50:00` acionado ao clicar em "Iniciar Consulta" ou manualmente.
  - Aos 45 minutos (5 minutos finais), a tag ganha destaque suave em âmbar com aviso `(5 min p/ fechar)` sem gerar ruído sonoro.

---

## 🔒 Invariantes Estabelecidas
1. **Governança de Dados de Triagem:** O prontuário só pode expor dados de triagem emocional/GAD-7 se o parâmetro `prontuario_show_emotional_triage` estiver habilitado pelo administrador em `system_settings`.
2. **Proteção Anti-Vazamento e Intermediação:** Ferramentas de compartilhamento e reagendamento do profissional não devem expor links de contato particular externo (WhatsApp direto com paciente), canalizando sempre para a URL de agendamento e checkout institucional da Doxologos.
3. **Conformidade Fiscal Carnê-Leão:** O relatório fiscal deve sempre registrar exclusivamente sessões liquidadas (Regime de Caixa) com CBO 2515-10 e codificação UTF-8 BOM.
4. **Reagendamento com Preservação de Preço:** Agendamentos de retorno via `ScheduleNextSessionModal` devem respeitar o contrato de repasse e duração do serviço ativo do psicólogo.
