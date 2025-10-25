#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupGA4() {
  console.log('\n🎯 Configuração Automática Google Analytics 4 - Doxologos\n');
  
  try {
    // Obter Measurement ID
    const measurementId = await question('Digite seu GA4 Measurement ID (G-XXXXXXXXXX): ');
    
    if (!measurementId || !measurementId.startsWith('G-')) {
      throw new Error('Measurement ID inválido. Deve começar com "G-"');
    }

    // Obter ambiente
    const environment = await question('Ambiente (development/production) [development]: ') || 'development';
    
    // Configurações de monitoramento
    const enableAnalytics = await question('Ativar Analytics? (y/n) [y]: ') || 'y';
    const enablePerformance = await question('Ativar monitoramento de performance? (y/n) [y]: ') || 'y';
    const enableErrorTracking = await question('Ativar tracking de erros? (y/n) [y]: ') || 'y';

    // Criar arquivo de configuração
    const envConfig = `# Google Analytics 4 - Configuração Automática
# Gerado em: ${new Date().toISOString()}

# Google Analytics
VITE_GA_MEASUREMENT_ID=${measurementId}
VITE_ENABLE_ANALYTICS=${enableAnalytics.toLowerCase() === 'y' ? 'true' : 'false'}
VITE_ENVIRONMENT=${environment}

# Performance Monitoring
VITE_ENABLE_PERFORMANCE_MONITORING=${enablePerformance.toLowerCase() === 'y' ? 'true' : 'false'}
VITE_ERROR_TRACKING_ENABLED=${enableErrorTracking.toLowerCase() === 'y' ? 'true' : 'false'}

# Configurações Específicas do Ambiente
${environment === 'production' ? `
# Produção - Configurações Otimizadas
VITE_DEBUG_MODE=false
VITE_PERFORMANCE_BUDGET=true
VITE_CRITICAL_ALERTS=true
` : `
# Desenvolvimento - Configurações Debug
VITE_DEBUG_MODE=true
VITE_CONSOLE_TRACKING=true
VITE_VERBOSE_LOGGING=true
`}`;

    // Determinar caminho do arquivo
    const configPath = environment === 'production' 
      ? path.join(__dirname, '..', '.env.production')
      : path.join(__dirname, '..', 'config', 'local.env');

    // Verificar se diretório config existe
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log(`📁 Criado diretório: ${configDir}`);
    }

    // Salvar configuração
    fs.writeFileSync(configPath, envConfig);
    console.log(`✅ Configuração salva em: ${configPath}`);

    // Criar arquivo de validação GA4
    const validationScript = `// Validação Automática GA4 - Doxologos
// Adicione este código no console do navegador para testar

console.log('🎯 Testando Configuração GA4...');

// 1. Verificar se gtag está carregado
if (typeof gtag !== 'undefined') {
  console.log('✅ gtag carregado com sucesso');
  
  // 2. Testar evento personalizado
  gtag('event', 'ga4_config_test', {
    event_category: 'Setup',
    event_label: 'Configuration Test',
    custom_parameter_1: '${measurementId}',
    custom_parameter_2: '${environment}'
  });
  
  console.log('✅ Evento de teste enviado');
  
  // 3. Verificar Web Vitals
  if (typeof webVitalsMonitor !== 'undefined') {
    console.log('✅ Web Vitals Monitor ativo');
    console.log('📊 Snapshot atual:', webVitalsMonitor.getVitalsSnapshot());
  }
  
  // 4. Verificar Error Tracking
  if (typeof analytics !== 'undefined') {
    console.log('✅ Analytics Manager carregado');
    
    // Testar error tracking
    analytics.trackEvent('setup_validation', {
      event_category: 'Configuration',
      event_label: 'Setup Complete',
      value: 1
    });
  }
  
  console.log('🎉 Configuração GA4 funcionando corretamente!');
  console.log('📈 Verifique o Real-Time no Google Analytics');
  
} else {
  console.error('❌ gtag não encontrado - verifique a configuração');
}`;

    const validationPath = path.join(__dirname, '..', 'ga4-validation.js');
    fs.writeFileSync(validationPath, validationScript);
    console.log(`🧪 Script de validação criado: ${validationPath}`);

    // Criar comando de build personalizado
    const buildScript = `#!/bin/bash
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
echo "  3. Configurar alertas no Google Analytics"`;

    const buildScriptPath = path.join(__dirname, '..', 'scripts', 'build-production.sh');
    const scriptsDir = path.dirname(buildScriptPath);
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    fs.writeFileSync(buildScriptPath, buildScript);
    fs.chmodSync(buildScriptPath, '755'); // Tornar executável
    console.log(`🔧 Script de build criado: ${buildScriptPath}`);

    // Atualizar package.json com novos scripts
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      packageJson.scripts = {
        ...packageJson.scripts,
        'ga4:validate': 'node ga4-validation.js',
        'build:production': './scripts/build-production.sh',
        'deploy:vercel': 'vercel --prod',
        'deploy:netlify': 'netlify deploy --prod',
        'analyze:bundle': 'npx vite-bundle-analyzer dist/assets/*.js',
        'test:performance': 'lighthouse http://localhost:4173 --view'
      };
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('📦 Scripts adicionados ao package.json');
    }

    console.log('\n🎉 Configuração concluída com sucesso!\n');
    console.log('📋 Próximos passos:');
    console.log('1. Execute: npm run dev');
    console.log('2. Abra o console do navegador');
    console.log('3. Cole o conteúdo de ga4-validation.js');
    console.log('4. Verifique o Real-Time no Google Analytics');
    console.log('5. Execute: npm run build:production para deploy\n');
    
    // Gerar relatório de configuração
    const report = {
      timestamp: new Date().toISOString(),
      measurementId,
      environment,
      features: {
        analytics: enableAnalytics.toLowerCase() === 'y',
        performance: enablePerformance.toLowerCase() === 'y',
        errorTracking: enableErrorTracking.toLowerCase() === 'y'
      },
      files: {
        config: configPath,
        validation: validationPath,
        buildScript: buildScriptPath
      }
    };

    fs.writeFileSync(
      path.join(__dirname, '..', 'ga4-setup-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('📄 Relatório de configuração salvo em: ga4-setup-report.json');

  } catch (error) {
    console.error('❌ Erro durante configuração:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Função para verificar dependências
function checkDependencies() {
  const requiredDirs = ['src/lib', 'src/hooks', 'src/components'];
  const requiredFiles = [
    'src/lib/analytics.js',
    'src/hooks/useAnalytics.js',
    'src/hooks/useErrorTracking.js'
  ];

  console.log('🔍 Verificando dependências...');

  for (const dir of requiredDirs) {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      console.error(`❌ Diretório não encontrado: ${dir}`);
      return false;
    }
  }

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Arquivo não encontrado: ${file}`);
      return false;
    }
  }

  console.log('✅ Todas as dependências encontradas');
  return true;
}

// Executar configuração
if (checkDependencies()) {
  setupGA4();
} else {
  console.error('❌ Dependências não encontradas. Verifique se o sistema de analytics foi instalado corretamente.');
  process.exit(1);
}