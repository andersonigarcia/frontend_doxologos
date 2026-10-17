# ADR 005: Multi-Perfil Híbrido (Dual-Role RBAC & Zero-Downtime)

- **Data:** 2026-10-07
- **Status:** Aceito e Implementado
- **Decisores:** Product Lead, Tech Lead, Platform Security, Fullstack Dev

---

## 1. Contexto
Profissionais de saúde e administradores também precisam agendar consultas como pacientes em sua vida pessoal. Anteriormente, possuíam role única e estática (`professional` ou `admin`), gerando estranheza visual quando navegavam na Área do Paciente ou na Home.

## 2. Decisão
1. **Resolução Dinâmica de Roles:** Implementar resolução dinâmica de `availableRoles` com base em `app_metadata.role` e `app_metadata.roles` no `SupabaseAuthContext` (ex: `professional` recebe automaticamente `['professional', 'patient']`; `admin` recebe `['admin', 'professional', 'patient']`; pacientes comuns recebem apenas `['patient']`).
2. **Controle de Contexto Ativo:** Criar controle de `activeRole`, persistido em `localStorage` (`doxologos_preferred_active_role`) com retrocompatibilidade 100% com o contrato legado `userRole = activeRole`.
3. **UserBadge Interativo:** `UserBadge` com menu dropdown interativo para usuários híbridos alternarem de perfil com 1 clique (desktop e mobile), mantendo botão simples nativo para pacientes exclusivos.
4. **Auto-Switching em ProtectedRoute:** Se um profissional com perfil ativo 'patient' acessar `/profissional`, a rota restrita ativa o perfil correto de forma fluida sem barrar o acesso.
5. **Auditoria Estruturada:** Registro de alternância de perfis via `auditLogger.ROLE_SWITCH`.

## 3. Consequências
- Zero migrações destrutivas de banco de dados.
- Zero impacto para pacientes em produção.
- Escalabilidade para múltiplos perfis sem fragmentação de contas.
- Conformidade total com a suíte de testes automatizados.
