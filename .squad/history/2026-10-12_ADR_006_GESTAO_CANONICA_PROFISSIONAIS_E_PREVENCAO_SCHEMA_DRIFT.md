# ADR 006: Gestão Canônica de Profissionais e Prevenção de Schema Drift

- **Data:** 2026-10-12
- **Status:** Aceito e Implementado
- **Decisores:** Tech Lead, Platform Security, Fullstack Dev, Bug Hunter

---

## 1. Contexto
Ao editar os dados de um profissional no Hub 360 (`/admin/professionals/:id`), o salvamento falhava com status `400 Bad Request` ("User not found") ou os campos de e-mail/documentos apareciam vazios com placeholders após o salvamento. A causa raiz envolvia fragmentação por consultas diretas à tabela `professionals`, divergência entre `id` da tabela e `user_id` de `auth.users`, e tentativa de persistir coluna inexistente `email` na tabela `professionals` (Postgres error 42703).

## 2. Decisão
1. **Serviço Canônico Centralizado:** Criação de `src/services/professionalService.js` com funções puras de leitura, listagem, atualização e alteração de status.
2. **Separação Atômica de Dados:** Separação entre dados clínicos/cadastrais (Postgres) e credenciais (Auth).
3. **RPC Direta para E-mails:** Priorização da RPC `admin_list_users` no Postgres para listagem segura e rápida de e-mails, com fallback para Edge Function.
4. **Whitelisting Rigoroso:** Inclusão de `ALLOWED_PROFESSIONAL_FIELDS` impedindo envio de campos fantasmas como `email`.
5. **Blindagem de UI:** Refatoração de `ProfileTab.jsx`, `ProfessionalHubPage.jsx`, `ProfessionalListPage.jsx` e `AdminUsuariosPage.jsx` para consumir o serviço canônico.
6. **Retificação do ARCH.md:** Sincronização do diagrama ERD com o schema real.

## 3. Consequências
- Fim definitivo do erro 400 Bad Request e da perda de dados de profissionais.
- Proteção absoluta contra schema drift na tabela `professionals`.
- Suíte unitária `professionalService.test.js` com 100% de aprovação.
