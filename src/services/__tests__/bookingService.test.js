import {
  ALLOWED_BOOKING_FIELDS,
  VALID_BOOKING_STATUSES,
  sanitizeBookingPayload,
  getBookingById,
  createBooking,
  createChildBookings,
  updateBookingStatus,
  rescheduleBooking,
  listBookings
} from '../bookingService';
import { supabase } from '@/lib/customSupabaseClient';
import bookingEmailManager from '@/lib/bookingEmailManager';

// Mock Supabase
jest.mock('@/lib/customSupabaseClient', () => {
  return {
    supabase: {
      from: jest.fn()
    }
  };
});

// Mock bookingEmailManager
jest.mock('@/lib/bookingEmailManager', () => ({
  sendPaymentApproved: jest.fn().mockResolvedValue({ success: true }),
  sendThankYou: jest.fn().mockResolvedValue({ success: true }),
  sendCancellation: jest.fn().mockResolvedValue({ success: true })
}));

describe('bookingService — Domain Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeBookingPayload', () => {
    it('deve remover campos inexistentes no banco como meeting_platform e service_name', () => {
      const rawInput = {
        patient_name: '  João Silva  ',
        patient_email: '  joao@teste.com  ',
        patient_phone: '  (11) 99999-9999  ',
        booking_date: '2026-10-15',
        booking_time: '14:30',
        valor_consulta: '150',
        meeting_platform: 'meet', // Coluna que gerava erro no passado
        service_name: 'Terapia Individual',
        professional_name: 'Dr. Eric',
        unknown_metadata: 'invalid'
      };

      const sanitized = sanitizeBookingPayload(rawInput);

      expect(sanitized.patient_name).toBe('João Silva');
      expect(sanitized.patient_email).toBe('joao@teste.com');
      expect(sanitized.patient_phone).toBe('(11) 99999-9999');
      expect(sanitized.booking_date).toBe('2026-10-15');
      expect(sanitized.booking_time).toBe('14:30:00');
      expect(sanitized.valor_consulta).toBe(150);
      expect(sanitized.status).toBe('pending_payment');

      // Campos fantasmas removidos
      expect(sanitized.meeting_platform).toBeUndefined();
      expect(sanitized.service_name).toBeUndefined();
      expect(sanitized.professional_name).toBeUndefined();
      expect(sanitized.unknown_metadata).toBeUndefined();
    });

    it('deve preservar status válido quando fornecido', () => {
      const sanitized = sanitizeBookingPayload({ status: 'confirmed' });
      expect(sanitized.status).toBe('confirmed');
    });
  });

  describe('getBookingById', () => {
    it('deve lançar erro se id não for fornecido', async () => {
      await expect(getBookingById('')).rejects.toThrow('ID do agendamento é obrigatório.');
    });

    it('deve buscar agendamento com relações por padrão', async () => {
      const mockBooking = { id: 'booking-1', patient_name: 'Maria' };
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: mockBooking, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      const result = await getBookingById('booking-1');

      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(eqMock).toHaveBeenCalledWith('id', 'booking-1');
      expect(result).toEqual(mockBooking);
    });

    it('deve filtrar por user_id quando especificado', async () => {
      const mockBooking = { id: 'booking-2', user_id: 'user-99' };
      const selectMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: mockBooking, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock
      });

      const result = await getBookingById('booking-2', { userId: 'user-99' });

      expect(eqMock).toHaveBeenCalledWith('id', 'booking-2');
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user-99');
      expect(result).toEqual(mockBooking);
    });
  });

  describe('createBooking', () => {
    it('deve sanitizar e inserir agendamento', async () => {
      const mockCreated = { id: 'new-b-1', status: 'pending_payment' };
      const insertMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: mockCreated, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock
      });

      const result = await createBooking({
        patient_name: 'Teste',
        meeting_platform: 'zoom'
      });

      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({ patient_name: 'Teste', status: 'pending_payment' })
      ]);
      expect(result).toEqual(mockCreated);
    });
  });

  describe('createChildBookings', () => {
    it('deve retornar array vazio se lista for vazia', async () => {
      const result = await createChildBookings([]);
      expect(result).toEqual([]);
    });

    it('deve sanitizar e inserir múltiplos agendamentos em lote', async () => {
      const mockList = [{ id: 'child-1' }, { id: 'child-2' }];
      const insertMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockResolvedValue({ data: mockList, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock
      });

      const result = await createChildBookings([
        { patient_name: 'Filho 1' },
        { patient_name: 'Filho 2' }
      ]);

      expect(result).toHaveLength(2);
      expect(insertMock).toHaveBeenCalled();
    });
  });

  describe('updateBookingStatus', () => {
    it('deve rejeitar status inválido', async () => {
      await expect(
        updateBookingStatus('b-1', 'status_totalmente_invalido')
      ).rejects.toThrow('Status de agendamento inválido: status_totalmente_invalido');
    });

    it('deve atualizar status com sucesso e disparar notificação se notify=true', async () => {
      const mockUpdated = {
        id: 'b-1',
        status: 'confirmed',
        patient_name: 'Lucas',
        patient_email: 'lucas@teste.com'
      };

      const updateMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: mockUpdated, error: null });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
        select: selectMock,
        single: singleMock
      });

      const result = await updateBookingStatus('b-1', 'confirmed', { notify: true });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'confirmed' })
      );
      expect(bookingEmailManager.sendPaymentApproved).toHaveBeenCalled();
      expect(result.status).toBe('confirmed');
    });
  });

  describe('rescheduleBooking', () => {
    it('deve exigir data e hora para reagendamento', async () => {
      await expect(
        rescheduleBooking('b-1', { newDate: '', newTime: '' })
      ).rejects.toThrow('Nova data e horário são obrigatórios.');
    });

    it('deve atualizar data, hora e registrar histórico', async () => {
      const mockRescheduled = {
        id: 'b-1',
        booking_date: '2026-11-01',
        booking_time: '10:00:00',
        reschedule_count: 1
      };

      const updateMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const selectMock = jest.fn().mockReturnThis();
      const singleMock = jest.fn().mockResolvedValue({ data: mockRescheduled, error: null });
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });

      supabase.from.mockImplementation((table) => {
        if (table === 'bookings') {
          return {
            update: updateMock,
            eq: eqMock,
            select: selectMock,
            single: singleMock
          };
        }
        if (table === 'booking_reschedule_history') {
          return { insert: insertMock };
        }
        return {};
      });

      const result = await rescheduleBooking('b-1', {
        newDate: '2026-11-01',
        newTime: '10:00',
        attemptsUsed: 0,
        userId: 'user-1'
      });

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          booking_date: '2026-11-01',
          booking_time: '10:00:00',
          reschedule_count: 1
        })
      );
      expect(insertMock).toHaveBeenCalled();
      expect(result.id).toBe('b-1');
    });
  });

  describe('listBookings', () => {
    it('deve aplicar filtros corretamente', async () => {
      const mockList = [{ id: 'b-1' }, { id: 'b-2' }];
      const selectMock = jest.fn().mockReturnThis();
      const orderMock = jest.fn().mockReturnThis();
      const eqMock = jest.fn().mockReturnThis();
      const inMock = jest.fn().mockReturnThis();
      const gteMock = jest.fn().mockReturnThis();
      const lteMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockResolvedValue({ data: mockList, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        order: orderMock,
        eq: eqMock,
        in: inMock,
        gte: gteMock,
        lte: lteMock,
        limit: limitMock
      });

      const result = await listBookings({
        professionalId: 'prof-123',
        status: ['confirmed', 'paid'],
        startDate: '2026-10-01',
        endDate: '2026-10-31'
      });

      expect(supabase.from).toHaveBeenCalledWith('bookings');
      expect(eqMock).toHaveBeenCalledWith('professional_id', 'prof-123');
      expect(inMock).toHaveBeenCalledWith('status', ['confirmed', 'paid']);
      expect(gteMock).toHaveBeenCalledWith('booking_date', '2026-10-01');
      expect(lteMock).toHaveBeenCalledWith('booking_date', '2026-10-31');
      expect(result).toEqual(mockList);
    });
  });
});
