import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Componente CRM WhatsApp: Botão de Disparo 1-Click e Lembretes Anti-No-Show.
 * Suporta despacho automático via API ou link gratuito direto no WhatsApp Web (wa.me).
 */
const WhatsAppReminderButton = ({
  bookingId,
  inscricaoId,
  phone,
  patientName,
  bookingDate,
  bookingTime,
  psychologistName,
  zoomUrl,
  reminderType = '24h',
  variant = 'outline',
  size = 'sm',
  className = '',
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Formatação básica de telefone para wa.me
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const formattedPhone = cleanPhone.length === 10 || cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;

  // Mensagem padrão empática Doxologos
  let messageText = '';
  if (reminderType === '24h') {
    messageText = `Olá, ${patientName || 'Paciente'}! 💜 Lembramos que sua consulta com ${psychologistName || 'Psicólogo(a)'} está agendada para amanhã (${bookingDate || ''}) às ${bookingTime || ''}.\n\nPara confirmar sua presença, acesse a Área do Paciente: https://novo.doxologos.com.br/area-do-paciente`;
  } else if (reminderType === '1h') {
    messageText = `Olá, ${patientName || 'Paciente'}! ⏳ Sua teleconsulta com ${psychologistName || 'Psicólogo(a)'} começará em 1 hora (${bookingTime || ''}).\n\nLink de acesso Zoom: ${zoomUrl || 'https://novo.doxologos.com.br/area-do-paciente'}`;
  } else {
    messageText = `Olá, ${patientName || 'Paciente'}! Lembrete de atendimento com ${psychologistName || 'Psicólogo(a)'} em ${bookingDate || ''}. Acesse: ${zoomUrl || 'https://novo.doxologos.com.br/area-do-paciente'}`;
  }

  const waMeUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`
    : '';

  const handleSendReminder = async () => {
    setLoading(true);

    try {
      // Dispara Edge Function de WhatsApp (registra log e tenta despacho automático se API ativada)
      const { data, error } = await supabase.functions.invoke('send-whatsapp-reminder', {
        body: {
          booking_id: bookingId || null,
          inscricao_id: inscricaoId || null,
          reminder_type: reminderType,
          custom_message: messageText,
        },
      });

      if (error) {
        throw error;
      }

      const targetUrl = data?.wa_me_url || waMeUrl;

      if (data?.status === 'sent') {
        toast({
          title: 'Lembrete Enviado!',
          description: `Mensagem enviada com sucesso via API para ${patientName}.`,
        });
      } else {
        toast({
          title: 'Lembrete Registrado (Modo Gratuito)',
          description: 'Abrindo o WhatsApp Web para envio em 1 clique...',
        });

        if (targetUrl) {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
        }
      }
    } catch (err) {
      console.warn('Erro na Edge Function de WhatsApp. Recorrendo ao envio direto via wa.me:', err);
      if (waMeUrl) {
        window.open(waMeUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast({
          variant: 'destructive',
          title: 'Telefone Não Encontrado',
          description: 'O paciente não possui número de telefone/WhatsApp cadastrado.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSendReminder}
      disabled={loading}
      className={`border-green-600 text-green-700 hover:bg-green-50 ${className}`}
      title="Enviar lembrete de consulta via WhatsApp"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2" />
      ) : (
        <MessageSquare className="w-4 h-4 mr-2 text-green-600" />
      )}
      Lembrete WhatsApp
    </Button>
  );
};

export default WhatsAppReminderButton;
