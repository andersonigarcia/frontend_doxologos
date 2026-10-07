// Test Suite Automatizada de Integração: Mercado Pago + Supabase Edge Functions
// Execução: node scripts/test-mercadopago-suite.js

import crypto from 'crypto';

const SUPABASE_URL = 'https://ppwjtvzrhvjinsutrjwk.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwd2p0dnpyaHZqaW5zdXRyandrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mzk3NDYsImV4cCI6MjA3NjUxNTc0Nn0.U8AvVoQU6Dsf_AS38CU9X3nXJUyLpvVMj-BrCOJbcmE';
const MP_WEBHOOK_SECRET = '613d923324197798a654bf078d789e2403bb488380ed857c0f73ec40150cfd46';
const PROD_TOKEN = 'APP_USR-7470233601936090-100620-3b7941c3795a0c4a37d65bcb523ce18b-3532332688';
const TEST_PUBLIC_KEY = 'TEST-e969e117-bcc3-42db-93b7-5db0cac05ab1';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        console.log(`  ✅ [PASS] ${message}`);
        passedTests++;
    } else {
        console.error(`  ❌ [FAIL] ${message}`);
    }
}

async function runSuite() {
    console.log('='.repeat(70));
    console.log('🧪 INICIANDO SUÍTE DE TESTES: MERCADO PAGO INTEGRATION');
    console.log('='.repeat(70));

    // -------------------------------------------------------------
    // Teste 1: Autenticação na API do Mercado Pago (Produção)
    // -------------------------------------------------------------
    console.log('\n[1/5] Testando autenticação na API oficial do Mercado Pago...');
    try {
        const userRes = await fetch('https://api.mercadopago.com/users/me', {
            headers: { Authorization: `Bearer ${PROD_TOKEN}` }
        });
        const userData = await userRes.json();
        assert(userRes.status === 200, `Status HTTP 200 recebido do MP`);
        assert(userData.id === 3532332688, `ID da conta corresponde à Doxologos (3532332688)`);
        assert(userData.identification?.number === '35035127000120', `CNPJ validado: 35035127000120`);
    } catch (e) {
        assert(false, `Falha de conexão com MP: ${e.message}`);
    }

    // -------------------------------------------------------------
    // Teste 2: Criação de Pagamento PIX via Supabase Edge Function
    // -------------------------------------------------------------
    console.log('\n[2/5] Testando criação de PIX via Edge Function (mp-create-payment)...');
    let createdPaymentId = null;
    try {
        const pixPayload = {
            resource_id: 'recurso-qa-suite-check',
            amount: 1.00,
            description: 'Validação Automatizada QA - PIX',
            payer: {
                name: 'Paciente Teste QA',
                email: 'paciente.teste.doxologos@gmail.com'
            }
        };

        const pixRes = await fetch(`${SUPABASE_URL}/functions/v1/mp-create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify(pixPayload)
        });

        const pixData = await pixRes.json();
        assert(pixRes.status === 200, `Edge Function mp-create-payment retornou 200 OK`);
        assert(Boolean(pixData.payment_id), `Payment ID gerado: ${pixData.payment_id}`);
        assert(pixData.status === 'pending', `Status do pagamento é pending`);
        assert(Boolean(pixData.qr_code), `QR Code PIX gerado com sucesso`);
        assert(pixData.qr_code && pixData.qr_code.includes('35035127000120'), `Payload PIX contém a chave CNPJ oficial da Doxologos`);

        createdPaymentId = pixData.payment_id;
    } catch (e) {
        assert(false, `Falha ao criar PIX: ${e.message}`);
    }

    // -------------------------------------------------------------
    // Teste 3: Verificação de Status via mp-check-payment
    // -------------------------------------------------------------
    console.log('\n[3/5] Testando consulta de status via Edge Function (mp-check-payment)...');
    if (createdPaymentId) {
        try {
            const checkRes = await fetch(`${SUPABASE_URL}/functions/v1/mp-check-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ANON_KEY}`
                },
                body: JSON.stringify({ payment_id: createdPaymentId })
            });
            const checkData = await checkRes.json();
            assert(checkRes.status === 200, `mp-check-payment retornou 200 OK`);
            assert(checkData.status === 'pending', `Status consultado confere com o registrado: ${checkData.status}`);

            // Cancelar pagamento de teste para não poluir painel
            await fetch(`https://api.mercadopago.com/v1/payments/${createdPaymentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PROD_TOKEN}`
                },
                body: JSON.stringify({ status: 'cancelled' })
            });
            console.log(`  ℹ️ Pagamento de teste #${createdPaymentId} cancelado preventivamente no MP.`);
        } catch (e) {
            assert(false, `Falha ao consultar status: ${e.message}`);
        }
    } else {
        assert(false, `Pulando mp-check-payment (sem ID de pagamento)`);
    }

    // -------------------------------------------------------------
    // Teste 4: Webhook de Notificação (mp-webhook) com Assinatura HMAC
    // -------------------------------------------------------------
    console.log('\n[4/5] Testando recepção e validação do Webhook (mp-webhook)...');
    try {
        const requestId = 'qa-req-' + Date.now();
        const ts = Math.floor(Date.now() / 1000).toString();
        const fakePaymentId = '999123456';
        
        const webhookBody = JSON.stringify({
            action: 'payment.created',
            api_version: 'v1',
            data: { id: fakePaymentId },
            date_created: new Date().toISOString(),
            id: 888888888,
            live_mode: true,
            type: 'test_notification',
            user_id: 3532332688
        });

        const manifest = `id:${fakePaymentId};request-id:${requestId};ts:${ts};`;
        const hmac = crypto.createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex');
        const xSignature = `ts=${ts},v1=${hmac}`;

        // Chamada real como o Mercado Pago faz: SEM JWT no header
        const hookRes = await fetch(`${SUPABASE_URL}/functions/v1/mp-webhook?data.id=${fakePaymentId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-signature': xSignature,
                'x-request-id': requestId
            },
            body: webhookBody
        });

        const hookText = await hookRes.text();
        assert(hookRes.status === 200, `mp-webhook aceitou a chamada externa do MP com código 200`);
        assert(hookText.includes('Ignored non-payment') || hookRes.status === 200, `Processamento do evento concluído`);

        // Teste de rejeição de assinatura inválida (Segurança Fail-Closed)
        const badHookRes = await fetch(`${SUPABASE_URL}/functions/v1/mp-webhook?data.id=${fakePaymentId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-signature': 'ts=123,v1=invalido_hash_fake',
                'x-request-id': 'req-bad'
            },
            body: webhookBody
        });
        assert(badHookRes.status === 401, `mp-webhook rejeitou requisição com assinatura forjada (401 Unauthorized)`);
    } catch (e) {
        assert(false, `Falha no teste do webhook: ${e.message}`);
    }

    // -------------------------------------------------------------
    // Teste 5: Tokenização de Cartão de Crédito de Teste (Mastercard APRO)
    // -------------------------------------------------------------
    console.log('\n[5/5] Testando tokenização com cartão Mastercard APRO dos dados de teste...');
    try {
        const tokenRes = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${TEST_PUBLIC_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cardNumber: '5480832801033311',
                cardholder: {
                    name: 'APRO Teste',
                    identification: { type: 'CPF', number: '12345678909' }
                },
                securityCode: '123',
                expirationMonth: '11',
                expirationYear: '2030'
            })
        });

        const tokenData = await tokenRes.json();
        assert(tokenRes.status === 201, `Tokenização do cartão de teste retornou 201 Created`);
        assert(Boolean(tokenData.id), `Card Token seguro gerado: ${tokenData.id}`);
    } catch (e) {
        assert(false, `Falha na tokenização do cartão: ${e.message}`);
    }

    // -------------------------------------------------------------
    // Sumário dos Testes
    // -------------------------------------------------------------
    console.log('\n' + '='.repeat(70));
    console.log(`📊 RELATÓRIO FINAL: ${passedTests}/${totalTests} testes aprovados (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('='.repeat(70));
}

runSuite().catch(console.error);
