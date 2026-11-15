import React from 'react';
import { Smartphone, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CheckoutStickyCtaMobile = ({
    bookingTotal,
    creditCoversTotal,
    selectedMethod,
    processing,
    onPay,
    onPayDirectCard,
    formatCurrency
}) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-2xl z-40 md:hidden">
            <div className="container max-w-md mx-auto flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <span className="text-[11px] text-gray-500 font-medium block">Total</span>
                    <span className="text-lg font-bold text-[#2d8659] block leading-tight">
                        {formatCurrency(creditCoversTotal ? 0 : bookingTotal)}
                    </span>
                </div>
                <div className="flex-1">
                    {(selectedMethod === 'credit_card' || selectedMethod === 'debit_card') ? (
                        <Button
                            onClick={onPayDirectCard}
                            disabled={processing}
                            className="w-full bg-[#2d8659] hover:bg-[#236b47] text-white font-bold h-12 rounded-xl shadow-md text-sm flex items-center justify-center gap-1.5"
                        >
                            <CreditCard className="w-4 h-4" />
                            Pagar com Cartão
                        </Button>
                    ) : (
                        <Button
                            onClick={onPay}
                            disabled={processing}
                            className="w-full bg-[#2d8659] hover:bg-[#236b47] text-white font-bold h-12 rounded-xl shadow-md text-sm flex items-center justify-center gap-1.5"
                        >
                            {processing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Gerando...
                                </>
                            ) : (
                                <>
                                    <Smartphone className="w-4 h-4" />
                                    {selectedMethod === 'pix' ? 'Gerar PIX (Aprovação 3s)' : 'Continuar'}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckoutStickyCtaMobile;
