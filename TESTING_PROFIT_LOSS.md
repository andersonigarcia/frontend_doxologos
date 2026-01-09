# Guia de Teste: Dashboard de Lucro/Prejuízo

## ✅ Mudanças Implementadas

### Arquivos Modificados

1. **Novo Hook**: [`usePlatformRevenueFromLedger.jsx`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/hooks/usePlatformRevenueFromLedger.jsx)
   - Busca dados de `payment_ledger_entries`
   - Filtra por `REVENUE_SERVICE` e `LIABILITY_PROFESSIONAL`
   - Inclui logs detalhados para debug

2. **Hook Atualizado**: [`useProfitLoss.jsx`](file:///c:/Users/ander/source/repos/frontend_doxologos/src/hooks/useProfitLoss.jsx)
   - Linha 3: Adicionado import do novo hook
   - Linha 191: Trocado `usePlatformRevenue` por `usePlatformRevenueFromLedger`

---

## 🎯 Valores Esperados (Baseado no Diagnóstico)

### Dados do Ledger (Este Mês)
```
REVENUE_SERVICE (CREDIT):
- 18 entradas
- Total: R$ 1.050,00

LIABILITY_PROFESSIONAL (CREDIT):
- 18 entradas  
- Total: R$ 1.600,00

Margem Plataforma: R$ 1.050 - R$ 1.600 = R$ -550,00 (NEGATIVA)
```

### ⚠️ Observação Importante

O diagnóstico mostra **margem negativa** (R$ -550), o que significa que os repasses aos profissionais (R$ 1.600) são **maiores** que a receita da plataforma (R$ 1.050).

**Isso pode indicar**:
1. Erro nos lançamentos do ledger
2. Promoções ou descontos aplicados
3. Repasses incorretos

---

## 🧪 Como Testar

### Passo 1: Acessar Dashboard

1. Abra o navegador
2. Acesse: https://novo.doxologos.com.br/admin
3. Navegue até a aba **"Lucro/Prejuízo"**

### Passo 2: Verificar Valores

**ANTES** (com NaN):
- ❌ Receita Total: `R$ NaN`
- ❌ Margem Plataforma: `R$ NaN`
- ❌ Custos Totais: `R$ NaN`
- ✅ Lucro/Prejuízo: `R$ 180,00`

**DEPOIS** (esperado):
- ✅ Receita Total: `R$ 1.050,00`
- ✅ Margem Plataforma: `R$ -550,00` (negativa!)
- ✅ Custos Totais: `[valor dos custos]`
- ✅ Lucro/Prejuízo: `R$ -550 - [custos]`

### Passo 3: Verificar Console Logs

Abra o DevTools (F12) e procure por:

```
📊 Ledger entries fetched: 43
💰 Revenue entries: 18 Payout entries: 18
📈 Calculated: {
  totalRevenue: 1050,
  totalPayouts: 1600,
  platformMargin: -550,
  marginPercentage: '-52.38%',
  bookingsCount: 18
}
```

---

## 🔍 Checklist de Validação

- [ ] Dashboard carrega sem erros
- [ ] **Receita Total** mostra valor numérico (não NaN)
- [ ] **Margem Plataforma** mostra valor numérico (não NaN)
- [ ] **Custos Totais** mostra valor numérico (não NaN)
- [ ] **Lucro/Prejuízo** mostra valor calculado corretamente
- [ ] Console mostra logs de debug
- [ ] Filtros de período funcionam (Este Mês, Trimestre, Ano)

---

## 🐛 Troubleshooting

### Problema: Ainda mostra NaN

**Verificar**:
1. Arquivo `useProfitLoss.jsx` foi salvo corretamente?
2. Import do novo hook está presente?
3. Linha 191 usa `usePlatformRevenueFromLedger`?

**Solução**:
```bash
# Limpar cache e rebuild
npm run build
# ou
ctrl + shift + R (hard refresh no navegador)
```

### Problema: Valores diferentes do esperado

**Verificar**:
1. Período selecionado (Este Mês, Trimestre, Ano)
2. Logs do console para ver valores calculados
3. Executar diagnóstico SQL novamente

### Problema: Erro no console

**Verificar**:
1. Tabela `payment_ledger_entries` existe?
2. Permissões RLS estão corretas?
3. Usuário logado é admin?

---

## 📊 Próximos Passos Após Teste

### Se Tudo Funcionar ✅

1. **Investigar Margem Negativa**
   - Por que repasses (R$ 1.600) > receita (R$ 1.050)?
   - Verificar lançamentos no Livro Caixa
   - Corrigir dados se necessário

2. **Backfill Opcional**
   - Preencher `bookings.valor_consulta` e `bookings.valor_repasse_profissional`
   - Executar script de backfill

3. **Adicionar Constraints**
   - Prevenir NULLs futuros em bookings

### Se Houver Problemas ❌

1. Verificar logs do console
2. Executar diagnóstico SQL novamente
3. Revisar código das mudanças
4. Reportar erro com detalhes

---

## 📝 Comandos Úteis

### Reexecutar Diagnóstico
```sql
-- No Supabase SQL Editor
-- Copiar e executar: database/scripts/diagnose_profit_loss_nan.sql
```

### Ver Logs em Tempo Real
```javascript
// No Console do DevTools
localStorage.setItem('debug', 'true');
location.reload();
```

### Limpar Cache
```bash
# Ctrl + Shift + R no navegador
# ou
npm run build
```

---

## ⚠️ Notas Importantes

> [!WARNING]
> **Margem Negativa Detectada**
> 
> O diagnóstico mostra margem de **-52.38%**, indicando que os repasses
> são maiores que a receita. Isso precisa ser investigado.

> [!TIP]
> **Logs de Debug**
> 
> O hook inclui logs detalhados. Use o console para verificar
> os valores calculados em cada etapa.

> [!NOTE]
> **Fonte de Dados**
> 
> Agora usando `payment_ledger_entries` (Livro Caixa) como fonte única
> de verdade, garantindo consistência com o Ledger.
