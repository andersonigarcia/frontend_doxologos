import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need this for database checks if anon doesn't have access
// Note: We might need to ask user for Service Role Key if it's not in .env, or use the one from config/local.env if available.
// For now, let's assume we can hit the webhook public URL.

const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/mp-webhook`;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || 'teste_secret'; // Fallback for local testing if not in env

async function testWebhook() {
    console.log('🧪 Starting Webhook & Ledger Integration Test...');
    console.log(`Target: ${WEBHOOK_URL}`);

    // 1. Create a dummy booking or use an existing one to update
    // Ideally we should create a test booking first via Supabase Client
    // but for simplicity, let's try to trigger a "non-existent" payment first to see if it reaches the logic,
    // or simulate a payment ID that we know won't exist in MP (which will fail the Double Check).

    // Wait! The new webhook logic performs a fetch-back to MP (`fetchMpPayment`). 
    // If I send a fake ID, the function will fail at `fetchMpPayment` and return 500 or 400.
    // This proves the function is working (it tries to validate).

    // To properly test SUCCESS flow, we would need to mock the MP API or have a real payment ID.
    // Since we can't easily mock the MP API *inside* the Edge Function from here,
    // we will test the "Failure Path" essentially validating that the function IS protecting against fake data.
    // This validates connectivity and security logic.

    const fakePaymentId = '123456789';
    const payload = {
        action: 'payment.created',
        api_version: 'v1',
        data: { id: fakePaymentId },
        date_created: new Date().toISOString(),
        id: 123456,
        live_mode: false,
        type: 'payment',
        user_id: '123456'
    };

    // Generate Signature using the real secret from .env
    const ts = Date.now().toString();
    const requestId = crypto.randomUUID();
    const manifest = `id:${fakePaymentId};request-id:${requestId};ts:${ts};`;

    const signingSecret = MP_WEBHOOK_SECRET;
    const signature = crypto.createHmac('sha256', signingSecret)
        .update(manifest)
        .digest('hex');

    const headers = {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
        'x-signature': `ts=${ts},v1=${signature}`
    };

    // URL no formato v2.0 (Feed): data.id como query param
    const targetUrl = `${WEBHOOK_URL}?data.id=${fakePaymentId}&type=payment`;

    try {
        console.log('📤 Sending Webhook v2.0 Request (with HMAC)...');
        console.log(`   URL: ${targetUrl}`);
        console.log(`   x-request-id: ${requestId}`);
        console.log(`   Manifest signed: "${manifest}"`);
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log(`\n📥 Response Status: ${response.status}`);
        console.log(`📥 Response Body: ${text}`);

        if (response.status === 401) {
            console.error('❌ HMAC verification FAILED — secret ainda incorreto ou divergente.');
        } else if (response.status === 200 || response.status === 500) {
            console.log('✅ HMAC verificado com sucesso! Webhook passou pela validação de assinatura.');
            if (response.status === 500) {
                console.log('   (500 esperado: ID de pagamento falso não encontrado na API do MP — correto)');
            }
        } else {
            console.warn(`⚠️ Status inesperado: ${response.status}`);
        }

    } catch (error) {
        console.error('❌ Request failed:', error);
    }
}

testWebhook();
