# 🎯 Proposta de Melhorias - Sistema de Eventos com Zoom

**Data:** 29/10/2025  
**Objetivo:** Integração completa entre eventos, Zoom e pagamentos com segurança e controle de acesso

---

## 📊 Situação Atual

### ✅ O que já existe:
- ✅ Tabela `eventos` com campo `valor` (gratuito/pago)
- ✅ Tabela `inscricoes_eventos` com campo `valor_pago`
- ✅ Sistema de pagamento via Mercado Pago PIX
- ✅ Integração Zoom funcionando para agendamentos (bookings)
- ✅ Edge Function `create-zoom-meeting` configurada
- ✅ Sistema de email via SendGrid

### ❌ O que falta:
- ❌ Criar sala Zoom automaticamente para cada evento
- ❌ Enviar link Zoom por email após inscrição (gratuito) ou pagamento (pago)
- ❌ Controlar acesso à sala (apenas inscritos pagos)
- ❌ Validar limite de participantes em eventos pagos
- ❌ Status de pagamento vinculado à inscrição

---

## 🎨 Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE EVENTOS                          │
└─────────────────────────────────────────────────────────────┘

1. ADMIN CRIA EVENTO
   ├─ Define: título, data, hora, descrição, valor, vagas
   ├─ Sistema cria sala Zoom automaticamente
   └─ Salva: meeting_link, meeting_password, meeting_id

2. USUÁRIO SE INSCREVE
   ├─ Evento Gratuito:
   │  ├─ Inscrição confirmada imediatamente
   │  ├─ Status: 'confirmed'
   │  └─ Email com link Zoom enviado IMEDIATAMENTE
   │
   └─ Evento Pago:
      ├─ Gera QR Code PIX
      ├─ Status: 'pending'
      └─ Aguarda webhook Mercado Pago

3. WEBHOOK MERCADO PAGO (apenas eventos pagos)
   ├─ Pagamento aprovado?
   ├─ Atualiza status: 'pending' → 'confirmed'
   ├─ Marca inscricao: payment_status = 'approved'
   └─ Email com link Zoom enviado APÓS PAGAMENTO

4. CONTROLE DE ACESSO
   ├─ Link Zoom exibido apenas para inscritos 'confirmed'
   ├─ Área do usuário mostra eventos inscritos
   ├─ Validação de vagas antes de inscrever
   └─ Relatórios para admin (quem pagou/não pagou)
```

---

## 🗄️ Mudanças no Banco de Dados

### 1. Tabela `eventos` (adicionar campos Zoom)

```sql
-- Adicionar campos para armazenar dados da sala Zoom
ALTER TABLE eventos 
ADD COLUMN IF NOT EXISTS meeting_link TEXT,
ADD COLUMN IF NOT EXISTS meeting_password TEXT,
ADD COLUMN IF NOT EXISTS meeting_id TEXT,
ADD COLUMN IF NOT EXISTS meeting_start_url TEXT,
ADD COLUMN IF NOT EXISTS vagas_disponiveis INTEGER DEFAULT 0;

COMMENT ON COLUMN eventos.meeting_link IS 'Link da sala Zoom para participantes';
COMMENT ON COLUMN eventos.meeting_password IS 'Senha da sala Zoom';
COMMENT ON COLUMN eventos.meeting_id IS 'ID da reunião no Zoom';
COMMENT ON COLUMN eventos.meeting_start_url IS 'Link para host iniciar a reunião';
COMMENT ON COLUMN eventos.vagas_disponiveis IS 'Número máximo de participantes (0 = ilimitado)';

-- Índice para consultas de eventos com Zoom
CREATE INDEX IF NOT EXISTS idx_eventos_meeting_id ON eventos(meeting_id);
```

### 2. Tabela `inscricoes_eventos` (adicionar status de pagamento)

```sql
-- Adicionar campos de controle de pagamento e confirmação
ALTER TABLE inscricoes_eventos 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS zoom_link_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS zoom_link_sent_at TIMESTAMP DEFAULT NULL;

-- Constraint para garantir status válidos
ALTER TABLE inscricoes_eventos 
ADD CONSTRAINT inscricoes_eventos_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled'));

ALTER TABLE inscricoes_eventos 
ADD CONSTRAINT inscricoes_eventos_payment_status_check 
CHECK (payment_status IS NULL OR payment_status IN ('pending', 'approved', 'rejected', 'cancelled'));

COMMENT ON COLUMN inscricoes_eventos.status IS 'Status da inscrição: pending (aguardando pagamento), confirmed (confirmado), cancelled (cancelado)';
COMMENT ON COLUMN inscricoes_eventos.payment_status IS 'Status do pagamento (apenas eventos pagos): pending, approved, rejected, cancelled';
COMMENT ON COLUMN inscricoes_eventos.payment_id IS 'ID do pagamento no Mercado Pago';
COMMENT ON COLUMN inscricoes_eventos.payment_date IS 'Data de aprovação do pagamento';
COMMENT ON COLUMN inscricoes_eventos.zoom_link_sent IS 'Se o email com link Zoom já foi enviado';
COMMENT ON COLUMN inscricoes_eventos.zoom_link_sent_at IS 'Data/hora do envio do email com Zoom';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_inscricoes_status ON inscricoes_eventos(status);
CREATE INDEX IF NOT EXISTS idx_inscricoes_payment_id ON inscricoes_eventos(payment_id);
CREATE INDEX IF NOT EXISTS idx_inscricoes_evento_id ON inscricoes_eventos(evento_id);
```

### 3. View para relatórios (opcional)

```sql
-- View para facilitar consultas de inscrições com dados completos
CREATE OR REPLACE VIEW vw_inscricoes_completas AS
SELECT 
    ie.id,
    ie.evento_id,
    e.titulo AS evento_titulo,
    e.data_evento,
    e.hora_evento,
    e.valor AS evento_valor,
    ie.nome,
    ie.email,
    ie.telefone,
    ie.status,
    ie.payment_status,
    ie.valor_pago,
    ie.payment_id,
    ie.payment_date,
    ie.zoom_link_sent,
    ie.zoom_link_sent_at,
    ie.created_at AS inscricao_em,
    e.meeting_link,
    e.meeting_password,
    CASE 
        WHEN e.valor = 0 THEN 'Gratuito'
        WHEN ie.payment_status = 'approved' THEN 'Pago'
        WHEN ie.payment_status = 'pending' THEN 'Aguardando Pagamento'
        ELSE 'Pendente'
    END AS status_descricao
FROM inscricoes_eventos ie
JOIN eventos e ON ie.evento_id = e.id
ORDER BY ie.created_at DESC;
```

---

## 🔧 Implementações Necessárias

### 1. **Criar sala Zoom ao criar evento**

📁 `src/pages/AdminPage.jsx` (ou onde admin cria eventos)

```javascript
import { zoomService } from '../lib/zoomService';

async function handleCreateEvento(eventoData) {
    try {
        const { titulo, descricao, data_evento, hora_evento, valor, vagas_disponiveis } = eventoData;
        
        // 1. Criar sala Zoom automaticamente
        console.log('🎥 Criando sala Zoom para o evento...');
        
        const zoomData = await zoomService.createMeeting({
            topic: `Evento: ${titulo}`,
            startTime: `${data_evento}T${hora_evento}:00`,
            duration: 120, // 2 horas padrão (ajustar conforme necessário)
            timezone: 'America/Sao_Paulo',
            agenda: descricao,
            settings: {
                join_before_host: false,
                waiting_room: true, // CRÍTICO: sala de espera ativa
                approval_type: 0, // Requer aprovação manual do host
                registration_type: 1, // Registro requerido
                mute_upon_entry: true,
                auto_recording: 'cloud' // Opcional: gravar automaticamente
            }
        });
        
        if (!zoomData) {
            throw new Error('Falha ao criar sala Zoom');
        }
        
        // 2. Salvar evento com dados do Zoom
        const { data, error } = await supabase
            .from('eventos')
            .insert([{
                titulo,
                descricao,
                data_evento,
                hora_evento,
                valor,
                vagas_disponiveis,
                meeting_link: zoomData.join_url,
                meeting_password: zoomData.password,
                meeting_id: zoomData.id,
                meeting_start_url: zoomData.start_url,
                ativo: true
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        console.log('✅ Evento criado com sala Zoom:', data);
        return { success: true, data };
        
    } catch (error) {
        console.error('❌ Erro ao criar evento:', error);
        return { success: false, error: error.message };
    }
}
```

---

### 2. **Inscrição com verificação de vagas**

📁 `src/pages/EventoDetalhePage.jsx`

```javascript
async function handleInscricao(eventoId, userData) {
    try {
        // 1. Buscar dados do evento
        const { data: evento, error: eventoError } = await supabase
            .from('eventos')
            .select('*')
            .eq('id', eventoId)
            .single();
        
        if (eventoError) throw eventoError;
        
        // 2. Verificar vagas disponíveis (apenas eventos pagos)
        if (evento.valor > 0 && evento.vagas_disponiveis > 0) {
            const { count, error: countError } = await supabase
                .from('inscricoes_eventos')
                .select('*', { count: 'exact', head: true })
                .eq('evento_id', eventoId)
                .eq('status', 'confirmed'); // Apenas confirmados
            
            if (countError) throw countError;
            
            if (count >= evento.vagas_disponiveis) {
                alert('⚠️ Evento esgotado! Não há mais vagas disponíveis.');
                return { success: false, message: 'Vagas esgotadas' };
            }
        }
        
        // 3. Verificar se usuário já está inscrito
        const { data: inscricaoExistente } = await supabase
            .from('inscricoes_eventos')
            .select('*')
            .eq('evento_id', eventoId)
            .eq('email', userData.email)
            .maybeSingle();
        
        if (inscricaoExistente) {
            alert('Você já está inscrito neste evento!');
            return { success: false, message: 'Já inscrito' };
        }
        
        // 4. Criar inscrição
        const inscricaoData = {
            evento_id: eventoId,
            user_id: userData.user_id || null,
            nome: userData.nome,
            email: userData.email,
            telefone: userData.telefone,
            valor_pago: evento.valor,
            status: evento.valor === 0 ? 'confirmed' : 'pending', // Gratuito = confirmado
            payment_status: evento.valor > 0 ? 'pending' : null
        };
        
        const { data: inscricao, error: inscricaoError } = await supabase
            .from('inscricoes_eventos')
            .insert([inscricaoData])
            .select()
            .single();
        
        if (inscricaoError) throw inscricaoError;
        
        // 5. Evento GRATUITO: Enviar email com Zoom imediatamente
        if (evento.valor === 0) {
            await enviarEmailZoomGratuito(inscricao.id, evento, userData);
            return { 
                success: true, 
                type: 'gratuito',
                message: 'Inscrição confirmada! Verifique seu email.'
            };
        }
        
        // 6. Evento PAGO: Gerar pagamento PIX
        const pixData = await gerarPagamentoPIX(inscricao, evento, userData);
        return { 
            success: true, 
            type: 'pago',
            pixData,
            message: 'Realize o pagamento para confirmar sua inscrição'
        };
        
    } catch (error) {
        console.error('❌ Erro na inscrição:', error);
        return { success: false, error: error.message };
    }
}
```

---

### 3. **Enviar email com Zoom (eventos gratuitos)**

📁 `src/lib/emailTemplates.js` (adicionar novo método)

```javascript
// EMAIL: Inscrição Confirmada - Evento Gratuito (com Zoom)
eventoGratuitoConfirmado(inscricao, evento) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2d8659; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .zoom-box { background: #dbeafe; padding: 25px; margin: 25px 0; border-radius: 8px; border-left: 4px solid #3b82f6; }
            .btn { display: inline-block; padding: 14px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
            .password-box { background: white; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 18px; font-weight: bold; color: #1e40af; text-align: center; margin: 15px 0; }
            .info-box { background: #fef3c7; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #f59e0b; }
            .success-box { background: #dcfce7; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #16a34a; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">✅ Inscrição Confirmada!</h1>
            </div>
            
            <div class="content">
                <p>Olá, <strong>${inscricao.nome}</strong>!</p>
                
                <p>Sua inscrição no evento <strong>"${evento.titulo}"</strong> foi confirmada com sucesso! 🎉</p>
                
                <div class="success-box">
                    <h3 style="margin: 0 0 10px 0; color: #15803d;">📅 Detalhes do Evento:</h3>
                    <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date(evento.data_evento).toLocaleDateString('pt-BR')}</p>
                    <p style="margin: 5px 0;"><strong>Horário:</strong> ${evento.hora_evento}</p>
                    <p style="margin: 5px 0;"><strong>Modalidade:</strong> Online via Zoom</p>
                    ${evento.descricao ? `<p style="margin: 10px 0 0 0;">${evento.descricao}</p>` : ''}
                </div>
                
                <div class="zoom-box">
                    <h3 style="margin: 0 0 15px 0; color: #1e40af;">🎥 Acesso à Sala Zoom</h3>
                    <p style="margin: 0 0 15px 0;">Clique no botão abaixo para acessar o evento online:</p>
                    <a href="${evento.meeting_link}" class="btn">🔗 Entrar no Evento Online</a>
                    
                    ${evento.meeting_password ? `
                    <p style="margin: 15px 0 5px 0; font-weight: bold; color: #1e40af;">🔑 Senha da Sala:</p>
                    <div class="password-box">${evento.meeting_password}</div>
                    ` : ''}
                    
                    <p style="margin: 15px 0 0 0; font-size: 13px; color: #64748b;">
                        💡 <strong>Dica:</strong> Salve este email para ter acesso fácil ao link no dia do evento!
                    </p>
                </div>
                
                <div class="info-box">
                    <h3 style="margin: 0 0 12px 0; color: #92400e;">📱 Primeira vez no Zoom?</h3>
                    <ol style="margin: 0; padding-left: 20px; color: #78350f; line-height: 1.8;">
                        <li>Clique no botão "Entrar no Evento Online" acima</li>
                        <li>Se for a primeira vez, o Zoom pedirá para <strong>baixar o aplicativo</strong> - é gratuito e seguro</li>
                        <li>Se não baixar automaticamente: <a href="https://zoom.us/download" style="color: #92400e;">zoom.us/download</a></li>
                        <li>Após instalar, clique novamente no link do evento</li>
                        <li>Digite a senha se solicitado</li>
                        <li>Aguarde na sala de espera - o organizador irá admiti-lo(a)</li>
                    </ol>
                </div>
                
                <div class="success-box">
                    <h3 style="margin: 0 0 10px 0; color: #15803d;">✅ Recomendações:</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #166534;">
                        <li>Entre 10 minutos antes do horário agendado</li>
                        <li>Teste seu áudio e vídeo antes do evento</li>
                        <li>Esteja em um local tranquilo com boa conexão de internet</li>
                        <li>Tenha papel e caneta para anotações</li>
                    </ul>
                </div>
                
                <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px;">
                    Nos vemos no evento! Se tiver dúvidas, responda este email.
                </p>
                
                <p style="margin: 20px 0 0 0;">
                    Atenciosamente,<br>
                    <strong>Equipe Doxologos</strong><br>
                    <a href="mailto:contato@doxologos.com.br">contato@doxologos.com.br</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
}
```

---

### 4. **Webhook Mercado Pago - Eventos Pagos**

📁 `supabase/functions/mp-webhook/index.ts` (adicionar lógica para eventos)

```typescript
// Dentro do handler do webhook, após confirmar pagamento:

if (mpPayment.status === 'approved' || mpPayment.status === 'paid') {
    
    // Verificar se é pagamento de EVENTO ou AGENDAMENTO
    const externalRef = mpPayment.external_reference;
    
    if (externalRef?.startsWith('EVENTO_')) {
        // LÓGICA PARA EVENTOS
        const inscricaoId = externalRef.replace('EVENTO_', '');
        
        // 1. Atualizar status da inscrição
        const { data: inscricao, error: updateError } = await supabaseAdmin
            .from('inscricoes_eventos')
            .update({
                status: 'confirmed',
                payment_status: 'approved',
                payment_id: mpPayment.id,
                payment_date: new Date().toISOString()
            })
            .eq('id', inscricaoId)
            .select('*, eventos(*)')
            .single();
        
        if (updateError) {
            console.error('Erro ao atualizar inscrição:', updateError);
            return new Response(JSON.stringify({ error: updateError }), { status: 500 });
        }
        
        // 2. Enviar email com link Zoom
        try {
            const evento = inscricao.eventos;
            const emailHtml = emailTemplates.eventoPagoConfirmado(inscricao, evento);
            
            await sendEmail(
                SENDGRID_KEY,
                SENDGRID_FROM,
                inscricao.email,
                `✅ Pagamento Confirmado - ${evento.titulo}`,
                emailHtml
            );
            
            // Marcar que email foi enviado
            await supabaseAdmin
                .from('inscricoes_eventos')
                .update({
                    zoom_link_sent: true,
                    zoom_link_sent_at: new Date().toISOString()
                })
                .eq('id', inscricaoId);
            
            console.log('✅ Email com Zoom enviado para:', inscricao.email);
            
        } catch (emailError) {
            console.error('❌ Erro ao enviar email:', emailError);
        }
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Pagamento confirmado e email enviado' 
        }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    // ... resto da lógica para bookings
}
```

---

### 5. **Gerar pagamento PIX para eventos**

📁 `src/lib/mercadoPagoService.js` (criar se não existir)

```javascript
import { supabase } from './supabase';

export async function gerarPagamentoEventoPIX(inscricao, evento, userData) {
    try {
        // Chamar Edge Function do Mercado Pago
        const { data, error } = await supabase.functions.invoke('mp-create-payment', {
            body: {
                transaction_amount: parseFloat(evento.valor),
                description: `Inscrição - ${evento.titulo}`,
                payment_method_id: 'pix',
                payer: {
                    email: userData.email,
                    first_name: userData.nome.split(' ')[0],
                    last_name: userData.nome.split(' ').slice(1).join(' ') || 'Silva',
                    identification: {
                        type: 'CPF',
                        number: userData.cpf || '00000000000'
                    }
                },
                external_reference: `EVENTO_${inscricao.id}`, // IMPORTANTE: prefixo EVENTO_
                notification_url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mp-webhook`
            }
        });
        
        if (error) throw error;
        
        return {
            qr_code: data.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
            payment_id: data.id,
            ticket_url: data.point_of_interaction.transaction_data.ticket_url
        };
        
    } catch (error) {
        console.error('Erro ao gerar PIX:', error);
        throw error;
    }
}
```

---

### 6. **Controle de acesso na área do usuário**

📁 `src/pages/MinhasInscricoesPage.jsx` (criar nova página)

```javascript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, Video, Check, X, AlertCircle } from 'lucide-react';

export default function MinhasInscricoesPage() {
    const [inscricoes, setInscricoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    
    useEffect(() => {
        loadUserAndInscricoes();
    }, []);
    
    async function loadUserAndInscricoes() {
        try {
            // Buscar usuário logado
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = '/login';
                return;
            }
            setUser(user);
            
            // Buscar inscrições do usuário
            const { data, error } = await supabase
                .from('inscricoes_eventos')
                .select(`
                    *,
                    eventos (
                        id,
                        titulo,
                        descricao,
                        data_evento,
                        hora_evento,
                        valor,
                        meeting_link,
                        meeting_password
                    )
                `)
                .eq('email', user.email)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setInscricoes(data || []);
            
        } catch (error) {
            console.error('Erro ao carregar inscrições:', error);
        } finally {
            setLoading(false);
        }
    }
    
    function getStatusBadge(inscricao) {
        if (inscricao.status === 'confirmed') {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                    <Check className="w-4 h-4 mr-1" />
                    Confirmado
                </span>
            );
        }
        if (inscricao.status === 'pending') {
            return (
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Aguardando Pagamento
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm">
                <X className="w-4 h-4 mr-1" />
                Cancelado
            </span>
        );
    }
    
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-8">Minhas Inscrições em Eventos</h1>
            
            {inscricoes.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Você ainda não está inscrito em nenhum evento.</p>
                    <a href="/#eventos" className="mt-4 inline-block text-primary hover:underline">
                        Ver eventos disponíveis
                    </a>
                </div>
            ) : (
                <div className="space-y-6">
                    {inscricoes.map((inscricao) => (
                        <div key={inscricao.id} className="border rounded-lg p-6 bg-white shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {inscricao.eventos.titulo}
                                    </h2>
                                    <div className="flex items-center gap-4 mt-2 text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(inscricao.eventos.data_evento).toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {inscricao.eventos.hora_evento}
                                        </span>
                                    </div>
                                </div>
                                {getStatusBadge(inscricao)}
                            </div>
                            
                            {inscricao.eventos.descricao && (
                                <p className="text-gray-700 mb-4">{inscricao.eventos.descricao}</p>
                            )}
                            
                            {/* ZOOM: Exibir apenas se confirmado */}
                            {inscricao.status === 'confirmed' && inscricao.eventos.meeting_link && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Video className="w-5 h-5 text-blue-600" />
                                        <h3 className="font-bold text-blue-900">Acesso à Sala Online</h3>
                                    </div>
                                    <a 
                                        href={inscricao.eventos.meeting_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg mt-2 transition-colors"
                                    >
                                        🎥 Entrar no Evento
                                    </a>
                                    {inscricao.eventos.meeting_password && (
                                        <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                                            <p className="text-sm text-gray-600 mb-1">🔑 Senha da sala:</p>
                                            <p className="font-mono font-bold text-blue-900 text-lg">
                                                {inscricao.eventos.meeting_password}
                                            </p>
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-600 mt-2">
                                        💡 Entre 10 minutos antes do horário agendado
                                    </p>
                                </div>
                            )}
                            
                            {/* Aguardando Pagamento */}
                            {inscricao.status === 'pending' && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                                    <p className="text-yellow-800">
                                        ⏳ Aguardando confirmação do pagamento. O link da sala Zoom será enviado por email após a aprovação.
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
```

---

## 📧 Templates de Email

### Email 1: Evento Gratuito Confirmado
- ✅ Enviado **imediatamente** após inscrição
- ✅ Contém link Zoom e senha
- ✅ Instruções para iniciantes

### Email 2: Evento Pago - Aguardando Pagamento
- ✅ Enviado após inscrição
- ✅ QR Code PIX
- ✅ Instruções de pagamento
- ❌ **NÃO** contém link Zoom

### Email 3: Evento Pago - Pagamento Confirmado
- ✅ Enviado após webhook do Mercado Pago
- ✅ Contém link Zoom e senha
- ✅ Confirmação de inscrição

---

## 🔒 Segurança e Controle de Acesso

### 1. **Sala de Espera Zoom (Waiting Room)**
```javascript
settings: {
    waiting_room: true, // OBRIGATÓRIO
    join_before_host: false, // Participantes não entram antes do host
    approval_type: 0, // Requer aprovação manual
    mute_upon_entry: true // Todos entram mutados
}
```

### 2. **Validação de Status**
- Link Zoom exibido **APENAS** para `status = 'confirmed'`
- Eventos pagos: confirmar **APÓS** `payment_status = 'approved'`
- Webhook valida pagamento antes de confirmar

### 3. **Limite de Vagas**
- Verificar `vagas_disponiveis` antes de inscrever
- Contar apenas inscrições `status = 'confirmed'`
- Bloquear inscrição se vagas esgotadas

### 4. **RLS (Row Level Security) - Supabase**
```sql
-- Usuários só veem suas próprias inscrições
CREATE POLICY "Users can view own inscricoes"
ON inscricoes_eventos
FOR SELECT
USING (auth.email() = email);

-- Admin pode ver todas
CREATE POLICY "Admin can view all inscricoes"
ON inscricoes_eventos
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);
```

---

## 📊 Relatórios para Admin

### 1. **Dashboard de Eventos**
```javascript
// Resumo por evento
SELECT 
    e.titulo,
    e.data_evento,
    e.vagas_disponiveis,
    COUNT(ie.id) FILTER (WHERE ie.status = 'confirmed') AS inscritos_confirmados,
    COUNT(ie.id) FILTER (WHERE ie.status = 'pending') AS aguardando_pagamento,
    SUM(ie.valor_pago) FILTER (WHERE ie.payment_status = 'approved') AS receita_total
FROM eventos e
LEFT JOIN inscricoes_eventos ie ON e.id = ie.evento_id
WHERE e.ativo = true
GROUP BY e.id
ORDER BY e.data_evento;
```

### 2. **Lista de Participantes**
```javascript
// Exportar lista para Excel/PDF
SELECT 
    ie.nome,
    ie.email,
    ie.telefone,
    ie.status,
    ie.payment_status,
    ie.created_at
FROM inscricoes_eventos ie
WHERE ie.evento_id = 'EVENTO_ID'
AND ie.status = 'confirmed'
ORDER BY ie.nome;
```

---

## 🧪 Testes Necessários

### Cenário 1: Evento Gratuito
- [ ] Criar evento gratuito (valor = 0)
- [ ] Verificar se sala Zoom foi criada
- [ ] Fazer inscrição
- [ ] Verificar status: `confirmed` imediatamente
- [ ] Verificar email recebido com link Zoom
- [ ] Testar acesso à sala

### Cenário 2: Evento Pago - Pagamento Aprovado
- [ ] Criar evento pago (valor > 0)
- [ ] Verificar se sala Zoom foi criada
- [ ] Fazer inscrição
- [ ] Verificar status: `pending`
- [ ] Gerar QR Code PIX
- [ ] Simular pagamento no Mercado Pago
- [ ] Webhook atualiza status para `confirmed`
- [ ] Email com Zoom enviado
- [ ] Link aparece na área do usuário

### Cenário 3: Evento Pago - Vagas Esgotadas
- [ ] Criar evento com 5 vagas
- [ ] Fazer 5 inscrições e pagar todas
- [ ] Tentar 6ª inscrição
- [ ] Verificar bloqueio de vagas

### Cenário 4: Controle de Acesso
- [ ] Usuário com status `pending` não vê link Zoom
- [ ] Usuário com status `confirmed` vê link Zoom
- [ ] Link só funciona com senha correta

---

## 📝 Checklist de Implementação

### Backend (Database)
- [ ] Executar migration: adicionar campos Zoom na tabela `eventos`
- [ ] Executar migration: adicionar campos status/pagamento na tabela `inscricoes_eventos`
- [ ] Criar view `vw_inscricoes_completas`
- [ ] Configurar RLS policies

### Edge Functions
- [ ] Atualizar `mp-webhook` para eventos
- [ ] Testar webhook com eventos
- [ ] Validar envio de emails

### Frontend
- [ ] Adicionar criação de Zoom ao criar evento (AdminPage)
- [ ] Implementar verificação de vagas na inscrição
- [ ] Criar página `MinhasInscricoesPage`
- [ ] Adicionar rota `/minhas-inscricoes`
- [ ] Atualizar templates de email
- [ ] Adicionar geração de PIX para eventos

### Testes
- [ ] Testar evento gratuito completo
- [ ] Testar evento pago completo
- [ ] Testar limite de vagas
- [ ] Testar controle de acesso
- [ ] Testar emails (gratuito e pago)

---

## 🎯 Benefícios da Solução

✅ **Automação Completa:** Sala Zoom criada automaticamente  
✅ **Segurança:** Apenas pagantes acessam eventos pagos  
✅ **Controle de Vagas:** Sistema bloqueia quando lotado  
✅ **Experiência do Usuário:** Fluxo claro (gratuito vs pago)  
✅ **Gestão Facilitada:** Admin vê status de todos os participantes  
✅ **Escalável:** Funciona para N eventos simultâneos  

---

## 📞 Suporte

Dúvidas sobre a implementação?  
**Documentação completa:** `docs/EVENTOS_ZOOM_PROPOSAL.md`  
**Integração Zoom:** `docs/ZOOM_INTEGRATION_GUIDE.md`  
**Pagamentos:** `docs/PAYMENT_SYSTEM_ARCHITECTURE.md`

---

**Pronto para implementar!** 🚀
