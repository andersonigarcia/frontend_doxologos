/**
 * Script de Teste da Integração Zoom
 * Execute no Console do Navegador (F12) para diagnosticar problemas
 */

// Copie e cole este código no Console do navegador para testar

console.log('🧪 === TESTE DE INTEGRAÇÃO ZOOM ===');
console.log('');

// 1. Verificar variáveis de ambiente
console.log('📋 1. Verificando variáveis de ambiente:');
const clientId = import.meta.env.VITE_ZOOM_CLIENT_ID;
const clientSecret = import.meta.env.VITE_ZOOM_CLIENT_SECRET;
const accountId = import.meta.env.VITE_ZOOM_ACCOUNT_ID;

console.log('   VITE_ZOOM_CLIENT_ID:', clientId ? '✅ Configurado' : '❌ NÃO configurado');
console.log('   VITE_ZOOM_CLIENT_SECRET:', clientSecret ? '✅ Configurado' : '❌ NÃO configurado');
console.log('   VITE_ZOOM_ACCOUNT_ID:', accountId ? '✅ Configurado' : '❌ NÃO configurado');
console.log('');

if (accountId) {
    console.log('   📝 Account ID:', accountId);
    console.log('   📏 Tamanho:', accountId.length, 'caracteres');
}
console.log('');

// 2. Testar autenticação
console.log('🔑 2. Testando autenticação:');

async function testZoomAuth() {
    try {
        if (!clientId || !clientSecret || !accountId) {
            console.error('❌ Credenciais incompletas!');
            return;
        }

        const credentials = btoa(`${clientId}:${clientSecret}`);
        const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
        
        console.log('   📡 Fazendo request para Zoom...');
        
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log('   📥 Status da resposta:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('   ❌ Erro:', errorText);
            
            // Tentar parsear JSON de erro
            try {
                const errorJson = JSON.parse(errorText);
                console.error('   💬 Mensagem de erro:', errorJson.message || errorJson.reason);
            } catch (e) {
                console.error('   💬 Resposta:', errorText);
            }
            return;
        }

        const data = await response.json();
        console.log('   ✅ Token obtido com sucesso!');
        console.log('   ⏱️ Expira em:', data.expires_in, 'segundos');
        console.log('   🔑 Token (primeiros 20 chars):', data.access_token.substring(0, 20) + '...');
        console.log('');
        console.log('✅ INTEGRAÇÃO ZOOM FUNCIONANDO!');
        return data;
        
    } catch (error) {
        console.error('   ❌ Erro na requisição:', error.message);
        console.error('   📋 Stack:', error.stack);
    }
}

// Executar teste
testZoomAuth();
