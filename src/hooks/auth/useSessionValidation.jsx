import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook para validação contínua de sessão
 * 
 * Funcionalidades:
 * - Validação periódica da sessão
 * - Refresh automático de token quando próximo da expiração
 * - Callback para sessão expirada
 * - Grace period para evitar logouts abruptos
 * 
 * @param {Object} options - Opções de configuração
 * @param {Function} options.onSessionExpired - Callback quando sessão expirar
 * @param {number} options.validationInterval - Intervalo de validação em ms (padrão: 5 minutos)
 * @param {number} options.gracePeriod - Período de graça antes de expirar em ms (padrão: 5 minutos)
 * @param {boolean} options.autoRefresh - Se deve fazer refresh automático (padrão: true)
 * @returns {Object} Estado da validação de sessão
 */
export function useSessionValidation(options = {}) {
    const {
        onSessionExpired,
        validationInterval = 5 * 60 * 1000, // 5 minutos
        gracePeriod = 5 * 60 * 1000, // 5 minutos
        autoRefresh = true,
    } = options;

    const { session, user } = useAuth();
    const [isValid, setIsValid] = useState(true);
    const [timeUntilExpiry, setTimeUntilExpiry] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastValidation, setLastValidation] = useState(null);

    const validationTimerRef = useRef(null);
    const expiryTimerRef = useRef(null);

    /**
     * Valida a sessão atual
     */
    const validateSession = useCallback(async () => {
        try {
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                console.error('❌ Erro ao validar sessão:', error);
                setIsValid(false);
                return false;
            }

            const hasValidSession = !!data.session;
            setIsValid(hasValidSession);
            setLastValidation(new Date());

            if (!hasValidSession && onSessionExpired) {
                onSessionExpired();
            }

            return hasValidSession;
        } catch (error) {
            console.error('❌ Erro crítico na validação de sessão:', error);
            setIsValid(false);
            return false;
        }
    }, [onSessionExpired]);

    /**
     * Faz refresh do token de autenticação
     */
    const refreshToken = useCallback(async () => {
        if (isRefreshing) {
            console.log('⏳ Refresh já em andamento, aguardando...');
            return false;
        }

        try {
            setIsRefreshing(true);
            console.log('🔄 Iniciando refresh de token...');

            const { data, error } = await supabase.auth.refreshSession();

            if (error) {
                console.error('❌ Erro ao fazer refresh de token:', error);
                setIsValid(false);
                if (onSessionExpired) {
                    onSessionExpired();
                }
                return false;
            }

            if (data.session) {
                console.log('✅ Token renovado com sucesso');
                setIsValid(true);
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Erro crítico ao fazer refresh:', error);
            setIsValid(false);
            return false;
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, onSessionExpired]);

    /**
     * Calcula tempo até expiração da sessão
     */
    const calculateTimeUntilExpiry = useCallback(() => {
        if (!session?.expires_at) {
            setTimeUntilExpiry(null);
            return null;
        }

        const expiryTime = new Date(session.expires_at * 1000).getTime();
        const now = Date.now();
        const timeLeft = expiryTime - now;

        setTimeUntilExpiry(timeLeft);
        return timeLeft;
    }, [session]);

    /**
     * Verifica se sessão está próxima de expirar
     */
    const isNearExpiry = useCallback(() => {
        const timeLeft = calculateTimeUntilExpiry();
        return timeLeft !== null && timeLeft > 0 && timeLeft <= gracePeriod;
    }, [calculateTimeUntilExpiry, gracePeriod]);

    // Efeito para validação periódica
    useEffect(() => {
        if (!user || !session) {
            setIsValid(false);
            return;
        }

        // Validação inicial
        validateSession();

        // Configurar validação periódica
        validationTimerRef.current = setInterval(() => {
            validateSession();
        }, validationInterval);

        return () => {
            if (validationTimerRef.current) {
                clearInterval(validationTimerRef.current);
            }
        };
    }, [user, session, validationInterval, validateSession]);

    // Efeito para monitorar expiração e fazer refresh automático
    useEffect(() => {
        if (!session || !autoRefresh) {
            return;
        }

        // Verificar expiração a cada minuto
        expiryTimerRef.current = setInterval(() => {
            const timeLeft = calculateTimeUntilExpiry();

            // Se está próximo de expirar, fazer refresh
            if (timeLeft !== null && timeLeft > 0 && timeLeft <= gracePeriod) {
                console.log(`⚠️ Sessão expira em ${Math.floor(timeLeft / 1000 / 60)} minutos, fazendo refresh...`);
                refreshToken();
            }

            // Se já expirou
            if (timeLeft !== null && timeLeft <= 0) {
                console.log('❌ Sessão expirada');
                setIsValid(false);
                if (onSessionExpired) {
                    onSessionExpired();
                }
            }
        }, 60 * 1000); // Verificar a cada minuto

        return () => {
            if (expiryTimerRef.current) {
                clearInterval(expiryTimerRef.current);
            }
        };
    }, [session, autoRefresh, gracePeriod, calculateTimeUntilExpiry, refreshToken, onSessionExpired]);

    return {
        isValid,
        isRefreshing,
        timeUntilExpiry,
        lastValidation,
        validateSession,
        refreshToken,
        isNearExpiry: isNearExpiry(),
    };
}
