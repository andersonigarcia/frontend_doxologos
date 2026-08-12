# 💬 MODELOS DE PROMPTS PARA O DIA A DIA (PRODUÇÃO & EVOLUÇÃO)

Utilize os modelos abaixo (copiando e colando no chat) para interagir com o Squad e garantir execuções seguras em produção.

---

### 1. Investigação de Bug/Incidente em Produção (Hotfix Protocol)
**Use quando ocorrer uma falha em ambiente de produção (Checkout, Zoom, Emails, Auth).**

> "Squad, ocorreu um incidente em produção no fluxo de **[ex: Checkout Mercado Pago / Agendamento]**.
> Erro / Comportamento observado: **[COLE O LOG OU DESCRIÇÃO AQUI]**.
> SRE e Backend Specialist: Investiguem silenciosamente a causa raiz sem alterar código precipitadamente. 
> Respeitem o protocolo de Hotfix, verifiquem se há impacto em transações em andamento e proponham a correção garantindo 100% de compatibilidade regressiva."

---

### 2. Nova Feature ou Evolução Segura (Feature Flag & Modularidade)
**Use para introduzir novas funcionalidades em ambiente ativo.**

> "Squad, precisamos implementar a nova funcionalidade de **[Nome da Feature]**.
> PM e Frontend Specialist: Criem o fluxo isolado em componentes React com suporte a Feature Flag ou toggle de configuração.
> Backend Specialist & DBA: Desenvolvam a Edge Function em Deno e as tabelas com políticas RLS no Supabase sem quebrar schemas existentes."

---

### 3. Migração de Banco de Dados Zero-Downtime (SQL Migration)
**Use ao alterar tabelas existentes em produção.**

> "DBA e Tech Lead, precisamos alterar a estrutura da tabela **[Nome da Tabela]** para suportar **[Novo Requisito]**.
> Apliquem o padrão *Expand & Contract*: criem o script SQL de migração mantendo compatibilidade com requisições legadas. Garantam que todas as políticas RLS estejam configuradas e não incluam nenhuma instrução `DROP` destrutiva."

---

### 4. Audit de Pre-Release & Definition of Done (DoD)
**Use antes de autorizar o deploy de um novo pacote/release.**

> "QA e Tech Lead, façam a auditoria final de Pre-Release para as alterações no módulo **[Nome do Módulo]**.
> Executem a validação do Definition of Done (DoD): garantam que `npm run build` compila sem erros, rodem os testes unitários (`npm test`), validem a segurança RLS e certifiquem-se de que não há dados PII expostos nos logs."

---

### 5. Code Review & Compliance LGPD/HIPAA
**Use antes de aprovar commits em módulos sensíveis de prontuário/paciente.**

> "Tech Lead e Security Engineer, façam um Code Review rígido no código abaixo.
> Verifiquem conformidade com LGPD/HIPAA, higienização de inputs com Zod, ausência de credenciais expostas e adesão às ADRs do nosso [`03_SQUAD_MEMORY.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/03_SQUAD_MEMORY.md).
> [COLE O CÓDIGO AQUI]"

---

### 6. Estratégia de Growth, SEO e Marketing de Conteúdo (Substack)
**Use para atrair tráfego orgânico e otimizar posicionamento no Google/Substack.**

> "Digital Growth Specialist e Copywriter, precisamos criar uma campanha de atração orgânica sobre o tema **[Tema de Saúde Mental / Psicologia]**.
> Criem o rascunho do artigo para o Substack com meta tags SEO de alto volume de busca, definam a estrutura da landing page de conversão e ajustem as tags Open-Graph para compartilhamento nas redes sociais."

---

### 7. Design System, UX e Acessibilidade (WCAG 2.1)
**Use ao criar ou refatorar interfaces para garantir alta estética e acessibilidade.**

> "UI/UX Designer e Frontend Specialist, revisem o componente **[Nome do Componente]**.
> Garantam aderência ao Design System Doxologos (TailwindCSS + Radix UI), contraste de cores WCAG 2.1 AA, navegação fluida via teclado, suporte a leitores de tela e animações suaves com Framer Motion."

---

### 8. Análise de Funil de Conversão e Inteligência de Negócio (BI)
**Use para analisar métricas financeiras, taxa de rejeição e conversão do checkout.**

> "Data Analytics BI Analyst e PM, analisem o desempenho do funil de checkout do Mercado Pago e os dados do GA4.
> Apontem onde estão os principais pontos de fricção entre a seleção de horários e a conclusão do pagamento PIX/Cartão. Proponham testes A/B e melhorias de CRO para aumentar a taxa de conversão."

---

### 9. Gatilho de Auto-Refinamento (Registro de ADR)
**Use após tomar uma decisão importante com o Squad.**

> "Excelente solução, Squad. Tech Lead, execute a **Etapa 6** do nosso processo. Escreva e salve a atualização no arquivo [`03_SQUAD_MEMORY.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/.squad/03_SQUAD_MEMORY.md) registrando essa decisão arquitetural que acabamos de tomar sobre **[Tema da Decisão]**."


