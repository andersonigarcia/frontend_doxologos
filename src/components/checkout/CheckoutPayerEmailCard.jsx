import React from 'react';
import { Card } from '@/components/ui/card';

const CheckoutPayerEmailCard = ({
    payerEmail,
    setPayerEmail,
    payerEmailError,
    setPayerEmailError,
    processing,
    fallbackEmail,
    isValidEmail
}) => {
    return (
        <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                E-mail para confirmação
            </h2>
            <p className="text-xs text-gray-500 mb-3">
                Usado pelo Mercado Pago para confirmar o pagamento. Se o e-mail estiver errado, corrija-o aqui.
            </p>
            <div className="relative">
                <input
                    id="payer-email-input"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={payerEmail}
                    onChange={(e) => {
                        setPayerEmail(e.target.value);
                        if (payerEmailError) setPayerEmailError('');
                    }}
                    disabled={processing}
                    className={`w-full px-4 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 ${
                        payerEmailError
                            ? 'border-red-400 bg-red-50 focus:ring-red-300'
                            : 'border-gray-300 focus:ring-[#2d8659]/40'
                    }`}
                />
                {payerEmailError && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" x2="12" y1="8" y2="12" />
                            <line x1="12" x2="12.01" y1="16" y2="16" />
                        </svg>
                        {payerEmailError}
                    </p>
                )}
            </div>
            {/* Prévia do e-mail que será usado caso o campo esteja vazio */}
            {!payerEmail && fallbackEmail && (
                <p className="mt-2 text-xs text-gray-400">
                    E-mail do cadastro: <span className="font-mono">{fallbackEmail}</span>
                    {!isValidEmail(fallbackEmail) && (
                        <span className="ml-2 text-red-500 font-semibold">⚠ inválido — preencha o campo acima</span>
                    )}
                </p>
            )}
        </Card>
    );
};

export default CheckoutPayerEmailCard;
