import React from 'react';
import { CreditCard } from 'lucide-react';
import { Card } from '@/components/ui/card';

const CheckoutWalletCard = ({
    creditLoading,
    creditError,
    usingCredit,
    setUsingCredit,
    processing,
    availableCreditAmount,
    creditCoversTotal,
    bookingTotal,
    formatCurrency
}) => {
    return (
        <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-green-600" />
                Créditos financeiros disponíveis
            </h2>

            {creditLoading ? (
                <div className="flex items-center text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#2d8659] mr-2"></div>
                    Carregando saldo...
                </div>
            ) : creditError ? (
                <p className="text-sm text-red-600">{creditError}</p>
            ) : (
                <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            className="form-checkbox h-5 w-5 text-[#2d8659] rounded"
                            checked={usingCredit}
                            onChange={(event) => {
                                setUsingCredit(event.target.checked);
                            }}
                            disabled={processing}
                        />
                        <div>
                            <p className="font-semibold text-gray-900">Desejo utilizar saldo da carteira nesta consulta</p>
                            <p className="text-xs text-gray-600">
                                Saldo disponível: {formatCurrency(availableCreditAmount)}
                            </p>
                        </div>
                    </label>

                    {usingCredit && !creditCoversTotal && (
                        <div className="text-xs text-yellow-700 mt-2 bg-yellow-50 p-2.5 rounded-lg border border-yellow-200">
                            O saldo da carteira cobre parcialmente o valor da consulta. O restante ({formatCurrency(bookingTotal - availableCreditAmount)}) será cobrado via Mercado Pago.
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default CheckoutWalletCard;
