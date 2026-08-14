# 🧠 MEMÓRIA DO SQUAD (Decisões e Padrões - ADRs)

*Este arquivo é o cérebro evolutivo do time. Atualize-o com padrões decididos ao longo do tempo para que a IA nunca cometa o mesmo erro duas vezes. Siga o formato ADR (Contexto -> Decisão -> Consequências).*

---

## 1. Padrões de Negócio e Produto (UX/PM)
- **Data (2026-07-15):** **Substack RSS como CMS do Blog (v2.2).**
  - *Contexto:* O time precisava publicar artigos sem ter que construir um CMS customizado no Supabase.
  - *Decisão:* Criar a Edge Function `sync-substack-manual` para consumir o feed RSS oficial do Substack (`doxologosoficial.substack.com`) e renderizar prévias na HomePage (`BlogPreviewSection`) e páginas dedicadas (`/artigos`).
  - *Consequências:* Agilidade total na produção de conteúdo sem custos de infraestrutura de CMS.

- **Data (2025-12-30):** **Redesign de Conversão e Rodapé Reorganizado por Persona (v2.1).**
  - *Contexto:* Navegação dispersa com baixa taxa de conversão nos botões de agendamento.
  - *Decisão:* Menu de navegação focado em CTA direto ("Agendar Consulta"), FAQ interativo com suporte a JSX e rodapé dividido por personas (Pacientes, Psicólogos, Sobre).
  - *Consequências:* Aumento no fluxo de agendamentos e redução de dúvidas frequentes.

---

## 2. Padrões de Arquitetura e Engenharia
- **Data (2025-01-28):** **Edge Functions em Deno para Regras de Negócio e Integrações (v2.0).**
  - *Contexto:* Necessidade de processar transações financeiras e credenciais secretas (Mercado Pago, Zoom OAuth, SMTP) fora do browser do cliente.
  - *Decisão:* Centralizar todas as rotas sensíveis em 28+ Deno Edge Functions no Supabase (`supabase/functions/`), como `mp-process-card-payment`, `mp-webhook`, `zoom-create-meeting` e `send-email`.
  - *Consequências:* Credenciais protegidas no backend BaaS e desacoplamento do cliente React.

- **Data (2025-01-28):** **Checkout Transparente Mercado Pago com PIX Inline.**
  - *Contexto:* Redirecionamentos externos para o checkout Mercado Pago causavam desistência de pacientes.
  - *Decisão:* Implementar checkout transparente via SDK v2 com formulário de cartão direto e QR Code PIX inline dinâmico (`qrcode.react`) gerado em tempo real.
  - *Consequências:* Experiência de compra sem fricção dentro da plataforma Doxologos.

---

## 3. Padrões de Banco de Dados e Segurança (PostgreSQL & Supabase RLS)
- **Data (2025-01-15):** **Row Level Security (RLS) Mandatório no Supabase.**
  - *Contexto:* Proteção de dados sensíveis de pacientes e agendamentos (compliance LGPD).
  - *Decisão:* Habilitar RLS em todas as tabelas clínicas e administrativas, restringindo acesso via políticas autenticadas (`auth.uid()`) e roles administrativas.
  - *Consequências:* Impossibilidade de vazamento de dados via queries diretas no cliente frontend.

- **Data (2025-01-20):** **Reconciliação Idempotente de Webhooks Mercado Pago.**
  - *Contexto:* Disparos duplicados de webhooks do Mercado Pago provocavam atualização concorrente em agendamentos.
  - *Decisão:* Implementar verificação de idempotência no `mp-webhook` e `mp-reconcile-payment`, registrando a hash do evento antes de atualizar o status do agendamento para `paid`.
  - *Consequências:* Garantia de que cada pagamento é processado uma única vez, emitindo a sala Zoom e os emails transacionais sem duplicação.

---

## 4. Observabilidade, SRE e Resolução de Bugs
- **Data (2025-02-01):** **Logs Estruturados e SMTP Hostinger com Fallback.**
  - *Contexto:* Emails de confirmação de agendamento eventualmente falhavam por timeout de conexão SMTP.
  - *Decisão:* Implementar sistema de retentativas na Edge Function `send-email` com log JSON detalhado e tratamento de erros padronizado.
  - *Consequências:* Facilidade de diagnóstico de entregabilidade via Supabase Dashboard Logs.

- **Data (2025-03-10):** **Controle de Deploy no Hostinger via FTP/Dist.**
  - *Contexto:* Build de produção em SPA no Hostinger apresentava 404 em rotas recarregadas diretamente (ex: `/area-do-paciente`).
  - *Decisão:* Adicionar `.htaccess` otimizado reescrevendo todas as requisições para `index.html` e script de pós-build para geração automatizada de `sitemap.xml`.
  - *Consequências:* Roteamento perfeito no ambiente de hospedagem estática Hostinger.

- **Data (2026-08-12):** **Diretrizes Rígidas para Produção: Feature Flags, Zero-Downtime SQL e Hotfix Protocol.**
  - *Contexto:* Com a plataforma ativa em produção (`https://novo.doxologos.com.br`), qualquer alteração descuidada em banco ou checkout representava risco direto de perda financeira ou indisponibilidade de teleconsultas.
  - *Decisão:* 
    1. Novas funcionalidades devem usar Feature Flags ou isolamento modular antes de liberação geral.
    2. Migrações de banco SQL devem seguir obrigatoriamente o padrão *Expand & Contract* (sem `DROP` direto em produção).
    3. Bugs em produção devem ser investigados silenciosamente via logs do Supabase antes de qualquer alteração de código.
  - *Consequências:* Garantia de alta disponibilidade, zero regressão em checkout e evolução contínua segura do projeto.

- **Data (2026-08-12):** **Automação de SEO, Acessibilidade WCAG 2.1 e Rastreamento de BI (GA4).**
  - *Contexto:* O projeto necessitava de atração contínua de tráfego qualificado e acessibilidade universal.
  - *Decisão:* 
    1. Integrar geração automatizada de `sitemap.xml` no hook `postbuild` buscando artigos e eventos dinamicamente do Supabase.
    2. Adicionar suporte a leitores de tela e contraste acessível (WCAG 2.1 AA) em todos os componentes UI (shadcn/Radix).
    3. Rastreamento estrito de eventos no Google Analytics 4 (conversões de agendamento, formulários e cliques de WhatsApp).
  - *Consequências:* Melhor posicionamento orgânico no Google, conformidade legal de acessibilidade e inteligência de negócios para tomada de decisão.

- **Data (2026-08-14):** **Distribuição Equitativa (Fair Share) de Atendimentos & Remoção do Ranking 'Mais Indicado'.**
  - *Contexto:* Existia o filtro 'Mais indicado' na seleção de profissionais que buscava um atributo `rating >= 4.8` inexistente (gerando tela vazia). Além disso, ranquear psicólogos violava a diretriz de produto da Doxologos de promover visibilidade democrática e igualitária entre todos os profissionais credenciados.
  - *Decisão:* 
    1. Remover o filtro fantasma 'Mais indicado' e substituí-lo pelo filtro de conveniência real '🌙 Atendimento Noturno' em `ProfessionalStep.jsx`.
    2. Implementar ordenação com Rotatividade Equitativa (Fair Share tie-breaker) para garantir que profissionais com igual nível de disponibilidade compartilhem a primeira exposição sem privilégio estático de banco.
  - *Consequências:* Eliminação do bug de lista vazia no agendamento, prevenção do churn de psicólogos novatos e alinhamento total com os preceitos éticos do CFP.






