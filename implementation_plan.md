# Plano de Implementação: Fase 4 - O "Fator UAU" para Pacientes

A Fase 4 foca em melhorar a retenção e o LTV (Lifetime Value) dos pacientes na plataforma Doxologos, agregando valor à experiência do paciente entre as consultas e estimulando o compromisso financeiro a longo prazo.

## 🚨 /TRUTH & /GAPS (Revisão de Negócio Obrigatória)

> [!CAUTION]
> **Risco Ético/Regulatório (CRP - Conselho Regional de Psicologia)**
> A Ação 4.1 original sugeria "Pacotes Fidelidade / Bônus". O Código de Ética Profissional do Psicólogo (CFP) e resoluções associadas proíbem estritamente a utilização do preço como forma de propaganda, oferecimento de "bônus", descontos atrelados a pacotes promocionais ou programas de fidelidade/milhagem. Se a plataforma atende psicólogos, implementar bônus em carteira **pode configurar infração ética para os profissionais cadastrados**.

> [!WARNING]
> **Risco de Privacidade de Dados (LGPD)**
> A Ação 4.2 propõe relatórios de evolução. Enviar resumos de sessões terapêuticas ou informações clínicas por E-mail ou WhatsApp é uma **violação grave de privacidade**. Qualquer relatório ou tarefa de casa deve ser disponibilizado **exclusivamente dentro de uma área logada e segura** do paciente.

> [!IMPORTANT]
> **Atrito Operacional (Profissional)**
> Para o paciente receber um "Relatório" bacana, o profissional precisa escrevê-lo. Se o profissional tiver que preencher um prontuário clínico (para ele) E um relatório de evolução (para o paciente), o tempo de pós-consulta dobra. A solução deve reaproveitar os campos que acabamos de criar na Fase 3.

---

## Proposta Revisada (Aprovada eticamente e tecnicamente)

Diante dos *Gaps* acima, a Fase 4 foi reformulada para fazer sentido operacional e regulatório:

### Ação 4.2: Portal do Paciente - "Meu Acompanhamento" (Dever de Casa Seguro)
Ao invés de enviar relatórios por e-mail, criaremos a aba "Meu Acompanhamento" no painel do próprio paciente (Área Logada).
- **Vantagem de Negócio:** Aumenta o engajamento e a percepção de valor. O paciente entra na plataforma entre as consultas, fortalecendo a retenção, de forma totalmente segura (LGPD).
- **Implementação e Fluxo:**
  1. O profissional, ao preencher o prontuário da sessão (Fase 3), preenche o campo `homework` (Tarefas / Dever de Casa).
  2. Adicionaremos um **Checkbox/Toggle** no modal de prontuário: *"Liberar visualização desta tarefa para o paciente"* (Desabilitado por padrão).
  3. O paciente, ao logar no seu painel (ex: `/dashboard/patient`), verá uma aba "Meu Acompanhamento".
  4. Nesta aba, haverá uma *timeline* exibindo apenas as "Tarefas" (`homework`) das sessões em que o profissional ativou o compartilhamento (junto com a data da sessão). Outros campos como Queixa Principal e Desenvolvimento permanecerão invisíveis para o paciente sempre.

---

## 🛠 Plano Técnico de Execução

### 1. Banco de Dados & RLS
- **[MODIFICAR] `patient_notes_history` e `patient_notes`**: Criar uma nova coluna booleana `homework_visible_to_patient` (default: false).
- **[MODIFICAR] RLS (Row Level Security)**: Adicionar uma nova política (Policy) de `SELECT` na tabela `patient_notes_history` permitindo que o paciente (baseado em `auth.email()`) possa visualizar as linhas onde `patient_email = auth.email()` E `homework_visible_to_patient = true`.
- **Restrição de Coluna**: O RLS de linhas permitirá a leitura, mas precisaremos garantir no Frontend do Paciente (ou na Query) que ele só selecione `id`, `session_date` e `homework` (evitando vazar `chief_complaint`).

### 2. Backend (Edge Functions)
- **[MODIFICAR] `patient-notes-manager`**: Atualizar a Edge Function de salvamento para receber o novo booleano e inseri-lo tanto na tabela `patient_notes` quanto na `patient_notes_history`. A função também deve limpar esse campo após salvar (voltando para `false` no rascunho principal).

### 3. Frontend - Área do Profissional
- **[MODIFICAR] `PatientDetailsModal.jsx`**: Adicionar o checkbox (Toggle switch) abaixo do campo de "Tarefas / Dever de Casa". Integrar o estado no formulário.
- **[MODIFICAR] `ProfessionalDashboardPage.jsx`**: Incluir o campo no payload do `handleSavePatientNotes`.

### 4. Frontend - Área do Paciente
- **[NOVO] Componente de Acompanhamento (`PatientAcompanhamento.jsx`)**: Criar uma aba ou seção dedicada no portal do paciente.
- O componente fará fetch das tarefas (via supabase client respeitando o RLS) e renderizará uma *timeline* simples, bonita e encorajadora (usando os padrões ricos de design definidos).

## User Review Required
Por favor, revise o plano atualizado. Se estiver de acordo, é só confirmar para iniciarmos a codificação da Fase 4!
