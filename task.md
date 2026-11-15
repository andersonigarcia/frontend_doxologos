# Tarefas: Fase 4 - Portal do Paciente (Meu Acompanhamento)

- `[x]` 1. **Banco de Dados (Migrations e RLS)**
  - `[x]` Criar migration para adicionar `homework_visible_to_patient` (BOOLEAN DEFAULT FALSE) em `patient_notes` e `patient_notes_history`
  - `[x]` Adicionar política RLS em `patient_notes_history` para permitir SELECT pelo próprio paciente (`auth.email()`) apenas se `homework_visible_to_patient = true`
- `[x]` 2. **Backend (Edge Function)**
  - `[x]` Atualizar `patient-notes-manager` para receber o boolean e gravar no histórico
  - `[x]` Limpar o valor na tabela principal (`patient_notes`) pós-save
- `[x]` 3. **Frontend: Profissional**
  - `[x]` Adicionar Switch de "Liberar visualização desta tarefa para o paciente" no modal `PatientDetailsModal.jsx`
  - `[x]` Garantir envio do estado pelo payload no `ProfessionalDashboardPage.jsx`
- `[x]` 4. **Frontend: Paciente**
  - `[x]` Mapear a rota/tela do paciente atual (`PatientDashboardPage.jsx` ou similar)
  - `[x]` Construir o componente `PatientAcompanhamento.jsx` com timeline visual e rica
  - `[x]` Fazer fetch das notas compartilhadas respeitando o RLS
