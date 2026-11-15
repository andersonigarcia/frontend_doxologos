# ADR 018 — Governança Documental, Limpeza de Código Órfão e Mobile CRO

- **Status:** Aprovada
- **Data:** 2026-10-18
- **Contexto:** Onda 1 de melhorias pós-Diagnóstico 360°
- **Personas:** Tech Lead, UX Design, Data & Growth

---

## 1. Contexto & Problema

Durante a auditoria arquitetural e de produto (Onda 1), foram identificados:
1. **Documentação Desatualizada em [`ARCH.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/ARCH.md):** Listava apenas 18 rotas quando a aplicação possui 48 rotas ativas em [`src/App.jsx`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/App.jsx). O diagrama de arquitetura e o fluxo de checkout ainda mencionavam `zoom-create-meeting` e Zoom/Twilio, enquanto o sistema roda canonicamente sobre Google Meet orquestrado via `personal_meet_link` do profissional.
2. **Arquivos Órfãos na Raiz:** Arquivos de extração temporária [`bookings.jsx`](file:///c:/Users/ander/source/repos/frontend_doxologos/bookings.jsx) e [`professionals.jsx`](file:///c:/Users/ander/source/repos/frontend_doxologos/professionals.jsx) gerados por script auxiliar permaneciam na raiz do repositório.
3. **Atrito de Conversão Mobile no Checkout:** Em [`src/pages/CheckoutDirectPage.jsx`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/pages/CheckoutDirectPage.jsx), inputs de cartão de crédito, validade, CVV e CPF não possuíam `inputMode="numeric"`, abrindo teclado alfanumérico padrão em celulares. Além disso, a página não possuía barra sticky com CTA no mobile, obrigando o usuário a rolar longos formulários para confirmar o pagamento (violando a diretriz da ADR 002).
4. **Lacuna de Métricas no Checkout Direto:** O fluxo transparente de cartão não emitia evento canônico `purchase` com moeda e valor no GA4 e não registrava `payment_error` em caso de recusa bancária.

---

## 2. Decisão

1. **Sincronização de [`ARCH.md`](file:///c:/Users/ander/source/repos/frontend_doxologos/ARCH.md):**
   - Atualizada a tabela de rotas para catalogar todas as 48 rotas organizadas em 8 domínios funcionais.
   - Atualizados diagramas e fluxos para refletir a teleconsulta via Google Meet (`personal_meet_link` e `post-payment-orchestrator`).
2. **Deleção dos Arquivos Órfãos:** Removidos os artefatos temporários da raiz.
3. **Mobile CRO & Acessibilidade em [`CheckoutDirectPage.jsx`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/pages/CheckoutDirectPage.jsx):**
   - Inserido `inputMode="numeric"` em número do cartão, validade, CVV e CPF.
   - Adicionados atributos de preenchimento automático nativo (`autoComplete="cc-number"`, `autoComplete="cc-exp"`, `autoComplete="cc-csc"`, `autoComplete="cc-name"`, `autoComplete="email"`).
   - Inserida barra sticky fixa no rodapé para dispositivos móveis (`md:hidden`) com resumo do valor e botão de submit vinculado ao formulário (`form="direct-card-form"`).
   - Adicionado `data-testid="tcle-checkbox"` para manter paridade com os testes automatizados do Playwright.
4. **Instrumentação de Growth (GA4):**
   - Emissão de evento de e-commerce padrão `purchase` em pagamentos de cartão aprovados.
   - Emissão de evento `payment_error` com motivo detalhado da recusa bancária para rastreamento de falhas e taxa de aprovação.

---

## 3. Consequências

- **Positivas:**
  - Redução drástica de abandono de checkout em smartphones.
  - Eliminação de débitos de documentação e código morto.
  - Visibilidade de conversão em tempo real no Google Analytics 4.
  - 100% de conformidade mantida nos guardrails automatizados (`check:architecture`).
- **Invariantes Preservados:**
  - Todos os 248 testes de domínio continuam verdes.
  - Build de produção gerado com sucesso sem regressões.
