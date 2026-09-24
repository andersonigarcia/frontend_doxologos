# 📖 PLAYBOOK DE PROMPTS — Doxologos Squad v2.0
### Guia Completo de Prompts Otimizados por Cenário

> Copie, ajuste os campos entre `[colchetes]` e cole na IDE/Antigravity.
> O Orquestrador identificará automaticamente a esteira correta.
> Para economizar tokens, **sempre forneça evidências antes de pedir código.**

---

## 🗂️ ÍNDICE

1. [🐛 Investigação de Bug](#1--investigação-de-bug)
2. [🚨 Incidente em Produção](#2--incidente-em-produção)
3. [🔎 Code Review & Auditoria Técnica](#3--code-review--auditoria-técnica)
4. [🎨 UI/UX, Acessibilidade e Conversão](#4--uiux-acessibilidade-e-conversão)
5. [🔭 Discovery & Exploração de Oportunidade](#5--discovery--exploração-de-oportunidade)
6. [📈 Crescimento, Analytics e SEO](#6--crescimento-analytics-e-seo)
7. [⚡ Hotfix & Correção Rápida](#7--hotfix--correção-rápida)
8. [📦 Nova Feature ou Componente](#8--nova-feature-ou-componente)
9. [🛡️ Segurança, RLS e Compliance LGPD](#9--segurança-rls-e-compliance-lgpd)
10. [💳 Checkout, Pagamento e Webhook](#10--checkout-pagamento-e-webhook)
11. [🧪 Testes e Qualidade](#11--testes-e-qualidade)
12. [🏗️ Evolução de Arquitetura e Banco](#12--evolução-de-arquitetura-e-banco)
13. [📊 Relatório Executivo e Diagnóstico 360°](#13--relatório-executivo-e-diagnóstico-360)
14. [🔁 Refatoração e Dívida Técnica](#14--refatoração-e-dívida-técnica)
15. [🤝 Onboarding de Profissional / Paciente](#15--onboarding-de-profissional--paciente)

---

## 1. 🐛 Investigação de Bug

### 1.1 Bug com Evidências Completas (máxima eficiência)
```
Orquestrador Doxologos, ative o Bug Hunter.

URL / Contexto: [ex: /checkout em produção | Edge Function mp-webhook]
Comportamento esperado: [o que deveria acontecer]
Comportamento real: [o que está acontecendo]

Erro / Stack trace:
[COLE O ERRO EXATO AQUI]

Logs disponíveis:
[Cole logs do Supabase Dashboard, console do browser ou painel MP]

Último deploy / alteração relacionada: [data e o que mudou]

Execute o protocolo de triage por camada. Entregue a Root Cause
confirmada ANTES de propor qualquer código.
```

### 1.2 Bug Intermitente / Race Condition
```
Orquestrador Doxologos, ative o Bug Hunter.

O bug ocorre de forma intermitente em [contexto: checkout PIX / agendamento / login].
Frequência estimada: [ex: 1 a cada 10 tentativas / apenas no mobile].
Não ocorre em dev local, apenas em produção.

Comportamento: [descreva o que o usuário vê]
Suspeita inicial: [race condition em useEffect / webhook duplicado / timeout de Edge Function]

Investigue priorizando: (1) idempotência do webhook, (2) race conditions
em hooks React, (3) timeout de Edge Function > 60s.
Confirme a root cause com evidências antes de propor solução.
```

### 1.3 Bug Silencioso (sem erro visível, comportamento errado)
```
Orquestrador Doxologos, ative o Bug Hunter.

Não há mensagem de erro visível, mas o comportamento está incorreto:
- O que deveria acontecer: [ex: booking muda para status confirmed após pagamento]
- O que está acontecendo: [ex: booking permanece pending_payment mesmo após MP aprovar]

Dados para investigar:
- ID do booking afetado (anonimizado): [booking_XYZ]
- Status no Supabase: pending_payment
- Status no painel Mercado Pago: approved

Investigue o fluxo do webhook mp-webhook → atualização do booking.
Verifique idempotência, logs da Edge Function e políticas RLS.
```

---

## 2. 🚨 Incidente em Produção

### 2.1 Checkout Fora do Ar (Máxima Prioridade)
```
Orquestrador Doxologos, EMERGÊNCIA. Ative a esteira Incident-Track.

IMPACTO: Checkout Mercado Pago está fora do ar em https://novo.doxologos.com.br
INÍCIO DO INCIDENTE: [horário aproximado]
AFETA: [PIX / Cartão / Ambos]

Evidências coletadas:
[Cole o erro exato do console ou da Edge Function]

PRIORIDADE 1: Contenção — verifique se é possível rollback imediato.
PRIORIDADE 2: Bug Hunter executa diagnóstico silencioso por camada.
PRIORIDADE 3: Hotfix mínimo com backward compatibility garantida.
NÃO introduza novas features neste PR.
```

### 2.2 Zoom / Meet — Pacientes Não Recebem o Link
```
Orquestrador Doxologos, EMERGÊNCIA. Ative Incident-Track.

PROBLEMA: Pacientes com booking confirmado não estão recebendo o link de
teleconsulta após pagamento aprovado.

Dados:
- Pagamento: aprovado no painel MP (status: approved)
- Booking: [confirmed / ainda pending_payment]
- Email de confirmação: [foi enviado / não foi enviado]
- Zoom meeting: [foi criado / não foi criado]
- Logs da zoom-create-meeting: [cole aqui se disponível]

Investigue a cadeia: mp-webhook → zoom-create-meeting → send-email.
Identifique onde a corrente está quebrando. Silent diagnosis primeiro.
```

### 2.3 Queda Geral de Disponibilidade
```
Orquestrador Doxologos, EMERGÊNCIA. Ative Incident-Track.

SYMPTOM: [erro 500 / tela branca / timeout generalizado] em produção.
URL: https://novo.doxologos.com.br/[rota afetada]
INÍCIO: [horário]

O que mudou recentemente:
- Último deploy: [data/hora]
- Arquivos alterados: [listar se souber]

Bug Hunter: inicie diagnóstico por (1) Frontend bundle, (2) Supabase status,
(3) Edge Functions, (4) CDN/Netlify. Contenção antes de qualquer commit.
```

---

## 3. 🔎 Code Review & Auditoria Técnica

### 3.1 Auditoria de Arquivo Específico
```
Orquestrador Doxologos, convoque Tech Lead + Platform Security + QA
para auditoria do arquivo [caminho/do/arquivo].

Verifiquem:
- Vazamentos de memória (useEffect sem cleanup, listeners não removidos)
- PII em logs (console.log com dados de paciente)
- Chamadas Supabase sem tratamento de erro
- Re-renders desnecessários (missing memo/callback)
- Tipagem TypeScript incompleta (any injustificado)
- Compliance com ARCH.md (estrutura e contratos)

Entregue um relatório executivo com severidade (Crítico / Alto / Médio / Baixo).
```

### 3.2 Auditoria de Edge Function
```
Orquestrador Doxologos, convoque Tech Lead + Platform Security + QA
para auditoria da Edge Function [nome-da-funcao] em supabase/functions/.

Verifiquem:
- Validação Zod cobrindo todos os campos do payload de entrada
- Tratamento de erros HTTP (400/401/422/500) com mensagem clara
- Nenhuma chave secreta exposta (MP_ACCESS_TOKEN, ZOOM_SECRET)
- Idempotência (se aplicável — webhook, pagamento)
- Logs sem PII (sem CPF, email, dados de cartão)
- Timeout adequado para a operação (Edge Functions têm limite de 60s no Supabase)

Resultado: lista de gaps com sugestão de correção e esforço estimado.
```

### 3.3 Review de PR / Diff
```
Orquestrador Doxologos, convoque Tech Lead + QA para revisar as
seguintes alterações antes do merge:

[Cole aqui o diff ou liste os arquivos alterados]

Verifiquem:
1. Regressão em fluxos críticos (checkout, agendamento, login)
2. Backward compatibility de contratos de API
3. Cobertura de testes para o código novo
4. Consistência com o padrão do codebase (ARCH.md)
5. Nenhum segredo exposto no código

Aprovação ou lista de bloqueios antes do merge.
```

---

## 4. 🎨 UI/UX, Acessibilidade e Conversão

### 4.1 Auditoria de Acessibilidade (WCAG 2.1)
```
Orquestrador Doxologos, convoque UX Design + Fullstack Dev para auditoria
de acessibilidade WCAG 2.1 AA na página [nome da página / componente].

Verifiquem:
- Todos os botões interativos têm aria-label descritivo?
- Contraste de cores atinge 4.5:1 no texto principal?
- Modais e drawers têm focus trap ao abrir?
- O fluxo é navegável por teclado (Tab / Enter / Esc)?
- Inputs usam inputMode correto (numeric, tel, email)?
- CTAs têm min-height: 44px para toque mobile?

Corrija os problemas identificados e confirme com build limpo.
```

### 4.2 Otimização de CRO Visual no Checkout
```
Orquestrador Doxologos, convoque UX Design + Product Lead + Fullstack Dev
para otimizar a taxa de conversão do [checkout PIX / checkout Cartão / página de agendamento].

Contexto:
- Taxa de abandono atual: [% se souber ou "desconhecido"]
- Dispositivo principal dos usuários: mobile (> 80% do tráfego)
- Maior ponto de desistência suspeito: [ex: formulário de dados pessoais / QR Code]

Analise e implemente:
1. Redução de campos obrigatórios ao mínimo necessário
2. Posicionamento do CTA principal acima do fold no mobile
3. Mensagens de erro específicas e empáticas (não "Erro genérico")
4. QR Code PIX com tamanho mínimo 200x200px em mobile

Confirme com npm run build e smoke test visual no mobile.
```

### 4.3 Melhoria de Microcopy (Tom de Voz)
```
Orquestrador Doxologos, convoque UX Design + Product Lead para revisar
os textos de [formulário de agendamento / checkout / área do paciente / emails].

Contexto Doxologos: plataforma de saúde mental. Tom deve ser:
- Acolhedor e empático (não frio ou técnico)
- Claro e direto (sem jargões médicos ou jurídicos)
- Encorajador (reduzir ansiedade do paciente no checkout)

Revise: labels de formulário, mensagens de erro, botões de CTA,
emails transacionais de confirmação e lembrete.
Entregue os textos atuais e os textos propostos lado a lado.
```

---

## 5. 🔭 Discovery & Exploração de Oportunidade

### 5.1 Discovery de Nova Feature
```
Orquestrador Doxologos, ative Standard-Track.
Convoque Product Lead + Tech Lead para um Discovery de nova feature.

OPORTUNIDADE IDENTIFICADA: [descreva em 1-2 frases o problema do usuário]

Contexto:
- Quem é afetado: [paciente / profissional / admin]
- Frequência do problema: [ex: relatado por X usuários / ocorre em Y% dos agendamentos]
- Hipótese de solução: [ex: notificação de lembrete 24h antes da consulta via WhatsApp]

Product Lead: avalie o ROI e defina critérios de aceite claros.
Tech Lead: avalie viabilidade técnica, dependências e esforço estimado.
Entregue: Go/No-Go fundamentado + escopo mínimo viável (MVP).
```

### 5.2 Exploração de Oportunidade de Negócio
```
Orquestrador Doxologos, convoque Product Lead + Data & Growth Analyst
para explorar a seguinte oportunidade de negócio:

OPORTUNIDADE: [ex: Pacote de sessões com desconto / Programa de fidelidade / B2B para empresas]

Perguntas para responder:
1. Impacto estimado no LTV por paciente?
2. Quais mudanças técnicas seriam necessárias (banco, Edge Functions, UI)?
3. Existe alguma restrição ética do CFP ou legal (LGPD) que impeça?
4. Qual o MVP de menor esforço para validar a hipótese?

Entregue um brief de oportunidade com Go/No-Go e próximos passos.
```

### 5.3 Análise Competitiva e Posicionamento
```
Orquestrador Doxologos, convoque Data & Growth Analyst + Product Lead
para uma análise de posicionamento competitivo.

Contexto: plataforma de psicologia online em crescimento.
Principais concorrentes percebidos: [liste se souber]

Analise com base em dados disponíveis:
1. Diferenciais únicos da Doxologos (checkout transparente, Zoom automático, LGPD)
2. Gaps de produto vs. concorrentes (o que eles têm que não temos?)
3. Oportunidades de SEO Clínico não exploradas
4. Proposta de 3 iniciativas de diferenciação de curto prazo (< 30 dias)
```

---

## 6. 📈 Crescimento, Analytics e SEO

### 6.1 Diagnóstico de Funil com Dados Reais
```
Orquestrador Doxologos, ative Growth-Track.
Convoque Data & Growth Analyst + Product Lead.

Dados do período [últimos 7 / 30 dias]:
[Cole aqui os dados do GA4, Supabase ou relatório financeiro]

Analise:
1. Onde está o maior gargalo de conversão no funil? (Descoberta → Agendamento → Pagamento)
2. Qual etapa tem maior taxa de abandono?
3. Qual o perfil do usuário que converte vs. o que abandona?

Entregue: Top 3 hipóteses de melhoria com métrica de sucesso definida para cada uma.
```

### 6.2 Experimento A/B
```
Orquestrador Doxologos, ative Growth-Track.
Quero testar a hipótese: "[Se mudarmos X, esperamos que Y aumente Z% em W dias]"

Variante A (atual): [descreva o estado atual]
Variante B (proposta): [descreva a mudança]

Data & Growth Analyst: valide a hipótese com dados existentes.
UX Design: projete a variante B.
Fullstack Dev: implemente com feature flag para fácil reversão.
QA: garanta que a variante não quebre fluxos críticos.

Métrica de sucesso: [ex: cliques no botão de agendamento / taxa de conclusão do checkout]
```

### 6.3 SEO Clínico
```
Orquestrador Doxologos, convoque Data & Growth Analyst + Fullstack Dev
para otimização de SEO Clínico.

Páginas prioritárias: [ex: HomePage, /agendamento, /evento/:slug, /artigos]

Implemente:
1. Title tags descritivos e únicos por página (< 60 chars)
2. Meta descriptions com CTA natural (< 155 chars)
3. H1 único por página com keyword principal
4. Schema.org HealthcareProfessional ou Event conforme aplicável
5. Open Graph tags para compartilhamento social

Restrição ética CFP: sem promessas de cura ou resultados garantidos nos textos.
Confirme com build limpo e valide no Google Rich Results Test (URL a fornecer).
```

### 6.4 Redução de No-Show (Faltas em Consultas)
```
Orquestrador Doxologos, ative Growth-Track.
Convoque Data & Growth Analyst + Product Lead + Fullstack Dev.

PROBLEMA: [% de no-show se disponível ou "estimado alto"]
IMPACTO: receita perdida por falta injustificada.

Proponha e implemente uma régua de comunicação:
- Lembrete D-1 (24h antes): email + WhatsApp via Twilio
- Lembrete H-2 (2h antes): WhatsApp apenas
- Mensagem pós-falta: reagendamento facilitado com link direto

Verifique que a Edge Function event-send-reminders pode ser reutilizada
ou adapte o fluxo via mp-webhook / patient-cancel-booking.
Todos os disparos devem ser idempotentes.
```

---

## 7. ⚡ Hotfix & Correção Rápida

### 7.1 Bug Visual / Layout
```
Orquestrador Doxologos, ative Fast-Track.
Corrigir problema visual na página [nome da página / componente]:

Comportamento atual: [ex: botão de agendamento fica cortado no iPhone SE]
Comportamento esperado: [ex: botão deve ser totalmente visível com padding adequado]

Arquivos provavelmente afetados: [ex: src/pages/AgendamentoPage.jsx]

Tech Lead: confirme que a alteração não afeta pagamentos, RLS ou Edge Functions.
Dev: corrija usando TailwindCSS. Confirme com npm run build.
```

### 7.2 Texto / Microcopy Errado
```
Orquestrador Doxologos, Fast-Track.
Corrigir texto em produção:

Local: [componente / página / email template]
Texto atual: "[texto errado exato]"
Texto correto: "[texto correto]"

Confirme que não há outras ocorrências do texto incorreto no codebase.
Build + commit.
```

### 7.3 Link Quebrado ou Rota Incorreta
```
Orquestrador Doxologos, Fast-Track.
Corrigir link quebrado:

URL atual (quebrada): [ex: /checkout/sucesso]
URL correta: [ex: /checkout/success]
Local no código: [ex: componente CheckoutPage.jsx, linha ~230]

Verificar se há outros links apontando para a URL incorreta.
Confirme com npm run build.
```

---

## 8. 📦 Nova Feature ou Componente

### 8.1 Nova Tela / Página
```
Orquestrador Doxologos, ative Standard-Track.

NOVA FEATURE: [nome da feature]
QUEM USA: [paciente / profissional / admin]
OBJETIVO: [o que o usuário consegue fazer com essa feature]

Critérios de aceite mínimos:
1. [critério 1]
2. [critério 2]
3. [critério 3]

Product Lead: valide ROI e linguagem humanizada.
Tech Lead: defina hooks TanStack Query e estrutura de dados.
Dev: implemente com TailwindCSS + Radix UI + acessibilidade básica.
QA: confirme com npm test + build.
```

### 8.2 Nova Edge Function
```
Orquestrador Doxologos, ative Full-Track (Edge Function = alto risco).

NOVA EDGE FUNCTION: [nome-da-funcao]
PROPÓSITO: [o que ela faz]
CHAMADA POR: [frontend React / outra Edge Function / cron]
PAYLOAD DE ENTRADA: [descreva os campos esperados]
PAYLOAD DE SAÍDA: [descreva o que retorna]

Tech Lead: especifique o contrato TypeScript + schema Zod.
Dev: implemente em Deno seguindo o padrão das funções existentes.
Platform Security: valide que nenhuma credencial vaza, RLS está correto.
QA: teste localmente via supabase functions serve.
Registre a função em ARCH.md após conclusão.
```

### 8.3 Novo Componente Reutilizável
```
Orquestrador Doxologos, ative Standard-Track.
Criar componente reutilizável: [NomeDoComponente]

PROPÓSITO: [o que o componente faz]
ONDE SERÁ USADO: [lista de páginas/contextos]

Props esperadas:
- [propName]: [tipo] — [descrição]

Tech Lead: avalie se existe um componente Radix UI / shadcn que resolva sem criar do zero.
Dev: implemente em src/components/ com TypeScript, TailwindCSS e acessibilidade.
QA: crie pelo menos 1 teste unitário Jest para o componente.
```

---

## 9. 🛡️ Segurança, RLS e Compliance LGPD

### 9.1 Auditoria de Políticas RLS
```
Orquestrador Doxologos, convoque Platform Security + Tech Lead para
auditoria de RLS na tabela [nome_da_tabela].

Verifiquem:
- RLS está habilitado na tabela?
- Políticas de SELECT: pacientes só veem seus próprios dados?
- Políticas de INSERT/UPDATE/DELETE: apenas service_role ou admin?
- Existe alguma política ausente que permitiria leitura anônima?
- A política está alinhada com o modelo documentado em ARCH.md (Seção 7)?

Entregue: diagnóstico + SQL das políticas corrigidas se necessário.
```

### 9.2 Varredura de PII em Logs
```
Orquestrador Doxologos, convoque Platform Security para varredura de PII.

Arquivos a verificar: [supabase/functions/ | src/lib/ | src/hooks/]

Busque por padrões de:
- console.log com email, CPF, telefone ou dados de cartão
- Logs de Edge Function que incluam raw_payload com dados sensíveis
- Variáveis nomeadas como "cpf", "password", "cardNumber" em contextos de log

Entregue lista de ocorrências com severidade e proposta de sanitização.
Não deve haver nenhuma ocorrência em produção — zero tolerância.
```

### 9.3 Migração de Banco com Zero-Downtime
```
Orquestrador Doxologos, ative Full-Track.
Convoque Tech Lead + Platform Security para planejar migração de banco.

ALTERAÇÃO PLANEJADA: [ex: adicionar coluna X na tabela bookings]
MOTIVO: [por que é necessário]

Tech Lead: aplique o padrão Expand & Contract:
1. EXPAND: adicionar a nova coluna como nullable (sem DROP)
2. MIGRATE: preencher dados existentes se necessário
3. CONTRACT: tornar NOT NULL apenas após validação em produção

Platform Security: confirme que a migração não quebra políticas RLS existentes.
QA: teste rollback da migração antes do deploy em produção.
Registre a decisão em 03_SQUAD_MEMORY.md.
```

---

## 10. 💳 Checkout, Pagamento e Webhook

### 10.1 Debugging de Webhook Mercado Pago
```
Orquestrador Doxologos, ative Full-Track + Bug Hunter.

PROBLEMA no webhook mp-webhook:
[Descreva: payment_id que falhou / status retornado / booking não atualizado]

Dados para investigação:
- payment_id do MP: [id]
- Status no MP: [approved / pending / rejected]
- Status no booking Supabase: [pending_payment / confirmed]
- Log da Edge Function (Supabase Dashboard): [cole aqui]

Bug Hunter: verifique (1) validade da assinatura MP, (2) idempotência
(o evento já foi processado?), (3) chamada Zoom após confirmação.
Não altere código antes de confirmar root cause.
```

### 10.2 Reconciliação de Pagamento Divergente
```
Orquestrador Doxologos, ative Full-Track.
Convoque Tech Lead + Fullstack Dev para reconciliação manual.

BOOKING DIVERGENTE:
- booking_id: [id anonimizado]
- Status Supabase: [pending_payment]
- Status Mercado Pago: [approved]
- payment_id MP: [id]

Execute via mp-reconcile-payment para atualizar o status.
Após reconciliação: verificar se Zoom foi criado e email foi enviado.
Se não: disparar manualmente zoom-create-meeting e send-email.
Registrar o caso em 03_SQUAD_MEMORY.md Seção 6 (Bugs Conhecidos).
```

### 10.3 Novo Método de Pagamento ou Mudança de Fluxo
```
Orquestrador Doxologos, ative Full-Track obrigatório (pagamento = alto risco).

ALTERAÇÃO: [descreva a mudança no fluxo de pagamento]

Checklist Full-Track obrigatório:
- Gatekeeper 0: ROI e impacto na margem por consulta
- Gatekeeper 2: Idempotência do webhook e Ledger 100% conciliado
- Gatekeeper 3: TypeScript/Zod tipado, sem degradação de performance
- Gatekeeper 4: E2E Playwright cobrindo o novo fluxo
- Gatekeeper 5: Zero PII em logs, RLS intacto

A chave MP_ACCESS_TOKEN NUNCA vai ao browser. Toda cobrança passa pela Edge Function.
Testes E2E devem passar antes de qualquer deploy em produção.
```

---

## 11. 🧪 Testes e Qualidade

### 11.1 Cobertura de Testes — Hook ou Utilitário
```
Orquestrador Doxologos, convoque QA + Fullstack Dev.
Criar testes unitários Jest para [nome do hook / utilitário]:

Arquivo alvo: [src/hooks/... | src/lib/... | src/utils/...]

Cenários mínimos a cobrir:
1. Caso happy path (fluxo normal)
2. Caso de erro de API (Supabase retorna null ou erro)
3. Caso de edge case: [descreva o caso limite específico]

QA: confirme que npm test passa 100% após os novos testes.
Objetivo: cobertura > 80% do arquivo alvo.
```

### 11.2 Teste E2E Playwright — Fluxo Crítico
```
Orquestrador Doxologos, convoque QA para criar teste E2E Playwright.

FLUXO A COBRIR: [ex: Agendamento completo PIX — seleção → checkout → confirmação]

Passos do fluxo:
1. [passo 1]
2. [passo 2]
3. [resultado esperado]

Usar ambiente de staging (não produção) com pagamento simulado.
O teste deve rodar em npx playwright test --headed para validação visual.
Após aprovação, incluir no pipeline CI/CD.
```

### 11.3 Smoke Test Pós-Deploy
```
Orquestrador Doxologos, convoque QA para executar smoke tests após deploy.

DEPLOY: [o que foi deployado e quando]

Smoke tests obrigatórios:
1. PIX: criar preferência via mp-create-preference e verificar init_point
2. Cartão: verificar formulário MP SDK carregando no checkout
3. Zoom: verificar zoom-create-meeting com meeting_id válido
4. Email: disparar send-email para [endereço de teste] e confirmar recebimento
5. Login: autenticação com conta de teste funcionando
6. Admin: painel admin carregando sem erro 403

Resultado: OK / FALHA com evidência para cada item.
```

---

## 12. 🏗️ Evolução de Arquitetura e Banco

### 12.1 Nova Tabela no Supabase
```
Orquestrador Doxologos, ative Full-Track.
Convoque Tech Lead + Platform Security para criar nova tabela.

NOME DA TABELA: [nome_da_tabela]
PROPÓSITO: [o que armazena e para qual feature]

Colunas necessárias:
- id: uuid DEFAULT gen_random_uuid() PRIMARY KEY
- [coluna]: [tipo] [nullable/not null] — [descrição]

Requisitos:
1. RLS habilitado com políticas para paciente (próprio) e admin (tudo)
2. Indexes para colunas usadas em WHERE frequente
3. Foreign keys com ON DELETE correto
4. Registrar ERD atualizado em ARCH.md

Platform Security: valide RLS antes do merge.
```

### 12.2 Refatoração de Edge Function Existente
```
Orquestrador Doxologos, ative Full-Track.
Refatorar Edge Function: supabase/functions/[nome-da-funcao]/index.ts

MOTIVAÇÃO: [ex: sem validação Zod / sem tratamento de erros HTTP / logs com PII]

Tech Lead: proponha a interface Zod para o payload.
Dev: refatore preservando o contrato de entrada/saída atual (backward compatible).
Platform Security: confirme zero PII nos logs após refatoração.
QA: teste localmente via supabase functions serve antes do deploy.
```

### 12.3 Otimização de Performance (Bundle e Queries)
```
Orquestrador Doxologos, convoque Tech Lead + Fullstack Dev + Platform Security
para diagnóstico de performance.

SINTOMA: [ex: LCP > 2.5s na HomePage / query de bookings demorando > 1s]

Investigue:
1. Bundle size: identificar componentes sem lazy loading
2. React Query: queries sem staleTime definido causando re-fetch excessivo
3. Supabase: queries sem índice nas colunas de filtro
4. Core Web Vitals: LCP, FID, CLS atuais vs. metas (LCP < 2.5s, CLS < 0.1)

Entregue: top 3 otimizações com impacto estimado e esforço de implementação.
```

---

## 13. 📊 Relatório Executivo e Diagnóstico 360°

### 13.1 Diagnóstico 360° Completo
```
Orquestrador Doxologos, convoque TODAS as personas para um
Diagnóstico 360° (Code Review + Business Audit + Security Audit).

Escopo: [arquivo específico | pasta inteira | plataforma completa]

Cada persona verifica sua área:
- Product Lead: ROI das features existentes, dívida de produto
- Tech Lead: dívida técnica, inconsistências com ARCH.md
- Platform Security: vulnerabilidades RLS, PII em logs, OWASP Top 10
- QA: cobertura de testes, fluxos sem automação E2E
- Data & Growth: métricas sem rastreamento, oportunidades de CRO
- UX Design: acessibilidade, mobile-first, microcopy
- Bug Hunter: bugs conhecidos não documentados em 03_SQUAD_MEMORY.md

Entregue um relatório executivo com severidade e esforço estimado por item.
```

### 13.2 Relatório de Saúde da Plataforma (Semanal)
```
Orquestrador Doxologos, gere o Relatório de Saúde Semanal da Plataforma.

Período: [data início] a [data fim]

Inclua:
1. Status dos SLAs (checkout 99.9% / Zoom < 3s / Email < 10s / LCP < 2.5s)
2. Bugs registrados e resolvidos na semana (03_SQUAD_MEMORY.md Seção 6)
3. Testes quebrando ou cobertura reduzida
4. Alterações de banco ou Edge Functions deployadas
5. Alertas de segurança ou política RLS alterada
6. Próximas 3 prioridades recomendadas

Formato: executivo, máximo 1 página, sem jargão técnico desnecessário.
```

---

## 14. 🔁 Refatoração e Dívida Técnica

### 14.1 Dividir Componente Grande
```
Orquestrador Doxologos, ative Standard-Track.
Convoque Tech Lead + Fullstack Dev para refatorar [NomeDoComponente].

PROBLEMA: o componente tem [X linhas] e mistura responsabilidades.
Arquivo: [caminho completo]

Objetivo: dividir em componentes menores seguindo princípio de responsabilidade única.

Tech Lead: proponha a nova estrutura de arquivos antes de qualquer código.
Dev: implemente a refatoração sem alterar o comportamento externo.
QA: confirme que npm test passa 100% e o build está limpo após a refatoração.
Proibido introduzir novas features neste PR.
```

### 14.2 Migração de Estado Local para React Query
```
Orquestrador Doxologos, convoque Tech Lead + Fullstack Dev.
Migrar estado local (useState + useEffect + fetch manual) para TanStack Query.

Arquivo alvo: [caminho do arquivo]
Queries afetadas: [descreva as chamadas Supabase existentes]

Tech Lead: defina os queryKeys e staleTime adequados.
Dev: substitua o padrão fetch/useEffect por useQuery/useMutation sem regressão.
QA: confirme que o comportamento de cache e refetch está correto.
```

---

## 15. 🤝 Onboarding de Profissional / Paciente

### 15.1 Melhoria do Fluxo de Onboarding
```
Orquestrador Doxologos, ative Standard-Track.
Convoque Product Lead + UX Design + Fullstack Dev.

MELHORIA: fluxo de onboarding para [novo paciente / novo profissional].

Dores identificadas:
- [ex: muitos campos no cadastro inicial]
- [ex: nenhum email de boas-vindas após confirmação]

Proponha e implemente:
1. Redução de fricção no formulário (campos mínimos no primeiro contato)
2. Email de boas-vindas via send-email após confirmação
3. Mensagem de orientação com próximos passos claros
4. Link direto para agendar a primeira consulta (sem navegar)

UX Design: valide acessibilidade e microcopy empático.
QA: confirme fluxo completo via Playwright.
```

---

> ## 💡 Dicas de Ouro para Prompts Eficientes
>
> 1. **Sempre forneça evidências** (logs, stack trace, URL) antes de pedir diagnóstico — economiza 30-40% de tokens.
> 2. **Especifique o arquivo** quando souber — evita que o squad explore arquivos desnecessários.
> 3. **Use os templates de esteira** — "Fast-Track", "Full-Track" etc. — para o squad não perder tempo qualificando.
> 4. **Uma tarefa por prompt** — prompts misturados com múltiplos objetivos geram respostas dispersas.
> 5. **Registre o resultado** — após resolver um bug ou tomar uma decisão de arquitetura, peça para registrar em `03_SQUAD_MEMORY.md`.
> 6. **Seja o cliente interno** — descreva o problema como um usuário, não como um desenvolvedor. O squad traduz para código.
