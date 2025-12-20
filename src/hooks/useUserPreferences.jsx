import { useState, useEffect, useCallback } from 'react';
import { preferencesService, DEFAULT_PREFERENCES, Theme, Language } from '@/lib/preferencesService';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook para gerenciar preferências do usuário
 * 
 * Funcionalidades:
 * - Buscar preferências
 * - Atualizar preferências
 * - Aplicar tema/idioma
 * - Resetar para padrão
 * 
 * @returns {Object} Estado e métodos de preferências
 */
export function useUserPreferences() {
    const { toast } = useToast();
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    /**
     * Busca preferências do usuário
     */
    const fetchPreferences = useCallback(async () => {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await preferencesService.getPreferences();

        if (fetchError) {
            setError(fetchError);
        } else {
            setPreferences(data);

            // Aplicar tema e idioma automaticamente
            preferencesService.applyTheme(data.theme);
            preferencesService.applyLanguage(data.language);
        }

        setLoading(false);
    }, []);

    /**
     * Atualiza preferências
     */
    const updatePreferences = useCallback(async (newPreferences) => {
        const { data, error: updateError } = await preferencesService.updatePreferences(newPreferences);

        if (updateError) {
            toast({
                variant: 'destructive',
                title: 'Erro ao salvar preferências',
                description: 'Não foi possível salvar suas preferências.',
            });
            return false;
        }

        setPreferences(data);

        // Aplicar tema/idioma se foram alterados
        if (newPreferences.theme) {
            preferencesService.applyTheme(newPreferences.theme);
        }
        if (newPreferences.language) {
            preferencesService.applyLanguage(newPreferences.language);
        }

        toast({
            title: '✅ Preferências salvas',
            description: 'Suas preferências foram atualizadas com sucesso.',
        });

        return true;
    }, [toast]);

    /**
     * Atualiza tema
     */
    const updateTheme = useCallback(async (theme) => {
        const success = await updatePreferences({ theme });
        return success;
    }, [updatePreferences]);

    /**
     * Atualiza idioma
     */
    const updateLanguage = useCallback(async (language) => {
        const success = await updatePreferences({ language });
        return success;
    }, [updatePreferences]);

    /**
     * Atualiza configurações de notificações
     */
    const updateNotificationSettings = useCallback(async (settings) => {
        const success = await updatePreferences(settings);
        return success;
    }, [updatePreferences]);

    /**
     * Atualiza layout do dashboard
     */
    const updateDashboardLayout = useCallback(async (layout) => {
        const success = await updatePreferences({ dashboard_layout: layout });
        return success;
    }, [updatePreferences]);

    /**
     * Reseta para padrão
     */
    const resetToDefault = useCallback(async () => {
        const { success } = await preferencesService.resetToDefault();

        if (success) {
            setPreferences(DEFAULT_PREFERENCES);
            preferencesService.applyTheme(DEFAULT_PREFERENCES.theme);
            preferencesService.applyLanguage(DEFAULT_PREFERENCES.language);

            toast({
                title: '🔄 Preferências resetadas',
                description: 'Suas preferências foram restauradas para o padrão.',
            });
        }

        return success;
    }, [toast]);

    // Buscar preferências ao montar
    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);

    return {
        preferences,
        loading,
        error,
        updatePreferences,
        updateTheme,
        updateLanguage,
        updateNotificationSettings,
        updateDashboardLayout,
        resetToDefault,
        refresh: fetchPreferences,
    };
}

/**
 * Hook simplificado para apenas tema
 * 
 * @returns {Object} Tema atual e função para atualizar
 */
export function useTheme() {
    const { preferences, updateTheme, loading } = useUserPreferences();

    return {
        theme: preferences.theme,
        setTheme: updateTheme,
        loading,
    };
}

/**
 * Hook simplificado para apenas idioma
 * 
 * @returns {Object} Idioma atual e função para atualizar
 */
export function useLanguage() {
    const { preferences, updateLanguage, loading } = useUserPreferences();

    return {
        language: preferences.language,
        setLanguage: updateLanguage,
        loading,
    };
}
