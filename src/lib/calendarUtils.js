/**
 * calendarUtils.js - Utilitários para sincronização de consultas com calendários pessoais
 * Compatível com: Google Agenda, Apple Calendar (iOS/macOS), Outlook e arquivos .ICS (RFC 5545).
 */

/**
 * Formata um objeto Date para o padrão UTC compactado exigido pelo RFC 5545 / Google Calendar (YYYYMMDDTHHMMSSZ)
 */
export function formatToUtcCompact(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Gera URL direta para adicionar evento ao Google Calendar com 1 clique
 * @param {Object} appointment Objeto com booking_date, booking_time, patient_name, service, meeting_link
 */
export function generateGoogleCalendarUrl(appointment) {
    if (!appointment?.booking_date || !appointment?.booking_time) return '#';

    try {
        const [hours, minutes] = appointment.booking_time.slice(0, 5).split(':');
        const startDate = new Date(`${appointment.booking_date}T${hours || '00'}:${minutes || '00'}:00`);
        
        // Duração padrão da sessão: 50 minutos
        const durationMinutes = appointment.service?.duration_minutes ? parseInt(appointment.service.duration_minutes, 10) : 50;
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

        const patientName = appointment.patient_name || 'Paciente';
        const serviceName = appointment.service?.name || 'Consulta Psicológica';
        const meetingUrl = appointment.meeting_link || appointment.meeting_start_url || `https://novo.doxologos.com.br/sala-espera/${appointment.id}`;

        const title = `Consulta Doxologos: ${patientName} (${serviceName})`;
        const details = [
            `Atendimento Psicológico Doxologos`,
            `Paciente: ${patientName}`,
            `Serviço: ${serviceName}`,
            `Sala Virtual: ${meetingUrl}`,
            `Prontuário & Histórico: https://novo.doxologos.com.br/profissional`,
            `Plataforma Segura Doxologos Psicologia`
        ].join('\n');

        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: title,
            dates: `${formatToUtcCompact(startDate)}/${formatToUtcCompact(endDate)}`,
            details,
            location: meetingUrl,
            sprop: 'website:https://novo.doxologos.com.br',
            trp: 'true'
        });

        return `https://calendar.google.com/calendar/render?${params.toString()}`;
    } catch (e) {
        console.error('Erro ao gerar URL do Google Calendar:', e);
        return '#';
    }
}

/**
 * Gera o conteúdo em formato .ICS (iCalendar RFC 5545) para uma consulta individual
 */
export function generateSingleIcsContent(appointment) {
    if (!appointment?.booking_date || !appointment?.booking_time) return null;

    const [hours, minutes] = appointment.booking_time.slice(0, 5).split(':');
    const startDate = new Date(`${appointment.booking_date}T${hours || '00'}:${minutes || '00'}:00`);
    const durationMinutes = appointment.service?.duration_minutes ? parseInt(appointment.service.duration_minutes, 10) : 50;
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    const nowCompact = formatToUtcCompact(new Date());
    const startCompact = formatToUtcCompact(startDate);
    const endCompact = formatToUtcCompact(endDate);

    const patientName = appointment.patient_name || 'Paciente';
    const serviceName = appointment.service?.name || 'Consulta Psicológica';
    const meetingUrl = appointment.meeting_link || appointment.meeting_start_url || `https://novo.doxologos.com.br/sala-espera/${appointment.id}`;
    const uid = `doxologos-${appointment.id || Date.now()}@novo.doxologos.com.br`;

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Doxologos Psicologia//Agenda Profissional//PT-BR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${nowCompact}`,
        `DTSTART:${startCompact}`,
        `DTEND:${endCompact}`,
        `SUMMARY:Consulta: ${patientName} - Doxologos`,
        `DESCRIPTION:Atendimento Psicológico Doxologos com ${patientName}.\\nLink de Acesso: ${meetingUrl}\\nProntuário: https://novo.doxologos.com.br/profissional`,
        `LOCATION:${meetingUrl}`,
        `URL:${meetingUrl}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Lembrete de Consulta Doxologos em 15 minutos',
        'TRIGGER:-PT15M',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
}

/**
 * Dispara o download de um arquivo .ICS no navegador
 */
export function downloadIcsFile(appointment) {
    const icsContent = generateSingleIcsContent(appointment);
    if (!icsContent) return;

    const safeDate = appointment.booking_date || 'consulta';
    const safeName = (appointment.patient_name || 'paciente').replace(/\s+/g, '_').toLowerCase();
    const filename = `doxologos_${safeDate}_${safeName}.ics`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Gera um arquivo .ICS consolidado com todas as consultas futuras do profissional
 */
export function downloadAgendaIcsFile(appointments = [], professionalName = 'Profissional') {
    const validBookings = appointments.filter(b => 
        b.booking_date && 
        b.booking_time && 
        ['confirmed', 'paid'].includes(b.status)
    );

    if (validBookings.length === 0) {
        alert('Nenhuma consulta futura confirmada para exportar.');
        return;
    }

    const nowCompact = formatToUtcCompact(new Date());

    const events = validBookings.map(appointment => {
        const [hours, minutes] = appointment.booking_time.slice(0, 5).split(':');
        const startDate = new Date(`${appointment.booking_date}T${hours || '00'}:${minutes || '00'}:00`);
        const durationMinutes = appointment.service?.duration_minutes ? parseInt(appointment.service.duration_minutes, 10) : 50;
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

        const patientName = appointment.patient_name || 'Paciente';
        const serviceName = appointment.service?.name || 'Consulta Psicológica';
        const meetingUrl = appointment.meeting_link || appointment.meeting_start_url || `https://novo.doxologos.com.br/sala-espera/${appointment.id}`;
        const uid = `doxologos-${appointment.id || Math.random()}@novo.doxologos.com.br`;

        return [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${nowCompact}`,
            `DTSTART:${formatToUtcCompact(startDate)}`,
            `DTEND:${formatToUtcCompact(endDate)}`,
            `SUMMARY:Consulta: ${patientName} (${serviceName})`,
            `DESCRIPTION:Atendimento Psicológico Doxologos com ${patientName}.\\nLink Sala Virtual: ${meetingUrl}\\nProntuário: https://novo.doxologos.com.br/profissional`,
            `LOCATION:${meetingUrl}`,
            `URL:${meetingUrl}`,
            'STATUS:CONFIRMED',
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            'DESCRIPTION:Lembrete de Consulta Doxologos em 15 minutos',
            'TRIGGER:-PT15M',
            'END:VALARM',
            'END:VEVENT'
        ].join('\r\n');
    }).join('\r\n');

    const calendarContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Doxologos Psicologia//Agenda Completa//PT-BR',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:Agenda Doxologos - ${professionalName}`,
        'X-WR-TIMEZONE:America/Sao_Paulo',
        events,
        'END:VCALENDAR'
    ].join('\r\n');

    const filename = `agenda_doxologos_${new Date().toISOString().slice(0, 10)}.ics`;
    const blob = new Blob([calendarContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
