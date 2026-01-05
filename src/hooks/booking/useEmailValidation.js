import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { validateEmail } from './usePatientForm';

/**
 * Hook para validação automática de email
 * Verifica se o email já existe no banco de dados
 * 
 * @returns {Object} - { checkEmail, isChecking, emailExists, error, clearEmailCheck }
 */
export function useEmailValidation() {
    const [isChecking, setIsChecking] = useState(false);
    const [emailExists, setEmailExists] = useState(null);
    const [error, setError] = useState(null);

    // Cache para evitar consultas duplicadas
    const cacheRef = useRef(new Map());

    // Debounce timer
    const debounceTimerRef = useRef(null);

    /**
     * Verifica se o email existe no banco de dados
     * @param {string} email - Email a ser verificado
     * @param {number} debounceMs - Tempo de debounce em ms (padrão: 500ms)
     * @returns {Promise<boolean|null>} - true se existe, false se não existe, null se erro
     */
    const checkEmail = useCallback(async (email, debounceMs = 500) => {
        // Limpar timer anterior
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Validar formato do email primeiro
        if (!email || !validateEmail(email)) {
            setEmailExists(null);
            setError(null);
            setIsChecking(false);
            return null;
        }

        // Normalizar email
        const normalizedEmail = email.trim().toLowerCase();

        // Verificar cache
        if (cacheRef.current.has(normalizedEmail)) {
            const cached = cacheRef.current.get(normalizedEmail);
            setEmailExists(cached);
            setIsChecking(false);
            return cached;
        }

        // Criar promise para debounce
        return new Promise((resolve) => {
            debounceTimerRef.current = setTimeout(async () => {
                setIsChecking(true);
                setError(null);

                try {
                    // Consultar Supabase Auth para verificar se email existe
                    // Usamos a tabela auth.users através de uma RPC function
                    const { data, error: rpcError } = await supabase.rpc('check_email_exists', {
                        email_to_check: normalizedEmail
                    });

                    if (rpcError) {
                        // Se a RPC não existir, usar fallback silencioso
                        // Não mostrar erro, apenas não fazer auto-toggle
                        console.warn('⚠️ RPC check_email_exists não disponível. Auto-toggle desabilitado.');
                        console.warn('💡 Para habilitar validação automática, aplique a migração SQL:');
                        console.warn('   supabase/migrations/check_email_exists.sql');

                        // Retornar null para indicar que não foi possível verificar
                        // Isso fará com que o auto-toggle não funcione, mas não mostra erro
                        setError(null);
                        setEmailExists(null);
                        setIsChecking(false);
                        resolve(null);
                        return;
                    }

                    const exists = Boolean(data);

                    // Atualizar cache
                    cacheRef.current.set(normalizedEmail, exists);

                    // Limitar tamanho do cache (máximo 50 emails)
                    if (cacheRef.current.size > 50) {
                        const firstKey = cacheRef.current.keys().next().value;
                        cacheRef.current.delete(firstKey);
                    }

                    setEmailExists(exists);
                    setIsChecking(false);
                    resolve(exists);
                } catch (err) {
                    console.error('Erro ao verificar email:', err);
                    setError('Erro ao verificar email. Por favor, continue manualmente.');
                    setEmailExists(null);
                    setIsChecking(false);
                    resolve(null);
                }
            }, debounceMs);
        });
    }, []);

    /**
     * Limpa o estado de verificação de email
     */
    const clearEmailCheck = useCallback(() => {
        setEmailExists(null);
        setError(null);
        setIsChecking(false);

        // Limpar debounce timer se existir
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
    }, []);

    /**
     * Limpa o cache de emails
     */
    const clearCache = useCallback(() => {
        cacheRef.current.clear();
    }, []);

    return {
        checkEmail,
        isChecking,
        emailExists,
        error,
        clearEmailCheck,
        clearCache,
    };
}
