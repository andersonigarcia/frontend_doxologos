// Test script for PIX payment Edge Functions
// Run: node test-pix-payment.js

const SUPABASE_URL = 'https://ppwjtvzrhvjinsutrjwk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwd2p0dnpyaHZqaW5zdXRyandrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5Mzk3NDYsImV4cCI6MjA3NjUxNTc0Nn0.U8AvVoQU6Dsf_AS38CU9X3nXJUyLpvVMj-BrCOJbcmE';

async function testCreatePixPayment() {
    console.log('🧪 Testando criação de pagamento PIX...\n');

    const payload = {
        booking_id: '7c9f572a-4309-4b03-b328-c647865e1e3f', // Booking real para teste
        amount: 10.50, // R$ 10,50 para teste
        description: 'Teste de Pagamento PIX',
        payer: {
            name: 'João Silva Teste',
            email: 'teste@example.com'
        }
    };

    console.log('📤 Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/mp-create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(payload)
        });

        console.log('\n📊 Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro:', errorText);
            return null;
        }

        const result = await response.json();
        console.log('✅ Resposta:', JSON.stringify(result, null, 2));

        if (result.qr_code) {
            console.log('\n✅ QR Code gerado com sucesso!');
            console.log('🔑 Payment ID:', result.payment_id);
            console.log('📝 QR Code (primeiros 50 chars):', result.qr_code.substring(0, 50) + '...');
        }

        return result;
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        return null;
    }
}

async function testCheckPaymentStatus(paymentId) {
    console.log('\n\n🧪 Testando verificação de status...\n');

    const payload = { payment_id: paymentId };

    console.log('📤 Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/mp-check-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(payload)
        });

        console.log('\n📊 Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro:', errorText);
            return;
        }

        const result = await response.json();
        console.log('✅ Resposta:', JSON.stringify(result, null, 2));

        if (result.status) {
            console.log('\n✅ Status do pagamento:', result.status);
        }
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
    }
}

async function runTests() {
    console.log('🚀 Iniciando testes das Edge Functions de PIX...\n');
    console.log('=' .repeat(60));

    // Teste 1: Criar pagamento PIX
    const paymentResult = await testCreatePixPayment();

    if (paymentResult && paymentResult.payment_id) {
        // Teste 2: Verificar status do pagamento
        await testCheckPaymentStatus(paymentResult.payment_id);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Testes concluídos!\n');
}

// Executar testes
runTests().catch(console.error);
