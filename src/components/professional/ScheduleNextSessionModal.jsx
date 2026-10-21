import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Clock,
    User,
    Mail,
    Phone,
    CheckCircle2,
    CalendarPlus,
    X,
    Loader2,
    ArrowRight,
    AlertCircle,
    DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createBooking } from '@/services/bookingService';

/**
 * ScheduleNextSessionModal - Modal de Reagendamento Imediato de Próxima Sessão
 * 
 * Permite ao psicólogo agendar a continuidade do tratamento no encerramento da consulta,
 * sugerindo automaticamente a mesma hora na semana seguinte (+7 dias),
 * com cálculo de honorários e garantia de permanência na plataforma (anti-desintermediação).
 */
export const ScheduleNextSessionModal = ({
    isOpen,
    onClose,
    patient,
    currentProfessional,
    services = [],
    onBookingCreated
}) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sugestão automática: mesma hora da semana seguinte
    const defaultDate = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().split('T')[0];
    }, []);

    const defaultTime = useMemo(() => {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        return `${hours}:00`;
    }, []);

    // Serviços disponíveis para o profissional
    const availableServices = useMemo(() => {
        if (!Array.isArray(services) || services.length === 0) return [];
        if (!currentProfessional) return services;
        const profServices = currentProfessional.services_ids || [];
        if (profServices.length === 0) return services;
        return services.filter(s => profServices.includes(s.id));
    }, [services, currentProfessional]);

    const defaultServiceId = useMemo(() => {
        if (availableServices.length > 0) {
            return availableServices[0].id;
        }
        return services[0]?.id || '';
    }, [availableServices, services]);

    const [formData, setFormData] = useState({
        booking_date: defaultDate,
        booking_time: defaultTime,
        service_id: defaultServiceId,
        status: 'confirmed', // 'confirmed' ou 'pending_payment'
        notes: ''
    });

    const selectedService = useMemo(() => {
        return services.find(s => s.id === formData.service_id) || availableServices[0] || null;
    }, [services, availableServices, formData.service_id]);

    if (!isOpen || !patient) return null;

    const handleQuickDatePreset = (daysAhead) => {
        const d = new Date();
        d.setDate(d.getDate() + daysAhead);
        setFormData(prev => ({ ...prev, booking_date: d.toISOString().split('T')[0] }));
    };

    const handleSubmit = async () => {
        if (!formData.booking_date || !formData.booking_time) {
            toast({
                variant: 'destructive',
                title: 'Campos obrigatórios',
                description: 'Por favor, selecione data e horário da próxima sessão.'
            });
            return;
        }

        try {
            setIsSubmitting(true);

            const servicePrice = Number(selectedService?.price || 150);
            const payoutRate = Number(selectedService?.professional_payout || (servicePrice * 0.6));

            const bookingPayload = {
                professional_id: currentProfessional?.id || null,
                service_id: formData.service_id || selectedService?.id || null,
                patient_name: patient.name,
                patient_email: patient.email || null,
                patient_phone: patient.phone || null,
                booking_date: formData.booking_date,
                booking_time: formData.booking_time.slice(0, 5),
                status: formData.status,
                valor_consulta: servicePrice,
                valor_repasse_profissional: payoutRate
            };

            const created = await createBooking(bookingPayload);

            toast({
                title: '✅ Sessão Agendada com Sucesso!',
                description: `Próximo atendimento marcado para ${new Date(formData.booking_date + 'T12:00:00').toLocaleDateString('pt-BR')} às ${formData.booking_time}.`
            });

            if (onBookingCreated) {
                onBookingCreated(created);
            }

            onClose();
        } catch (error) {
            console.error('Erro ao agendar próxima sessão:', error);
            toast({
                variant: 'destructive',
                title: 'Erro ao agendar',
                description: error.message || 'Não foi possível gravar o agendamento.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden font-sans z-10"
                >
                    {/* Header */}
                    <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                <CalendarPlus className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">Agendar Próxima Sessão</h3>
                                <p className="text-xs text-slate-400">Continuidade clínica e retenção terapêutica</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Paciente Identificado */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
                                    {patient.name?.charAt(0) || 'P'}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">{patient.name}</p>
                                    <p className="text-xs text-slate-500">{patient.email || patient.phone || 'Sem contato cadastrado'}</p>
                                </div>
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Paciente em Tratamento
                            </span>
                        </div>

                        {/* Atalhos Rápidos de Data */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                Sugestão de Período
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleQuickDatePreset(7)}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-900 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all text-center"
                                >
                                    Semana que vem (+7d)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickDatePreset(14)}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-900 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all text-center"
                                >
                                    Em 15 dias (+14d)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleQuickDatePreset(1)}
                                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-900 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all text-center"
                                >
                                    Amanhã (+1d)
                                </button>
                            </div>
                        </div>

                        {/* Data e Horário */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Data da Sessão
                                </label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.booking_date}
                                        onChange={e => setFormData(f => ({ ...f, booking_date: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Horário de Início
                                </label>
                                <div className="relative">
                                    <input
                                        type="time"
                                        value={formData.booking_time}
                                        onChange={e => setFormData(f => ({ ...f, booking_time: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Serviço & Honorário */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                Tipo de Atendimento / Serviço
                            </label>
                            <select
                                value={formData.service_id}
                                onChange={e => setFormData(f => ({ ...f, service_id: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                            >
                                {availableServices.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} — R$ {Number(s.price || 0).toFixed(2)} ({s.duration_minutes || 50} min)
                                    </option>
                                ))}
                            </select>
                            {selectedService && (
                                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                    <span>Seu repasse estimado:</span>
                                    <strong className="text-emerald-700">
                                        R$ {Number(selectedService.professional_payout || (selectedService.price * 0.6)).toFixed(2)}
                                    </strong>
                                </p>
                            )}
                        </div>

                        {/* Status da Confirmação */}
                        <div>
                            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                Status da Reserva
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData(f => ({ ...f, status: 'confirmed' }))}
                                    className={`p-2.5 rounded-xl border text-left transition-all ${formData.status === 'confirmed'
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <p className="font-bold text-xs">Confirmada</p>
                                    <p className="text-[10px] opacity-80">Garantida na agenda</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData(f => ({ ...f, status: 'pending_payment' }))}
                                    className={`p-2.5 rounded-xl border text-left transition-all ${formData.status === 'pending_payment'
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <p className="font-bold text-xs">Aguardando Pagamento</p>
                                    <p className="text-[10px] opacity-80">Reserva pendente</p>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-slate-50 border-t border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto text-xs font-semibold rounded-xl"
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="button"
                            onClick={() => handleSubmit(false)}
                            disabled={isSubmitting}
                            className="w-full sm:w-auto rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-9 px-5 flex items-center gap-1.5 shadow-xs"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gravando...</>
                            ) : (
                                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Confirmar Agendamento</>
                            )}
                        </Button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ScheduleNextSessionModal;
