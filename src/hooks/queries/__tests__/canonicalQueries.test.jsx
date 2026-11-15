import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useProfessionalsQuery,
  useProfessionalDetailQuery,
  useBookingsQuery,
  useBookingDetailQuery,
  usePatientBookingsQuery,
  usePaymentStatusQuery,
  usePaymentByIdQuery,
  usePaymentByBookingIdQuery,
  usePatientHomeworkTasksQuery,
  usePatientNotesHistoryQuery,
  useCreateBookingMutation,
  useUpdateBookingStatusMutation,
  useRescheduleBookingMutation
} from '../index';

import * as professionalService from '@/services/professionalService';
import * as bookingService from '@/services/bookingService';
import * as paymentService from '@/services/paymentService';
import * as patientService from '@/services/patientService';

jest.mock('@/services/professionalService');
jest.mock('@/services/bookingService');
jest.mock('@/services/paymentService');
jest.mock('@/services/patientService');
jest.mock('@/lib/customSupabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null })
    }))
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      }
    }
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Canonical TanStack Query Hooks (Onda 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useProfessionalsQuery & useProfessionalDetailQuery', () => {
    it('deve chamar listProfessionals com filtros e retornar dados', async () => {
      const mockList = [{ id: 'p1', name: 'Dr. Teste' }];
      professionalService.listProfessionals.mockResolvedValue(mockList);

      const { result } = renderHook(() => useProfessionalsQuery({ status: 'active' }), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(professionalService.listProfessionals).toHaveBeenCalledWith({ status: 'active' });
      expect(result.current.data).toEqual(mockList);
    });

    it('deve buscar detalhes do profissional por ID', async () => {
      const mockDetail = { id: 'p1', name: 'Dr. Teste' };
      professionalService.getProfessionalById.mockResolvedValue(mockDetail);

      const { result } = renderHook(() => useProfessionalDetailQuery('p1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(professionalService.getProfessionalById).toHaveBeenCalledWith('p1');
      expect(result.current.data).toEqual(mockDetail);
    });
  });

  describe('useBookingsQuery & usePatientBookingsQuery', () => {
    it('deve listar agendamentos através de listBookings', async () => {
      const mockBookings = [{ id: 'b1', booking_date: '2026-10-15' }];
      bookingService.listBookings.mockResolvedValue(mockBookings);

      const { result } = renderHook(() => useBookingsQuery({ status: 'confirmed' }), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(bookingService.listBookings).toHaveBeenCalledWith({ status: 'confirmed' });
      expect(result.current.data).toEqual(mockBookings);
    });

    it('deve buscar agendamentos do paciente com relações completas', async () => {
      const mockPatientBookings = [{ id: 'b2', user_id: 'u-123' }];
      bookingService.listPatientBookings.mockResolvedValue(mockPatientBookings);

      const { result } = renderHook(() => usePatientBookingsQuery('u-123'), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(bookingService.listPatientBookings).toHaveBeenCalledWith('u-123', undefined);
      expect(result.current.data).toEqual(mockPatientBookings);
    });

    it('deve buscar agendamento por ID', async () => {
      const mockBooking = { id: 'b1', patient_name: 'Paciente Teste' };
      bookingService.getBookingById.mockResolvedValue(mockBooking);

      const { result } = renderHook(() => useBookingDetailQuery('b1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(bookingService.getBookingById).toHaveBeenCalledWith('b1', { includeRelations: true });
      expect(result.current.data).toEqual(mockBooking);
    });
  });

  describe('usePaymentStatusQuery, usePaymentByIdQuery, usePaymentByBookingIdQuery', () => {
    it('deve consultar status de pagamento por mp_payment_id', async () => {
      const mockPayment = { id: 'pay-1', mp_payment_id: '999888', status: 'approved' };
      paymentService.getPaymentByMpId.mockResolvedValue(mockPayment);

      const { result } = renderHook(() => usePaymentStatusQuery('999888'), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(paymentService.getPaymentByMpId).toHaveBeenCalledWith('999888');
      expect(result.current.data).toEqual(mockPayment);
    });

    it('deve buscar pagamento por id primário', async () => {
      const mockPayment = { id: 'pay-1', status: 'approved' };
      paymentService.getPaymentById.mockResolvedValue(mockPayment);

      const { result } = renderHook(() => usePaymentByIdQuery('pay-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(paymentService.getPaymentById).toHaveBeenCalledWith('pay-1');
      expect(result.current.data).toEqual(mockPayment);
    });

    it('deve buscar pagamento por bookingId', async () => {
      const mockPayment = { id: 'pay-1', booking_id: 'b1' };
      paymentService.getPaymentByBookingId.mockResolvedValue(mockPayment);

      const { result } = renderHook(() => usePaymentByBookingIdQuery('b1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(paymentService.getPaymentByBookingId).toHaveBeenCalledWith('b1');
      expect(result.current.data).toEqual(mockPayment);
    });
  });

  describe('usePatientHistoryQuery', () => {
    it('deve buscar homework tasks do paciente', async () => {
      const mockTasks = [{ id: 'hw-1', homework: 'Respiração diafragmática' }];
      patientService.getPatientHomeworkTasks.mockResolvedValue(mockTasks);

      const { result } = renderHook(() => usePatientHomeworkTasksQuery('paciente@teste.com'), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(patientService.getPatientHomeworkTasks).toHaveBeenCalledWith('paciente@teste.com');
      expect(result.current.data).toEqual(mockTasks);
    });

    it('deve buscar histórico de prontuário do paciente', async () => {
      const mockHistory = [{ id: 'h-1', session_development: 'Boa evolução' }];
      patientService.getPatientNotesHistory.mockResolvedValue(mockHistory);

      const { result } = renderHook(() => usePatientNotesHistoryQuery('paciente@teste.com'), {
        wrapper: createWrapper()
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(patientService.getPatientNotesHistory).toHaveBeenCalledWith('paciente@teste.com');
      expect(result.current.data).toEqual(mockHistory);
    });
  });

  describe('useBookingMutations com invalidação de cache', () => {
    it('useCreateBookingMutation deve chamar createBooking e executar onSuccess', async () => {
      const mockCreated = { id: 'b-novo', status: 'pending_payment' };
      bookingService.createBooking.mockResolvedValue(mockCreated);

      const onSuccess = jest.fn();
      const { result } = renderHook(() => useCreateBookingMutation({ onSuccess }), {
        wrapper: createWrapper()
      });

      await result.current.mutateAsync({ patient_name: 'Novo Paciente' });

      expect(bookingService.createBooking).toHaveBeenCalledWith({ patient_name: 'Novo Paciente' });
      expect(onSuccess).toHaveBeenCalledWith(mockCreated, { patient_name: 'Novo Paciente' }, undefined);
    });

    it('useUpdateBookingStatusMutation deve chamar updateBookingStatus', async () => {
      const mockUpdated = { id: 'b-1', status: 'confirmed' };
      bookingService.updateBookingStatus.mockResolvedValue(mockUpdated);

      const { result } = renderHook(() => useUpdateBookingStatusMutation(), {
        wrapper: createWrapper()
      });

      await result.current.mutateAsync({ id: 'b-1', newStatus: 'confirmed' });

      expect(bookingService.updateBookingStatus).toHaveBeenCalledWith('b-1', 'confirmed', undefined);
    });

    it('useRescheduleBookingMutation deve chamar rescheduleBooking', async () => {
      const mockRescheduled = { id: 'b-1', booking_date: '2026-10-20' };
      bookingService.rescheduleBooking.mockResolvedValue(mockRescheduled);

      const { result } = renderHook(() => useRescheduleBookingMutation(), {
        wrapper: createWrapper()
      });

      await result.current.mutateAsync({
        id: 'b-1',
        newDate: '2026-10-20',
        newTime: '15:00',
        attemptsUsed: 0,
        userId: 'u-1'
      });

      expect(bookingService.rescheduleBooking).toHaveBeenCalledWith('b-1', {
        newDate: '2026-10-20',
        newTime: '15:00',
        attemptsUsed: 0,
        rescheduledFromId: undefined,
        userId: 'u-1'
      });
    });
  });
});
