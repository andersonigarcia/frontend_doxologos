import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../tests/msw/server.js';
import { useBookedSlots } from '../booking/useBookedSlots.js';

jest.mock('@/lib/customSupabaseClient', () => jest.requireActual('../../../tests/utils/mockSupabaseClient.js'));

describe('useBookedSlots — Month & Day Availability Hook', () => {
  it('deve retornar arrays vazios quando professionalId não for fornecido', async () => {
    const { result } = renderHook(() =>
      useBookedSlots({ professionalId: null, date: '2026-10-20' })
    );

    expect(result.current.bookedSlots).toEqual([]);
    expect(result.current.bookedSlotsByDate).toEqual({});
    expect(result.current.isLoadingSlots).toBe(false);
  });

  it('deve buscar e agrupar agendamentos de todo o mês e retornar slots do dia selecionado', async () => {
    const now = Date.now();
    const mockBookings = [
      {
        booking_date: '2026-10-20',
        booking_time: '15:00',
        status: 'confirmed',
        created_at: new Date(now - 1000 * 60 * 60).toISOString(),
      },
      {
        booking_date: '2026-10-20',
        booking_time: '17:00',
        status: 'paid',
        created_at: new Date(now - 1000 * 60 * 60).toISOString(),
      },
      {
        booking_date: '2026-10-27',
        booking_time: '10:00',
        status: 'confirmed',
        created_at: new Date(now - 1000 * 60 * 60).toISOString(),
      },
    ];

    server.use(
      http.get('*/rest/v1/bookings', () => HttpResponse.json(mockBookings))
    );

    const targetMonth = new Date('2026-10-01T00:00:00');
    const { result } = renderHook(() =>
      useBookedSlots({
        professionalId: 'prof-erica',
        date: '2026-10-20',
        currentMonth: targetMonth,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoadingSlots).toBe(false);
      expect(result.current.bookedSlots).toEqual(['15:00', '17:00']);
    });

    expect(result.current.bookedSlotsByDate).toEqual({
      '2026-10-20': ['15:00', '17:00'],
      '2026-10-27': ['10:00'],
    });
  });

  it('deve descartar slots pendentes expirados on-the-fly', async () => {
    const expiredCreatedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(); // 3h atrás
    const mockBookings = [
      {
        booking_date: '2026-10-20',
        booking_time: '15:00',
        status: 'pending', // Expirado para janela padrão
        created_at: expiredCreatedAt,
      },
      {
        booking_date: '2026-10-20',
        booking_time: '17:00',
        status: 'confirmed',
        created_at: expiredCreatedAt,
      },
    ];

    server.use(
      http.get('*/rest/v1/bookings', () => HttpResponse.json(mockBookings))
    );

    const { result } = renderHook(() =>
      useBookedSlots({
        professionalId: 'prof-erica',
        date: '2026-10-20',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoadingSlots).toBe(false);
      expect(result.current.bookedSlots).toEqual(['17:00']);
    });

    expect(result.current.bookedSlotsByDate['2026-10-20']).toEqual(['17:00']);
  });
});
