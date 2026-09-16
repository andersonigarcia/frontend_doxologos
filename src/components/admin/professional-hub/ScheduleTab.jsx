import React, { useState, useEffect } from 'react';
import { AppointmentCalendar } from '@/components/admin/AppointmentCalendar';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Calendar as CalendarIcon, Clock, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ScheduleTab = ({ professionalId }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedAppointments, setSelectedAppointments] = useState([]);

  useEffect(() => {
    fetchAppointments();
  }, [professionalId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('professional_id', professionalId)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (date, dayAppointments) => {
    setSelectedDate(date);
    setSelectedAppointments(dayAppointments);
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed':
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'pending_payment':
      case 'awaiting_payment':
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'cancelled':
      case 'cancelled_by_patient':
      case 'cancelled_by_professional':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'confirmed': return 'Confirmado';
      case 'paid': return 'Pago';
      case 'pending_payment':
      case 'awaiting_payment': return 'Pendente';
      case 'cancelled': 
      case 'cancelled_by_patient':
      case 'cancelled_by_professional': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'confirmed':
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending_payment':
      case 'awaiting_payment':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cancelled':
      case 'cancelled_by_patient':
      case 'cancelled_by_professional':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-2xl font-bold mb-2 text-gray-800 flex items-center">
          <CalendarIcon className="w-6 h-6 mr-2 text-purple-600" />
          Agenda e Agendamentos
        </h2>
        <p className="text-sm text-gray-500 mb-8 border-b border-gray-100 pb-4">
          Visualize o calendário e os detalhes das sessões marcadas para este profissional.
        </p>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-500">Carregando calendário...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendário */}
            <div className="lg:col-span-2">
              <AppointmentCalendar 
                appointments={appointments}
                onDateClick={handleDateClick}
                className="shadow-md border-0"
              />
            </div>
            
            {/* Painel Lateral de Detalhes do Dia */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex flex-col h-full min-h-[400px]">
              {selectedDate ? (
                <>
                  <h3 className="text-lg font-bold text-gray-800 mb-1 capitalize">
                    {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-sm text-gray-500 mb-6 border-b border-gray-200 pb-4">
                    {selectedAppointments.length === 0 
                      ? 'Nenhum agendamento neste dia.'
                      : `${selectedAppointments.length} agendamento(s) encontrado(s).`}
                  </p>
                  
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {selectedAppointments.map(app => (
                      <div key={app.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center text-sm font-bold text-gray-900">
                            <Clock className="w-4 h-4 mr-1 text-purple-600" />
                            {app.booking_time.slice(0,5)}
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1",
                            getStatusBadgeClass(app.status)
                          )}>
                            {getStatusIcon(app.status)}
                            {getStatusText(app.status)}
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-700 mt-3 pt-3 border-t border-gray-50">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="font-medium truncate" title={app.patient_name}>{app.patient_name || 'Paciente não informado'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-60 py-12">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">Selecione uma data no calendário<br/>para ver os detalhes do dia.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleTab;
