import React from 'react';
import { Lock, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

const CheckoutPaymentMethodSelector = ({
    paymentMethods,
    selectedMethod,
    onSelectMethod,
    processing,
    creditCoversTotal
}) => {
    return (
        <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
                <Lock className="w-5 h-5 mr-2 text-green-600" />
                Escolha o método de pagamento
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {paymentMethods.map((method) => (
                    <button
                        key={method.id}
                        type="button"
                        onClick={() => onSelectMethod(method.id)}
                        disabled={!method.available || processing || creditCoversTotal}
                        className={`p-4 rounded-lg border-2 transition-all relative text-left ${
                            selectedMethod === method.id
                                ? 'border-[#2d8659] bg-[#2d8659]/5'
                                : 'border-gray-200 hover:border-[#2d8659]/50'
                        } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {method.badge && (
                            <span className="absolute top-2 right-2 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                                {method.badge}
                            </span>
                        )}
                        <div className="flex items-center gap-3 mb-2">
                            <div className="text-[#2d8659]">{method.icon}</div>
                            <div className="text-left">
                                <p className="font-semibold text-gray-900">{method.name}</p>
                                <p className="text-xs text-gray-600">{method.description}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {(selectedMethod === 'credit_card' || selectedMethod === 'debit_card') && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Opção Segura: Formulário de Cartão Integrado
                    </h4>
                    <ul className="text-sm text-green-800 space-y-1 mb-3">
                        <li>✅ Pague diretamente sem sair do site</li>
                        <li>✅ Formulário integrado e protegido por SSL</li>
                        <li>✅ Tokenização instantânea via Mercado Pago SDK</li>
                        <li>✅ Compatível com Visa, Master, Elo, Hipercard e Amex</li>
                    </ul>
                    <p className="text-xs text-green-700 italic">
                        Ou escolha a opção tradicional via redirect seguro do Mercado Pago
                    </p>
                </div>
            )}

            {selectedMethod === 'pix' && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                        ✨ <strong>PIX é instantâneo!</strong> Após o pagamento, seu agendamento será confirmado automaticamente em até 3 segundos.
                    </p>
                </div>
            )}

            {selectedMethod === 'bank_transfer' && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-900">
                        ⏱️ <strong>Atenção:</strong> O boleto bancário pode levar até 2 dias úteis para compensação.
                    </p>
                </div>
            )}
        </Card>
    );
};

export default CheckoutPaymentMethodSelector;
