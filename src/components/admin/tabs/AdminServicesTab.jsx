import React, { useState, useMemo } from 'react';
import { Briefcase, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { secureLog } from '@/lib/secureLogger';

export const sanitizeCurrencyInput = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).replace(/[^0-9.,-]/g, '');
};

export const parseCurrencyToNumber = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    const sanitized = sanitizeCurrencyInput(value);
    if (!sanitized) {
        return null;
    }

    const normalized = sanitized.replace(/\./g, '').replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
};

export const formatNumberToCurrencyInput = (value) => {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    const numberValue = typeof value === 'string' ? parseCurrencyToNumber(value) : value;
    if (!Number.isFinite(numberValue)) {
        return '';
    }

    return numberValue.toFixed(2).replace('.', ',');
};

export function AdminServicesTab({ services = [], professionals = [], onRefresh }) {
    const { toast } = useToast();
    const [isEditingService, setIsEditingService] = useState(false);
    const [serviceFormData, setServiceFormData] = useState({
        id: null,
        name: '',
        price: '',
        professional_payout: '',
        duration_minutes: '50'
    });

    const servicePricingPreview = useMemo(() => {
        const patientValue = parseCurrencyToNumber(serviceFormData.price);
        const payoutValue = parseCurrencyToNumber(
            serviceFormData.professional_payout === '' ? serviceFormData.price : serviceFormData.professional_payout
        );

        const safePatientValue = Number.isFinite(patientValue) ? patientValue : 0;
        const safePayoutValue = Number.isFinite(payoutValue) ? payoutValue : safePatientValue;

        return {
            patientValue: safePatientValue,
            professionalValue: safePayoutValue,
            platformFee: Math.max(safePatientValue - safePayoutValue, 0)
        };
    }, [serviceFormData.price, serviceFormData.professional_payout]);

    const resetServiceForm = () => {
        setIsEditingService(false);
        setServiceFormData({ id: null, name: '', price: '', professional_payout: '', duration_minutes: '50' });
    };

    const handleEditService = (service) => {
        if (!service) return;
        setIsEditingService(true);
        setServiceFormData({
            id: service.id,
            name: service.name || '',
            price: formatNumberToCurrencyInput(service.price),
            professional_payout: formatNumberToCurrencyInput(service.professional_payout ?? service.price),
            duration_minutes: service.duration_minutes ? String(service.duration_minutes) : '50'
        });
    };

    const handleDeleteService = async (serviceId) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return;

        if (!window.confirm(`Tem certeza que deseja excluir o serviço "${service.name}"?`)) {
            return;
        }

        try {
            const { error } = await supabase.from('services').delete().eq('id', serviceId);
            if (error) {
                secureLog.error('Erro ao excluir serviço:', error?.message || error);
                toast({ variant: 'destructive', title: 'Erro ao excluir serviço', description: error.message });
            } else {
                toast({ title: 'Serviço excluído com sucesso!' });
                if (onRefresh) onRefresh();
            }
        } catch (error) {
            secureLog.error('Erro inesperado ao excluir serviço:', error);
            toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Não foi possível excluir o serviço.' });
        }
    };

    const handleServiceSubmit = async (e) => {
        e.preventDefault();

        const trimmedName = (serviceFormData.name || '').trim();
        const priceNumber = parseCurrencyToNumber(serviceFormData.price);
        const payoutInput = serviceFormData.professional_payout === ''
            ? serviceFormData.price
            : serviceFormData.professional_payout;
        const payoutNumber = parseCurrencyToNumber(payoutInput);
        const durationNumber = Number.parseInt(serviceFormData.duration_minutes, 10);

        if (!trimmedName) {
            toast({ variant: 'destructive', title: 'Nome do serviço é obrigatório' });
            return;
        }

        if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
            toast({ variant: 'destructive', title: 'Informe um valor válido cobrado do paciente.' });
            return;
        }

        if (!Number.isFinite(payoutNumber) || payoutNumber < 0) {
            toast({ variant: 'destructive', title: 'Informe um repasse válido para o profissional.' });
            return;
        }

        if (payoutNumber > priceNumber) {
            toast({ variant: 'destructive', title: 'O repasse não pode ser maior que o valor cobrado.' });
            return;
        }

        if (!Number.isFinite(durationNumber) || durationNumber <= 0) {
            toast({ variant: 'destructive', title: 'Informe a duração em minutos.' });
            return;
        }

        const payload = {
            name: trimmedName,
            price: priceNumber,
            professional_payout: payoutNumber,
            duration_minutes: durationNumber
        };

        let result;
        if (isEditingService) {
            result = await supabase.from('services').update(payload).eq('id', serviceFormData.id);
        } else {
            result = await supabase.from('services').insert([payload]);
        }

        if (result.error) {
            secureLog.error('Erro ao salvar serviço:', result.error?.message || result.error);
            toast({ variant: 'destructive', title: 'Erro ao salvar serviço', description: result.error.message });
        } else {
            toast({ title: isEditingService ? 'Serviço atualizado com sucesso!' : 'Serviço criado com sucesso!' });
            resetServiceForm();
            if (onRefresh) onRefresh();
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-xs p-6 border border-slate-200/80">
                <h2 className="text-xl font-bold mb-6 flex items-center text-slate-900">
                    <Briefcase className="w-6 h-6 mr-2 text-slate-800" /> Serviços
                </h2>
                <div className="space-y-4">
                    {services.map((service, index) => {
                        const professionalsCount = professionals.filter(prof =>
                            prof.services_ids && prof.services_ids.includes(service.id)
                        ).length;

                        return (
                            <div
                                key={service.id}
                                className={`border rounded-lg p-5 hover:shadow-md transition-all ${
                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                } hover:bg-blue-50 border-slate-200`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-bold text-lg text-gray-900">{service.name}</h3>
                                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                                                {professionalsCount} {professionalsCount === 1 ? 'profissional' : 'profissionais'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500 block text-xs">Valor cobrado (paciente)</span>
                                                <span className="font-bold text-green-600">
                                                    R$ {parseFloat(service.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block text-xs">Repasse ao profissional</span>
                                                <span className="font-semibold text-blue-600">
                                                    R$ {parseFloat(service.professional_payout ?? service.price).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-xs text-gray-500 block mt-1">
                                                    {(() => {
                                                        const patientAmount = parseCurrencyToNumber(service.price) ?? 0;
                                                        const payoutAmount = parseCurrencyToNumber(
                                                            service.professional_payout === undefined || service.professional_payout === null
                                                                ? service.price
                                                                : service.professional_payout
                                                        ) ?? 0;
                                                        const fee = Math.max(patientAmount - payoutAmount, 0);
                                                        return `Taxa plataforma: R$ ${fee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                    })()}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 block text-xs">Duração</span>
                                                <span className="font-medium text-slate-800">
                                                    {service.duration_minutes >= 60
                                                        ? `${Math.floor(service.duration_minutes / 60)}h${service.duration_minutes % 60 > 0 ? ` ${service.duration_minutes % 60}min` : ''}`
                                                        : `${service.duration_minutes}min`
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                        {professionalsCount > 0 && (
                                            <div className="mt-3">
                                                <span className="text-xs text-gray-500 block mb-1">Profissionais que atendem:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {professionals
                                                        .filter(prof => prof.services_ids && prof.services_ids.includes(service.id))
                                                        .map(prof => (
                                                            <span key={prof.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                                                {prof.name}
                                                            </span>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button size="icon" variant="ghost" onClick={() => handleEditService(service)} title="Editar serviço">
                                            <Edit className="w-4 h-4 text-slate-600" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleDeleteService(service.id)} className="hover:bg-red-50" title="Excluir serviço">
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100 h-fit">
                <h2 className="text-2xl font-bold mb-6 text-slate-800">{isEditingService ? 'Editar Serviço' : 'Novo Serviço'}</h2>
                <form onSubmit={handleServiceSubmit} className="space-y-4 text-sm">
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600">Nome do Serviço</label>
                        <input
                            name="name"
                            value={serviceFormData.name}
                            onChange={e => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                            placeholder="Ex: Consulta Psicológica, Terapia de Casal"
                            className="w-full input border border-slate-200 rounded-lg p-2"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600">Valor cobrado do paciente (R$)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">R$</span>
                            <input
                                name="price"
                                value={serviceFormData.price}
                                onChange={e => {
                                    const value = sanitizeCurrencyInput(e.target.value);
                                    setServiceFormData(prev => ({ ...prev, price: value }));
                                }}
                                type="text"
                                placeholder="150,00"
                                className="w-full input pl-8 border border-slate-200 rounded-lg p-2"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600">Repasse ao profissional (R$)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">R$</span>
                            <input
                                name="professional_payout"
                                value={serviceFormData.professional_payout}
                                onChange={e => {
                                    const value = sanitizeCurrencyInput(e.target.value);
                                    setServiceFormData(prev => ({ ...prev, professional_payout: value }));
                                }}
                                type="text"
                                placeholder="150,00"
                                className="w-full input pl-8 border border-slate-200 rounded-lg p-2"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Caso deixe em branco, será usado o mesmo valor cobrado do paciente.
                        </p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-600">
                        <p className="flex justify-between">
                            <span>Paciente paga</span>
                            <span className="font-semibold text-gray-900">R$ {servicePricingPreview.patientValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <p className="flex justify-between mt-1">
                            <span>Profissional recebe</span>
                            <span className="font-semibold text-blue-700">R$ {servicePricingPreview.professionalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                        <p className="flex justify-between mt-1">
                            <span>Taxa estimada da plataforma</span>
                            <span className="font-semibold text-emerald-700">R$ {servicePricingPreview.platformFee.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-600">Duração</label>
                        <div className="relative">
                            <input
                                name="duration_minutes"
                                value={serviceFormData.duration_minutes}
                                onChange={e => {
                                    const value = e.target.value.replace(/[^0-9]/g, '');
                                    setServiceFormData(prev => ({ ...prev, duration_minutes: value }));
                                }}
                                type="text"
                                placeholder="50"
                                className="w-full input pr-12 border border-slate-200 rounded-lg p-2"
                                required
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">min</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Duração em minutos (ex: 50 para 50min, 90 para 1h30min)</p>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold">
                            {isEditingService ? 'Salvar Alterações' : 'Criar Serviço'}
                        </Button>
                        {isEditingService && (
                            <Button type="button" variant="outline" onClick={resetServiceForm}>
                                Cancelar
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AdminServicesTab;
