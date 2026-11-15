# 🎯 UX de Conversão - HomePage

> **Status**: ✅ Implementado  
> **Objetivo**: Maximizar taxa de conversão (agendamentos), retenção e engajamento na página inicial

---

## 📋 Escopo das Melhorias (Jul 2026)

Revisão completa da HomePage com foco em UX e marketing de conversão, cobrindo: Cabeçalho, Blog, FAQ, Contato e Rodapé.

---

## 🔝 Cabeçalho (Header)

**Arquivo**: `src/components/home/HomeHeader.jsx`

### O que mudou

- **Limpeza de menu (desktop)**: removidos os links "Início", "Depoimentos", "Contato" e "Sou Profissional". Reduzida sobrecarga cognitiva segundo a [Lei de Hick](https://lawsofux.com/hicks-law/).
- **Menu desktop simplificado**: mantidos apenas `Profissionais`, `Blog`, `Área do Paciente` e o botão CTA.
- **CTA com ícone**: botão "Agendar Consulta" ganhou ícone `Calendar` para maior peso visual.
- **Menu mobile**: mantém todos os links para facilidade em tela pequena.

### Coesão de Marca

- O ícone provisório (`<Heart />` da Lucide) foi substituído pelo logotipo oficial (`/favicon.svg`) em 10 páginas do sistema via script de varredura.
- Páginas corrigidas: `AgendamentoPage`, `CheckoutPage`, `CreateUsersPage`, `DepoimentoPage`, `DoacaoPage`, `EventoDetalhePage`, `QuemSomosPage`, `RecuperarSenhaPage`, `RedefinirSenhaPage`, `TrabalheConoscoPage`.

---

## 📰 Blog / Artigos Recentes

**Arquivo**: `src/components/home/BlogPreviewSection.jsx`

### O que mudou

- Adicionada seção "Artigos Recentes" na HomePage, posicionada após os Profissionais.
- Exibe os 3 artigos mais recentes do banco, com card visual, data e link de leitura.
- Botão "Ver todos os artigos" direciona para `/artigos`.
- Banner de Newsletter logo abaixo dos artigos incentiva inscrição no Substack.

---

## ❓ FAQ (Perguntas Frequentes)

**Arquivo**: `src/components/home/FaqSection.jsx` | Dados em `src/pages/HomePage.jsx`

### O que mudou

- **Respostas com CTA**: respostas de alta intenção (ex: "Como agendar?") incluem links diretos para `/agendamento`.
- **Deduplicação**: perguntas redundantes (sobre planos de saúde e horários) foram consolidadas.
- **Campo `content` JSX**: estrutura de dados do FAQ passou a suportar conteúdo HTML/JSX além do texto plano, habilitando links e formatação rica.
- **Campo `searchableText`**: campo separado garante que a busca por texto funcione mesmo em respostas com JSX.
- **CTA WhatsApp no rodapé do FAQ**: card "Ainda tem dúvidas? Fale no WhatsApp" ao final da seção.

---

## 📬 Seção de Contato

**Arquivo**: `src/components/home/ContactSection.jsx`

### O que mudou

- **Limpeza visual**: removidos os 3 botões redundantes (WhatsApp, Ligar, Email) do topo.
- **Formulário em destaque**: card branco com sombra, e microcopy de segurança "🔒 Seus dados são confidenciais. Retornamos em até 24h."
- **Card WhatsApp em destaque**: coluna da direita prioriza o atendimento rápido via WhatsApp com card verde.
- **Alerta CVV**: aviso amarelo com o número de crise 188 (CVV) para compliance ético com o CFP.

---

## 🔻 Rodapé (Footer)

**Arquivo**: `src/pages/HomePage.jsx` (seção `<footer>`)

### O que mudou

- **Instagram adicionado**: ícone e link para `@doxologosoficial` na coluna da marca.
- **Colunas reorganizadas por persona**:
  - Coluna 1: Marca + Instagram
  - Coluna 2: **Para Pacientes** (Agendamento, Blog, Área do Paciente, Deixe seu Depoimento)
  - Coluna 3: **Institucional** (Quem Somos, Trabalhe Conosco, Área do Profissional, Doação)
  - Coluna 4: Contato e Registro
- **Correção de roteamento**: links âncora (`#inicio`, `#profissionais`) corrigidos para caminhos absolutos (`/#inicio`, `/#profissionais`) para funcionar em qualquer página.

---

## 📱 Mobile CRO & Redesign de Filtros (Agosto 2026 - v3.1)

### O que mudou

- **Orquestração de Flutuantes (Z-Index):** O Botão Flutuante do WhatsApp (`FloatingWhatsAppButton.jsx`) foi ajustado com offset responsivo (`bottom-[88px] md:bottom-28`) e z-index (`z-40`) para eliminar colisão com a barra sticky de agendamento e o banner LGPD em celulares.
- **Formulários Nativos iOS/Android:** Adicionados `inputMode="email"`, `inputMode="numeric"` e `autoComplete` nativos para preenchimento com 1 toque no cadastro do paciente.
- **Redesign dos Filtros Rápidos (`ProfessionalStep.jsx`):**
  - Removida a quebra de texto interna que deformava os botões em ovais.
  - Implementadas pílulas compactas de 1 linha (`whitespace-nowrap flex-shrink-0`) com cantos arredondados (`rounded-full`).
  - Ícones vetoriais SVG Lucide nativos (Hoje: `Zap`, TCC: `Brain`, Logoterapia: `Sprout`, Psicanálise: `MessageCircle`, Noturno: `Moon`).
  - Destaque ativo em tom verde escuro corporativo (`#1b3c37`) e rolagem horizontal suave por deslize (`no-scrollbar scroll-smooth`).
- **Checkout PIX Mobile-First (`CheckoutPage.jsx`):**
  - Destaque primário de 100% da largura para o botão "Copiar Código PIX Copia e Cola" com orientação amigável.
  - QR Code recolhível em menu sanfona explicativo.

---

## 🔄 Histórico de Mudanças

### v3.1 / v3.2 (Agosto 2026)
- Mobile Conversion Hardening, Redesign dos Filtros Rápidos e PIX Mobile.

### v2.2 (Jul 2026)
- Implementação completa das melhorias da HomePage descritas acima.

---

**Última atualização**: Agosto de 2026
