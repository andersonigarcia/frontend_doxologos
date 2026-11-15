import React, { useState, useMemo } from 'react';
import {
    Share2,
    Copy,
    Check,
    QrCode,
    ExternalLink,
    Download,
    Sparkles,
    User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';

/**
 * ProfessionalShareCard - Cartão e Modal de Compartilhamento de Perfil & Agendamento
 * 
 * Permite ao psicólogo copiar seu link direto de agendamento na Doxologos (Link da Bio)
 * e gerar QR Code oficial para cartão de visitas ou materiais institucionais.
 */
export const ProfessionalShareCard = ({ currentProfessional, className = '' }) => {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);

    const shareUrl = useMemo(() => {
        if (!currentProfessional?.id) {
            return `${window.location.origin}/agendamento`;
        }
        return `${window.location.origin}/agendamento?professional=${currentProfessional.id}`;
    }, [currentProfessional?.id]);

    const qrCodeUrl = useMemo(() => {
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(shareUrl)}`;
    }, [shareUrl]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            toast({
                title: '✅ Link copiado!',
                description: 'Link direto da sua agenda oficial Doxologos pronto para colar na sua Bio do Instagram ou redes.'
            });
            setTimeout(() => setCopied(false), 3000);
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Erro ao copiar',
                description: 'Não foi possível copiar automaticamente. Selecione e copie o link manual.'
            });
        }
    };

    const handleDownloadQr = async () => {
        try {
            const res = await fetch(qrCodeUrl);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `qrcode-agenda-${currentProfessional?.name ? currentProfessional.name.toLowerCase().replace(/\s+/g, '-') : 'doxologos'}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({ title: '📥 QR Code baixado', description: 'Imagem pronta para seus materiais ou cartões.' });
        } catch {
            window.open(qrCodeUrl, '_blank');
        }
    };

    return (
        <>
            <div className={`bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/60 relative overflow-hidden font-sans ${className}`}>
                {/* Efeito sutil de fundo */}
                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                <Sparkles className="w-3.5 h-3.5" />
                            </span>
                            <h3 className="font-bold text-base text-white">Sua Agenda Online & Link da Bio</h3>
                        </div>
                        <p className="text-xs text-slate-300 max-w-xl">
                            Copie o link oficial da sua agenda para adicionar à Bio do seu Instagram ou materiais de apresentação.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setIsQrModalOpen(true)}
                            className="flex-1 sm:flex-initial rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-9 px-3.5 flex items-center gap-1.5"
                        >
                            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                            QR Code
                        </Button>
                    </div>
                </div>

                {/* Caixa do Link */}
                <div className="mt-4 pt-3.5 border-t border-slate-700/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 bg-slate-950/60 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-200 truncate select-all">
                        {shareUrl}
                    </div>

                    <Button
                        type="button"
                        size="sm"
                        onClick={handleCopy}
                        className={`rounded-xl text-xs font-bold h-9 px-4 flex items-center justify-center gap-1.5 transition-all shrink-0 ${
                            copied
                                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                : 'bg-white text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        {copied ? (
                            <><Check className="w-3.5 h-3.5" /> Copiado!</>
                        ) : (
                            <><Copy className="w-3.5 h-3.5" /> Copiar Link da Bio</>
                        )}
                    </Button>
                </div>
            </div>

            {/* Modal de QR Code para Impressão e Cartão */}
            <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl bg-white p-6 font-sans">
                    <DialogHeader className="text-center sm:text-center">
                        <DialogTitle className="text-lg font-bold text-slate-900">
                            QR Code da sua Agenda
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Ideal para colocar em cartões de visitas, receituários ou apresentar no celular.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 flex flex-col items-center justify-center">
                        <div className="p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-md">
                            <img
                                src={qrCodeUrl}
                                alt="QR Code da sua Agenda"
                                className="w-56 h-56 object-contain"
                            />
                        </div>
                        <p className="text-xs font-bold text-slate-800 mt-3">{currentProfessional?.name || 'Psicólogo Doxologos'}</p>
                        <p className="text-[11px] text-slate-500">Aponte a câmera do celular para abrir a agenda</p>
                    </div>

                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsQrModalOpen(false)}
                            className="rounded-xl text-xs font-semibold"
                        >
                            Fechar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleDownloadQr}
                            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Baixar Imagem do QR Code
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ProfessionalShareCard;
