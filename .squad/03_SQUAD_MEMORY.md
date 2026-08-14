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

- **Data (2026-08-14):** **Reformulação de UX/DX & Replicação Trimestral de Disponibilidade de Agenda dos Psicólogos.**
  - *Contexto:* Psicólogos relatavam complexidade no cadastro de horários de atendimento e reclamações de que alterações "não refletiam na plataforma" quando esqueciam de selecionar e salvar os meses subsequentes.
  - *Decisão:* 
    1. Redesenhar `DayScheduleCard.jsx` adicionando presets de turno em 1 clique (Manhã: 08-12h, Tarde: 13-18h, Noite: 18-22h, Dia Todo: 08-18h) e gerador por faixa com intervalos configuráveis (30/45/60 min).
    2. Adicionar botão **"🚀 Replicar para Próximos 3 Meses"** em `AvailabilityManager.jsx` com modal de confirmação visual e handler em `AdminPage.jsx` que replica a grade nos 3 meses vigentes (com tratamento de virada de ano).
    3. Implementar detecção de estado rascunho (*Dirty State*), **Sticky Save Bar** (Barra Flutuante de Salvamento) e alerta de proteção `beforeunload` para impedir a perda silenciosa de alterações.
    4. Garantir a normalização de horários (`HH:MM`) em 24h para compatibilidade total com os filtros de agendamento de pacientes.
- **Data (2026-08-14):** **Revisão Estratégica & Matriz Dinâmica de Expiração de Agendamentos Pendentes de Pagamento.**
  - *Contexto:* Agendamentos pendentes de pagamento estavam travando a agenda dos psicólogos por longos períodos (até 6h ou 24h), gerando perda de faturamento para profissionais e frustração operacional.
  - *Decisão:*
    1. **Matriz de Tolerância Dinâmica (SLA):** Consultas em < 3h expiram em 15 minutos; consultas entre 3h e 24h expiram em 30 minutos; consultas > 24h expiram em 60 minutos (1 hora).
    2. **Expiração Nativa Mercado Pago:** Injetar `date_of_expiration` em `mp-create-payment/index.ts` sincronizado exatamente com a tolerância da plataforma para expirar a chave PIX no app do banco e eliminar estornos.
    3. **Descarte SQL On-The-Fly (`useBookedSlots.js`):** Desconsiderar agendamentos pendentes cuja tolerância expirou em tempo real durante a busca de disponibilidade, liberando o slot instantaneamente antes da cron de limpeza.
    4. **UX Transparente (`CheckoutPendingPage.jsx`):** Exibir um timer de contagem regressiva em tempo real (`MM:SS`) na tela do QR Code PIX com alerta visual e botão de redirecionamento em caso de expiração.
- **Data (2026-08-14):** **Padronização de Status de Agendamento no DRE, Fluxo de Caixa e Ledger de Repasse.**
  - *Contexto:* Existiam pequenas divergências entre os nomes dos status no banco (`pending`, `confirmed`) e os filtros do frontend (`pending_payment`, `paid`), além do tratamento de `no_show_unjustified` como cancelado em vez de faturamento retido e devido ao profissional.
  - *Decisão:*
    1. **Agregação de Compatibilidade:** Atualizar `useFinancialData.jsx` e `AdminPage.jsx` (`calculateTotals`) para mapear `['pending', 'pending_payment', 'awaiting_payment']` como pendentes e `['confirmed', 'paid']` como confirmados.
    2. **Faltas Injustificadas (`no_show_unjustified`):** Categorizar faltas sem justificativa do paciente como receita realizada e repasse devido ao psicólogo, pois o profissional esteve disponível.
    3. **Ampliação Visual (`getStatusLabel` e `statusColors`):** Incluir cores e rótulos para `expired`, `refunded` e `partially_refunded`.
- **Data (2026-08-14):** **Redesign de Alta Densidade e Usabilidade na Tela de Agendamentos (v3.2).**
  - *Contexto:* A aba de agendamentos consumia rolagem vertical excessiva devido a 7 cards de totais financeiros em 2 linhas e cards verticais de agendamentos com dados de preços duplicados (~220px por card).
  - *Decisão:* 
    1. **Barra Resumo Executiva em 1 Linha:** Substituir a grade de 7 cards por uma faixa horizontal compacta de 48px de altura.
    2. **Tabela de Dados (Data Table de Alta Densidade):** Adicionar o modo Data Table com linhas compactas de ~48px de altura (Data/Hora, Paciente, Psicólogo, Financeiro, Status e Ações).
    3. **Eliminação de Duplicações:** Remover os badges de preços duplicados dos cards e integrar ordenação/filtros em um toolbar unificado de 1 linha.
- **Data (2026-08-14):** **Otimização da Experiência Mobile & Hardening de Conversão (FASE 3.1 - CRO & Mobile-First).**
  - *Contexto:* Em preparação para o lançamento de campanhas de tráfego pago (Meta Ads/Google Ads) com tráfego predominantemente mobile (>80%), foi realizada uma auditoria completa que identificou gargalos de UX, colisão de elementos fixos no rodapé, atritos em teclados virtuais e formato ineficiente de apresentação do PIX no celular.
  - *Decisão:*
    1. **Orquestração de Flutuantes (Z-Index):** Reposicionar o botão do WhatsApp (`FloatingWhatsAppButton.jsx`) com offset responsivo (`bottom-[88px] md:bottom-28`) e ajuste de z-index (`z-40`) para eliminar sobreposição com barras sticky e banners LGPD em telas mobile (<768px).
    2. **Teclados Nativos & Autocomplete:** Adicionar `autoComplete` e `inputMode` nativos do iOS/Android em formulários de cadastro e agendamento (`PatientAccountStep.jsx`).
    3. **Grid Responsivo de Horários:** Reconfigurar a seleção de horários (`DateTimeStep.jsx`) para 2 colunas responsivas (`grid-cols-2`) no mobile, reduzindo em 50% o scroll vertical e garantindo alvos de toque maiores (48px+).
    4. **PIX Mobile-First:** No checkout de PIX (`CheckoutPage.jsx`), promover o botão "Copiar Código PIX Copia e Cola" a destaque primário de 100% da largura com aviso amigável, recolhendo o QR Code em menu explicativo para navegação em tela única.
  - *Consequências:* Eliminação de vazamento de conversão em dispositivos móveis, redução do tempo de agendamento e maximização do ROI de tráfego pago.










