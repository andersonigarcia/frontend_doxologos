#!/usr/bin/env node

/**
 * Script de Deploy Automatizado com Verificações de Analytics
 * Doxologos - Sistema de Monitoramento
 */

import fs from 'fs';
import path from 'path';
import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

class DeployManager {
  constructor() {
    this.environment = process.env.NODE_ENV || 'production';
    this.deployPlatform = process.env.DEPLOY_PLATFORM || 'vercel';
    this.checksPassed = [];
    this.checksErrors = [];
  }

  async run() {
    console.log('🚀 Iniciando Deploy Automatizado - Doxologos\n');
    
    try {
      await this.preDeployChecks();
      await this.buildApplication();
      await this.runTests();
      await this.performanceBudgetCheck();
      await this.deployApplication();
      await this.postDeployValidation();
      await this.notifySuccess();
    } catch (error) {
      console.error('❌ Deploy falhou:', error.message);
      await this.notifyFailure(error);
      process.exit(1);
    }
  }

  async preDeployChecks() {
    console.log('🔍 Executando verificações pre-deploy...\n');

    // 1. Verificar variáveis de ambiente
    await this.checkEnvironmentVariables();
    
    // 2. Verificar configuração GA4
    await this.checkGA4Configuration();
    
    // 3. Verificar dependências
    await this.checkDependencies();
    
    // 4. Verificar arquivos essenciais
    await this.checkEssentialFiles();

    console.log('✅ Verificações pre-deploy concluídas\n');
  }

  async checkEnvironmentVariables() {
    console.log('📋 Verificando variáveis de ambiente...');
    
    const requiredVars = [
      'VITE_GA_MEASUREMENT_ID',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];

    const productionVars = [
      'VITE_ENABLE_ANALYTICS',
      'VITE_ENABLE_PERFORMANCE_MONITORING',
      'VITE_ERROR_TRACKING_ENABLED'
    ];

    const allVars = [...requiredVars, ...(this.environment === 'production' ? productionVars : [])];
    const missing = [];

    for (const varName of allVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    if (missing.length > 0) {
      throw new Error(`Variáveis de ambiente faltando: ${missing.join(', ')}`);
    }

    // Validar formato do GA4 Measurement ID
    const gaId = process.env.VITE_GA_MEASUREMENT_ID;
    if (gaId && !gaId.startsWith('G-')) {
      throw new Error('VITE_GA_MEASUREMENT_ID deve começar com "G-"');
    }

    console.log('  ✅ Todas as variáveis de ambiente configuradas');
    this.checksPassed.push('Environment Variables');
  }

  async checkGA4Configuration() {
    console.log('📊 Verificando configuração Google Analytics...');

    // Verificar se arquivos de analytics existem
    const analyticsFiles = [
      'src/lib/analytics.js',
      'src/hooks/useAnalytics.js',
      'src/lib/webVitals.js'
    ];

    for (const file of analyticsFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo de analytics não encontrado: ${file}`);
      }
    }

    // Verificar se gtag está configurado no index.html
    const indexPath = path.join(__dirname, '..', 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    if (!indexContent.includes('gtag')) {
      throw new Error('Script do Google Analytics não encontrado no index.html');
    }

    console.log('  ✅ Configuração GA4 validada');
    this.checksPassed.push('GA4 Configuration');
  }

  async checkDependencies() {
    console.log('📦 Verificando dependências...');
    
    return new Promise((resolve, reject) => {
      exec('npm audit --audit-level moderate', (error, stdout, stderr) => {
        if (error && error.code > 0) {
          // Apenas falhar se houver vulnerabilidades críticas
          if (stdout.includes('high') || stdout.includes('critical')) {
            reject(new Error('Vulnerabilidades críticas encontradas. Execute npm audit fix'));
          }
        }
        
        console.log('  ✅ Dependências verificadas');
        this.checksPassed.push('Dependencies');
        resolve();
      });
    });
  }

  async checkEssentialFiles() {
    console.log('📁 Verificando arquivos essenciais...');
    
    const essentialFiles = [
      'package.json',
      'vite.config.js',
      'src/App.jsx',
      'src/main.jsx',
      'index.html'
    ];

    for (const file of essentialFiles) {
      const filePath = path.join(__dirname, '..', file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo essencial não encontrado: ${file}`);
      }
    }

    console.log('  ✅ Todos os arquivos essenciais presentes');
    this.checksPassed.push('Essential Files');
  }

  async buildApplication() {
    console.log('🔨 Construindo aplicação...\n');
    
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Build concluído com sucesso');
          this.checksPassed.push('Build');
          resolve();
        } else {
          reject(new Error(`Build falhou com código ${code}`));
        }
      });
    });
  }

  async runTests() {
    console.log('🧪 Executando testes...\n');
    
    // Se não houver testes configurados, pular esta etapa
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    
    if (!packageJson.scripts.test) {
      console.log('⚠️  Nenhum teste configurado, pulando...');
      return;
    }

    return new Promise((resolve, reject) => {
      const testProcess = spawn('npm', ['test', '--', '--run'], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Todos os testes passaram');
          this.checksPassed.push('Tests');
          resolve();
        } else {
          // Em desenvolvimento, testes podem ser opcionais
          if (this.environment !== 'production') {
            console.log('\n⚠️  Alguns testes falharam, mas continuando (não-produção)');
            this.checksErrors.push('Tests failed (non-blocking)');
            resolve();
          } else {
            reject(new Error(`Testes falharam com código ${code}`));
          }
        }
      });
    });
  }

  async performanceBudgetCheck() {
    console.log('⚡ Verificando orçamento de performance...\n');
    
    const distPath = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distPath)) {
      throw new Error('Diretório dist não encontrado. Execute o build primeiro.');
    }

    // Verificar tamanho dos arquivos JavaScript
    const jsFiles = this.getFilesByExtension(distPath, '.js');
    const totalJSSize = jsFiles.reduce((total, file) => {
      return total + fs.statSync(file).size;
    }, 0);

    const jsbudgetMB = 1; // 1MB budget para JS
    const totalJSMB = totalJSSize / (1024 * 1024);

    if (totalJSMB > jsbudgetMB) {
      console.log(`⚠️  Bundle JS excede orçamento: ${totalJSMB.toFixed(2)}MB (limite: ${jsbudgetMB}MB)`);
      this.checksErrors.push(`JS Bundle size: ${totalJSMB.toFixed(2)}MB`);
    } else {
      console.log(`✅ Bundle JS dentro do orçamento: ${totalJSMB.toFixed(2)}MB`);
    }

    // Verificar arquivos de imagem
    const imageFiles = this.getFilesByExtension(distPath, ['.jpg', '.jpeg', '.png', '.webp', '.svg']);
    const totalImageSize = imageFiles.reduce((total, file) => {
      return total + fs.statSync(file).size;
    }, 0);

    const imageBudgetMB = 2; // 2MB budget para imagens
    const totalImageMB = totalImageSize / (1024 * 1024);

    if (totalImageMB > imageBudgetMB) {
      console.log(`⚠️  Imagens excedem orçamento: ${totalImageMB.toFixed(2)}MB (limite: ${imageBudgetMB}MB)`);
      this.checksErrors.push(`Images size: ${totalImageMB.toFixed(2)}MB`);
    } else {
      console.log(`✅ Imagens dentro do orçamento: ${totalImageMB.toFixed(2)}MB`);
    }

    this.checksPassed.push('Performance Budget');
    console.log('');
  }

  getFilesByExtension(dir, extensions) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    const exts = Array.isArray(extensions) ? extensions : [extensions];
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getFilesByExtension(fullPath, extensions));
      } else if (exts.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async deployApplication() {
    console.log(`🚀 Fazendo deploy para ${this.deployPlatform}...\n`);
    
    const deployCommands = {
      vercel: ['vercel', '--prod'],
      netlify: ['netlify', 'deploy', '--prod'],
      'github-pages': ['npm', 'run', 'deploy:gh-pages'],
      surge: ['surge', 'dist', 'doxologos.surge.sh']
    };

    const command = deployCommands[this.deployPlatform];
    if (!command) {
      throw new Error(`Plataforma de deploy não suportada: ${this.deployPlatform}`);
    }

    return new Promise((resolve, reject) => {
      const deployProcess = spawn(command[0], command.slice(1), {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });

      deployProcess.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Deploy concluído com sucesso');
          this.checksPassed.push('Deploy');
          resolve();
        } else {
          reject(new Error(`Deploy falhou com código ${code}`));
        }
      });
    });
  }

  async postDeployValidation() {
    console.log('🔍 Validação pós-deploy...\n');
    
    // Aguardar alguns segundos para o deploy propagar
    await this.sleep(10000);
    
    const siteUrl = await this.getSiteUrl();
    if (!siteUrl) {
      console.log('⚠️  URL do site não disponível, pulando validação');
      return;
    }

    console.log(`🌐 Testando site: ${siteUrl}`);
    
    // Verificar se o site responde
    await this.checkSiteResponse(siteUrl);
    
    // Verificar se GA4 está funcionando
    await this.checkGA4Tracking(siteUrl);
    
    console.log('✅ Validação pós-deploy concluída\n');
    this.checksPassed.push('Post-Deploy Validation');
  }

  async getSiteUrl() {
    // Tentar obter URL do deployment
    // Isso varia conforme a plataforma
    if (this.deployPlatform === 'vercel') {
      // Vercel geralmente mostra a URL no output
      return process.env.VERCEL_URL || 'https://doxologos.vercel.app';
    }
    
    return process.env.SITE_URL || null;
  }

  async checkSiteResponse(url) {
    try {
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(url, { timeout: 10000 });
      
      if (response.ok) {
        console.log('  ✅ Site respondendo corretamente');
      } else {
        throw new Error(`Site retornou status ${response.status}`);
      }
    } catch (error) {
      console.log(`  ⚠️  Erro ao verificar site: ${error.message}`);
      this.checksErrors.push(`Site check failed: ${error.message}`);
    }
  }

  async checkGA4Tracking(url) {
    console.log('  📊 Verificando tracking GA4...');
    
    // Em um cenário real, você poderia usar ferramentas como Puppeteer
    // para verificar se o tracking está funcionando
    
    try {
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(url);
      const html = await response.text();
      
      if (html.includes('gtag') && html.includes(process.env.VITE_GA_MEASUREMENT_ID)) {
        console.log('  ✅ Scripts de tracking encontrados');
      } else {
        throw new Error('Scripts de tracking não encontrados no HTML');
      }
    } catch (error) {
      console.log(`  ⚠️  Erro ao verificar tracking: ${error.message}`);
      this.checksErrors.push(`GA4 check failed: ${error.message}`);
    }
  }

  async notifySuccess() {
    console.log('\n🎉 Deploy concluído com sucesso!\n');
    
    console.log('📋 Resumo das verificações:');
    this.checksPassed.forEach(check => {
      console.log(`  ✅ ${check}`);
    });
    
    if (this.checksErrors.length > 0) {
      console.log('\n⚠️  Avisos:');
      this.checksErrors.forEach(error => {
        console.log(`  ⚠️  ${error}`);
      });
    }

    console.log('\n📈 Próximos passos:');
    console.log('1. Verificar Google Analytics Real-Time');
    console.log('2. Testar funcionalidades principais');
    console.log('3. Monitorar Web Vitals');
    console.log('4. Configurar alertas de monitoramento');

    // Salvar relatório de deploy
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      platform: this.deployPlatform,
      checksPassed: this.checksPassed,
      checksErrors: this.checksErrors,
      siteUrl: await this.getSiteUrl()
    };

    fs.writeFileSync(
      path.join(__dirname, '..', 'deploy-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📄 Relatório salvo em: deploy-report.json');
  }

  async notifyFailure(error) {
    console.log('\n❌ Deploy falhou!\n');
    console.log('Erro:', error.message);
    
    if (this.checksPassed.length > 0) {
      console.log('\n✅ Verificações que passaram:');
      this.checksPassed.forEach(check => {
        console.log(`  ✅ ${check}`);
      });
    }

    console.log('\n🔧 Sugestões de correção:');
    console.log('1. Verifique os logs acima para erros específicos');
    console.log('2. Confirme que todas as variáveis de ambiente estão configuradas');
    console.log('3. Execute npm run build localmente para testar');
    console.log('4. Verifique se o GA4 Measurement ID está correto');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const deployManager = new DeployManager();
  deployManager.run().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}

export default DeployManager;