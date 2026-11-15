import React from 'react';
import { Calendar, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

const CheckoutOrderSummary = ({
    type,
    packageData,
    booking,
    inscricao,
    tituloParam,
    valorParam,
    bookingTotal,
    creditCoversTotal,
    availableCreditAmount,
    formatDateSafe,
    formatCurrency
}) => {
    const creditApplied = creditCoversTotal ? bookingTotal : Math.min(bookingTotal, availableCreditAmount || 0);

    return (
        <Card className="p-6 sticky top-8">
            <h3 className="text-lg font-bold mb-4">Resumo do Pedido</h3>

            <div className="space-y-4">
                {type === 'evento' ? (
                    <>
                        <div>
                            <p className="text-sm text-gray-600">Evento</p>
                            <p className="font-semibold">{inscricao?.evento?.titulo || tituloParam}</p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-600">Participante</p>
                            <p className="font-semibold">{inscricao?.patient_name}</p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-600">Data do Evento</p>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <p className="font-semibold">
                                    {formatDateSafe(inscricao?.evento?.data_inicio)}
                                </p>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-gray-600">Valor da Inscrição</p>
                                <p className="font-semibold">
                                    {formatCurrency(inscricao?.evento?.valor || parseFloat(valorParam))}
                                </p>
                            </div>
                            <div className="flex justify-between items-center text-lg font-bold">
                                <p>Total</p>
                                <p className="text-[#2d8659]">
                                    {formatCurrency(inscricao?.evento?.valor || parseFloat(valorParam))}
                                </p>
                            </div>
                        </div>
                    </>
                ) : packageData ? (
                    <>
                        <div>
                            <p className="text-sm text-gray-600">Pacote de Consultas</p>
                            <p className="font-semibold text-gray-900">{packageData.service_name || 'Psicoterapia'}</p>
                            <p className="text-xs text-[#2d8659] font-bold mt-0.5">{packageData.total_sessions} Sessões Agendadas</p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-600">Profissional</p>
                            <p className="font-semibold">{packageData.professional_name || packageData.professionals?.name || 'Profissional'}</p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-600">Paciente</p>
                            <p className="font-semibold">{packageData.patient_name}</p>
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-gray-600">Subtotal ({packageData.total_sessions} sessões)</p>
                                <p className="font-semibold">
                                    {formatCurrency(bookingTotal)}
                                </p>
                            </div>
                            {creditCoversTotal && (
                                <div className="flex justify-between items-center mb-2 text-green-700">
                                    <p>Crédito aplicado</p>
                                    <p>-{formatCurrency(creditApplied)}</p>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-lg font-bold">
                                <p>Total</p>
                                <p className="text-[#2d8659]">
                                    {formatCurrency(creditCoversTotal ? 0 : bookingTotal)}
                                </p>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div>
                            <p className="text-sm text-gray-600">Serviço</p>
                            <p className="font-semibold">{booking?.service?.name}</p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-600">Profissional</p>
                            <p className="font-semibold">{booking?.professional?.name}</p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-600">Data e Horário</p>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <p className="font-semibold">
                                    {booking && formatDateSafe(booking.booking_date)}
                                </p>
                            </div>
                            <p className="text-sm">{booking?.booking_time}</p>
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-gray-600">Subtotal</p>
                                <p className="font-semibold">
                                    {formatCurrency(bookingTotal)}
                                </p>
                            </div>
                            {creditCoversTotal && (
                                <div className="flex justify-between items-center mb-2 text-green-700">
                                    <p>Crédito aplicado</p>
                                    <p>-{formatCurrency(creditApplied)}</p>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-lg font-bold">
                                <p>Total</p>
                                <p className="text-[#2d8659]">
                                    {formatCurrency(creditCoversTotal ? 0 : bookingTotal)}
                                </p>
                            </div>
                        </div>
                    </>
                )}

                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-green-900">
                            <p className="font-semibold mb-1">Pagamento Seguro</p>
                            <p className="text-xs">
                                Seus dados são protegidos pelo Mercado Pago, líder em segurança digital na América Latina.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default CheckoutOrderSummary;
