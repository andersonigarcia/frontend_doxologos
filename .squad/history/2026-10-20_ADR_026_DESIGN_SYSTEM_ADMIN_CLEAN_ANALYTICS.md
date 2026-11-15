# ADR 026: Design System Administrativo Clean Analytics & Tipografia Tabular

## Status
Aprovado / Implementado

## Data
2026-10-20

## Contexto & Problema
A área administrativa da plataforma Doxologos anteriormente espelhava o mesmo padrão visual do portal institucional voltado aos pacientes:
1. Superfícies em tons quentes de bege e creme (`#f8f6f0`, `#fcfbf9`, `#e4ded5`).
2. Títulos e cabeçalhos em fontes serifadas (`font-serif`), orientadas ao acolhimento terapêutico institucional.
3. Monocromatismo em verde floresta (`#1b3c37` e `#2d8659`) utilizado concorrentemente em navegação, botões primários, alertas e status de agendamentos.

Embora esse padrão transmita acolhimento para o paciente final em páginas de captura e agendamento, no painel operacional de gestão executiva ele gerava:
- **Sobrecarga Cognitiva:** Dificuldade em distinguir botões de ação primária de badges de status e tags informativas.
- **Prejuízo na Escaneabilidade Numérica:** Ausência de tipografia monoespaçada tabular (`tabular-nums`) provocava oscilação na largura dos dígitos em tabelas de DRE, livro caixa e agendamentos, dificultando a conferência vertical de valores.
- **Baixo Contraste em Telas Mobile:** Em dispositivos móveis (>80% do tráfego do gestor), a combinação de tons beges com bordas tênues reduzia a nitidez em ambientes ensolarados ou com brilho moderado.

## Decisão Arquitetural
Adotar a padronização **Doxologos Enterprise / Clean Analytics** em todos os módulos da rota `/admin` e componentes administrativos, preservando a identidade da marca através da elegância funcional e clareza de dados:

1. **Superfície Neutra & Alto Contraste:**
   - Canvas base: `bg-slate-50 font-sans antialiased`.
   - Cards e módulos executivos: `bg-white rounded-xl border border-slate-200/80 shadow-xs`.
   - Divisórias nítidas: `border-slate-200/80` substituindo bordas opacas cremes.

2. **Tipografia Executiva & Dígitos Tabulares:**
   - Erradicação de fontes serifadas no painel administrativo em favor de `font-sans` com hierarquias sólidas (`font-bold text-slate-900 tracking-tight`).
   - Aplicação mandatória de `tabular-nums` em todas as métricas numéricas, moedas (`R$`), porcentagens e datas.

3. **Cores Semânticas Ativas:**
   - **Navegação & Ações Primárias:** `bg-slate-900 text-white hover:bg-slate-800` (contraste imediato e autoridade executiva).
   - **Receita & Eficiência (Emerald):** `text-emerald-700 bg-emerald-50/70 border-emerald-200` para faturamento, consultas concluídas e lucratividade.
   - **Volume & Conversão (Blue):** `text-blue-700 bg-blue-50/70 border-blue-200` para honorários de psicólogos e taxas de conversão de funil.
   - **Atenção & Pendências (Amber):** `text-amber-800 bg-amber-50/70 border-amber-200` para status pendentes, riscos operacionais e custos.
   - **Alertas Críticos & Cancelamentos (Rose):** `text-rose-800 bg-rose-50/70 border-rose-200` para perdas de pacientes, no-shows e cancelamentos.

4. **Ergonomia Mobile-First Preservada:**
   - Targets de toque mantidos em ≥44px (touch targets acessíveis).
   - Grids responsivos de KPIs (2x2 em mobile, 4 colunas em desktop).
   - Segmented controls de navegação horizontal com touch scrolling suave.

## Consequências & Impacto
- **Positivas:**
  - Leitura financeira e operacional imediata sem confusão entre botões e status.
  - Alinhamento vertical perfeito de valores monetários na DRE, Livro Caixa e Repasses.
  - Redução drástica de tempo de tomada de decisão para o administrador.
- **Mitigações:**
  - As páginas públicas de pacientes (`/`, `/agendamento`, `/depoimento`, etc.) permanecem com o design institucional acolhedor de terapia humanizada. A separação entre front-office (acolhimento) e back-office (cockpit executivo) reflete as melhores práticas de produtos digitais SaaS de saúde de alta maturidade.
