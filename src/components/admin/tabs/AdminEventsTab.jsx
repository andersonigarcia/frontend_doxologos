import React, { useState } from 'react';
import { Calendar, Users, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { secureLog } from '@/lib/secureLogger';
import ConfirmDialog from '@/components/ConfirmDialog';

export const generateUniqueSlug = (title) => {
    const baseSlug = (title || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    const timestamp = Date.now().toString().slice(-6);
    return `${baseSlug}-${timestamp}`;
};

export const slugifyTitle = (title) => {
    if (!title) return '';
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

const parseDateTime = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeDateTime = (value) => {
    if (!value) return null;
    return value.length === 16 ? `${value}:00` : value;
};

const sanitizeNullableText = (value) => {
    if (value === null || value === undefined) return null;
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
};

const getSmartDefaultDateTime = (hoursFromNow = 0, roundToNext = 'hour') => {
    const now = new Date();
    now.setHours(now.getHours() + hoursFromNow);

    if (roundToNext === 'hour') {
        now.setMinutes(0, 0, 0);
        now.setHours(now.getHours() + 1);
    } else if (roundToNext === 'halfhour') {
        const minutes = now.getMinutes();
        if (minutes < 30) {
            now.setMinutes(30, 0, 0);
        } else {
            now.setMinutes(0, 0, 0);
            now.setHours(now.getHours() + 1);
        }
    }

    return now.toISOString().slice(0, 16);
};

export function AdminEventsTab({ events = [], professionals = [], onRefresh }) {
    const { toast } = useToast();

    const [eventFormData, setEventFormData] = useState({
        id: null,
        titulo: '',
        descricao: '',
        tipo_evento: 'Workshop',
        data_inicio: getSmartDefaultDateTime(24, 'hour'),
        data_fim: getSmartDefaultDateTime(26, 'hour'),
        professional_id: '',
        limite_participantes: '30',
        data_limite_inscricao: getSmartDefaultDateTime(23, 'hour'),
        valor: 0,
        link_slug: '',
        data_inicio_exibicao: getSmartDefaultDateTime(0, 'hour'),
        data_fim_exibicao: getSmartDefaultDateTime(24, 'hour'),
        vagas_disponiveis: 0,
        meeting_link: '',
        meeting_password: '',
        meeting_id: '',
        meeting_start_url: '',
        meeting_link_release_minutes: 60,
        ativo: true,
        platform_fee_type: 'percentage',
        platform_fee_value: 20.00
    });

    const [isEditingEvent, setIsEditingEvent] = useState(false);
    const [eventFormErrors, setEventFormErrors] = useState({});
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
    const [showManualZoomFields, setShowManualZoomFields] = useState(false);
    const [isFreeEvent, setIsFreeEvent] = useState(true);

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        warningMessage: '',
        type: 'danger',
        onConfirm: () => {}
    });

    const clearEventError = (field) => {
        if (eventFormErrors[field]) {
            setEventFormErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const resetEventForm = () => {
        setIsEditingEvent(false);
        setEventFormErrors({});
        setSlugManuallyEdited(false);
        setShowManualZoomFields(false);
        setIsFreeEvent(true);
        setEventFormData({
            id: null,
            titulo: '',
            descricao: '',
            tipo_evento: 'Workshop',
            data_inicio: getSmartDefaultDateTime(24, 'hour'),
            data_fim: getSmartDefaultDateTime(26, 'hour'),
            professional_id: '',
            limite_participantes: '30',
            data_limite_inscricao: getSmartDefaultDateTime(23, 'hour'),
            valor: 0,
            vagas_disponiveis: 0,
            link_slug: '',
            data_inicio_exibicao: getSmartDefaultDateTime(0, 'hour'),
            data_fim_exibicao: getSmartDefaultDateTime(24, 'hour'),
            meeting_link: '',
            meeting_password: '',
            meeting_id: '',
            meeting_start_url: '',
            meeting_link_release_minutes: 60,
            ativo: true,
            platform_fee_type: 'percentage',
            platform_fee_value: 20.00
        });
    };

    const handleEditEvent = (event) => {
        const formatDateForInput = (value) => {
            if (!value) return '';
            const parsed = new Date(value);
            return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 16);
        };

        setIsEditingEvent(true);
        setEventFormErrors({});
        setEventFormData({
            ...event,
            data_inicio: formatDateForInput(event.data_inicio),
            data_fim: formatDateForInput(event.data_fim),
            data_limite_inscricao: formatDateForInput(event.data_limite_inscricao),
            data_inicio_exibicao: formatDateForInput(event.data_inicio_exibicao),
            data_fim_exibicao: formatDateForInput(event.data_fim_exibicao),
            professional_id: event.professional_id || '',
            limite_participantes: event.limite_participantes != null ? String(event.limite_participantes) : '',
            vagas_disponiveis: event.vagas_disponiveis != null ? Number(event.vagas_disponiveis) : 0,
            valor: event.valor != null ? Number(event.valor) : 0,
            link_slug: event.link_slug || '',
            meeting_link: event.meeting_link || '',
            meeting_password: event.meeting_password || '',
            meeting_id: event.meeting_id || '',
            meeting_start_url: event.meeting_start_url || '',
            meeting_link_release_minutes: event.meeting_link_release_minutes ?? 60,
            ativo: event.ativo !== undefined ? event.ativo : true,
            platform_fee_type: event.platform_fee_type || 'percentage',
            platform_fee_value: event.platform_fee_value != null ? Number(event.platform_fee_value) : 20.00
        });
        setSlugManuallyEdited(Boolean(event.link_slug));
        setShowManualZoomFields(Boolean(event.meeting_link || event.meeting_start_url));
        setIsFreeEvent(!(Number(event.valor) > 0));
    };

    const handleDeleteEvent = async (eventId) => {
        const event = events.find(e => e.id === eventId);
        if (!event) return;

        try {
            let inscricoesData = [];
            try {
                const { data, error } = await supabase
                    .from('inscricoes_eventos')
                    .select('id')
                    .eq('evento_id', eventId);

                if (!error) {
                    inscricoesData = data || [];
                }
            } catch (error) {
                secureLog.error('Erro ao carregar inscrições do evento:', error?.message || error);
                inscricoesData = [];
            }

            let warningMessage = '';
            if (inscricoesData?.length > 0) {
                warningMessage = `Este evento possui ${inscricoesData.length} inscrição(ões).\nAs inscrições também serão excluídas.`;
            }

            setConfirmDialog({
                isOpen: true,
                title: 'Excluir Evento',
                message: `Tem certeza que deseja excluir o evento "${event.titulo}"?`,
                warningMessage,
                type: 'danger',
                onConfirm: async () => {
                    if (inscricoesData?.length > 0) {
                        try {
                            const { error: inscricoesError } = await supabase
                                .from('inscricoes_eventos')
                                .delete()
                                .eq('evento_id', eventId);

                            if (inscricoesError) {
                                secureLog.error('Erro ao excluir inscrições do evento:', inscricoesError?.message || inscricoesError);
                                toast({ variant: 'destructive', title: 'Erro ao excluir inscrições do evento' });
                                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                return;
                            }
                        } catch (error) {
                            secureLog.error('Erro inesperado ao excluir inscrições do evento:', error?.message || error);
                        }
                    }

                    const { error } = await supabase.from('eventos').delete().eq('id', eventId);
                    if (error) {
                        secureLog.error('Erro ao excluir evento:', error?.message || error);
                        toast({ variant: 'destructive', title: 'Erro ao excluir evento', description: error.message });
                    } else {
                        toast({ title: 'Evento excluído com sucesso!' });
                        onRefresh?.();
                    }
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }
            });
        } catch (error) {
            secureLog.error('Erro inesperado ao preparar exclusão de evento:', error?.message || error);
            toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Não foi possível verificar o evento.' });
        }
    };

    const handleEventSubmit = async (e) => {
        e.preventDefault();

        const errors = {};
        const trimmedTitle = eventFormData.titulo?.trim() || '';
        const trimmedDescription = eventFormData.descricao?.trim() || '';
        const professionalId = eventFormData.professional_id;
        const startDate = parseDateTime(eventFormData.data_inicio);
        const endDate = parseDateTime(eventFormData.data_fim);
        const signupDeadlineDate = parseDateTime(eventFormData.data_limite_inscricao);
        const displayStartDate = parseDateTime(eventFormData.data_inicio_exibicao);
        const displayEndDate = parseDateTime(eventFormData.data_fim_exibicao);

        const limit = Number.parseInt(eventFormData.limite_participantes, 10);
        const rawVagas = eventFormData.vagas_disponiveis;
        const vagasDisponiveis = rawVagas === '' || rawVagas === null || rawVagas === undefined
            ? 0
            : Number.parseInt(rawVagas, 10);
        const rawValor = eventFormData.valor;
        const valor = rawValor === '' || rawValor === null || rawValor === undefined
            ? (isFreeEvent ? 0 : Number.NaN)
            : Number.parseFloat(rawValor);

        if (!trimmedTitle) {
            errors.titulo = 'Informe um título para o evento.';
        }

        if (!professionalId) {
            errors.professional_id = 'Selecione um profissional responsável.';
        }

        if (!startDate) {
            errors.data_inicio = 'Informe a data e hora de início.';
        }

        if (!endDate) {
            errors.data_fim = 'Informe a data e hora de término.';
        }

        if (startDate && endDate && endDate <= startDate) {
            errors.data_fim = 'A data e hora de término devem ser posteriores ao início.';
        }

        if (!Number.isFinite(limit) || limit <= 0) {
            errors.limite_participantes = 'Defina o limite de vagas (mínimo 1).';
        }

        if (!Number.isFinite(vagasDisponiveis) || vagasDisponiveis < 0) {
            errors.vagas_disponiveis = 'Informe as vagas disponíveis na sala (zero para ilimitado).';
        }

        if (!Number.isFinite(valor) || valor < 0 || (!isFreeEvent && valor === 0)) {
            errors.valor = isFreeEvent
                ? 'Defina um valor válido (use 0 para evento gratuito).'
                : 'Informe o valor cobrado (maior que zero).';
        }

        if (!signupDeadlineDate) {
            errors.data_limite_inscricao = 'Informe a data limite para inscrições.';
        } else if (startDate && signupDeadlineDate >= startDate) {
            errors.data_limite_inscricao = 'O limite de inscrição precisa ocorrer antes do início do evento.';
        }

        if (displayStartDate && displayEndDate && displayEndDate < displayStartDate) {
            errors.data_fim_exibicao = 'O fim da exibição deve ser posterior ao início.';
        }

        if (displayStartDate && startDate && displayStartDate > startDate) {
            errors.data_inicio_exibicao = 'A exibição deve começar antes do evento iniciar.';
        }

        if (displayEndDate && startDate && displayEndDate < startDate) {
            errors.data_fim_exibicao = 'Mantenha o evento visível pelo menos até o início.';
        }

        const existingEvent = isEditingEvent ? events.find(evt => evt.id === eventFormData.id) : null;
        const existingRegistrations = existingEvent?.inscricoes_eventos?.[0]?.count || 0;

        if (!errors.limite_participantes && isEditingEvent && Number.isFinite(limit) && existingRegistrations > 0 && limit < existingRegistrations) {
            errors.limite_participantes = `Já existem ${existingRegistrations} inscrições. Ajuste o limite para pelo menos esse total.`;
        }

        if (!errors.vagas_disponiveis && isEditingEvent && Number.isFinite(vagasDisponiveis) && vagasDisponiveis > 0 && existingRegistrations > 0 && vagasDisponiveis < existingRegistrations) {
            errors.vagas_disponiveis = `Já existem ${existingRegistrations} inscrições. Defina vagas suficientes na sala.`;
        }

        if (Object.keys(errors).length > 0) {
            setEventFormErrors(errors);
            const firstErrorKey = Object.keys(errors)[0];
            toast({
                variant: 'destructive',
                title: 'Revise os campos do evento',
                description: errors[firstErrorKey]
            });
            return;
        }

        setEventFormErrors({});

        let finalLinkSlug = (eventFormData.link_slug || '').trim().toLowerCase();
        const originalSlug = (eventFormData.link_slug || '').trim().toLowerCase();

        if (!finalLinkSlug) {
            finalLinkSlug = generateUniqueSlug(trimmedTitle);
            setEventFormData(prev => ({ ...prev, link_slug: finalLinkSlug }));
            toast({
                title: 'Slug gerado automaticamente',
                description: `Link do evento: ${finalLinkSlug}`
            });
        } else {
            const slugRegex = /^[a-z0-9-]+$/;
            if (!slugRegex.test(finalLinkSlug)) {
                const message = 'Use apenas letras minúsculas, números e hífens no slug.';
                setEventFormErrors(prev => ({ ...prev, link_slug: message }));
                toast({
                    variant: 'destructive',
                    title: 'Slug inválido',
                    description: message
                });
                return;
            }

            const shouldCheckSlug = !isEditingEvent || finalLinkSlug !== originalSlug;
            if (shouldCheckSlug) {
                const { data: slugMatches, error: slugCheckError } = await supabase
                    .from('eventos')
                    .select('id')
                    .eq('link_slug', finalLinkSlug)
                    .limit(1);

                if (slugCheckError) {
                    secureLog.error('Erro ao validar slug de evento:', slugCheckError?.message || slugCheckError);
                    toast({
                        variant: 'destructive',
                        title: 'Erro ao validar slug',
                        description: slugCheckError.message || 'Não foi possível validar o link. Tente novamente.'
                    });
                    return;
                }

                if (slugMatches && slugMatches.length > 0 && (!isEditingEvent || slugMatches[0].id !== eventFormData.id)) {
                    finalLinkSlug = generateUniqueSlug(trimmedTitle);
                    setEventFormData(prev => ({ ...prev, link_slug: finalLinkSlug }));
                    toast({
                        title: 'Slug ajustado automaticamente',
                        description: `Já existia um evento com este link. Usamos: ${finalLinkSlug}`
                    });
                }
            }
        }

        const sanitizedMeetingFields = {
            meeting_link: sanitizeNullableText(eventFormData.meeting_link),
            meeting_password: sanitizeNullableText(eventFormData.meeting_password),
            meeting_id: sanitizeNullableText(eventFormData.meeting_id),
            meeting_start_url: sanitizeNullableText(eventFormData.meeting_start_url)
        };

        const sanitizedEventData = {
            titulo: trimmedTitle,
            descricao: trimmedDescription || null,
            tipo_evento: eventFormData.tipo_evento || 'Workshop',
            professional_id: professionalId,
            data_inicio: normalizeDateTime(eventFormData.data_inicio),
            data_fim: normalizeDateTime(eventFormData.data_fim),
            data_limite_inscricao: normalizeDateTime(eventFormData.data_limite_inscricao),
            limite_participantes: limit,
            vagas_disponiveis: Number.isFinite(vagasDisponiveis) ? vagasDisponiveis : 0,
            valor: Number.isFinite(valor) ? valor : 0,
            data_inicio_exibicao: eventFormData.data_inicio_exibicao ? normalizeDateTime(eventFormData.data_inicio_exibicao) : null,
            data_fim_exibicao: eventFormData.data_fim_exibicao ? normalizeDateTime(eventFormData.data_fim_exibicao) : null,
            ativo: eventFormData.ativo === undefined ? true : !!eventFormData.ativo,
            link_slug: finalLinkSlug,
            platform_fee_type: eventFormData.platform_fee_type || 'percentage',
            platform_fee_value: Number(eventFormData.platform_fee_value) || 0,
            ...sanitizedMeetingFields
        };

        let result;
        if (isEditingEvent) {
            const { id } = eventFormData;
            result = await supabase
                .from('eventos')
                .update(sanitizedEventData)
                .eq('id', id)
                .select();
        } else {
            result = await supabase
                .from('eventos')
                .insert([sanitizedEventData])
                .select();
        }

        if (result.error) {
            secureLog.error('Erro ao salvar evento:', result.error?.message || result.error);
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar evento',
                description: result.error.message
            });
            return;
        }

        toast({ title: `Evento ${isEditingEvent ? 'atualizado' : 'criado'} com sucesso!` });
        resetEventForm();
        onRefresh?.();
    };

    const priceNumber = Number(eventFormData.valor) || 0;
    const hasPaidValue = priceNumber > 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center">
                    <Calendar className="w-6 h-6 mr-2 text-[#2d8659]" /> Eventos
                </h2>
                {events.map((event, index) => {
                    const dataInicio = new Date(event.data_inicio);
                    const dataFim = new Date(event.data_fim);
                    const dataExpiracao = new Date(event.data_limite_inscricao);
                    const isExpired = dataExpiracao < new Date();
                    const inscricoes = event.inscricoes_eventos?.[0]?.count || 0;

                    return (
                        <div
                            key={event.id}
                            className={`border rounded-lg p-6 mb-4 hover:shadow-md transition-all ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            } hover:bg-blue-50`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <h3 className="font-bold text-lg text-gray-900">{event.titulo}</h3>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                        }`}>
                                            {isExpired ? 'Expirado' : 'Aberto'}
                                        </span>
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                            {event.tipo_evento}
                                        </span>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            event.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {event.ativo ? '✅ Ativo' : '⏸️ Inativo'}
                                        </span>
                                        {event.data_inicio_exibicao && event.data_fim_exibicao && (
                                            (() => {
                                                const agora = new Date();
                                                const inicioExibicao = new Date(event.data_inicio_exibicao);
                                                const fimExibicao = new Date(event.data_fim_exibicao);

                                                let statusExibicao = '';
                                                let corExibicao = '';

                                                if (agora < inicioExibicao) {
                                                    statusExibicao = '🕒 Aguardando';
                                                    corExibicao = 'bg-yellow-100 text-yellow-800';
                                                } else if (agora >= inicioExibicao && agora <= fimExibicao) {
                                                    statusExibicao = '👁️ Exibindo';
                                                    corExibicao = 'bg-purple-100 text-purple-800';
                                                } else {
                                                    statusExibicao = '🚫 Oculto';
                                                    corExibicao = 'bg-gray-100 text-gray-600';
                                                }

                                                return (
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${corExibicao}`}>
                                                        {statusExibicao}
                                                    </span>
                                                );
                                            })()
                                        )}
                                    </div>

                                    {event.descricao && (
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                            {event.descricao.length > 120
                                                ? `${event.descricao.substring(0, 120)}...`
                                                : event.descricao}
                                        </p>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-500 block">Início</span>
                                            <span className="font-medium">
                                                {dataInicio.toLocaleDateString('pt-BR')} às {dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Fim</span>
                                            <span className="font-medium">
                                                {dataFim.toLocaleDateString('pt-BR')} às {dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block">Inscrições até</span>
                                            <span className={`font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                                                {dataExpiracao.toLocaleDateString('pt-BR')} às {dataExpiracao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <span className="flex items-center text-sm text-gray-600">
                                                <Users className="w-4 h-4 mr-1" />
                                                {inscricoes} / {event.limite_participantes} inscritos
                                            </span>
                                            {event.link_slug && (
                                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                    Link: {event.link_slug}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <Button size="icon" variant="ghost" onClick={() => handleEditEvent(event)} title="Editar evento">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteEvent(event.id)} className="hover:bg-red-50" title="Excluir evento">
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="lg:col-span-7 bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6">{isEditingEvent ? 'Editar Evento' : 'Novo Evento'}</h2>
                <form onSubmit={handleEventSubmit} className="space-y-6 text-sm">
                    <section className="rounded-2xl border border-gray-100 bg-gray-50/60 p-5 space-y-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">Informações principais</h3>
                            <p className="text-xs text-gray-500">Título, descrição e quem conduz o evento.</p>
                        </div>
                        <div className="space-y-3">
                            <input
                                name="titulo"
                                value={eventFormData.titulo || ''}
                                onChange={e => {
                                    const value = e.target.value;
                                    setEventFormData(prev => {
                                        const next = { ...prev, titulo: value };
                                        if (!slugManuallyEdited) {
                                            next.link_slug = slugifyTitle(value);
                                        }
                                        return next;
                                    });
                                    clearEventError('titulo');
                                }}
                                placeholder="Título do Evento"
                                className={`w-full input ${eventFormErrors.titulo ? 'border-red-500 focus:ring-red-300' : ''}`}
                                aria-invalid={eventFormErrors.titulo ? 'true' : 'false'}
                                required
                            />
                            {eventFormErrors.titulo && (
                                <p className="text-xs text-red-500">{eventFormErrors.titulo}</p>
                            )}
                            <textarea
                                name="descricao"
                                value={eventFormData.descricao || ''}
                                onChange={e => setEventFormData(prev => ({ ...prev, descricao: e.target.value }))}
                                placeholder="Descrição do conteúdo, público e diferenciais"
                                className="w-full input"
                                rows="3"
                            />
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Formato</label>
                                    <select
                                        name="tipo_evento"
                                        value={eventFormData.tipo_evento || 'Workshop'}
                                        onChange={e => setEventFormData(prev => ({ ...prev, tipo_evento: e.target.value }))}
                                        className="w-full input"
                                    >
                                        <option value="Workshop">Workshop</option>
                                        <option value="Palestra">Palestra</option>
                                        <option value="Masterclass">Masterclass</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Profissional responsável</label>
                                    <select
                                        name="professional_id"
                                        value={eventFormData.professional_id || ''}
                                        onChange={e => {
                                            setEventFormData(prev => ({ ...prev, professional_id: e.target.value }));
                                            clearEventError('professional_id');
                                        }}
                                        className={`w-full input ${eventFormErrors.professional_id ? 'border-red-500 focus:ring-red-300' : ''}`}
                                        aria-invalid={eventFormErrors.professional_id ? 'true' : 'false'}
                                        required
                                    >
                                        <option value="">Selecione o profissional</option>
                                        {professionals.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    {eventFormErrors.professional_id && (
                                        <p className="text-xs text-red-500 mt-1">{eventFormErrors.professional_id}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-gray-100 p-5 space-y-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-base font-semibold text-gray-800">Agenda e inscrições</h3>
                                <p className="text-xs text-gray-500">Defina datas, limite de vagas e valor do evento.</p>
                            </div>
                            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-[#2d8659]"
                                    checked={isFreeEvent}
                                    onChange={(e) => {
                                        setIsFreeEvent(e.target.checked);
                                        setEventFormData(prev => ({ ...prev, valor: e.target.checked ? 0 : '' }));
                                        clearEventError('valor');
                                    }}
                                />
                                Evento gratuito
                            </label>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Data/Hora Início</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <input
                                            type="date"
                                            value={eventFormData.data_inicio ? eventFormData.data_inicio.split('T')[0] : ''}
                                            onChange={e => {
                                                const dateValue = e.target.value;
                                                const timeValue = eventFormData.data_inicio ? eventFormData.data_inicio.split('T')[1] : '09:00';
                                                setEventFormData(prev => ({ ...prev, data_inicio: `${dateValue}T${timeValue}` }));
                                                clearEventError('data_inicio');
                                                clearEventError('data_fim');
                                            }}
                                            className={`w-full input text-sm ${eventFormErrors.data_inicio ? 'border-red-500 focus:ring-red-300' : ''}`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="time"
                                            value={eventFormData.data_inicio ? eventFormData.data_inicio.split('T')[1] || '09:00' : '09:00'}
                                            onChange={e => {
                                                const dateValue = eventFormData.data_inicio ? eventFormData.data_inicio.split('T')[0] : new Date().toISOString().split('T')[0];
                                                const timeValue = e.target.value;
                                                setEventFormData(prev => ({ ...prev, data_inicio: `${dateValue}T${timeValue}` }));
                                                clearEventError('data_inicio');
                                            }}
                                            className={`w-full input text-sm ${eventFormErrors.data_inicio ? 'border-red-500 focus:ring-red-300' : ''}`}
                                            required
                                        />
                                    </div>
                                </div>
                                {eventFormErrors.data_inicio && (
                                    <p className="text-xs text-red-500 mt-1">{eventFormErrors.data_inicio}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Data/Hora Fim</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <input
                                            type="date"
                                            value={eventFormData.data_fim ? eventFormData.data_fim.split('T')[0] : ''}
                                            onChange={e => {
                                                const dateValue = e.target.value;
                                                const timeValue = eventFormData.data_fim ? eventFormData.data_fim.split('T')[1] : '11:00';
                                                setEventFormData(prev => ({ ...prev, data_fim: `${dateValue}T${timeValue}` }));
                                                clearEventError('data_fim');
                                            }}
                                            className={`w-full input text-sm ${eventFormErrors.data_fim ? 'border-red-500 focus:ring-red-300' : ''}`}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="time"
                                            value={eventFormData.data_fim ? eventFormData.data_fim.split('T')[1] || '11:00' : '11:00'}
                                            onChange={e => {
                                                const dateValue = eventFormData.data_fim ? eventFormData.data_fim.split('T')[0] : new Date().toISOString().split('T')[0];
                                                const timeValue = e.target.value;
                                                setEventFormData(prev => ({ ...prev, data_fim: `${dateValue}T${timeValue}` }));
                                                clearEventError('data_fim');
                                            }}
                                            className={`w-full input text-sm ${eventFormErrors.data_fim ? 'border-red-500 focus:ring-red-300' : ''}`}
                                            required
                                        />
                                    </div>
                                </div>
                                {eventFormErrors.data_fim && (
                                    <p className="text-xs text-red-500 mt-1">{eventFormErrors.data_fim}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Limite de participantes</label>
                                <input
                                    type="number"
                                    name="limite_participantes"
                                    value={eventFormData.limite_participantes || ''}
                                    onChange={e => {
                                        setEventFormData(prev => ({ ...prev, limite_participantes: e.target.value }));
                                        clearEventError('limite_participantes');
                                    }}
                                    placeholder="Ex: 25"
                                    className={`w-full input ${eventFormErrors.limite_participantes ? 'border-red-500 focus:ring-red-300' : ''}`}
                                    min="1"
                                    max="500"
                                    required
                                />
                                {eventFormErrors.limite_participantes && (
                                    <p className="text-xs text-red-500 mt-1">{eventFormErrors.limite_participantes}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Vagas na sala (0 = ilimitado)</label>
                                <input
                                    type="number"
                                    name="vagas_disponiveis"
                                    value={eventFormData.vagas_disponiveis || 0}
                                    onChange={e => {
                                        const parsedValue = parseInt(e.target.value, 10);
                                        setEventFormData(prev => ({ ...prev, vagas_disponiveis: Number.isNaN(parsedValue) ? 0 : parsedValue }));
                                        clearEventError('vagas_disponiveis');
                                    }}
                                    className={`w-full input ${eventFormErrors.vagas_disponiveis ? 'border-red-500 focus:ring-red-300' : ''}`}
                                    min="0"
                                    max="1000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Liberar Link (min antes)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={eventFormData.meeting_link_release_minutes || ''}
                                        onChange={e => {
                                            const val = parseInt(e.target.value, 10);
                                            setEventFormData(prev => ({ ...prev, meeting_link_release_minutes: isNaN(val) ? 0 : val }));
                                        }}
                                        className="w-full input pr-8"
                                        min="0"
                                        placeholder="Ex: 60"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">min</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Valor do evento</label>
                                <div className={`input flex items-center ${isFreeEvent ? 'bg-gray-100 text-gray-400' : ''}`}>
                                    <span className="text-xs text-gray-500 mr-2">R$</span>
                                    <input
                                        type="number"
                                        value={isFreeEvent ? 0 : eventFormData.valor || ''}
                                        onChange={e => {
                                            const parsedValue = parseFloat(e.target.value);
                                            setEventFormData(prev => ({ ...prev, valor: Number.isNaN(parsedValue) ? '' : parsedValue }));
                                            clearEventError('valor');
                                        }}
                                        placeholder="Ex: 97,00"
                                        className="flex-1 bg-transparent outline-none"
                                        disabled={isFreeEvent}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                {eventFormErrors.valor && (
                                    <p className="text-xs text-red-500 mt-1">{eventFormErrors.valor}</p>
                                )}
                            </div>

                            {!isFreeEvent && priceNumber > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Taxa da Plataforma</label>
                                    <div className="space-y-2">
                                        <select
                                            value={eventFormData.platform_fee_type}
                                            onChange={e => setEventFormData(prev => ({ ...prev, platform_fee_type: e.target.value }))}
                                            className="input text-sm w-full"
                                        >
                                            <option value="percentage">Percentual (%)</option>
                                            <option value="fixed">Valor Fixo (R$)</option>
                                        </select>
                                        <div className="input flex items-center">
                                            <span className="text-xs text-gray-500 mr-2">
                                                {eventFormData.platform_fee_type === 'percentage' ? '%' : 'R$'}
                                            </span>
                                            <input
                                                type="number"
                                                value={eventFormData.platform_fee_value || ''}
                                                onChange={e => {
                                                    const value = parseFloat(e.target.value);
                                                    setEventFormData(prev => ({
                                                        ...prev,
                                                        platform_fee_value: Number.isNaN(value) ? '' : value
                                                    }));
                                                }}
                                                placeholder={eventFormData.platform_fee_type === 'percentage' ? 'Ex: 20' : 'Ex: 15.00'}
                                                className="flex-1 bg-transparent outline-none"
                                                min="0"
                                                step={eventFormData.platform_fee_type === 'percentage' ? '1' : '0.01'}
                                                max={eventFormData.platform_fee_type === 'percentage' ? '100' : undefined}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Limite para inscrições</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    value={eventFormData.data_limite_inscricao ? eventFormData.data_limite_inscricao.split('T')[0] : ''}
                                    onChange={e => {
                                        const dateValue = e.target.value;
                                        const timeValue = eventFormData.data_limite_inscricao ? eventFormData.data_limite_inscricao.split('T')[1] : '23:59';
                                        setEventFormData(prev => ({ ...prev, data_limite_inscricao: `${dateValue}T${timeValue}` }));
                                        clearEventError('data_limite_inscricao');
                                    }}
                                    className={`w-full input text-sm ${eventFormErrors.data_limite_inscricao ? 'border-red-500 focus:ring-red-300' : ''}`}
                                    required
                                />
                                <input
                                    type="time"
                                    value={eventFormData.data_limite_inscricao ? eventFormData.data_limite_inscricao.split('T')[1] || '23:59' : '23:59'}
                                    onChange={e => {
                                        const dateValue = eventFormData.data_limite_inscricao ? eventFormData.data_limite_inscricao.split('T')[0] : new Date().toISOString().split('T')[0];
                                        const timeValue = e.target.value;
                                        setEventFormData(prev => ({ ...prev, data_limite_inscricao: `${dateValue}T${timeValue}` }));
                                        clearEventError('data_limite_inscricao');
                                    }}
                                    className={`w-full input text-sm ${eventFormErrors.data_limite_inscricao ? 'border-red-500 focus:ring-red-300' : ''}`}
                                    required
                                />
                            </div>
                            {eventFormErrors.data_limite_inscricao && (
                                <p className="text-xs text-red-500 mt-1">{eventFormErrors.data_limite_inscricao}</p>
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-gray-100 p-5 space-y-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">Visibilidade e Transmissão</h3>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
                            <input
                                type="checkbox"
                                id="evento_ativo"
                                checked={eventFormData.ativo === true}
                                onChange={e => setEventFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                                className="w-4 h-4 text-[#2d8659] border-2 border-gray-300 rounded focus:ring-[#2d8659] focus:ring-2"
                            />
                            <label htmlFor="evento_ativo" className="text-sm font-medium text-gray-700 cursor-pointer">
                                Evento ativo e visível para pacientes
                            </label>
                        </div>

                        <div className="flex items-start justify-between gap-3 pt-2">
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800">Link da Videochamada (Google Meet/Zoom)</h4>
                            </div>
                            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-[#2d8659]"
                                    checked={showManualZoomFields}
                                    onChange={(e) => {
                                        setShowManualZoomFields(e.target.checked);
                                        if (!e.target.checked) {
                                            setEventFormData(prev => ({
                                                ...prev,
                                                meeting_link: '',
                                                meeting_password: '',
                                                meeting_id: '',
                                                meeting_start_url: ''
                                            }));
                                        }
                                    }}
                                />
                                Preencher manualmente
                            </label>
                        </div>
                        {showManualZoomFields && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1">Link para participantes</label>
                                    <input
                                        type="url"
                                        value={eventFormData.meeting_link || ''}
                                        onChange={(e) => setEventFormData(prev => ({ ...prev, meeting_link: e.target.value }))}
                                        placeholder="https://meet.google.com/xyz"
                                        className="w-full input"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">Senha da reunião</label>
                                    <input
                                        type="text"
                                        value={eventFormData.meeting_password || ''}
                                        onChange={(e) => setEventFormData(prev => ({ ...prev, meeting_password: e.target.value }))}
                                        placeholder="Opcional"
                                        className="w-full input"
                                    />
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl border border-gray-100 p-5 space-y-4">
                        <div>
                            <h3 className="text-base font-semibold text-gray-800">Link do evento (Slug)</h3>
                        </div>
                        <div className="flex gap-2">
                            <input
                                name="link_slug"
                                value={eventFormData.link_slug || ''}
                                onChange={e => {
                                    const value = e.target.value.toLowerCase();
                                    setSlugManuallyEdited(true);
                                    setEventFormData(prev => ({ ...prev, link_slug: value }));
                                    clearEventError('link_slug');
                                }}
                                placeholder="workshop-ansiedade"
                                className={`flex-1 input ${eventFormErrors.link_slug ? 'border-red-500 focus:ring-red-300' : ''}`}
                                pattern="[a-z0-9-]+"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    const slug = generateUniqueSlug(eventFormData.titulo || 'evento');
                                    setSlugManuallyEdited(true);
                                    setEventFormData(prev => ({ ...prev, link_slug: slug }));
                                    clearEventError('link_slug');
                                    toast({ title: 'Slug gerado!', description: slug });
                                }}
                                disabled={!eventFormData.titulo}
                            >
                                Gerar
                            </Button>
                        </div>

                        <div className="flex flex-col gap-2 border-t pt-4 md:flex-row md:items-center md:justify-end">
                            {isEditingEvent && (
                                <Button type="button" variant="outline" onClick={resetEventForm}>
                                    Cancelar edição
                                </Button>
                            )}
                            <Button type="submit" className="bg-[#2d8659] hover:bg-[#236b47]">
                                {isEditingEvent ? 'Salvar alterações' : 'Criar evento'}
                            </Button>
                        </div>
                    </section>
                </form>
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                warningMessage={confirmDialog.warningMessage}
                type={confirmDialog.type}
            />
        </div>
    );
}

export default AdminEventsTab;
