import { StrictMode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../tests/msw/server.js';
import { TEST_SUPABASE_URL } from '../../../tests/msw/constants.js';
import { useHomeContent } from '../home/useHomeContent.js';

jest.mock('@/lib/customSupabaseClient', () => jest.requireActual('../../../tests/utils/mockSupabaseClient.js'));

const now = Date.now();
const homeFixtures = {
  event: {
    id: 'evt-1',
    status: 'aberto',
    ativo: true,
    professional_id: 'prof-1',
    data_limite_inscricao: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    data_inicio_exibicao: new Date(now - 60 * 60 * 1000).toISOString(),
    data_fim_exibicao: new Date(now + 60 * 60 * 1000).toISOString(),
    data_inicio: new Date(now + 60 * 60 * 1000).toISOString()
  },
  professionals: [
    { id: 'prof-2', name: 'Beatriz' },
    { id: 'prof-1', name: 'Ana' }
  ],
  eventProfessionals: [{ id: 'prof-1', name: 'Ana' }],
  reviews: [
    {
      id: 'rev-1',
      is_approved: true,
      professionals: { name: 'Ana' },
      bookings: {
        patient_name: 'Maria',
        patient_email: 'maria@example.com',
        booking_date: '2025-12-01'
      }
    }
  ]
};

const createStrictWrapper = () => ({ children }) => <StrictMode>{children}</StrictMode>;

const respondWithJson = (table, body, init) => {
  const endpoint = `*/rest/v1/${table}`;
  return [
    http.get(endpoint, () => HttpResponse.json(body, init)),
    http.post(endpoint, () => HttpResponse.json(body, init))
  ];
};

const registerHomeSuccessHandlers = () => {
  const professionalsResolver = ({ request }) => {
    const url = new URL(request.url);
    const idQuery = url.searchParams.get('id');
    if (idQuery) {
      return HttpResponse.json(homeFixtures.eventProfessionals);
    }
    return HttpResponse.json(homeFixtures.professionals);
  };

  server.use(
    ...respondWithJson('eventos', [homeFixtures.event]),
    http.get('*/rest/v1/professionals', professionalsResolver),
    http.post('*/rest/v1/professionals', professionalsResolver),
    ...respondWithJson('reviews', homeFixtures.reviews)
  );
};

describe('useHomeContent', () => {
  test('loads curated home content and sorts professionals', async () => {
    registerHomeSuccessHandlers();
    const toast = jest.fn();
    const trackAsyncError = jest.fn();
    const wrapper = createStrictWrapper();

    const { result, unmount } = renderHook(() => useHomeContent({ toast, trackAsyncError }), { wrapper });

    await waitFor(() => expect(result.current.activeEvents).toHaveLength(1));

    expect(result.current.activeEvents[0].professional.name).toBe('Ana');
    expect(result.current.professionals.map((prof) => prof.name)).toEqual(['Ana', 'Beatriz']);
    expect(result.current.testimonials).toHaveLength(1);
    expect(trackAsyncError).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();

    await waitFor(() => expect(typeof result.current.refreshHomeContent).toBe('function'));

    unmount();
  });

  test('notifies and tracks when professionals query fails', async () => {
    server.use(
      ...respondWithJson('eventos', [homeFixtures.event]),
      ...respondWithJson('reviews', homeFixtures.reviews),
      ...respondWithJson('professionals', { message: 'unavailable' }, { status: 500 })
    );

    const toast = jest.fn();
    const trackAsyncError = jest.fn();
    const wrapper = createStrictWrapper();

    const { result, unmount } = renderHook(() => useHomeContent({ toast, trackAsyncError }), { wrapper });

    await waitFor(() => expect(result.current.testimonialsLoading).toBe(false));
    await waitFor(() => expect(toast).toHaveBeenCalled());

    expect(trackAsyncError).toHaveBeenCalledWith(expect.anything(), 'fetch_professionals');
    expect(result.current.professionals).toEqual([]);

    unmount();
  });
});
