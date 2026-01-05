# 🔒 Solução: Erro SSL no Mercado Pago Local

## ❌ Erro Atual

```
Your payment cannot be processed because the website contains credit card data 
and is not using a secure connection. SSL certificate is required to operate.
```

---

## 🎯 Por que acontece?

O Mercado Pago SDK **exige HTTPS** para tokenizar cartões (padrão PCI-DSS de segurança). 

- ❌ `http://localhost:3000` → **Não funciona**
- ✅ `https://localhost:3000` → **Funciona**
- ✅ `https://seu-dominio.com` → **Funciona**

---

## ✅ SOLUÇÕES

### **Opção 1: Deploy em Produção (RECOMENDADO)** 🚀

O código está pronto. Basta fazer deploy:

```bash
# Deploy para produção (Hostinger/Vercel/Netlify)
npm run build
# Upload da pasta dist/ para seu servidor HTTPS
```

**Vantagem**: Funciona imediatamente, ambiente real  
**Quando usar**: Quando estiver pronto para testar com usuários reais

---

### **Opção 2: HTTPS Local com mkcert** 🔐

Instalar certificado SSL local confiável:

#### Windows (PowerShell como Administrador):

```powershell
# 1. Instalar Chocolatey (se não tiver)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 2. Instalar mkcert
choco install mkcert

# 3. Criar certificado local
mkcert -install
cd C:\Users\ander\source\repos\frontend_doxologos
mkcert localhost 127.0.0.1 ::1

# 4. Arquivos gerados:
# localhost+2.pem (certificado)
# localhost+2-key.pem (chave privada)
```

#### Atualizar vite.config.js:

```javascript
import fs from 'fs';

export default defineConfig({
  server: {
    https: {
      key: fs.readFileSync('./localhost+2-key.pem'),
      cert: fs.readFileSync('./localhost+2.pem'),
    },
    host: '::',
    port: 3000
  },
  // ... resto da config
});
```

#### Rodar dev server:

```bash
npm run dev
# Acesse: https://localhost:3000
```

**Vantagem**: Ambiente local idêntico à produção  
**Desvantagem**: Requer instalação de ferramentas

---

### **Opção 3: Usar Túnel HTTPS (ngrok/Cloudflare)** 🌐

Expor localhost via túnel HTTPS:

#### Usando Cloudflare Tunnel (Grátis):

```powershell
# 1. Instalar cloudflared
# Download: https://github.com/cloudflare/cloudflared/releases

# 2. Rodar túnel
cloudflared tunnel --url http://localhost:3000
```

Você receberá uma URL tipo: `https://xyz123.trycloudflare.com`

#### Usando ngrok (Grátis):

```powershell
# 1. Instalar ngrok
choco install ngrok

# 2. Criar túnel
ngrok http 3000
```

Você receberá uma URL tipo: `https://abc123.ngrok.io`

**Vantagem**: Rápido, sem instalação de certificados  
**Desvantagem**: URL muda toda vez, precisa atualizar no código

---

### **Opção 4: Modo de Teste Simplificado** 🧪

**TEMPORÁRIO**: Para teste rápido, podemos simular o fluxo sem SDK:

```javascript
// CheckoutDirectPage.jsx - APENAS PARA TESTE
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // BYPASS temporário do SDK (apenas para teste local)
  if (window.location.protocol === 'http:') {
    console.warn('⚠️ Modo de teste sem SSL - simulando token');
    
    // Simular token (não envia dados reais do cartão)
    const mockToken = {
      id: 'test_token_' + Date.now(),
      status: 'active'
    };
    
    // Processar pagamento com token simulado
    const result = await MercadoPagoService.processCardPayment({
      token: mockToken.id,
      amount: total,
      installments,
      description,
      payer: {
        email: booking?.patient_email || inscricao?.patient_email,
        identification: {
          type: docType,
          number: docNumber.replace(/\D/g, '')
        }
      },
      booking_id: bookingId,
      inscricao_id: inscricaoId
    });
    
    // ... resto do código
    return;
  }
  
  // Fluxo normal com SDK (HTTPS)
  // ... código existente
};
```

⚠️ **ATENÇÃO**: Esta opção **NÃO processa pagamentos reais**. Use apenas para testar o fluxo da aplicação.

---

## 🎯 RECOMENDAÇÃO

Para seu caso, sugiro:

### **AGORA (Desenvolvimento)**:
✅ **Opção 3** - Cloudflare Tunnel  
- Rápido (2 minutos)
- Sem instalação complexa
- HTTPS real
- Testa SDK completo

```powershell
# 1. Download cloudflared.exe
# https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe

# 2. Renomear para cloudflared.exe e mover para pasta do projeto

# 3. Rodar túnel
./cloudflared tunnel --url http://localhost:3000

# 4. Copiar URL HTTPS gerada
# 5. Acessar a URL no navegador
```

### **DEPOIS (Produção)**:
✅ **Opção 1** - Deploy HTTPS  
- Ambiente real
- Performance otimizada
- URL definitiva

---

## 🔧 Script Rápido para Cloudflare Tunnel

Crie arquivo `start-https-tunnel.ps1`:

```powershell
# Download cloudflared se não existir
if (-not (Test-Path "./cloudflared.exe")) {
    Write-Host "📥 Baixando cloudflared..."
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "./cloudflared.exe"
}

# Iniciar dev server em segundo plano
Write-Host "🚀 Iniciando dev server..."
Start-Process -NoNewWindow npm -ArgumentList "run", "dev"

# Aguardar dev server iniciar
Start-Sleep -Seconds 5

# Iniciar túnel
Write-Host "🌐 Criando túnel HTTPS..."
Write-Host "✅ Seu site estará disponível em HTTPS em alguns segundos..."
./cloudflared tunnel --url http://localhost:3000
```

Execute:
```powershell
powershell -ExecutionPolicy Bypass -File start-https-tunnel.ps1
```

---

## ✅ Verificar se Funcionou

Após acessar via HTTPS, abra o console do browser (F12):

```javascript
// Deve aparecer:
✅ Mercado Pago SDK inicializado

// Ao clicar em "Finalizar Pagamento":
🔵 Criando token do cartão...
✅ Token criado: tok_xxxxx
📤 Enviando para Edge Function...
✅ Pagamento processado!
```

Se aparecer esses logs, **está funcionando!** 🎉

---

## 📊 Comparação das Opções

| Opção | Tempo Setup | Complexidade | Testa SDK Real | Produção |
|-------|-------------|--------------|----------------|----------|
| Deploy Produção | 10 min | Baixa | ✅ Sim | ✅ Sim |
| mkcert | 15 min | Média | ✅ Sim | ❌ Não |
| Cloudflare Tunnel | 2 min | Baixa | ✅ Sim | ❌ Não |
| ngrok | 2 min | Baixa | ✅ Sim | ❌ Não |
| Mock Token | 1 min | Baixa | ❌ Não | ❌ Não |

---

## 🎯 Próximo Passo

**Escolha uma opção acima e me avise qual prefere que eu te ajudo a implementar!**

Minha recomendação: **Cloudflare Tunnel** (mais rápido) ou **Deploy** (mais definitivo)

---

**Última atualização**: 28/01/2025
