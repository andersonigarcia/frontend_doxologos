# ADR 024 — Redesign UI/UX Mobile-First e Alinhamento à Identidade Visual Doxologos

- **Status:** Aprovado & Implementado
- **Data:** 2026-10-19
- **Autores:** UX Designer, Product Lead, Fullstack Dev & Orquestrador Doxologos
- **Contexto:** 
  A Área Administrativa da plataforma apresentava layout, contrastes e cores desarmônicos (tons de verde genérico `#2d8659`, cards escuros tipo terminal de desenvolvedor) e pouca ergonomia em dispositivos móveis, que concentram **mais de 80% do tráfego real dos usuários e gestores da clínica**. No smartphone, os indicadores ficavam empilhados verticalmente gerando viewports excessivos de rolagem, e a sidebar ficava inacessível sem uma gaveta (drawer) intuitiva.

## Decisões Tomadas

### 1. Aderência Estrita aos Design Tokens Oficiais Doxologos
- **Fundo da Aplicação:** Off-white acolhedor (`#f8f6f0` / `var(--background)`), substituindo o cinza padrão de SaaS (`bg-slate-100`).
- **Primária:** Verde Petróleo Profundo (`#1b3c37` / `var(--primary)`), transmitindo autoridade clínica e serenidade.
- **Secundária / Acentos:** Sálvia mineral suave (`#9bab9b` / `var(--primary-light)`), Areia (`#e4ded5`, `#f4efe6`, `#c9baa3`).
- **Tipografia:** Títulos editoriais com `font-serif` combinados com corpo de texto sans-serif moderno, legível e balanceado.

### 2. Ergonomia Mobile-First (> 80% do Tráfego)
- **Grid de KPIs 2x2 no Mobile:** Todos os 4 módulos estruturados (`StrategicCockpitModule`, `FinancialControlModule`, `OperationalRetentionModule`, `GrowthAnalyticsModule`) agora utilizam `grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4`. Isso permite visualização instantânea dos 4 indicadores vitais no primeiro terço da tela, eliminando o efeito de scroll infinito.
- **Carrosséis Horizontais Touch-Friendly:** Filtros temporais (`Hoje`, `Ontem`, `7d`, `30d`, `Ano`, `Tudo`) e sub-abas operacionais utilizam rolagem horizontal tocável (`overflow-x-auto scrollbar-none flex-nowrap`) com altura mínima de toque de 38-44px.
- **Touch Targets Conformes WCAG:** Áreas clicáveis e botões de ação respeitam a recomendação de pelo menos 44px de altura.

### 3. Navegação Mobile Drawer & Indicador de Módulo
- **Slide-Over Drawer:** No mobile (`< md`), o botão hamburger abre uma gaveta deslizante completa contendo o `AdminSidebar` responsivo, permitindo navegar entre os 6 módulos estruturados da clínica com fechamento automático ao selecionar qualquer tab.
- **Barra de Módulo Rápido:** Uma barra compacta sticky no topo do mobile exibe o módulo ativo e a aba corrente com botão de acesso rápido à gaveta.

### 4. Card do Copiloto IA Executivo (Card Claro Premium) & Ocultação de Scrollbars Nativas
- **Card Claro Premium:** Substituição do bloco escuro (que criava peso visual excessivo e efeito "buraco negro") por um card branco nobre (`bg-white`), bordas minerais (`#e4ded5`), tipografia serifada em Verde Petróleo (`#1b3c37`) e 3 pilares editoriais com fundos suaves de alto contraste clínico (esmeralda suave, âmbar suave e petróleo suave).
- **Eliminação de Scrollbars Nativas:** Inclusão de regras estritas de ocultação de barra de rolagem cinza (`[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`) no carrossel de períodos e nas sub-abas operacionais, garantindo visual limpo e polido tanto no desktop quanto no mobile.

### 5. Resiliência e Redesign do Módulo de Blog & Substack
- **Carregamento Resiliente Direto:** O módulo `BlogManagementDashboard` dependia exclusivamente de uma Edge Function remota (`admin-update-article`) mesmo para listar artigos. A falha de autenticação/execução da função deixava a tela em estado vazio ("Nenhum artigo encontrado") apesar dos artigos existirem no banco. Implementamos consulta direta canônica à tabela `artigos` do Supabase com fallback gracioso para a Edge Function.
- **Redesign Card Claro Premium:** A tela adotou o design system Doxologos com cabeçalho serifado `#1b3c37`, badge editorial com faísca, busca integrada com anel de foco sálvia, chips de filtro de visibilidade (`Todos`, `Visíveis`, `Ocultos`), visualização em cartões no mobile (`block sm:hidden`) e tabela elegante no desktop (`hidden sm:block`).
- **Alertas de Erro com Ação de Retry:** Em caso de oscilação de rede, é exibido banner com botão de "Tentar Novamente" em vez de tela em branco silenciosa.

## Consequências e Resultados
- **100% de Preservação das Fórmulas de Negócio:** Nenhuma métrica, query de banco ou regra de split/DRE foi modificada.
- **Aprovação Global nos Testes:** Todas as suítes de teste de admin verdes, incluindo nova suíte dedicada `BlogManagementDashboard.test.jsx`.
- **Guardrails Arquiteturais:** 100% aprovados (`npm run check:architecture`).
- **Build de Produção:** Vite compilou com sucesso sem alertas de bundles quebrados (`npm run build`).
