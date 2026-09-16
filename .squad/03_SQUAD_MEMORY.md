# 🧠 MEMÓRIA DO SQUAD (Decisões e Padrões - ADRs)

*Este arquivo é o cérebro evolutivo do time. Atualize-o com padrões decididos ao longo do tempo para que a IA nunca cometa o mesmo erro duas vezes. Siga o formato ADR (Contexto -> Decisão -> Consequências).*

---

## 1. Padrões de Orquestração de IA e Squad
- **Data (2026-09-16):** **Reestruturação Modular do Squad de IA (Antigravity & IDE Mode).**
  - *Contexto:* O prompt monolítico gigante de 17KB com 22 papéis no mesmo arquivo consumia tokens excessivos e engessava qualquer tarefa pequena em um ciclo burocrático de 6 etapas e 6 gatekeepers.
  - *Decisão:* Dividir a especificação em um Orquestrador Central magro (`ORCHESTRATOR.md`), 5 personas focadas em `.squad/agents/` e 3 esteiras de execução dinâmica em `.squad/workflows/` (*Fast-Track*, *Standard-Track* e *Full-Track*).
  - *Consequências:* Redução de até 75% no consumo de tokens por sessão, respostas até 3x mais rápidas em tarefas de baixo risco e garantia de validação completa apenas quando pagamentos, RLS ou LGPD forem afetados.

---

## 2. Padrões de Negócio e Produto (UX/PM)
- **Data (2026-07-15):** **Substack RSS como CMS do Blog (v2.2).**
  - *Contexto:* O time precisava publicar artigos sem ter que construir um CMS customizado no Supabase.
  - *Decisão:* Criar a Edge Function `sync-substack-manual` para consumir o feed RSS oficial do Substack (`doxologosoficial.substack.com`) e renderizar prévias na HomePage (`BlogPreviewSection`) e páginas dedicadas (`/artigos`).
  - *Consequências:* Agilidade total na produção de conteúdo sem custos de infraestrutura de CMS.

- **Data (2025-12-30):** **Redesign de Conversão e Rodapé Reorganizado por Persona (v2.1).**
  - *Contexto:* Navegação dispersa com baixa taxa de conversão nos botões de agendamento.
  - *Decisão:* Menu de navegação focado em CTA direto ("Agendar Consulta"), FAQ interativo com suporte a JSX e rodapé dividido por personas (Pacientes, Psicólogos, Sobre).
  - *Consequências:* Aumento no fluxo de agendamentos e redução de dúvidas frequentes.

---

## 3. Padrões de Arquitetura e Engenharia
- **Data (2025-01-28):** **Edge Functions em Deno para Regras de Negócio e Integrações (v2.0).**
  - *Contexto:* Necessidade de processar transações financeiras e credenciais secretas (Mercado Pago, Zoom OAuth, SMTP) fora do browser do cliente.
  - *Decisão:* Centralizar todas as rotas sensíveis em 28+ Deno Edge Functions no Supabase (`supabase/functions/`), como `mp-process-card-payment`, `mp-webhook`, `zoom-create-meeting` e `send-email`.
  - *Consequências:* Credenciais protegidas no backend BaaS e desacoplamento do cliente React.

- **Data (2025-01-28):** **Checkout Transparente Mercado Pago com PIX Inline.**
  - *Contexto:* Redirecionamentos externos para o checkout Mercado Pago causavam desistência de pacientes.
  - *Decisão:* Implementar checkout transparente via SDK v2 com formulário de cartão direto e QR Code PIX inline dinâmico (`qrcode.react`) gerado em tempo real.
  - *Consequências:* Experiência de compra sem fricção dentro da plataforma Doxologos.

---

## 4. Padrões de Banco de Dados e Segurança (PostgreSQL & Supabase RLS)
- **Data (2025-01-15):** **Row Level Security (RLS) Mandatório no Supabase.**
  - *Contexto:* Proteção de dados sensíveis de pacientes e agendamentos (compliance LGPD).
  - *Decisão:* Habilitar RLS em todas as tabelas clínicas e administrativas, restringindo acesso via políticas autenticadas (`auth.uid()`) e roles administrativas.
  - *Consequências:* Impossibilidade de vazamento de dados via queries diretas no cliente frontend.

- **Data (2025-01-20):** **Reconciliação Idempotente de Webhooks Mercado Pago.**
  - *Contexto:* Disparos duplicados de webhooks do Mercado Pago provocavam atualização concorrente em agendamentos.
  - *Decisão:* Implementar verificação de idempotência no `mp-webhook` e `mp-reconcile-payment`, registrando a hash do evento antes de atualizar o status do agendamento para `paid`.
  - *Consequências:* Garantia de que cada pagamento é processado uma única vez, emitindo a sala Zoom e os emails transacionais sem duplicação.

---

## 5. Observabilidade, SRE e Resolução de Bugs
- **Data (2026-08-14):** **Otimização da Experiência Mobile & Hardening de Conversão (FASE 3.1 - CRO & Mobile-First).**
  - *Contexto:* Tráfego predominantemente mobile (>80%) demandou reposicionamento de elementos flutuantes e botões PIX.
  - *Decisão:* Reposicionar botão do WhatsApp, adicionar `inputMode` e `autoComplete` nativos e destacar o código PIX copia e cola no mobile.
  - *Consequências:* Redução de atritos no checkout mobile e aumento da taxa de conversão.
