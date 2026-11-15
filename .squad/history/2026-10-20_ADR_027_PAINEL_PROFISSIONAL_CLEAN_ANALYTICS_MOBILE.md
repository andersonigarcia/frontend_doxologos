# 🏛️ ADR 027: Modernização do Painel do Profissional — Clean Analytics, Ergonomia Mobile-First e Atendimento Imediato

## 📅 Data
2026-10-20

## 🎯 Contexto e Diagnóstico
O Painel do Profissional (`/profissional`, `ProfessionalDashboardPage.jsx`) apresentava desafios críticos que impactavam a rotina clínica diária dos psicólogos:
1. **Déficit Severo de Usabilidade Mobile:** A sidebar era completamente ocultada em telas menores que 768px (`hidden md:block`), enquanto o menu hambúrguer continha apenas "Voltar ao site" e "Logout". Profissionais acessando pelo smartphone entre consultas ficavam impossibilitados de trocar de aba.
2. **Fricção no Fluxo de Atendimento:** O psicólogo precisava navegar por abas para encontrar a teleconsulta do momento, o link do Google Meet e a evolução do prontuário, gerando atrasos entre sessões.
3. **Ambiguidade Contábil e Fiscal:** Os honorários a receber eram rotulados genericamente como "Faturamento", misturando sessões já realizadas com sessões futuras confirmadas, gerando confusão sobre apuração para Livro Caixa / Carnê-Leão e emissão de recibos/NFS-e. Além disso, o fallback de repasse calculava 100% da consulta na ausência do valor explícito (gerando valores inflados).
4. **Agrupamento de Pacientes com Risco de Colisão:** Pacientes sem e-mail cadastrado eram indexados unicamente pelo primeiro nome, criando risco de colisão entre homônimos.
5. **Poluição Visual (Overchoice de Abas):** Módulos administrativos desnecessários ou obsoletos poluíam a experiência do terapeuta.
6. **Desalinhamento com o Design System Clean Analytics (ADR 026):** O painel do profissional ainda retinha tons legados e contrastes fracos.

---

## 💡 Decisões Tomadas

### 1. Ergonomia Mobile-First com Barra Inferior Nativa
- Criado o componente [`ProfessionalBottomNav.jsx`](file:///src/components/professional/ProfessionalBottomNav.jsx) exclusivo para mobile (`md:hidden`), fixado no rodapé (`bottom-0 z-40`) com `safe-area-inset-bottom` para iPhone/Android.
- Oferece 5 atalhos com alvos de toque ergonômicos (≥48px): **Hoje** (Cockpit do Dia), **Agenda** (Consultas), **Pacientes** (Prontuários), **Horários** (Disponibilidade) e **Honorários** (Repasses).
- O menu hambúrguer mobile também foi expandido para permitir alternância rápida entre todas as áreas.

### 2. Fluxo "1-Clique para Atendimento" (`ImmediateCareCard.jsx`)
- Criado o componente [`ImmediateCareCard.jsx`](file:///src/components/professional/ImmediateCareCard.jsx) posicionado como Hero Card no topo do painel.
- Identifica dinamicamente a próxima consulta ativa do dia (`confirmed` ou `paid`) e expõe:
  - Botão de ação primária em 1 toque: **Iniciar Consulta Agora** (Google Meet / Sala de Espera).
  - Botão de ação secundária: **Evolução Clínica / Prontuário** (abre direto o modal estruturado do paciente).
  - Botão de lembrete via **WhatsApp** com texto pré-formatado e link da consulta.
  - Estado vazio gracioso caso não haja consultas pendentes no dia.

### 3. Integridade Numérica e Separação Contábil
- Em [`useProfessionalStats.jsx`](file:///src/hooks/useProfessionalStats.jsx):
  - Segregação estrita entre `realizedRevenue` (sessões `completed` ou `paid`) e `forecastRevenue` (sessões futuras `confirmed`).
  - Rotulagem explícita no painel como **"Meus Honorários (Mês)"**, informando o valor realizado em destaque e a projeção com clareza.
- Em [`usePatientData.jsx`](file:///src/hooks/usePatientData.jsx):
  - Fallback de repasse profissional ajustado de 100% para 60% caso não haja valor pré-configurado no serviço.
  - Sanitização da chave de agrupamento de pacientes: prioriza e-mail limpo; na ausência, concatena telefone numérico com nome completo, eliminando riscos de sobreposição entre homônimos.

### 4. Transição para o Clean Analytics Design System (ADR 026)
- Fundo do painel atualizado para `bg-slate-50` com cartões em `bg-white border-slate-200/80 rounded-2xl shadow-xs`.
- Tipografia sans-serif refinada com alinhamento tabular (`tabular-nums`) para todos os valores monetários e horários.
- Ações primárias no padrão `bg-slate-900 text-white hover:bg-slate-800`.
- Modais e listas de pacientes ([`PatientList.jsx`](file:///src/components/admin/PatientList.jsx) e [`PatientDetailsModal.jsx`](file:///src/components/admin/PatientDetailsModal.jsx)) modernizados com badges de conformidade ao sigilo profissional (Res. CFP 001/2009 e LGPD).

### 5. Despoluição da Experiência Clínica
- Removidas abas administrativas não pertinentes à atuação do terapeuta (gestão de custos gerais da clínica, SEO de blog, cupons promocionais, etc.), mantendo foco total no paciente, na agenda e no retorno financeiro.

### 6. Cockpit Diário da Agenda Clínica (`ProfessionalScheduleCockpit.jsx`)
- Desenvolvido o componente visual de alta legibilidade substituindo tabelas genéricas:
  - Navegador ágil de datas: **[ Ontem ] [ Hoje (N) ] [ Amanhã (N) ] [ Seletor Livre ]**.
  - Timeline cronológica vertical com pills de horário em alto contraste, cards de pacientes, valor do honorário e chips de status.
  - Ações clínicas em 1 toque por consulta: entrar no Google Meet, abrir prontuário/evolução, enviar lembrete via WhatsApp, exportar para Google Agenda e baixar `.ics`.
  - Métricas consolidadas do dia: total de consultas, honorários previstos do dia e janela de horários (início e término).

### 7. Radar de Novos Agendamentos (`RecentBookingsBanner.jsx`)
- Componente de alerta inteligente posicionado no topo do Cockpit:
  - Destaca agendamentos confirmados/pagos nas últimas 48 horas.
  - Expõe atalho individual "+ Google Agenda" e botão de marcar como lido (persistido em `localStorage`).

### 8. Sincronização de Calendário Pessoal & Exportação .ICS (`calendarUtils.js` & `CalendarSyncModal.jsx`)
- Utilitário canônico `calendarUtils.js`:
  - Geração de URLs diretas do Google Calendar (`https://calendar.google.com/calendar/render?...`).
  - Geração de arquivos padrão RFC 5545 `.ics` para consultas individuais e para a agenda futura completa do psicólogo com alarmes embutidos (`VALARM` 15 minutos antes).
- Modal `CalendarSyncModal.jsx` com instruções didáticas para iPhone/iPad (Apple Calendar), Android e Google Agenda/Outlook.

### 9. Central de Notificações In-App & Disparo no Webhook
- `NotificationCenter.jsx` integrado aos headers desktop e mobile do painel do profissional, com badge pulsante de contagem e sintetizador sonoro discreto via Web Audio API (`playChime`) sem dependências de arquivos externos.
- Em `post-payment-orchestrator`:
  - Inclusão de botão "📅 Adicionar ao Google Agenda" no e-mail transacional de confirmação do psicólogo.
  - Gravação automática de registros na tabela `notifications` direcionados ao `user_id` do profissional assim que um pagamento é aprovado.

### 10. Despoluição da Visão Geral: Realocação da Evolução da Receita e Eliminação de Ações Rápidas Redundantes
- **Evolução da Receita (`RevenueAnalytics`):** Removido da aba "Visão Geral" (`dashboard`) e realocado para a aba "Honorários" (`financeiro`), compondo o topo do `FinancialDashboard`. Na Visão Geral, a métrica de honorários fica restrita ao `StatCard` discreto ("Meus Honorários do Mês").
- **Ações Rápidas (`QuickActions`):** Removido por completa redundância com a barra lateral esquerda (desktop) e a barra inferior (`ProfessionalBottomNav` no mobile). A eliminação do bloco recupera mais de 250px de altura de tela, garantindo que o Cockpit Diário e os cards de atendimento permaneçam acima da dobra.

---

## 🔒 Invariantes Arquiteturais Estabelecidas
1. **Mobile Bottom Nav Obrigatório:** Qualquer nova funcionalidade principal voltada ao psicólogo deve ter ponto de entrada na navegação mobile sem depender de menus aninhados.
2. **Terminologia de Honorários:** No painel do profissional, o termo "Faturamento" é proibido; deve-se usar estritamente "Honorários Realizados" e "Honorários Previstos".
3. **Sigilo CFP Res. 001/2009:** Todo modal de prontuário deve exibir aviso explícito de sigilo e não expor dados de pacientes a terceiros.
4. **Alarme Pessoal via Calendário:** Consultas confirmadas devem sempre prover link de 1 clique para Google Calendar e arquivo universal `.ics` com alarme configurado para 15 minutos antes.
5. **Notificação In-App Obrigatória:** Toda aprovação de agendamento no backend deve gerar registro na tabela `notifications` para o profissional além do e-mail.
6. **Segregação de Contexto Clínico vs. Financeiro:** Gráficos históricos de receita pertencem estritamente à aba "Honorários", mantendo a "Visão Geral" dedicada à operação clínica imediata (próximo atendimento, agenda do dia, alertas). Blocos de "Ações Rápidas" que duplicam a navegação da barra lateral são vedados.
