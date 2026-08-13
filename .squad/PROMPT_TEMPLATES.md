# 💬 MODELOS DE PROMPTS PARA O DIA A DIA (PRODUÇÃO, NEGÓCIO & EVOLUÇÃO)

Utilize os modelos abaixo (copiando e colando no chat) para interagir com o Squad Multiagente Doxologos e garantir execuções seguras, estratégicas e em conformidade com o mercado.

---

### 1. Análise de Mercado, Benchmarking & Cases de Sucesso (Estratégia & PO)
**Use para avaliar concorrentes, novos modelos de receita ou funcionalidades antes de desenhar a solução.**

> "Squad (Business Analyst, PO e PM), realizem uma análise de mercado e benchmarking competitivo sobre **[ex: Modelo de Assinatura / Pacotes Corporativos / Consultas em Grupo]**.
> Avaliem cases de sucesso de plataformas líderes (ex: Psicologia Viva, Zenklub, Doctoralia, Talkspace). Mapeiem requisitos funcionais, modelo de monetização, proposta de valor e apresentem uma recomendação de MVP alinhada ao Doxologos."

---

### 2. Investigação de Bug/Incidente em Produção (Hotfix Protocol)
**Use quando ocorrer uma falha em ambiente de produção (Checkout, Zoom, Emails, Auth).**

> "Squad, ocorreu um incidente em produção no fluxo de **[ex: Checkout Mercado Pago / Agendamento]**.
> Erro / Comportamento observado: **[COLE O LOG OU DESCRIÇÃO AQUI]**.
> SRE, AppSec e Backend Specialist: Investiguem silenciosamente a causa raiz sem alterar código precipitadamente. 
> Respeitem o protocolo de Hotfix, verifiquem se há impacto em transações em andamento e proponham a correção garantindo 100% de compatibilidade regressiva."

---

### 3. Emissão Fiscal (NFS-e), Ledger Financeiro & Audit de Pagamento
**Use ao implementar ou modificar regras de cobrança, reembolso ou faturamento tributário.**

> "Squad (Especialista Financeiro, Payments e Fiscal), precisamos revisar o fluxo tributário e financeiro do módulo **[Nome do Módulo]**.
> Garantam que o valor de cobrança no checkout do Mercado Pago seja reconciliado com idempotência no Supabase, a regra de repasse no Ledger esteja correta e a emissão automática de NFS-e esteja pronta sem divergência de impostos."

---

### 4. Auditoria de Privacidade (LGPD/HIPAA) & Compliance Regulatório (CFP)
**Use antes de criar ou modificar tabelas ou fluxos que tratem dados de prontuários ou agendamentos.**

> "DPO / Privacy Specialist e Especialista Jurídico, realizem uma auditoria de compliance no módulo **[Nome do Módulo]**.
> Verifiquem o consentimento informado do paciente, criptografia de dados sensíveis de psicologia, anonimização de logs sem PII e alinhamento com as resoluções do Conselho Federal de Psicologia (CFP) e LGPD."

---

### 5. UX Research, UX Writing & Redesign de Conversão (CRO)
**Use para refinar microcopies, páginas de agendamento e reduzir fricção da jornada.**

> "UX Researcher, UX Writer e UI/UX Designer, analisem o fluxo de **[ex: Onboarding do Paciente / Tela de Checkout]**.
> Avaliem os pontos de atrito da jornada, proponham microcopies empáticas para saúde mental e desenhem a solução alinhada ao Design System Doxologos (Tailwind + Radix UI) com contraste WCAG 2.1 AA."

---

### 6. Nova Feature ou Evolução Segura (Feature Flag & Modularidade)
**Use para introduzir novas funcionalidades em ambiente ativo.**

> "Squad, precisamos implementar a nova funcionalidade de **[Nome da Feature]**.
> PM e Frontend Specialist: Criem o fluxo isolado em componentes React com suporte a Feature Flag ou toggle de configuração.
> Backend Specialist & DBA: Desenvolvam a Edge Function em Deno e as tabelas com políticas RLS no Supabase sem quebrar schemas existentes."

---

### 7. Migração de Banco de Dados Zero-Downtime (SQL Migration)
**Use ao alterar tabelas existentes em produção.**

> "DBA e Tech Lead, precisamos alterar a estrutura da tabela **[Nome da Tabela]** para suportar **[Novo Requisito]**.
> Apliquem o padrão *Expand & Contract*: criem o script SQL de migração mantendo compatibilidade com requisições legadas. Garantam que todas as políticas RLS estejam configuradas e não incluam nenhuma instrução `DROP` destrutiva."

---

### 8. Automação de QA E2E (Playwright) & Performance (Core Web Vitals)
**Use para validar fluxos críticos de checkout/agendamento e otimizar tempo de carregamento.**

> "QA Automation Engineer e Performance Specialist, criem e executem a suíte de testes para o módulo **[Nome do Módulo]**.
> Implementem testes E2E com Playwright cobrindo casos felizes e de erro no checkout PIX/Cartão. Verifiquem se o LCP do componente permanece abaixo de 2.5s e se o bundle JS não sofreu regressão."

---

### 9. CRM, Retenção & Régua de Redução de No-Show
**Use para criar automações de e-mail/WhatsApp que garantam presença nas consultas.**

> "CRM Specialist e PMM, desenhem uma régua de engajamento e retenção para **[ex: Confirmação e Lembretes de Teleconsulta]**.
> Definam o timing dos disparos (24h antes, 1h antes, 10 min antes), a mensagem no tom Doxologos para WhatsApp/E-mail e as métricas para mensurar a redução da taxa de faltas (no-show)."

---

### 10. Audit de Pre-Release & Definition of Done (DoD) com 5 Gatekeepers
**Use antes de autorizar o deploy de um novo pacote/release.**

> "Squad e Tech Lead, façam a auditoria final de Pre-Release com os 5 Gatekeepers de Validação Cruzada para **[Nome da Release/Módulo]**.
> Executem o Definition of Done (DoD): compilação limpa (`npm run build`), testes unitários (`npm test`), testes E2E, auditoria RLS/AppSec, ausência de PII em logs e checagem fiscal/financeira."

---

### 11. Gatilho de Auto-Refinamento (Registro de ADR)
**Use após tomar uma decisão importante com o Squad.**

> "Excelente solução, Squad. Tech Lead, execute a **Etapa 6** do nosso processo. Escreva e salve a atualização no arquivo [`03_SQUAD_MEMORY.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/03_SQUAD_MEMORY.md) registrando essa decisão arquitetural que acabamos de tomar sobre **[Tema da Decisão]**."

---

### 12. Diagnóstico & Auditoria Completa 360° da Aplicação (Master Audit Prompt)
**Use para acionar o Squad em uma avaliação completa de saúde do projeto (Negócio, UX, Código, Segurança, Finanças e LGPD).**

> "Squad Multiagente Doxologos, acionem os **6 Pilares de Domínio** para executar uma **Auditoria e Diagnóstico 360° Completo** na aplicação atual (`https://novo.doxologos.com.br` / base de código).
> 
> Exijo uma avaliação minuciosa cobrindo os seguintes aspectos por pilar:
> 
> 1. 🎯 **Estratégia & Produto (PO/BA/Growth):** Mapeiem o funil de agendamento e checkout. Onde estão os gargalos de conversão? O produto atende aos padrões dos principais concorrentes de saúde mental (Zenklub/Doctoralia)? Como está nossa retenção e controle de no-show?
> 2. 🎨 **UX, Design & Microcopy (UX Researcher/Writer):** Avaliem a usabilidade, acessibilidade (WCAG 2.1 AA) e clareza das microcopies defensivas/humanizadas no checkout e formulários. Há atritos na jornada do paciente ou psicólogo?
> 3. ⚙️ **Engenharia & Banco (Tech Lead/DBA):** Inspecionem a qualidade do código React/Vite e Edge Functions em Deno. As tabelas do Supabase possuem políticas RLS ativas? Há dívidas técnicas estruturais ou riscos de quebra de contrato?
> 4. 🛡️ **Qualidade, SRE, AppSec & Performance (QA/AppSec/SRE/Perf):** Inspecionem os testes automatizados, vulnerabilidades OWASP Top 10, latência de Edge Functions e Core Web Vitals (LCP < 2.5s). Há qualquer risco de vazamento de PII em logs do sistema?
> 5. 💰 **Finanças, Pagamentos & Fiscal (Controller/Payments/Fiscal):** Inspecionem a resiliência do checkout Mercado Pago (PIX inline/Cartão), a reconciliação idempotente de webhooks, a integridade do Ledger de repasses e a prontidão para emissão automatizada de NFS-e.
> 6. ⚖️ **Governança, Compliance & DPO (Legal/Privacy/Data):** Verifiquem o consentimento informado dos pacientes, conformidade com a LGPD e resoluções do Conselho Federal de Psicologia (CFP). Os dados sensíveis estão protegidos?
> 
> **Resultado esperado:** Apresentem um relatório com (a) Diagnóstico Atual por Pilar, (b) Lista de Vulnerabilidades/Gargalos Priorizados por Gravidade (Alta/Média/Baixa) e (c) Plano de Ação Imediato com os Pre-Flight Checks para correção."

### 13. Diagnostico completo
**Use para diagnostico completo da aplicação

Squad Multiagente Doxologos, acionem os 6 Pilares de Domínio para executar uma Auditoria e Diagnóstico 360° Completo na aplicação atual (https://novo.doxologos.com.br / base de código).

Exijo uma avaliação minuciosa cobrindo os seguintes aspectos por pilar:

1. 🎯 Estratégia & Produto (PO/BA/Growth): Mapeiem o funil de agendamento e checkout. Onde estão os gargalos de conversão? O produto atende aos padrões dos principais concorrentes de saúde mental (Zenklub/Doctoralia)? Como está nossa retenção e controle de no-show?
2. 🎨 UX, Design & Microcopy (UX Researcher/Writer): Avaliem a usabilidade, acessibilidade (WCAG 2.1 AA) e clareza das microcopies defensivas/humanizadas no checkout e formulários. Há atritos na jornada do paciente ou psicólogo?
3. ⚙️ Engenharia & Banco (Tech Lead/DBA): Inspecionem a qualidade do código React/Vite e Edge Functions em Deno. As tabelas do Supabase possuem políticas RLS ativas? Há dívidas técnicas estruturais ou riscos de quebra de contrato?
4. 🛡️ Qualidade, SRE, AppSec & Performance (QA/AppSec/SRE/Perf): Inspecionem os testes automatizados, vulnerabilidades OWASP Top 10, latência de Edge Functions e Core Web Vitals (LCP < 2.5s). Há qualquer risco de vazamento de PII em logs do sistema?
5. 💰 Finanças, Pagamentos & Fiscal (Controller/Payments/Fiscal): Inspecionem a resiliência do checkout Mercado Pago (PIX inline/Cartão), a reconciliação idempotente de webhooks, a integridade do Ledger de repasses e a prontidão para emissão automatizada de NFS-e.
6. ⚖️ Governança, Compliance & DPO (Legal/Privacy/Data): Verifiquem o consentimento informado dos pacientes, conformidade com a LGPD e resoluções do Conselho Federal de Psicologia (CFP). Os dados sensíveis estão protegidos?

Resultado esperado: Apresentem um relatório com (a) Diagnóstico Atual por Pilar, (b) Lista de Vulnerabilidades/Gargalos Priorizados por Gravidade (Alta/Média/Baixa) e (c) Plano de Ação Imediato com os Pre-Flight Checks para correção.
