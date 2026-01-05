import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Modal de Aviso de Pagamento Existente
 * 
 * Exibido quando o usuário tenta criar um novo pagamento mas já existe
 * um pagamento pendente para o mesmo agendamento.
 * 
 * Previne pagamentos duplicados e confusão do usuário.
 */
const ExistingPaymentModal = ({ payment, onContinue, onNewPayment, onClose }) => {
    if (!payment) return null;

    // Calcular tempo desde criação
    const getTimeSince = (createdAt) => {
        const now = new Date();
        const created = new Date(createdAt);
        const diffMs = now - created;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'menos de 1 minuto';
        if (diffMins === 1) return '1 minuto';
        if (diffMins < 60) return `${diffMins} minutos`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) return '1 hora';
        if (diffHours < 24) return `${diffHours} horas`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return '1 dia';
        return `${diffDays} dias`;
    };

    const timeSince = getTimeSince(payment.created_at);
    const isPending = payment.status === 'pending' || payment.status === 'in_process';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full"
                >
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0">
                            {isPending ? (
                                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-yellow-600" />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <XCircle className="w-6 h-6 text-red-600" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {isPending ? 'Pagamento em Andamento' : 'Pagamento Anterior Detectado'}
                            </h3>
                            <p className="text-sm text-gray-600">
                                Detectamos um pagamento {payment.payment_method_id === 'pix' ? 'PIX' : ''} criado há{' '}
                                <strong>{timeSince}</strong>.
                            </p>
                        </div>
                    </div>

                    {/* Status do pagamento */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <span className="text-gray-500">Status:</span>
                                <span className="ml-2 font-medium capitalize">
                                    {payment.status === 'pending' ? 'Pendente' :
                                        payment.status === 'in_process' ? 'Processando' :
                                            payment.status}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500">Método:</span>
                                <span className="ml-2 font-medium uppercase">
                                    {payment.payment_method_id || 'PIX'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Aviso */}
                    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-900">
                                <p className="font-semibold mb-1">⚠️ Atenção: Risco de Cobrança Duplicada</p>
                                <p>
                                    Criar um novo pagamento pode resultar em <strong>cobrança duplicada</strong>.
                                    Recomendamos continuar com o pagamento existente.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col gap-3">
                        {isPending && payment.qr_code && (
                            <Button
                                onClick={onContinue}
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                                <Clock className="w-4 h-4 mr-2" />
                                Continuar com Pagamento Existente
                            </Button>
                        )}

                        <Button
                            onClick={onNewPayment}
                            variant="outline"
                            className="w-full border-2 border-gray-300"
                        >
                            Criar Novo Pagamento Mesmo Assim
                        </Button>

                        <Button
                            onClick={onClose}
                            variant="ghost"
                            className="w-full"
                        >
                            Cancelar
                        </Button>
                    </div>

                    {/* Nota de rodapé */}
                    <p className="text-xs text-gray-500 text-center mt-4">
                        Em caso de pagamento duplicado, o reembolso é processado em até 48h
                    </p>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ExistingPaymentModal;
