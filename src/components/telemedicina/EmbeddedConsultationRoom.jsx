import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Clock, Shield, Maximize2, Minimize2, PhoneOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const EmbeddedConsultationRoom = ({
    roomUrl,
    token,
    durationMinutes = 50,
    isOwner = false,
    participantName = 'Participante',
    onSessionEnd,
}) => {
    const [loading, setLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [timeLeftSeconds, setTimeLeftSeconds] = useState(durationMinutes * 60);
    const containerRef = useRef(null);
    const iframeRef = useRef(null);

    // Constrói a URL do Daily Prebuilt com o token e preferências em português
    const embedUrl = roomUrl
        ? `${roomUrl}?t=${token || ''}&lang=pt&showLeaveButton=true`
        : '';

    // Cronômetro dinâmico da sessão
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeftSeconds(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Escuta eventos do Daily via postMessage (ex: left-meeting)
    useEffect(() => {
        const handleMessage = (e) => {
            if (e.data && e.data.action === 'left-meeting') {
                if (onSessionEnd) onSessionEnd();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onSessionEnd]);

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    };

    const formatTimer = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const isRunningLow = timeLeftSeconds <= 300; // Últimos 5 minutos

    return (
        <div 
            ref={containerRef}
            className={`relative w-full rounded-2xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800 transition-all ${
                isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[75vh] min-h-[580px]'
            }`}
        >
            {/* Barra de Status e Controles no Topo */}
            <div className="absolute top-0 inset-x-0 h-14 bg-gradient-to-b from-slate-950/90 to-transparent z-20 px-6 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-white tracking-wide uppercase flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        Sala Segura Doxologos
                    </span>
                    {isOwner && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-medium">
                            Anfitrião (Psicólogo)
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3 pointer-events-auto">
                    {/* Timer da Consulta */}
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium backdrop-blur-md border ${
                        isRunningLow 
                            ? 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse'
                            : 'bg-slate-900/80 text-slate-200 border-slate-700/60'
                    }`}>
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{formatTimer(timeLeftSeconds)}</span>
                        {isRunningLow && <span className="text-[10px] text-red-300 ml-1">(Término próximo)</span>}
                    </div>

                    {/* Botão de Tela Cheia */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700/60 backdrop-blur-md transition-colors"
                        title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                        type="button"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Loading Overlay com Animação */}
            {loading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 text-white p-6">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Conectando à Teleconsulta</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto">
                            Preparando ambiente seguro e criptografado para o seu atendimento...
                        </p>
                    </motion.div>
                </div>
            )}

            {/* IFrame Seguro da Teleconsulta Daily.co */}
            {embedUrl ? (
                <iframe
                    ref={iframeRef}
                    src={embedUrl}
                    allow="camera; microphone; fullscreen; display-capture; autoplay; encrypted-media"
                    onLoad={() => setLoading(false)}
                    className="w-full h-full border-0 rounded-2xl"
                    title="Teleconsulta Doxologos"
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
                    <h3 className="text-lg font-bold">Falha ao carregar sala virtual</h3>
                    <p className="text-sm text-slate-400 mt-1 mb-4">Não foi possível inicializar a sala de vídeo.</p>
                    {onSessionEnd && (
                        <Button onClick={onSessionEnd} variant="outline" className="border-slate-700 text-white">
                            Voltar à Sala de Espera
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
