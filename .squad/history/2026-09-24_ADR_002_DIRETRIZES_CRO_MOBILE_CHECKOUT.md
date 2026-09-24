# ADR 002: Otimização de Conversão Mobile (CRO) no Checkout e Agendamento

- **Data:** 2026-09-24
- **Status:** Aprovado e Implementado
- **Decisores:** UX Design, Product Lead, Fullstack Dev

---

## 1. Contexto
A análise de tráfego do Google Analytics evidenciou que **mais de 80% dos usuários** acessam a plataforma via dispositivos móveis (smartphones). O fluxo anterior apresentava potenciais pontos de atrito:
1. O botão principal de prosseguir para pagamento e confirmação ficava abaixo da dobra (*below the fold*) em telas pequenas, exigindo rolagem excessiva.
2. O QR Code PIX renderizado no mobile às vezes ficava pequeno ou oculto dentro de um `<details>` retrátil, dificultando a leitura por quem utiliza um segundo dispositivo para pagar.
3. Mensagens de erro em formulários eram técnicas ou genéricas, elevando a ansiedade do paciente.

## 2. Decisão
1. **CTA Sticky Acima da Dobra (Mobile):** Implementação de barra inferior flutuante fixa (`fixed bottom-0 left-0 right-0 md:hidden`) no Checkout e no resumo de agendamento com o valor total e o botão de ação imediato ("Gerar PIX" / "Pagar com Cartão" / "Avançar para Pagamento").
2. **QR Code PIX com Tamanho Mínimo de 200px:** No mobile e desktop, o QR Code agora é renderizado com tamanho mínimo de `200x200px` (utilizando `size={200}` e `size={220}`) em moldura de alto contraste e com indicação clara para leitura com o app bancário.
3. **Copywriting Empático e Acolhedor:** Validações de campos obrigatórios reformuladas para um tom amigável e encorajador, adequado ao contexto de clínica de saúde mental.

## 3. Consequências
- Aumento imediato na taxa de conclusão de agendamentos e redução no abandono de checkout mobile.
- Clareza visual e confiança reforçada no fluxo de pagamento instantâneo via PIX.
