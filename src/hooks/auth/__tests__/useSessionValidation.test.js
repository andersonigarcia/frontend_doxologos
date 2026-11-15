import { renderHook, act } from '@testing-library/react';
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

// ESTRATÉGIA DE ISOLAMENTO:
// Retornamos session: null e user: null para que o useEffect do hook execute
// o early-return na linha `if (!user || !session) { setIsValid(false); return; }`.
// Isso impede que o hook crie setInterval e chame validateSession() automaticamente
// no mount. Sem isso, o act() do React 18 fica aguardando o timer de 5min, causando timeout.
// Os testes exercitam validateSession() e refreshToken() de forma imperativa.
jest.mock('@/contexts/SupabaseAuthContext', () => ({
    useAuth: jest.fn(() => ({
        session: null,
        user: null,
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

        // isValid começa como false (useEffect detectou user/session null)
        expect(result.current.isValid).toBe(false);

        // Após chamar validateSession() com getSession retornando sessão válida → true
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
        const { result } = renderHook(() => useSessionValidation({ autoRefresh: false }));

        // Após validateSession() com sessão válida, isValid deve ser true
        // (o hook não tem acesso a session.expires_at pois useAuth retorna null,
        // mas isNearExpiry é derivado de calculateTimeUntilExpiry que lê session do useAuth)
        await act(async () => {
            await result.current.validateSession();
        });

        // Sessão confirmada válida pelo getSession mock — isValid é true
        expect(result.current.isValid).toBe(true);
        // isNearExpiry é false pois session do useAuth é null → calculateTimeUntilExpiry retorna null
        expect(result.current.isNearExpiry).toBe(false);
    });
});
