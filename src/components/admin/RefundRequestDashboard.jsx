import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import emailService from '@/lib/emailService';
import emailTemplates from '@/lib/emailTemplates';

export default function RefundRequestDashboard() {
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Action State
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionType, setActionType] = useState(null); // 'approve', 'reject', 'process'
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchRefundRequests();
    }, []);

    const fetchRefundRequests = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inscricoes_eventos')
                .select(`
          id,
          user_id,
          evento_id,
          data_inscricao,
          status,
          refund_status,
          refund_amount,
          cancellation_reason,
          cancelled_at,
          payment_id,
          payment_id,
          patient_name,
          patient_email,
          eventos (
            titulo,
            valor,
            data_inicio
          )
        `)
                .neq('refund_status', 'none') // Fetch only where refund is relevant
                .not('refund_status', 'is', null)
                .order('cancelled_at', { ascending: false });

            if (error) throw error;
            setRefunds(data || []);
        } catch (err) {
            console.error('Erro ao buscar reembolsos:', err);
            toast({
                title: 'Erro',
                description: 'Não foi possível carregar as solicitações de reembolso.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!selectedRequest || !actionType) return;

        try {
            setProcessing(true);
            let newStatus = '';

            if (actionType === 'approve') newStatus = 'approved';
            if (actionType === 'reject') newStatus = 'rejected';
            if (actionType === 'process') newStatus = 'processed';

            // 2. If approving, create/log in event_refunds (if not exists)
            if (actionType === 'approve') {
                const { data: existingRefund } = await supabase
                    .from('event_refunds')
                    .select('id')
                    .eq('inscricao_id', selectedRequest.id)
                    .single();

                if (!existingRefund) {
                    const { error: insertError } = await supabase
                        .from('event_refunds')
                        .insert({
                            evento_id: selectedRequest.evento_id,
                            inscricao_id: selectedRequest.id,
                            payment_id: selectedRequest.payment_id,
                            amount: selectedRequest.eventos?.valor,
                            status: 'pending',
                            reason: selectedRequest.cancellation_reason,
                            processed_by: (await supabase.auth.getUser()).data.user?.id
                        });
                    if (insertError) console.error('Error logging refund:', insertError);
                }
            }

            // 3. If processing (Mark as Paid), use RPC to handle financial reversal
            if (actionType === 'process') {
                const { data: rpcData, error: rpcError } = await supabase.rpc('process_refund_reversal', {
                    p_inscricao_id: selectedRequest.id,
                    p_admin_id: (await supabase.auth.getUser()).data.user?.id
                });

                if (rpcError) throw rpcError;
                console.log('Reversal processed:', rpcData);
            } else {
                // Only update status for approve/reject (process handled by RPC above)
                if (actionType !== 'process') {
                    const { error: updateError } = await supabase
                        .from('inscricoes_eventos')
                        .update({
                            refund_status: newStatus,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', selectedRequest.id);

                    if (updateError) throw updateError;
                }
            }



            // 4. Send Notification Email
            try {
                const userEmail = selectedRequest.patient_email;
                const userName = selectedRequest.patient_name;
                const eventTitle = selectedRequest.eventos?.titulo;

                if (userEmail && (actionType === 'approve' || actionType === 'reject')) {
                    let emailHtml = null;
                    let subject = '';
                    const inscricaoMock = { nome: userName || 'Participante' };

                    if (actionType === 'approve') {
                        emailHtml = emailTemplates.eventoReembolsoAprovado(
                            inscricaoMock,
                            selectedRequest.eventos,
                            selectedRequest.eventos?.valor
                        );
                        subject = `Reembolso Aprovado - ${eventTitle}`;
                    } else if (actionType === 'reject') {
                        emailHtml = emailTemplates.eventoReembolsoRejeitado(
                            inscricaoMock,
                            selectedRequest.eventos,
                            notes
                        );
                        subject = `Atualização sobre Reembolso - ${eventTitle}`;
                    }

                    if (emailHtml) {
                        await emailService.sendEmail({
                            to: userEmail,
                            subject: subject,
                            html: emailHtml,
                            type: 'refund_notification'
                        });
                        console.log(`Email de ${actionType} enviado para ${userEmail}`);
                    }
                }
            } catch (emailErr) {
                console.warn('Erro ao enviar email de notificação (não bloqueante):', emailErr);
            }

            toast({
                title: 'Sucesso',
                description: `Solicitação ${actionType === 'process' ? 'processada' : actionType + 'ada'} com sucesso.`
            });

            fetchRefundRequests();
            setSelectedRequest(null);
            setActionType(null);
            setNotes('');

        } catch (err) {
            console.error('Erro na ação:', err);
            toast({
                title: 'Erro',
                description: 'Falha ao processar ação.',
                variant: 'destructive'
            });
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'requested': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Solicitado</Badge>;
            case 'approved': return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Aprovado</Badge>;
            case 'rejected': return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Rejeitado</Badge>;
            case 'processed': return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Reembolsado</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gerenciamento de Reembolsos</CardTitle>
                <CardDescription>
                    Visualize e gerencie solicitações de cancelamento e reembolso de eventos.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : refunds.length === 0 ? (
                    <div className="text-center p-8 text-gray-500">
                        Nenhuma solicitação de reembolso encontrada.
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data Solicitação</TableHead>
                                    <TableHead>Evento</TableHead>
                                    <TableHead>Participante</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Motivo</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {refunds.map((refund) => (
                                    <TableRow key={refund.id}>
                                        <TableCell>
                                            {new Date(refund.cancelled_at).toLocaleDateString()}
                                            <div className="text-xs text-gray-500">
                                                {new Date(refund.cancelled_at).toLocaleTimeString()}
                                            </div>
                                        </TableCell>
                                        <TableCell>{refund.eventos?.titulo}</TableCell>
                                        <TableCell>
                                            <div>{refund.patient_name || 'Usuário'}</div>
                                            <div className="text-xs text-gray-500">{refund.patient_email}</div>
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency(refund.eventos?.valor || 0)}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(refund.refund_status)}</TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={refund.cancellation_reason}>
                                            {refund.cancellation_reason || '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {refund.refund_status === 'requested' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => { setSelectedRequest(refund); setActionType('approve'); }}
                                                        title="Aprovar"
                                                    >
                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => { setSelectedRequest(refund); setActionType('reject'); }}
                                                        title="Rejeitar"
                                                    >
                                                        <XCircle className="w-4 h-4 text-red-600" />
                                                    </Button>
                                                </div>
                                            )}

                                            {refund.refund_status === 'approved' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => { setSelectedRequest(refund); setActionType('process'); }}
                                                >
                                                    <RefreshCw className="w-4 h-4 mr-2" />
                                                    Marcar Pago
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === 'approve' && 'Aprovar Reembolso'}
                            {actionType === 'reject' && 'Rejeitar Reembolso'}
                            {actionType === 'process' && 'Confirmar Pagamento do Reembolso'}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === 'approve' && 'Isso aprovará o reembolso mas NÃO estornará o dinheiro automaticamente. Você precisará processar o estorno manualmente no gateway de pagamento.'}
                            {actionType === 'reject' && 'O usuário será notificado que o reembolso foi negado.'}
                            {actionType === 'process' && 'Confirme que você realizou o estorno financeiro (PIX/Cartão). Esta ação reverterá os splits financeiros na plataforma.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        {selectedRequest && (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-md text-sm">
                                    <p><strong>Participante:</strong> {selectedRequest.patient_name}</p>
                                    <p><strong>Valor:</strong> {formatCurrency(selectedRequest.eventos?.valor || 0)}</p>
                                    <p><strong>Motivo do Cliente:</strong> {selectedRequest.cancellation_reason || 'Não informado'}</p>
                                    {selectedRequest.payment_id && <p className='mt-2 text-xs text-gray-500'>ID Pagamento: {selectedRequest.payment_id}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Observações Internas (Opcional)</label>
                                    <Textarea
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Adicione notas sobre a decisão..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedRequest(null)}>Cancelar</Button>
                        <Button
                            onClick={handleAction}
                            disabled={processing}
                            variant={actionType === 'reject' ? 'destructive' : 'default'}
                        >
                            {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
