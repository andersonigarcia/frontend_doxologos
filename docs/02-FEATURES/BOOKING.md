# 📅 Sistema de Agendamentos

> **Status**: ✅ Implementado  
> **Funcionalidade**: Agendamento e reagendamento de consultas

---

## 📋 Funcionalidades

- ✅ Agendamento de consultas
- ✅ Reagendamento
- ✅ Cancelamento
- ✅ Verificação de disponibilidade
- ✅ Integração com pagamentos
- ✅ Integração com Zoom
- ✅ Emails automáticos

---

## 🗄️ Estrutura do Banco

### Tabela: `bookings`

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id),
  service_id UUID REFERENCES services(id),
  professional_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMP NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  duration INTEGER DEFAULT 60,
  valor_consulta DECIMAL(10,2),
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  payment_status TEXT DEFAULT 'pending', -- pending, paid, failed
  meeting_link TEXT,
  meeting_password VARCHAR(50),
  meeting_id VARCHAR(100),
  meeting_start_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 💻 Como Usar

### Criar Agendamento

```javascript
import { supabase } from '@/lib/supabaseClient';
import { bookingEmailManager } from '@/lib/bookingEmailManager';
import { zoomService } from '@/lib/zoomService';

// 1. Criar booking
const { data: booking, error } = await supabase.from('bookings').insert({
  patient_id: patientId,
  service_id: serviceId,
  professional_id: professionalId,
  scheduled_at: '2025-10-27T14:00:00',
  booking_date: '2025-10-27',
  booking_time: '14:00',
  valor_consulta: 150.00,
  status: 'pending'
}).select(`
  *,
  services (name),
  professional:profiles (name)
`).single();

// 2. Criar reunião Zoom (se online)
const meeting = await zoomService.createMeeting({
  topic: `Consulta - ${booking.patient.name}`,
  start_time: booking.scheduled_at,
  duration: 60
});

await supabase.from('bookings').update({
  meeting_link: meeting.join_url,
  meeting_password: meeting.password,
  meeting_id: meeting.id
}).eq('id', booking.id);

// 3. Enviar email de confirmação
await bookingEmailManager.sendConfirmation(booking);

// 4. Redirecionar para checkout
navigate(`/checkout?booking_id=${booking.id}&valor=${booking.valor_consulta}`);
```

### Reagendar

```javascript
const reagendar = async (bookingId, newDate, newTime, reason) => {
  // 1. Buscar booking atual
  const { data: oldBooking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  // 2. Atualizar booking
  const { data: newBooking } = await supabase
    .from('bookings')
    .update({
      booking_date: newDate,
      booking_time: newTime,
      scheduled_at: `${newDate}T${newTime}:00`,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single();

  // 3. Atualizar reunião Zoom
  if (oldBooking.meeting_id) {
    await zoomService.updateMeeting(oldBooking.meeting_id, {
      start_time: newBooking.scheduled_at
    });
  }

  // 4. Enviar email
  await bookingEmailManager.sendReschedule(newBooking, oldBooking, reason);
};
```

### Cancelar

```javascript
const cancelar = async (bookingId, reason, cancelledBy) => {
  // 1. Atualizar status
  const { data: booking } = await supabase
    .from('bookings')
    .update({ 
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single();

  // 2. Cancelar reunião Zoom
  if (booking.meeting_id) {
    await zoomService.deleteMeeting(booking.meeting_id);
  }

  // 3. Enviar email
  await bookingEmailManager.sendCancellation(booking, reason, cancelledBy);
};
```

### Verificar Disponibilidade

```javascript
const checkAvailability = async (professionalId, date, time) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('professional_id', professionalId)
    .eq('booking_date', date)
    .eq('booking_time', time)
    .in('status', ['pending', 'confirmed']);

  return data.length === 0; // true = disponível
};
```

---

## 🔔 Lembretes Automáticos

### Cron Job (Edge Function)

```typescript
// Executar diariamente às 9h
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Buscar bookings para amanhã
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      patient:patients (email, name),
      service:services (name),
      professional:profiles (name)
    `)
    .eq('booking_date', tomorrowStr)
    .in('status', ['confirmed']);

  // Enviar lembretes
  for (const booking of bookings) {
    await bookingEmailManager.sendReminder(
      booking,
      booking.meeting_link
    );
  }

  return new Response('OK', { status: 200 });
});
```

### Configurar Cron no Supabase

```bash
# Via Supabase CLI
supabase functions deploy send-reminders --cron "0 9 * * *"
```

---

## 📊 Relatórios

### Bookings por Status

```sql
SELECT 
  status,
  COUNT(*) as total
FROM bookings
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status;
```

### Taxa de Conversão (Agendamentos → Pagos)

```sql
SELECT 
  ROUND(
    100.0 * SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) as taxa_conversao
FROM bookings
WHERE created_at >= NOW() - INTERVAL '30 days';
```

---

**Última atualização**: 28/01/2025 | [Voltar ao Índice](../README.md)
