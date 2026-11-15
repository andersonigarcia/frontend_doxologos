# ADR 003: Padronização Visual da Identidade da Marca e Política de Comunicação via WhatsApp

- **Data:** 2026-09-24
- **Status:** Aprovado e Implementado
- **Decisores:** UX Design, Tech Lead, Dev

---

## 1. Contexto
1. **Inconsistência da Logo no Topo:** A página inicial utilizava a identidade institucional oficial através do componente `DoxologosLogo` (brasão verde floresta + tipografia serifada), enquanto diversas páginas internas e fluxos de checkout/agendamento renderizavam um favicon solto de 32px com o texto estilizado com `gradient-text`, quebrando o padrão de marca e transmitindo aspecto de incompletude.
2. **Falsa Promessa de Notificação por WhatsApp:** A plataforma opera com a feature flag `WHATSAPP_BOOKING_CONFIRMATION: false` (aguardando contratação da API oficial de mensageria). No entanto, algumas telas de agendamento afirmavam que o paciente receberia o link da consulta por WhatsApp, gerando expectativas não atendidas e dúvidas no suporte.

## 2. Decisão
1. **Padronização Visual da Logo:** Fica estabelecido o uso mandatório do componente oficial `DoxologosLogo` (`@/components/brand/DoxologosLogo`) em todos os cabeçalhos da aplicação (Home, Agendamento, Checkout, Doação, Depoimentos, Trabalhe Conosco, Área do Paciente e Painel Profissional), utilizando classes TailwindCSS homogêneas (`h-9 md:h-10 w-auto`). É vedado o uso de `src="/favicon.svg"` acompanhado de texto manual para compor o cabeçalho.
2. **Alinhamento da Régua de Comunicação:** Todas as mensagens de envio passivo de notificação ou link de videochamada foram direcionadas para:
   - **E-mail de confirmação** do paciente;
   - **Painel da Área do Paciente** (`/area-do-paciente`).
3. **Escopo do Canal WhatsApp:** O botão de WhatsApp deve ser mantido estritamente para suporte humanizado ativo ("Precisa de ajuda? Fale conosco no WhatsApp"), sem prometer envio automático de mensagens transacionais pelo sistema.

## 3. Consequências
- Identidade visual unificada, sóbria e consistente em 100% das páginas da plataforma.
- Eliminação de ansiedade e ruído de comunicação com pacientes pós-reserva.
- Conformidade estrita entre a interface do usuário e as capacidades ativas do backend.
