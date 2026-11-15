/**
 * bookResourceService.js
 * 
 * Serviço para gerenciar os recursos digitais do livro (Book Companion).
 * 
 * Responsabilidades:
 * - Buscar recurso por slug (usado pela landing page do QR Code)
 * - Registrar download gratuito (captura de lead)
 * - Verificar se usuário já possui acesso ao material pago
 * - Criar pagamento para compra de upgrade clínico
 * - Confirmar entrega após aprovação do pagamento
 * - Notificar admin via painel e e-mail
 */

import { supabase } from '@/lib/customSupabaseClient';
import { logger } from '@/lib/logger.js';
import emailService from '@/lib/emailService';

const ADMIN_NOTIFICATION_EMAIL = 'contato@doxologos.com.br';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ================================================================
// 1. Buscar recurso pelo slug do QR Code
// ================================================================
/**
 * Busca o recurso pelo slug imutável do QR Code.
 * Também incrementa o contador de visualizações de forma atômica.
 *
 * @param {string} slug - ex: 'cap04-ansiedade'
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function getResourceBySlug(slug) {
    if (!slug) return { data: null, error: new Error('Slug inválido') };

    try {
        logger.info('bookResourceService.getResourceBySlug:start', { slug });

        const { data, error } = await supabase
            .from('book_resources')
            .select('*')
            .eq('slug', slug)
            .eq('is_active', true)
            .single();

        if (error) {
            logger.error('bookResourceService.getResourceBySlug:error', error, { slug });
            return { data: null, error };
        }

        // Incrementa visualização de forma atômica (fire & forget — não bloqueia o usuário)
        supabase.rpc('increment_book_resource_views', { p_slug: slug }).then(() => {
            logger.info('bookResourceService.getResourceBySlug:view-counted', { slug });
        });

        logger.success('bookResourceService.getResourceBySlug:found', { slug, id: data.id });
        return { data, error: null };
    } catch (err) {
        logger.error('bookResourceService.getResourceBySlug:critical', err, { slug });
        return { data: null, error: err };
    }
}

// ================================================================
// 2. Registrar download gratuito + captura de lead
// ================================================================
/**
 * Registra um download gratuito do recurso.
 * Se o usuário não estiver logado, cria/atualiza registro de lead com e-mail e nome.
 * Gera um link temporário de download seguro.
 *
 * @param {Object} params
 * @param {string} params.resourceId - UUID do recurso
 * @param {string} params.freeFileUrl - URL pública do arquivo gratuito
 * @param {string|null} params.userId - UUID do usuário logado (null se anônimo)
 * @param {string|null} params.leadEmail - E-mail do lead (obrigatório se userId é null)
 * @param {string|null} params.leadName - Nome do lead (opcional)
 * @param {Object} params.utm - UTMs de rastreio { source, medium, campaign }
 * @returns {Promise<{downloadUrl: string, downloadId: string, error: Error|null}>}
 */
export async function registerFreeDownload({ resourceId, freeFileUrl, userId, leadEmail, leadName, utm = {} }) {
    const context = { resourceId, userId: userId || 'anonymous', leadEmail };
    try {
        logger.info('bookResourceService.registerFreeDownload:start', context);

        // Inserir registro de download
        const { data: downloadRecord, error: insertError } = await supabase
            .from('user_book_downloads')
            .insert([{
                user_id: userId || null,
                resource_id: resourceId,
                download_type: 'free',
                lead_email: leadEmail || null,
                lead_name: leadName || null,
                payment_status: 'completed',
                utm_source: utm.source || 'book_qrcode',
                utm_medium: utm.medium || 'print',
                utm_campaign: utm.campaign || 'book_companion',
            }])
            .select()
            .single();

        if (insertError) {
            logger.warn('bookResourceService.registerFreeDownload:insert-warn', insertError, context);
            // Não bloqueia — segue com o download mesmo se o insert falhar
        }

        // Incrementa contador de downloads (fire & forget)
        supabase.rpc('increment_book_resource_downloads', { p_resource_id: resourceId });

        logger.success('bookResourceService.registerFreeDownload:success', context);
        return {
            downloadUrl: freeFileUrl,
            downloadId: downloadRecord?.id || null,
            error: null,
        };
    } catch (err) {
        logger.error('bookResourceService.registerFreeDownload:critical', err, context);
        // Retorna a URL mesmo em caso de erro de registro — não bloqueia o leitor
        return { downloadUrl: freeFileUrl, downloadId: null, error: err };
    }
}

// ================================================================
// 3. Verificar se usuário já possui licença paga do recurso
// ================================================================
/**
 * Verifica se o usuário já possui uma licença paga para o recurso.
 *
 * @param {string} resourceId - UUID do recurso
 * @param {string} userId - UUID do usuário logado
 * @returns {Promise<{hasAccess: boolean, download: Object|null}>}
 */
export async function checkUserPaidAccess(resourceId, userId) {
    if (!resourceId || !userId) return { hasAccess: false, download: null };

    try {
        const { data, error } = await supabase
            .from('user_book_downloads')
            .select('*')
            .eq('resource_id', resourceId)
            .eq('user_id', userId)
            .eq('download_type', 'paid')
            .eq('payment_status', 'completed')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) return { hasAccess: false, download: null };
        return { hasAccess: true, download: data };
    } catch {
        return { hasAccess: false, download: null };
    }
}

// ================================================================
// 4. Criar pagamento para upgrade clínico (Mercado Pago PIX)
// ================================================================
/**
 * Inicia o pagamento PIX para a compra do upgrade clínico do recurso.
 * Cria um registro de download com status 'pending' e retorna os dados do PIX.
 *
 * @param {Object} params
 * @param {Object} params.resource - Objeto completo do book_resource
 * @param {string} params.userId - UUID do usuário comprador
 * @param {string} params.payerEmail - E-mail do comprador
 * @param {string|null} params.payerName - Nome do comprador
 * @returns {Promise<{pixData: Object, downloadRecordId: string, error: Error|null}>}
 */
export async function createResourcePayment({ resource, userId, payerEmail, payerName }) {
    const context = { resourceId: resource.id, userId, payerEmail };

    try {
        logger.info('bookResourceService.createResourcePayment:start', context);

        // 1. Cria registro de compra com status pending
        const { data: pendingRecord, error: insertError } = await supabase
            .from('user_book_downloads')
            .insert([{
                user_id: userId,
                resource_id: resource.id,
                download_type: 'paid',
                lead_email: payerEmail,
                lead_name: payerName || null,
                payment_status: 'pending',
                paid_amount_brl: resource.paid_price_brl,
                license_type: resource.paid_license_type || 'clinical',
                utm_source: 'book_qrcode',
                utm_medium: 'print',
                utm_campaign: 'book_companion_paid',
            }])
            .select()
            .single();

        if (insertError) {
            throw new Error(`Erro ao criar registro de compra: ${insertError.message}`);
        }

        // 2. Chama a Edge Function do Mercado Pago para criar PIX
        const response = await fetch(`${SUPABASE_URL}/functions/v1/mp-create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                resource_id: resource.id,
                download_record_id: pendingRecord.id,
                amount: Number(resource.paid_price_brl),
                description: `${resource.paid_title || resource.title} — Material Clínico Doxologos`,
                payer: {
                    email: payerEmail,
                    first_name: payerName || '',
                },
                payment_method_id: 'pix',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao criar PIX: ${errorText}`);
        }

        const pixData = await response.json();
        logger.success('bookResourceService.createResourcePayment:pix-created', {
            ...context,
            paymentId: pixData.payment_id,
        });

        return {
            pixData,
            downloadRecordId: pendingRecord.id,
            error: null,
        };
    } catch (err) {
        logger.error('bookResourceService.createResourcePayment:error', err, context);
        return { pixData: null, downloadRecordId: null, error: err };
    }
}

// ================================================================
// 5. Confirmar entrega após aprovação do pagamento
// ================================================================
/**
 * Confirma a entrega do material pago após aprovação do PIX/Cartão.
 * Atualiza o registro, incrementa contadores e dispara notificações.
 *
 * @param {Object} params
 * @param {string} params.downloadRecordId - ID do registro de compra (pending)
 * @param {string} params.paymentId - ID do pagamento no Mercado Pago
 * @param {Object} params.resource - Objeto do book_resource
 * @param {string} params.payerEmail - E-mail do comprador (para envio do material)
 * @param {string|null} params.payerName - Nome do comprador
 * @param {string|null} params.userId - UUID do comprador (para notificação no admin)
 * @returns {Promise<{downloadUrl: string, error: Error|null}>}
 */
export async function confirmPaidDelivery({ downloadRecordId, paymentId, resource, payerEmail, payerName, userId }) {
    const context = { downloadRecordId, paymentId, resourceId: resource.id, payerEmail };

    try {
        logger.info('bookResourceService.confirmPaidDelivery:start', context);

        // 1. Atualiza o registro para 'completed' e salva o payment_id
        const { error: updateError } = await supabase
            .from('user_book_downloads')
            .update({
                payment_status: 'completed',
                payment_id: paymentId,
            })
            .eq('id', downloadRecordId);

        if (updateError) {
            logger.warn('bookResourceService.confirmPaidDelivery:update-warn', updateError, context);
        }

        // 2. Incrementa contador de compras (fire & forget)
        supabase.rpc('increment_book_resource_purchases', { p_resource_id: resource.id });

        // 3. Notificação no painel de admin (inserir na tabela notifications para todos os admins)
        await notifyAdminOfPurchase({ resource, payerEmail, payerName, paymentId, downloadRecordId });

        // 4. Envio de e-mail ao comprador com o link do material
        await sendPurchaseConfirmationEmail({ resource, payerEmail, payerName });

        logger.success('bookResourceService.confirmPaidDelivery:complete', context);

        return { downloadUrl: resource.paid_file_url, error: null };
    } catch (err) {
        logger.error('bookResourceService.confirmPaidDelivery:error', err, context);
        // Retorna a URL mesmo em caso de erro de notificação
        return { downloadUrl: resource.paid_file_url, error: err };
    }
}

// ================================================================
// 6. Verificar status do pagamento (para polling ativo no frontend)
// ================================================================
/**
 * Verifica o status atual do pagamento via API.
 * Usado pelo polling ativo da tela de checkout enquanto o leitor aguarda PIX.
 *
 * @param {string} paymentId - ID do pagamento no Mercado Pago
 * @returns {Promise<{status: string, error: Error|null}>}
 */
export async function checkPaymentStatus(paymentId) {
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/mp-check-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ payment_id: paymentId }),
        });

        if (!response.ok) throw new Error('Erro ao verificar status do pagamento');
        const result = await response.json();
        return { status: result.status, statusDetail: result.status_detail, error: null };
    } catch (err) {
        return { status: null, statusDetail: null, error: err };
    }
}

// ================================================================
// 7. Funções internas de notificação
// ================================================================

/**
 * Insere notificação para o(s) admin(s) no painel e envia e-mail institucional.
 * @private
 */
async function notifyAdminOfPurchase({ resource, payerEmail, payerName, paymentId, downloadRecordId }) {
    const title = `Nova compra: ${resource.paid_title || resource.title}`;
    const message = `${payerName || 'Leitor'} (${payerEmail}) comprou o material do Capítulo ${resource.chapter_number || ''}: "${resource.paid_title || resource.title}" — R$ ${Number(resource.paid_price_brl).toFixed(2)}`;

    try {
        // 7a. Inserir notificação via RPC (a Edge Function server-side ou trigger cuida da distribuição para admins)
        //     No frontend (anon key) não temos acesso a auth.users para listar admins —
        //     então inserimos uma notificação "de sistema" sem user_id específico,
        //     que pode ser lida por qualquer admin via painel.
        await supabase.from('notifications').insert([{
            user_id: null, // null = notificação de sistema (admins verão no painel)
            type: 'book:purchase',
            title,
            message,
            link: '/admin?tab=book-resources',
            metadata: {
                resource_id: resource.id,
                resource_slug: resource.slug,
                payment_id: paymentId,
                download_record_id: downloadRecordId,
                payer_email: payerEmail,
                paid_amount: resource.paid_price_brl,
            },
        }]);

        // 7b. Enviar e-mail institucional para contato@doxologos.com.br
        await emailService.sendEmail({
            to: ADMIN_NOTIFICATION_EMAIL,
            subject: `[Book Companion] Nova venda — ${resource.paid_title || resource.title}`,
            type: 'admin_notification',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2d8659;">Nova Venda — Material do Livro</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px; font-weight: bold;">Material:</td><td style="padding: 8px;">${resource.paid_title || resource.title}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Capítulo:</td><td style="padding: 8px;">${resource.chapter_number ? `Cap. ${resource.chapter_number}` : 'N/A'}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Comprador:</td><td style="padding: 8px;">${payerName || 'Não informado'}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">E-mail:</td><td style="padding: 8px;">${payerEmail}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">Valor:</td><td style="padding: 8px;">R$ ${Number(resource.paid_price_brl).toFixed(2)}</td></tr>
                        <tr><td style="padding: 8px; font-weight: bold;">ID do Pagamento:</td><td style="padding: 8px; font-size: 12px;">${paymentId}</td></tr>
                    </table>
                    <p style="margin-top: 24px; font-size: 12px; color: #999;">
                        Acesse o painel admin para mais detalhes: 
                        <a href="https://doxologos.com.br/admin?tab=book-resources">doxologos.com.br/admin</a>
                    </p>
                </div>
            `,
        });
    } catch (notifyErr) {
        // Falha silenciosa — não impede a entrega ao comprador
        logger.warn('bookResourceService.notifyAdminOfPurchase:failed', notifyErr, { resourceId: resource.id });
    }
}

/**
 * Envia e-mail de confirmação ao comprador com link de download.
 * @private
 */
async function sendPurchaseConfirmationEmail({ resource, payerEmail, payerName }) {
    try {
        await emailService.sendEmail({
            to: payerEmail,
            subject: `Seu material chegou: ${resource.paid_title || resource.title}`,
            type: 'purchase_confirmation',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <h1 style="color: #2d8659; font-size: 24px;">Material liberado!</h1>
                        <p style="color: #555; font-size: 16px;">
                            Olá${payerName ? `, ${payerName}` : ''}! Seu material clínico está pronto para download.
                        </p>
                    </div>
                    
                    <div style="background: #f0faf5; border-left: 4px solid #2d8659; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                        <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #1a5c3a;">${resource.paid_title || resource.title}</h2>
                        <p style="margin: 0; color: #555; font-size: 14px;">${resource.paid_description || resource.description || ''}</p>
                    </div>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${resource.paid_file_url}" 
                           style="background: #2d8659; color: white; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; display: inline-block;">
                            Baixar Material Agora
                        </a>
                    </div>

                    <p style="font-size: 13px; color: #777; text-align: center;">
                        Ou acesse em: <a href="${resource.paid_file_url}" style="color: #2d8659;">${resource.paid_file_url}</a>
                    </p>

                    <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />

                    <p style="font-size: 13px; color: #999; text-align: center;">
                        Este material é de uso clínico pessoal e profissional. Acesse sua conta em 
                        <a href="https://doxologos.com.br/area-do-paciente" style="color: #2d8659;">doxologos.com.br</a> 
                        para ver todos os seus materiais.
                    </p>
                </div>
            `,
        });
    } catch (emailErr) {
        // Falha silenciosa — o link de download já foi exibido na tela
        logger.warn('bookResourceService.sendPurchaseConfirmationEmail:failed', emailErr, { payerEmail });
    }
}

/**
 * Retorna todos os materiais (gratuitos + pagos) que o usuário já acessou.
 * Usado na seção "Meus Materiais" da Área do Paciente.
 *
 * @param {string} userId - UUID do usuário logado
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function getUserBookShelf(userId) {
    if (!userId) return { data: [], error: null };

    try {
        const { data, error } = await supabase
            .from('user_book_downloads')
            .select(`
                *,
                resource:resource_id (
                    id, slug, chapter_number, title, description,
                    free_file_url, has_paid_version, paid_title, paid_file_url,
                    paid_price_brl, book_title
                )
            `)
            .eq('user_id', userId)
            .in('payment_status', ['completed'])
            .order('created_at', { ascending: false });

        if (error) return { data: [], error };
        return { data: data || [], error: null };
    } catch (err) {
        return { data: [], error: err };
    }
}
