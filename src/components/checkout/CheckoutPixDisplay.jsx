import React from 'react';
import { Smartphone, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { QRCodeSVG } from 'qrcode.react';
import { CLINIC_CONTACT } from '@/constants/contact';
import analytics from '@/lib/analytics';

const CheckoutPixDisplay = ({
    pixPayment,
    paymentStatus,
    onCopyPix
}) => {
    if (!pixPayment?.qrCode) return null;

    return (
        <Card className="p-5 sm:p-6 border-2 border-emerald-500/30 shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-center text-emerald-900 flex items-center justify-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                Pague com PIX
            </h3>

            <div className="flex flex-col items-center">
                {/* Destaque Mobile: Copia e Cola no mesmo aparelho */}
                <div className="w-full bg-emerald-50/80 border border-emerald-200 p-4 rounded-xl mb-5 text-center">
                    <p className="text-xs font-semibold text-emerald-800 mb-2">
                        📲 Pagamento no celular: Copie o código abaixo e cole no app do seu banco
                    </p>

                    <Button
                        size="lg"
                        onClick={onCopyPix}
                        className="w-full bg-[#2d8659] hover:bg-[#236b47] text-white font-bold h-12 text-base shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all touch-manipulation"
                    >
                        <Smartphone className="w-5 h-5" />
                        Copiar Código PIX Copia e Cola
                    </Button>

                    <div className="mt-3 flex items-center gap-2">
                        <input
                            type="text"
                            value={pixPayment.qrCode}
                            readOnly
                            className="flex-1 px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-mono text-gray-700 truncate"
                        />
                    </div>
                </div>

                {/* QR Code visível com mínimo de 200px (220px) para escaneamento */}
                <div className="w-full text-center mb-5 flex flex-col items-center">
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                        📷 Ou escaneie o QR Code abaixo com a câmera do app do banco:
                    </p>
                    <div className="bg-white p-3 rounded-2xl border-2 border-emerald-100 shadow-sm inline-flex items-center justify-center min-w-[220px] min-h-[220px]">
                        <QRCodeSVG
                            value={pixPayment.qrCode}
                            size={220}
                            level="M"
                        />
                    </div>
                    <p className="text-xs text-gray-600 mt-2 font-medium">
                        Aprovação instantânea em até 3 segundos após o pagamento
                    </p>
                </div>

                <div className="w-full text-center border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-center gap-2 text-amber-700 mb-1">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <p className="font-semibold text-sm">
                            {paymentStatus?.status === 'approved'
                                ? '🎉 Pagamento Aprovado!'
                                : 'Aguardando pagamento no banco...'}
                        </p>
                    </div>
                    <p className="text-xs text-gray-500">
                        Status: <span className="font-mono font-bold text-gray-700">{paymentStatus?.status || 'pendente'}</span> • A confirmação é automática (sem precisar recarregar a tela).
                    </p>
                    <div className="mt-4 pt-3 border-t border-gray-100">
                        <a
                            href={`https://wa.me/${CLINIC_CONTACT.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Estou na tela de pagamento PIX e preciso de ajuda para concluir meu agendamento.')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                                try {
                                    analytics.trackEvent('whatsapp_click', {
                                        event_category: 'checkout',
                                        event_label: 'pix_help'
                                    });
                                } catch (e) {}
                            }}
                            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#1b5e20] hover:underline min-h-[36px]"
                        >
                            <MessageCircle className="w-4 h-4" />
                            Teve dificuldade com o PIX? Fale conosco no WhatsApp
                        </a>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default CheckoutPixDisplay;
