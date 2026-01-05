import { StrictMode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../../tests/msw/server.js';
import { TEST_SUPABASE_URL } from '../../../tests/msw/constants.js';
import { useBookingData } from '../booking/useBookingData.js';
import { supabase as testSupabase } from '@/lib/customSupabaseClient';

jest.mock('@/lib/customSupabaseClient', () => jest.requireActual('../../../tests/utils/mockSupabaseClient.js'));

const bookingFixtures = {
  professionals: [
    { id: 'prof-2', name: 'Bruno' },
    { id: 'prof-1', name: 'Ana' }
  ],
  services: [{ id: 'svc-1', name: 'Terapia Individual' }],
  availability: [
    { professional_id: 'prof-1', day_of_week: 'monday', available_times: ['09:00', '10:00'] },
    { professional_id: 'prof-2', day_of_week: 'tuesday', available_times: ['11:00'] }
  ],
  blockedDates: [{ id: 'blk-1', date: '2025-12-24' }],
  reviews: [
    {
      id: 'rev-1',
      is_approved: true,
      professionals: { name: 'Ana' },
      bookings: { patient_name: 'Joao', patient_email: 'joao@example.com' }
    }
  ]
};

const respondWithJson = (table, body, init) => {
  const endpoint = `*/rest/v1/${table}`;
  return [
    http.get(endpoint, () => HttpResponse.json(body, init)),
    http.post(endpoint, () => HttpResponse.json(body, init))
  ];
};

const registerBookingSuccessHandlers = () => {
  server.use(
    ...respondWithJson('professionals', bookingFixtures.professionals),
    ...respondWithJson('services', bookingFixtures.services),
    ...respondWithJson('availability', bookingFixtures.availability),
    ...respondWithJson('blocked_dates', bookingFixtures.blockedDates),
    ...respondWithJson('reviews', bookingFixtures.reviews)
  );
};

const createQueryWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0
      }
    }
  });

  const wrapper = ({ children }) => (
    <StrictMode>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </StrictMode>
  );

  return { wrapper, queryClient };
};

describe('useBookingData', () => {
  test('returns booking datasets when Supabase succeeds', async () => {
    registerBookingSuccessHandlers();
    const toast = jest.fn();
    const { wrapper, queryClient } = createQueryWrapper();

    const manualResponse = await fetch('https://tests.supabase.local/rest/v1/professionals?select=*');
    const manualJson = await manualResponse.json();
    console.log('manual fetch data', manualJson);

    const { data: directData, error: directError } = await testSupabase.from('professionals').select('*');
    console.log('direct supabase data', directData, directError);

    const { result, unmount } = renderHook(() => useBookingData({ toast }), { wrapper });

    await waitFor(() => expect(result.current.professionals).toHaveLength(2));

    expect(result.current.services).toEqual(bookingFixtures.services);
    expect(result.current.blockedDates[0].date).toBe('2025-12-24');
    expect(result.current.availability['prof-1'].monday).toContain('09:00');
    expect(result.current.testimonials[0].bookings.patient_name).toBe('Joao');
    expect(toast).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refreshBookingData();
    });

    unmount();
    queryClient.clear();
  });

  test('emits toast when professionals query fails', async () => {
    registerBookingSuccessHandlers();
    server.use(
      ...respondWithJson('professionals', { message: 'fail' }, { status: 500 })
    );

    const toast = jest.fn();
    const { wrapper, queryClient } = createQueryWrapper();

    const { data: failureData, error: failureError } = await testSupabase.from('professionals').select('*');
    console.log('failure supabase data', failureData, failureError);

    const { result, unmount } = renderHook(() => useBookingData({ toast }), { wrapper });

    try {
      await waitFor(() => expect(toast).toHaveBeenCalled());
    } catch (error) {
      console.log('toast calls', toast.mock.calls);
      console.log('professionals query state', queryClient.getQueryState(['professionals']));
      throw error;
    }

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Não conseguimos carregar os profissionais' })
    );
    expect(result.current.professionals).toEqual([]);

    unmount();
    queryClient.clear();
  });
});
