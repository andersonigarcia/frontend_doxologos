import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const EmergencyBookingModal = ({ isOpen, onClose, professionals, services, onBookingCreated }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        whatsapp: '',
        cpf: '',
        professional_id: '',
        service_id: '',
        booking_date: '',
        booking_time: '',
        room_link: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            setIsLoading(true);
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;

            if (!accessToken) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            // Precisamos buscar o preço do serviço e a duração para calcular o end_time
            const selectedService = services.find(s => s.id === formData.service_id);
            if (!selectedService) {
                throw new Error('Serviço inválido.');
            }

            const startDate = new Date(`${formData.booking_date}T${formData.booking_time}`);
            const endDate = new Date(startDate.getTime() + (selectedService.duration_minutes || 50) * 60000);
            const end_time = endDate.toTimeString().slice(0, 5);

            const payload = {
                ...formData,
                booking_date: formData.booking_date,
                booking_time: formData.booking_time
            };

            const { data, error } = await supabase.functions.invoke('create-emergency-booking', {
                body: payload
            });

            if (error) {
                let errorMsg = error.message;
                try {
                    if (error.context && typeof error.context.json === 'function') {
                        const errorJson = await error.context.json();
                        errorMsg = errorJson.error || error.message;
                    }
                } catch (_) {}
                throw new Error(errorMsg || 'Erro ao processar encaixe de urgência.');
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            toast({
                title: 'Encaixe realizado com sucesso!',
                description: `A consulta foi agendada e o paciente ${formData.name} recebeu um e-mail com as instruções de acesso e sala.`,
            });

            onBookingCreated();
            onClose();
        } catch (error) {
            console.error('Erro no encaixe de urgência:', error);
            toast({
                variant: 'destructive',
                title: 'Erro no Encaixe',
                description: error.message || 'Não foi possível realizar o agendamento de urgência.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-white text-slate-900 border-none shadow-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-600">
                        <AlertTriangle className="w-6 h-6" />
                        Novo Encaixe de Urgência
                    </DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">
                        Esta ação ignora bloqueios de agenda, cadastra o paciente automaticamente, lança o pagamento como PIX Direto e dispara a Nota Fiscal e-mail com a senha.
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome do Paciente *</Label>
                            <Input id="name" name="name" required value={formData.name} onChange={handleChange} placeholder="Ex: João da Silva" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail *</Label>
                            <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} placeholder="joao@email.com" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="whatsapp">WhatsApp</Label>
                            <Input id="whatsapp" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="(11) 99999-9999" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cpf">CPF (Para Nota Fiscal)</Label>
                            <Input id="cpf" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="professional_id">Profissional *</Label>
                            <select
                                id="professional_id"
                                name="professional_id"
                                required
                                value={formData.professional_id}
                                onChange={handleChange}
                                className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">Selecione o profissional...</option>
                                {professionals?.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service_id">Serviço *</Label>
                            <select
                                id="service_id"
                                name="service_id"
                                required
                                value={formData.service_id}
                                onChange={handleChange}
                                className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="">Selecione o serviço...</option>
                                {services?.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="booking_date">Data *</Label>
                            <Input id="booking_date" name="booking_date" type="date" required value={formData.booking_date} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="booking_time">Hora Início *</Label>
                            <Input id="booking_time" name="booking_time" type="time" required value={formData.booking_time} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="room_link">Link da Sala (Zoom/Meet)</Label>
                        <Input id="room_link" name="room_link" value={formData.room_link} onChange={handleChange} placeholder="https://zoom.us/j/..." />
                        <p className="text-xs text-slate-500">Se preenchido, este link será enviado no e-mail do paciente.</p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Confirmar Encaixe Urgente
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
