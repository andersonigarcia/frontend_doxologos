# ADR 032 — Unificação Canônica do Módulo Fiscal de NFS-e e Resiliência Municipal

**Data:** 2026-10-21  
**Status:** Aprovado e Implementado  
**Autores:** Orquestrador Doxologos / Squad de Engenharia  
**Contexto:** Revisão completa do ecossistema fiscal de NFS-e (PBHISS Digital / ABRASF) e blindagem contra falhas municipais, bloqueios no checkout e violações de sigilo clínico.

---

## 1. Contexto & Problema

O ecossistema fiscal da Doxologos gerencia a emissão de Notas Fiscais Eletrônicas de Serviço (NFS-e) perante a Secretaria Municipal da Fazenda de Belo Horizonte (BHISS Digital), sob o código de serviço 04.01.01 (intermediação tecnológica e agendamento de saúde mental / psicologia).

Identificamos vulnerabilidades estruturais:
1. **Ausência de Serviço Canônico (`SSOT`):** Telas de UI (`NfseResilienceDashboard.jsx` e `FaturamentoMensalPage.jsx`) realizavam queries diretas a `public.nfse_emissions` e invocações dispersas às Edge Functions (`emit-nfse`, `batch-emit-nfse`), violando a arquitetura canônica estabelecida na Fase 4.
2. **Mismatch de Status (`error` vs `failed`):** O banco de dados e as Edge Functions gravam status `'error'`, mas o frontend do profissional checava `'failed'`. Como resultado, rejeições da PBH ficavam ocultas ou exibidas como "Pendente", impossibilitando correções e reenvios pelo psicólogo.
3. **Lacuna nas Políticas de RLS:** A tabela `nfse_emissions` não possuía política RLS que permitisse a profissionais autenticados visualizarem suas próprias notas de agendamentos e eventos.
4. **Risco ao Checkout e Sigilo Clínico:** Necessidade de garantir que emissões sejam 100% assíncronas (sem bloquear checkouts PIX/Cartão) e que o campo `<Discriminacao>` do XML jamais receba diagnósticos, sintomas ou dados sensíveis de pacientes (CFP nº 001/2009 e LGPD Art. 11).

---

## 2. Decisões de Arquitetura

1. **Criação do Serviço Canônico `src/services/nfseService.js`:**
   - Centraliza todas as interações com `public.nfse_emissions` e as Edge Functions (`emit-nfse`, `batch-emit-nfse`).
   - Normaliza os status municipais (`failed` -> `error`, `queued` -> `pending`).
   - Sanitiza estritamente payloads contra `databaseCatalog.json` (29 colunas oficiais).
   - Sanitiza descrições via `sanitizeNfseDiscriminacao`, purgando termos clínicos sensíveis.
2. **Refatoração dos Consumidores Frontend:**
   - `NfseResilienceDashboard.jsx`: 100% migrado para consumir `listNfseEmissions`, `emitSingleNfse`, `retryNfseEmission`, `updateAndRetryNfseEmission` e `markNfseManualResolved`.
   - `FaturamentoMensalPage.jsx`: Migrado para `getNfseMapByBookingIds` e `batchEmitNfse`. Status de erro agora exibe indicador visual e mensagem explicativa clara para o profissional.
3. **Migration RLS de Visibilidade do Profissional:**
   - Criada migration `20261021_allow_professionals_view_nfse.sql` liberando leitura para psicólogos vinculados aos agendamentos ou eventos da nota fiscal.
4. **Guardrails Automatizados e Cobertura de Testes:**
   - Adicionados testes de guardrail em `scripts/check-architecture-guardrails.js` e `src/services/__tests__/architectureGuardrails.test.js`.
   - Criada suíte unitária completa `src/services/__tests__/nfseService.test.js` com 19 testes unitários dedicados.

---

## 3. Consequências

- **Estabilidade e Resiliência:** Erros municipais na PBH não bloqueiam checkouts e são devidamente catalogados com retentativas manuais e automáticas no painel.
- **Sigilo Clínico:** Garantia programática de Zero-PII clínica nas declarações enviadas à Fazenda Municipal.
- **Conformidade Total de Guardrails:** 100% de conformidade no pipeline `npm run squad:check` (34 test suites, 363 testes passando com sucesso).
