#!/bin/bash
# Build Script Otimizado para Produção com GA4

echo "🚀 Iniciando build de produção..."

# Verificar variáveis de ambiente
if [ -z "$VITE_GA_MEASUREMENT_ID" ]; then
  echo "❌ VITE_GA_MEASUREMENT_ID não configurado"
  exit 1
fi

echo "✅ GA4 Measurement ID: $VITE_GA_MEASUREMENT_ID"

# Build otimizado
echo "📦 Gerando build..."
npm run build

# Verificar tamanho do bundle
echo "📊 Analisando bundle size..."
npx vite-bundle-analyzer dist/assets/*.js --mode production

# Gerar relatório de performance
echo "⚡ Gerando relatório de performance..."
npx lighthouse http://localhost:4173 --output=json --output-path=./lighthouse-report.json --no-error-on-failed-assert || true

echo "🎉 Build concluído com sucesso!"
echo "📈 Próximos passos:"
echo "  1. Fazer deploy em produção"
echo "  2. Testar GA4 no site real"
echo "  3. Configurar alertas no Google Analytics"