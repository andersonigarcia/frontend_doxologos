/**
 * Exemplo de Uso do Sistema de Logs - CheckoutPage
 * 
 * Demonstra como integrar o logger em componentes existentes
 */

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

const CheckoutPageExample = () => {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  
  // Timer para medir performance de carregamento
  useEffect(() => {
    const timer = logger.startTimer('CheckoutPage:mount');
    
    logger.info('CheckoutPage mounted', { 
      timestamp: new Date().toISOString() 
    });
    
    // Cleanup
    return () => {
      timer.end();
      logger.debug('CheckoutPage unmounted');
    };
  }, []);
  
  // Exemplo: Processar pagamento com logs detalhados
  const handlePayment = async (formData) => {
    const timer = logger.startTimer('Payment:processing');
    
    try {
      setLoading(true);
      
      // INFO: Evento importante
      logger.info('Payment initiated', {
        method: formData.paymentMethod,
        amount: formData.amount
      });
      
      // DEBUG: Dados detalhados (só aparece em DEBUG level)
      logger.debug('Payment form data', formData);
      
      // Simulação de chamada API
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      // Log de API call
      logger.api('POST', '/api/payments', response.status, {
        orderId: response.data?.orderId
      });
      
      if (!response.ok) {
        throw new Error(`Payment failed: ${response.status}`);
      }
      
      const data = await response.json();
      setPaymentData(data);
      
      // SUCCESS: Operação bem-sucedida
      logger.payment('Payment successful', data.orderId, formData.amount);
      logger.success('Payment processed successfully', {
        orderId: data.orderId,
        transactionId: data.transactionId
      });
      
      // Mede duração
      const duration = timer.end();
      
      // Batch logging para métricas
      logger.batch('Payment Metrics', {
        duration: `${duration.toFixed(2)}ms`,
        method: formData.paymentMethod,
        amount: formData.amount,
        status: 'success'
      });
      
      return data;
      
    } catch (error) {
      // ERROR: Sempre capturado (mesmo em SILENT)
      logger.error('Payment processing failed', error, {
        method: formData.paymentMethod,
        amount: formData.amount,
        step: 'api_call'
      });
      
      // Métricas de erro
      logger.batch('Payment Error Metrics', {
        error: error.message,
        method: formData.paymentMethod,
        timestamp: new Date().toISOString()
      });
      
      throw error;
      
    } finally {
      setLoading(false);
      timer.end();
    }
  };
  
  // Exemplo: Validação de formulário
  const validateForm = (formData) => {
    logger.debug('Validating form data', formData);
    
    const errors = [];
    
    if (!formData.amount || formData.amount <= 0) {
      const error = 'Invalid amount';
      errors.push(error);
      logger.warn('Validation failed: Invalid amount', { 
        amount: formData.amount 
      });
    }
    
    if (!formData.paymentMethod) {
      const error = 'Payment method required';
      errors.push(error);
      logger.warn('Validation failed: Missing payment method');
    }
    
    if (errors.length > 0) {
      logger.info('Form validation failed', { 
        errors,
        fieldCount: Object.keys(formData).length 
      });
      return { valid: false, errors };
    }
    
    logger.debug('Form validation passed');
    return { valid: true, errors: [] };
  };
  
  // Exemplo: Analytics tracking
  const trackUserAction = (action, data = {}) => {
    logger.analytics(`User action: ${action}`, {
      ...data,
      timestamp: Date.now(),
      page: 'checkout'
    });
  };
  
  return (
    <div>
      <h1>Checkout</h1>
      
      <button 
        onClick={() => {
          trackUserAction('clicked_pay_button', { 
            amount: 150 
          });
          
          handlePayment({
            amount: 150,
            paymentMethod: 'pix'
          });
        }}
        disabled={loading}
      >
        {loading ? 'Processando...' : 'Pagar'}
      </button>
    </div>
  );
};

export default CheckoutPageExample;

/**
 * EXEMPLO DE OUTPUT NO CONSOLE
 * 
 * Com LOG_LEVEL = DEBUG:
 * ℹ️ [INFO] CheckoutPage mounted {timestamp: "2025-10-28T..."}
 * 🐛 [DEBUG] Payment form data {amount: 150, paymentMethod: "pix"}
 * ℹ️ [INFO] Payment initiated {method: "pix", amount: 150}
 * ℹ️ [INFO] API POST /api/payments - Status: 200 {orderId: "123"}
 * ℹ️ [INFO] Payment: Payment successful {orderId: "123", amount: 150}
 * ✅ [SUCCESS] Payment processed successfully {orderId: "123", ...}
 * 🐛 [DEBUG] Performance: Payment:processing = 234.56ms
 * 📊 [BATCH] Payment Metrics
 *   duration: 234.56ms
 *   method: pix
 *   amount: 150
 *   status: success
 * 
 * 
 * Com LOG_LEVEL = INFO:
 * ℹ️ [INFO] CheckoutPage mounted {timestamp: "2025-10-28T..."}
 * ℹ️ [INFO] Payment initiated {method: "pix", amount: 150}
 * ℹ️ [INFO] API POST /api/payments - Status: 200 {orderId: "123"}
 * ℹ️ [INFO] Payment: Payment successful {orderId: "123", amount: 150}
 * ✅ [SUCCESS] Payment processed successfully {orderId: "123", ...}
 * 📊 [BATCH] Payment Metrics
 *   duration: 234.56ms
 *   method: pix
 *   amount: 150
 *   status: success
 * 
 * 
 * Com LOG_LEVEL = SILENT:
 * (Nenhum log no console, mas erros vão para o buffer)
 * 
 * 
 * Em caso de erro (SEMPRE loga, mesmo em SILENT):
 * ❌ [ERROR] Payment processing failed {method: "pix", amount: 150, ...}
 * 📊 [BATCH] Payment Error Metrics
 *   error: "Network error"
 *   method: pix
 *   timestamp: 2025-10-28T...
 */

/**
 * COMANDOS ÚTEIS NO CONSOLE
 * 
 * // Ativar debug durante problema em produção
 * window.enableDebugLogs();
 * 
 * // Desativar após resolver
 * window.disableLogs();
 * 
 * // Ver logs capturados
 * window.viewLogs();
 * 
 * // Baixar logs para análise
 * window.downloadLogs();
 * 
 * // Ver configuração atual
 * window.__DOXOLOGOS_LOGGER__.getInfo();
 */
