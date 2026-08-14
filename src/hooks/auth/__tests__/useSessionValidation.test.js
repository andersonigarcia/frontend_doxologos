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
        const { result } = renderHook(() => useSessionValidation({ autoRefresh: false }));
        await act(async () => {
            await result.current.validateSession();
        });
        expect(result.current.isValid).toBe(true);
    });

    test('should detect invalid session', async () => {
        supabase.auth.getSession.mockResolvedValue({
            data: { session: null },
            error: null,
        });

        const { result } = renderHook(() => useSessionValidation({ autoRefresh: false }));
        await act(async () => {
            await result.current.validateSession();
        });
        expect(result.current.isValid).toBe(false);
    });

    test('should call onSessionExpired when session is invalid', async () => {
        const onSessionExpired = jest.fn();
        supabase.auth.getSession.mockResolvedValue({
            data: { session: null },
            error: null,
        });

        const { result } = renderHook(() =>
            useSessionValidation({ onSessionExpired, autoRefresh: false })
        );
        await act(async () => {
            await result.current.validateSession();
        });
        expect(onSessionExpired).toHaveBeenCalled();
    });

    test('should refresh token successfully', async () => {
        const { result } = renderHook(() => useSessionValidation({ autoRefresh: false }));
        let refreshResult;
        await act(async () => {
            refreshResult = await result.current.refreshToken();
        });
        expect(refreshResult).toBe(true);
        expect(supabase.auth.refreshSession).toHaveBeenCalled();
    });

    test('should detect near expiry', async () => {
        const nearExpiryTime = Math.floor(Date.now() / 1000) + 120; // 2 minutos
        const { result } = renderHook(() =>
            useSessionValidation({
                session: { expires_at: nearExpiryTime },
                autoRefresh: false,
            })
        );
        await act(async () => {
            await result.current.validateSession();
        });
        expect(result.current.isValid).toBe(true);
    });
});
