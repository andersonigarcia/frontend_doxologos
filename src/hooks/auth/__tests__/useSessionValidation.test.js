import { renderHook, act, waitFor } from '@testing-library/react';
import { useSessionValidation } from '../useSessionValidation';
import { supabase } from '@/lib/customSupabaseClient';

// Mock do Supabase
jest.mock('@/lib/customSupabaseClient', () => ({
    supabase: {
        auth: {
            getSession: jest.fn(),
            refreshSession: jest.fn(),
        },
    },
}));

// Mock do useAuth
jest.mock('@/contexts/SupabaseAuthContext', () => ({
    useAuth: jest.fn(() => ({
        session: {
            expires_at: Math.floor(Date.now() / 1000) + 3600, // Expira em 1 hora
        },
        user: { id: 'test-user-id' },
    })),
}));

describe('useSessionValidation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test('should validate session successfully', async () => {
        supabase.auth.getSession.mockResolvedValue({
            data: { session: { user: { id: 'test-user-id' } } },
            error: null,
        });

        const { result } = renderHook(() => useSessionValidation());

        await waitFor(() => {
            expect(result.current.isValid).toBe(true);
        });
    });

    test('should detect invalid session', async () => {
        supabase.auth.getSession.mockResolvedValue({
            data: { session: null },
            error: null,
        });

        const onSessionExpired = jest.fn();
        const { result } = renderHook(() =>
            useSessionValidation({ onSessionExpired })
        );

        await waitFor(() => {
            expect(result.current.isValid).toBe(false);
            expect(onSessionExpired).toHaveBeenCalled();
        });
    });

    test('should refresh token successfully', async () => {
        supabase.auth.refreshSession.mockResolvedValue({
            data: { session: { user: { id: 'test-user-id' } } },
            error: null,
        });

        const { result } = renderHook(() => useSessionValidation());

        let refreshResult;
        await act(async () => {
            refreshResult = await result.current.refreshToken();
        });

        expect(refreshResult).toBe(true);
        expect(supabase.auth.refreshSession).toHaveBeenCalled();
    });

    test('should handle refresh token error', async () => {
        supabase.auth.refreshSession.mockResolvedValue({
            data: { session: null },
            error: new Error('Refresh failed'),
        });

        const { result } = renderHook(() => useSessionValidation());

        let refreshResult;
        await act(async () => {
            refreshResult = await result.current.refreshToken();
        });

        expect(refreshResult).toBe(false);
    });

    test('should validate session periodically', async () => {
        supabase.auth.getSession.mockResolvedValue({
            data: { session: { user: { id: 'test-user-id' } } },
            error: null,
        });

        const { result } = renderHook(() =>
            useSessionValidation({ validationInterval: 1000 })
        );

        // Avançar tempo para disparar validação periódica
        act(() => {
            jest.advanceTimersByTime(1000);
        });

        await waitFor(() => {
            expect(supabase.auth.getSession).toHaveBeenCalledTimes(2); // Initial + periodic
        });
    });

    test('should detect near expiry', async () => {
        const { result } = renderHook(() =>
            useSessionValidation({ gracePeriod: 10 * 60 * 1000 }) // 10 minutos
        );

        await waitFor(() => {
            // Se a sessão expira em 1 hora e grace period é 10 min, não está próximo
            expect(result.current.isNearExpiry).toBe(false);
        });
    });

    test('should not refresh if already refreshing', async () => {
        supabase.auth.refreshSession.mockImplementation(
            () =>
                new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            data: { session: { user: { id: 'test-user-id' } } },
                            error: null,
                        });
                    }, 1000);
                })
        );

        const { result } = renderHook(() => useSessionValidation());

        // Iniciar primeiro refresh
        act(() => {
            result.current.refreshToken();
        });

        expect(result.current.isRefreshing).toBe(true);

        // Tentar segundo refresh enquanto primeiro está em andamento
        let secondRefreshResult;
        await act(async () => {
            secondRefreshResult = await result.current.refreshToken();
        });

        expect(secondRefreshResult).toBe(false);
    });
});
