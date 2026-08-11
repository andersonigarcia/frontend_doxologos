# 🧠 MEMÓRIA DO SQUAD (Decisões e Padrões - ADRs)

*Este arquivo é o cérebro evolutivo do time. Atualize-o com padrões decididos ao longo do tempo para que a IA nunca cometa o mesmo erro duas vezes. Siga o formato ADR (Contexto -> Decisão -> Consequências).*

## 1. Padrões de Negócio e Produto (UX/PM)
- **Data (YYYY-MM-DD):** *[Contexto: Precisávamos decidir a política de senhas de pacientes. Decisão: Padronizar em min. 8 caracteres, sem forçar regras complexas que diminuam a adesão, compensando com rate-limiting no login. Consequências: Melhor UX na ponta, requer monitoramento severo contra brute-force.]*
- ...

## 2. Padrões de Arquitetura e Engenharia
- **Data (YYYY-MM-DD):** *[Contexto: Escolha de lib de formulários no React. Decisão: React Hook Form com Zod devido ao baixo re-render. Consequências: Menos overhead de memória, porém curva de aprendizado inicial no Zod.]*
- ...

## 3. Padrões de Banco de Dados e Dados Clínicos
- **Data (YYYY-MM-DD):** *[Contexto: Deleção de pacientes. Decisão: Proibido "Hard Delete". Adicionado `deleted_at` e ofuscação de nome. Consequências: Queries precisam sempre filtrar `deleted_at IS NULL`.]*
- ...

## 4. Observabilidade, SRE e Resolução de Bugs
- **Data (YYYY-MM-DD):** *[Contexto: Erros silenciosos no proxy do AWS ECS. Decisão: Configurar Uvicorn com `--proxy-headers` em todo o cluster. Consequências: IPs reais dos usuários passaram a ser logados corretamente, essencial para auditoria LGPD.]*
- ...
