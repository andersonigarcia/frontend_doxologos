# Fase 0 - Baseline Financeiro

## Objetivo
Documentar o estado atual do fluxo financeiro e ativar telemetria mínima sem alterar comportamento de clientes, preparando o terreno para a normalização contábil das próximas fases.

## Entregáveis
- **Documentação**: `docs/FINANCIAL_BASELINE.md` resumindo tabelas, edge functions e fluxos (checkout, eventos, créditos).
- **Instrumentação**: logs estruturados em `MercadoPagoService`, `CheckoutPage.jsx`, `EventoDetalhePage.jsx` e `financial-credit-manager` com contexto (`source_type`, IDs, valores, usuário).
- **Checklist de Smoke Tests**: script/manual descrevendo como validar consulta → pagamento PIX, evento pago, uso de crédito.
- **Snapshot de Schema**: inventário das tabelas relevantes (payments, bookings, services, financial_credits) e colunas sensíveis.

## Atividades
1. **Auditoria de Schema**
   - Exportar descrição das tabelas-chave usando Supabase CLI/Studio.
   - Documentar relacionamentos e campos obrigatórios/conhecidamente nulos.
2. **Instrumentação de Logs**
   - `MercadoPagoService`: adicionar `logger.info/error` antes/depois das chamadas externas + resultados relevantes.
   - `CheckoutPage.jsx` e `EventoDetalhePage.jsx`: logar criação de pagamentos e respostas (sem dados sensíveis).
   - `financial-credit-manager`: logar ações `list/reserve/consume` com `credit_id`, `user_id`, `amount`.
3. **Smoke Tests**
   - Descrever passos manuais e automatizados (Jest/RTL) aplicáveis nesta fase.
   - Rodar `npm run test checkout-smoke` (a definir) ou equivalent e registrar resultado.
4. **Relatório Final da Fase 0**
   - Atualizar doc com status dos itens acima e blockers (se houver).

## Critérios de Conclusão
- Documentação publicada e revisada em PR.
- Logs verificáveis localmente (rodar `npm run dev`, exercitar fluxos e observar console/Logger).
- Smoke tests executados sem regressões.
- Sem alterações de comportamento percebidas por usuários finais.

## Riscos & Mitigações
- **Ruído de Log**: usar níveis (`info`, `warn`, `error`) e `logger.withContext` para evitar vazamento de dados sensíveis.
- **Tempo de Auditoria**: priorizar tabelas usadas em pagamentos/repasse; anexar links Supabase para detalhes adicionais.

## Próximos Passos (pré-Fase 1)
- Validar com time financeiro o baseline documentado.
- Preparar migrations da Fase 1 com base nas lacunas identificadas.
