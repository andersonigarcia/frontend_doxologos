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
        supabase.auth.getSession.mockResolvedValue({
            data: { session: { user: { id: 'test-user-id' } } },
            error: null,
        });
        supabase.auth.refreshSession.mockResolvedValue({
            data: { session: { user: { id: 'test-user-id' } } },
            error: null,
        });
    });

    test('should validate session successfully', async () => {
        let result;
        await act(async () => {
            const hook = renderHook(() => useSessionValidation({ autoRefresh: false }));
            result = hook.result;
        });

        await waitFor(() => {
            expect(result.current.isValid).toBe(true);
        });
    });

    test('should detect invalid session', async () => {
        supabase.auth.getSession.mockResolvedValue({
            data: { session: null },
            error: null,
        });

        let result;
        await act(async () => {
            const hook = renderHook(() => useSessionValidation({ autoRefresh: false }));
            result = hook.result;
        });

        await waitFor(() => {
            expect(result.current.isValid).toBe(false);
        });
    });

    test('should call onSessionExpired when session is invalid', async () => {
        const onSessionExpired = jest.fn();
        supabase.auth.getSession.mockResolvedValue({
            data: { session: null },
            error: null,
        });

        await act(async () => {
            renderHook(() => useSessionValidation({ onSessionExpired, autoRefresh: false }));
        });

        await waitFor(() => {
            expect(onSessionExpired).toHaveBeenCalled();
        });
    });

    test('should refresh token successfully', async () => {
        let result;
        await act(async () => {
            const hook = renderHook(() => useSessionValidation({ autoRefresh: false }));
            result = hook.result;
        });

        let refreshResult;
        await act(async () => {
            refreshResult = await result.current.refreshToken();
        });

        expect(refreshResult).toBe(true);
        expect(supabase.auth.refreshSession).toHaveBeenCalled();
    });

    test('should detect near expiry', async () => {
        let result;
        await act(async () => {
            const hook = renderHook(() =>
                useSessionValidation({ gracePeriod: 10 * 60 * 1000, autoRefresh: false })
            );
            result = hook.result;
        });

        await waitFor(() => {
            expect(result.current.isNearExpiry).toBe(false);
        });
    });

    test('should not refresh if already refreshing', async () => {
        let resolveRefresh;
        supabase.auth.refreshSession.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveRefresh = resolve;
                })
        );

        let result;
        await act(async () => {
            const hook = renderHook(() => useSessionValidation({ autoRefresh: false }));
            result = hook.result;
        });

        let firstPromise;
        act(() => {
            firstPromise = result.current.refreshToken();
        });

        expect(result.current.isRefreshing).toBe(true);

        let secondRefreshResult;
        await act(async () => {
            secondRefreshResult = await result.current.refreshToken();
        });

        expect(secondRefreshResult).toBe(false);

        await act(async () => {
            resolveRefresh({
                data: { session: { user: { id: 'test-user-id' } } },
                error: null,
            });
            await firstPromise;
        });
    });
});
