# ADR 015: Desmembramento Estrutural dos God Components & Observabilidade Real-User (RUM)

- **Data:** 2026-10-12
- **Status:** Aceito e Implementado
- **Decisores:** Tech Lead, Fullstack Dev, UX Design, Platform Security

---

## 1. Contexto
Os arquivos `AdminPage.jsx` e `ProfessionalDashboardPage.jsx` continham mais de 5.700 linhas cada ("God Components"), inlinando blocos massivos de JSX e estados complexos para agendamentos operacionais (~1.140 linhas), gestão de eventos (~800 linhas), profissionais (~450 linhas), serviços clínicos (~190 linhas), pagamentos (~120 linhas) e depoimentos (~80 linhas). Essa duplicação elevava o custo de manutenção, aumentava o tempo de bundling do Vite para ~51s e dificultava testes isolados. Ao mesmo tempo, faltava um módulo proativo de observabilidade em tempo real (RUM - Real User Monitoring) para rastrear Core Web Vitals, latências de API do Supabase/Mercado Pago e taxas de falha em produção no cliente.

## 2. Decisão
1. **Desacoplamento em 6 Abas Modulares:** Extração em `src/components/admin/tabs/`:
   - `AdminBookingsTab.jsx`: Gestão completa de agendamentos com tabela, cards e calendário.
   - `AdminEventsTab.jsx`: Gestão e criação de eventos, links Meet/Zoom, splits de taxa.
   - `AdminServicesTab.jsx`: Catálogo de serviços, preços, repasses e sanitização monetária.
   - `AdminProfessionalsTab.jsx`: Visão administrativa embeddada e perfil profissional.
   - `AdminPaymentsTab.jsx`: Gestão de pagamentos, vínculos a consultas e formulários.
   - `AdminTestimonialsTab.jsx`: Moderação e atalhos de depoimentos públicos.
   - `index.js`: Barrel export padronizado.
2. **Observabilidade RUM:** Criação de `src/lib/observability/rumMonitoring.js` para monitoramento de Core Web Vitals (LCP, FID, CLS, FCP, TTFB), latências de API e cálculo de Health Score em tempo real.
3. **Refatoração dos Painéis:** Redução de ~5.700 para < 3.000 linhas em `AdminPage.jsx` e `ProfessionalDashboardPage.jsx` (~48% de redução).
4. **Guardrails e Testes:** Adição de testes de abas (`adminTabs.test.jsx`) e guardrails arquiteturais.

## 3. Consequências
- Código altamente modular e testável isoladamente.
- Tempo de compilação de produção (`vite build`) reduzido de 51s para ~22s.
- Telemetria de usuário real ativa para detecção proativa de degradação.
