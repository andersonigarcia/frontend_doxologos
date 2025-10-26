// Validação Automática GA4 - Doxologos
// Adicione este código no console do navegador para testar

console.log('🎯 Testando Configuração GA4...');

// 1. Verificar se gtag está carregado
if (typeof gtag !== 'undefined') {
  console.log('✅ gtag carregado com sucesso');
  
  // 2. Testar evento personalizado
  gtag('event', 'ga4_config_test', {
    event_category: 'Setup',
    event_label: 'Configuration Test',
    custom_parameter_1: 'G-FSXFYQVCEC',
    custom_parameter_2: 'production'
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
}