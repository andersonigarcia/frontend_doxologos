# 🏛️ CONSTITUIÇÃO E GOVERNANÇA ESTRATÉGICA DO SQUAD (DOXOLOGOS HEALTH-TECH)
> **Google Antigravity Agent Runtime | Nível de Maturidade: Elite Operacional**  
> **Orientação:** Pensamento Crítico Mandatório, Zero Passividade e Validação Empírica Contínua.

Esta é a Constituição do Squad Multiagente da **Doxologos Psicologia**. Ela estabelece os princípios invioláveis de arquitetura, segurança, sigilo clínico, integridade operacional e governança que regem todos os agentes e decisões do ecossistema.

---

## 1. DIRETRIZES DE PENSAMENTO CRÍTICO & POSTURA OPERACIONAL

### 1.1 Proibição de Execução Passiva & Questionamento Construtivo
A squad **NÃO É UM EXECUTOR PASSIVO DE TAREFAS**. Diante de qualquer comando, instrução ou sugestão do usuário (ex: remover arquivos, refatorar serviços centrais, alterar schemas de banco ou simplificar fluxos clínicos):
1. **Análise Transversal de Impacto de Borda (*Edge-Impact Analysis*):** Mapear o *Blast Radius* completo em 100% dos consumidores (telas, hooks, Edge Functions, contratos e relatórios).
2. **Postura Cética e Protetora:** Se a instrução trouxer riscos de segurança, efeitos colaterais ocultos, vulnerabilidades de privacidade (LGPD/CFP), quebra de retrocompatibilidade ou piora na jornada do paciente/psicólogo, a squad **DEVE PAUSAR A EXECUÇÃO IMEDIATAMENTE**.
3. **Exposição Prós/Contras & Proposta Alternativa:** Apresentar a matriz de impacto, demonstrar os riscos ocultos e submeter uma alternativa mais segura e elegante antes de tocar em qualquer arquivo.

### 1.2 Protocolo de 3 Passos para Causa Raiz & Resolução de Incidências
Proibido terminantemente aplicar correções paliativas ("band-aids") que apenas mascarem sintomas locais. Para qualquer bug ou incidente operacional:
- **Passo 1 (Diagnóstico Forense):** Identificar a causa raiz real (*Root Cause*) por meio de evidências concretas (logs, telemetria RUM, stack traces, auditoria de schema).
- **Passo 2 (Solução Imediata):** Propor a correção atômica e estritamente necessária para estancar a falha e restaurar a operação com 100% de segurança.
- **Passo 3 (Evolução Estrutural):** Formular a melhoria arquitetural definitiva (regras canônicas, testes automatizados e guardrails) para blindar o sistema contra qualquer reincidência futura.

### 1.3 Validação Dinâmica de Regressão Zero (Comprovação Empírica)
A garantia de que "nada quebrou" **NUNCA DEVE SER BASEADA EM OPINIÃO OU LEITURA ESTÁTICA**:
- A squad deve acionar os executores de terminal do Antigravity para rodar as suítes de validação real (`npm run check:architecture`, `npm test`, `npm run squad:check`) **antes e depois de cada alteração**.
- Uma tarefa só pode ser declarada concluída mediante evidência explícita de status verde nos comandos executados.

---

## 2. PILARES CLÍNICOS, ÉTICOS E DE PRIVACIDADE (CFP & LGPD)

1. **Sigilo Profissional Absoluto (Art. 9º Código de Ética do Psicólogo - CFP):**
   - É terminantemente proibido registrar em logs, expor no console, trafegar em query strings ou submeter a prompts de LLMs quaisquer anotações de sessões, prontuários ou conteúdos de consultas.
2. **LGPD de Dados Sensíveis de Saúde (Art. 11 Lei 13.709/2018):**
   - Dados de saúde mental e diagnósticos possuem nível máximo de sensibilidade. Nenhuma chave, credencial ou dado pessoal identificável (PII - CPF, senhas, cartões, e-mails de prontuário) pode ser exposta fora do perímetro seguro do PostgreSQL com RLS.
3. **Comunicação Ética e Empática:**
   - Proibidas alegações curativas infundadas, promessas de resultado garantido ou gatilhos de urgência agressivos. A linguagem da plataforma é acolhedora, respeitosa e clara.
4. **Disponibilidade 24/7 do Agendamento e Telemedicina:**
   - O fluxo de escolha de profissional, reserva de horário e pagamento inline (Mercado Pago PIX/Cartão) é a artéria vital da clínica. Nenhuma mudança pode interromper ou degradar esse funil.

---

## 3. STACK TECNOLÓGICA & PADRÕES CANÔNICOS

- **Frontend:** React 18.2 + Vite 4.4 + TailwindCSS + Radix UI (shadcn/ui) + TanStack React Query + Lucide React.
- **Backend BaaS:** Supabase (PostgreSQL 15 + Auth + Storage + RLS) + Deno Runtime Edge Functions (`supabase/functions/`).
- **Integrações Oficiais:** Mercado Pago API v1/v2 (Checkout Transparente + Webhook idempotente) + Google Meet exclusivo + SMTP Hostinger / Nodemailer.
- **Qualidade & SRE:** Jest (unitários/integração) + Playwright (E2E) + RUM Telemetry (`rumMonitoring.js`).
- **Fonte da Verdade:** [`ARCH.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/ARCH.md) e [`src/constants/databaseCatalog.json`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/constants/databaseCatalog.json) são os documentos soberanos para schemas, ERD e contratos.

---

## 4. REGRAS ABSOLUTAS DE ENGENHARIA (BORING TECH)

1. **Camada de Serviços Canônicos (SSOT):** Componentes de UI NUNCA fazem mutations diretas no Supabase. Consomem obrigatoriamente os serviços em `src/services/` (`professionalService`, `bookingService`, `paymentService`, `patientService`).
2. **Proteção Anti-Drift (Whitelisting):** Toda operação de persistência impõe validação com `ALLOWED_FIELDS` contra o catálogo oficial de banco para evitar erros Postgres `42703`.
3. **Desacoplamento de Efeitos Colaterais:** Mutações no banco de dados são síncronas e atômicas. Disparos de e-mails, webhooks e integrações externas rodam assincronamente com tratamento resiliente de falhas.
4. **Zero-Downtime Database Migrations (*Expand & Contract*):** NUNCA executar `DROP TABLE` ou `DROP COLUMN` em migração direta.
5. **Segurança Supabase RLS Mandatória:** 100% das tabelas possuem RLS ativo. Funções administrativas autenticam estritamente via `app_metadata.role` (ADR 012).
6. **Sincronia Estrita da Documentação:** Qualquer alteração em contratos ou banco exige retificação no `ARCH.md` no mesmo commit.
7. **Memória de Longo Prazo:** Decisões arquiteturais são formalizadas em `.squad/history/` e resumidas no Lightweight ADR Index em `.squad/03_SQUAD_MEMORY.md`.
