# ADR 025 — Blindagem de Integridade de Leads, Higienização da Base e Validação Antifraude

## 📅 Data
2026-10-19

## 📌 Status
**Aprovada e Implementada**

---

## 🎯 Contexto e Problema
Durante a auditoria operacional do CRM de Leads de Autoavaliações Psicométricas (`assessment_leads`), identificou-se a entrada de dados fictícios e lixo na base de dados:
1. **Telefones Fictícios:** Números como `+5551999999999` (todos os dígitos repetidos), `+5511988887777` (repetições em blocos preguiçosos) e `(00) 00000-0000` (induzido pelo placeholder com DDD 00 inexistente).
2. **E-mails Fictícios / Descartáveis:** Inclusão de domínios como `example.com`, `teste.com.br`, `test.com` e usernames como `teste@`, que além de poluir o funil de aquisição, disparavam o relatório psicométrico automático por SMTP gerando *hard bounces* e risco iminente de suspensão da conta de e-mail da clínica.
3. **Nomes Inválidos:** Pacientes colando o endereço de e-mail no campo nome (ex: `tuanetalita7@gmail.com`) ou preenchendo `"TEste"` e `"Maria Teste"`.
4. **Placeholders Indutores:** Campos com `seuemail@exemplo.com` e `(00) 00000-0000` que ensinavam o usuário a digitar dados falsos.

---

## 💡 Decisões Tomadas

### 1. Criação do Módulo Canônico `src/lib/leadValidator.js`
- **Telefone / WhatsApp (`validateLeadPhone`):**
  - Validação estrita dos 67 DDDs oficiais do Brasil (Anatel).
  - Exigência do 9º dígito (`9`) para celulares (11 dígitos).
  - Bloqueio de repetições completas (`99999-9999`, `00000-0000`), sequências de mais de 5 dígitos consecutivos idênticos, blocos repetitivos (`988887777`) e sequências óbvias (`123456789`, `987654321`).
  - Normalização padronizada para o formato E.164 (`+5511984567890`).
- **E-mail (`validateLeadEmail`):**
  - Sintaxe RFC completa com domínio de primeiro nível válido.
  - Blacklist ativa de domínios descartáveis/teste (`example.com`, `teste.com.br`, `test.com`, `fake.com`, `mailinator.com`, `tempmail.com`, etc.).
  - Blacklist de usernames fictícios óbvios (`teste@`, `test@`, `asdasd@`, `fake@`, `naotem@`).
- **Nome (`validateLeadName`):**
  - Mínimo de 2 caracteres alfabéticos reais.
  - Detecção imediata de e-mail colado no campo nome (presença de `@` e `.`) com orientação amigável.
  - Bloqueio de termos de teste isolados (`teste`, `maria teste`, `fulano`, `anonimo`).
- **Orquestração (`validateLeadData`):**
  - Pelo menos um canal de contato válido (WhatsApp ou E-mail) é obrigatório.
  - Se fornecido, cada campo deve respeitar sua validação estrita.

### 2. Blindagem em Duas Camadas (Frontend e Service Layer)
- **Frontend (`LeadCaptureSection.jsx` & `AnxietyGuideModal.jsx`):**
  - Placeholders realistas: `Ex: Maria Silva`, `seu.email@gmail.com` e `(11) 98456-7890`.
  - Validação inline suave no `onBlur` com feedback acolhedor abaixo do campo, mantendo o formulário leve, limpo e sem atritos desnecessários.
- **Service Layer (`assessmentService.js`):**
  - Interceptação antes de `supabase.from('assessment_leads').insert([payload])`.
  - Se os dados forem classificados como fictícios, o cadastro é recusado, o backup local de lixo é evitado e o disparo de e-mails para endereços inexistentes é abortado.

---

## 🧪 Validação e Testes
- Suíte `src/lib/__tests__/leadValidator.test.js` com 20 testes unitários cobrindo todos os cenários da imagem real do CRM, DDDs válidos/inválidos, celulares, sequências e domínios.
- 100% dos testes do projeto aprovados (31 suítes, 323 testes).
- `npm run check:architecture` e `npm run build` aprovados com 100% de conformidade.
