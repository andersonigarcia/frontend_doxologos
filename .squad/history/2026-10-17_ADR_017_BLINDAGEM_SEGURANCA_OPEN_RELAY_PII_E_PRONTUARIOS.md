# ADR 017: Blindagem de Segurança contra Open Relay, Mascaramento de PII e Sincronização de Prontuários (Onda 0)

- **Data:** 2026-10-17
- **Status:** Aceito e Implementado
- **Decisores:** Platform Security, Bug Hunter, Tech Lead, Fullstack Dev, QA Automation

---

## 1. Contexto
Durante o Diagnóstico 360° da plataforma Doxologos Psicologia, a Squad identificou vulnerabilidades críticas de segurança e bugs de persistência clínica:
1. **Open Mail Relay em `send-email` (`SEC-02`):** A Edge Function `supabase/functions/send-email/index.ts` operava sem validação de autorização, permitindo que requisições anônimas disparassem e-mails arbitrários através do SMTP Hostinger da clínica.
2. **Exposição de Chave Privada GCP (`SEC-01`):** O arquivo de credencial de Service Account `doxologos-1760796344726-8926d0677c12.json` residia exposto em texto plano na raiz do projeto.
3. **Discrepância de Contrato em Prontuários (`BUG-01`):** `src/services/patientService.js` invocava `action: 'save_session_note'`, enquanto `patient-notes-manager/index.ts` aceitava estritamente `action: 'save'`, provocando erros HTTP 400.
4. **Amnésia de Notas no Prontuário (`BUG-02`):** `patient-notes-manager` limpava os campos de `patient_notes` após a gravação de histórico, retornando dados vazios ao psicólogo na ação `get`.
5. **Vazamento de PII em Logs (`SEC-03`):** `emailService.js`, `CheckoutDirectPage.jsx` e `TrabalheConoscoPage.jsx` registravam e-mails e tokens no console em produção.

## 2. Decisões Implementadas
1. **Blindagem de `send-email`:**
   - Imposição de validação de token `Authorization: Bearer <token>` (rejeição 401 imediata para chamadas anônimas sem token válido).
   - Enforcement estrito de anti-spoofing: `fromEmail` é travado no domínio autorizado da clínica (`doxologos@doxologos.com.br`).
   - Mascaramento de PII de destinatários em logs e sanitização anti-CRLF no assunto.
2. **Isolamento de Credencial GCP:**
   - Remoção do arquivo de chave privada da raiz e arquivamento seguro em `config/credentials/`, explicitamente protegido no `.gitignore`.
3. **Unificação Canônica de Prontuários:**
   - Atualização de `patientService.js` para enviar `action: 'save'`.
   - Adição de suporte ao alias `action: 'save_session_note'` em `patient-notes-manager` para máxima resiliência bidirecional.
   - Implementação de fallback no `action: 'get'` para recuperar o snapshot mais recente de `patient_notes_history` caso a tabela principal esteja vazia.
4. **Mascaramento de PII no Frontend:**
   - Mascaramento de e-mails (`to`, `cc`) em `src/lib/emailService.js`.
   - Restrição de logs com token de cartão em `CheckoutDirectPage.jsx` e anonimização de candidatos em `TrabalheConoscoPage.jsx`.

## 3. Consequências
- Eliminação da brecha de Open Mail Relay, protegendo a reputação de IP do SMTP da clínica.
- Restauração completa da integridade do fluxo de anotações clínicas do psicólogo.
- Conformidade reforçada com o Art. 11 da LGPD e o Código de Ética do Psicólogo (CFP).
