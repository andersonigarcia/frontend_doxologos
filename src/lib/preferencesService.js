import { supabase } from '@/lib/customSupabaseClient';

/**
 * Serviço para gerenciar preferências do usuário
 * 
 * Funcionalidades:
 * - Buscar preferências
 * - Atualizar preferências
 * - Resetar para padrão
 */

/**
 * Preferências padrão
 */
export const DEFAULT_PREFERENCES = {
    theme: 'light',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    notifications_enabled: true,
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    email_reminders: true,
    reminder_hours_before: 24,
    dashboard_layout: {},
};

/**
 * Temas disponíveis
 */
export const Theme = {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto',
};

/**
 * Idiomas disponíveis
 */
export const Language = {
    PT_BR: 'pt-BR',
    EN_US: 'en-US',
};

/**
 * Classe para gerenciar preferências do usuário
 */
class PreferencesService {
    /**
     * Busca preferências do usuário atual
     * 
     * @returns {Promise<{data: Object, error?: Error}>}
     */
    async getPreferences() {
        try {
            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .single();

            if (error) {
                // Se não encontrou, retornar preferências padrão
                if (error.code === 'PGRST116') {
                    console.log('ℹ️  Preferências não encontradas, usando padrão');
                    return { data: DEFAULT_PREFERENCES, error: null };
                }

                console.error('❌ Erro ao buscar preferências:', error);
                return { data: DEFAULT_PREFERENCES, error };
            }

            return { data, error: null };
        } catch (error) {
            console.error('❌ Erro crítico ao buscar preferências:', error);
            return { data: DEFAULT_PREFERENCES, error };
        }
    }

    /**
     * Atualiza preferências do usuário
     * 
     * @param {Object} preferences - Preferências a atualizar
     * @returns {Promise<{data: Object, error?: Error}>}
     */
    async updatePreferences(preferences) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return { data: null, error: new Error('Usuário não autenticado') };
            }

            const { data, error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: user.id,
                    ...preferences,
                })
                .select()
                .single();

            if (error) {
                console.error('❌ Erro ao atualizar preferências:', error);
                return { data: null, error };
            }

            console.log('✅ Preferências atualizadas');
            return { data, error: null };
        } catch (error) {
            console.error('❌ Erro crítico ao atualizar preferências:', error);
            return { data: null, error };
        }
    }

    /**
     * Atualiza tema
     * 
     * @param {string} theme - Tema (light, dark, auto)
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async updateTheme(theme) {
        if (!Object.values(Theme).includes(theme)) {
            return { success: false, error: new Error('Tema inválido') };
        }

        const { data, error } = await this.updatePreferences({ theme });
        return { success: !error, error };
    }

    /**
     * Atualiza idioma
     * 
     * @param {string} language - Idioma (pt-BR, en-US)
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async updateLanguage(language) {
        if (!Object.values(Language).includes(language)) {
            return { success: false, error: new Error('Idioma inválido') };
        }

        const { data, error } = await this.updatePreferences({ language });
        return { success: !error, error };
    }

    /**
     * Atualiza configurações de notificações
     * 
     * @param {Object} notificationSettings - Configurações
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async updateNotificationSettings(notificationSettings) {
        const { data, error } = await this.updatePreferences(notificationSettings);
        return { success: !error, error };
    }

    /**
     * Atualiza layout do dashboard
     * 
     * @param {Object} layout - Layout em JSON
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async updateDashboardLayout(layout) {
        const { data, error } = await this.updatePreferences({
            dashboard_layout: layout,
        });
        return { success: !error, error };
    }

    /**
     * Reseta preferências para padrão
     * 
     * @returns {Promise<{success: boolean, error?: Error}>}
     */
    async resetToDefault() {
        const { data, error } = await this.updatePreferences(DEFAULT_PREFERENCES);
        return { success: !error, error };
    }

    /**
     * Aplica tema ao documento
     * 
     * @param {string} theme - Tema a aplicar
     */
    applyTheme(theme) {
        const root = document.documentElement;

        if (theme === Theme.AUTO) {
            // Detectar preferência do sistema
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            theme = prefersDark ? Theme.DARK : Theme.LIGHT;
        }

        if (theme === Theme.DARK) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        console.log(`🎨 Tema aplicado: ${theme}`);
    }

    /**
     * Aplica idioma ao documento
     * 
     * @param {string} language - Idioma a aplicar
     */
    applyLanguage(language) {
        document.documentElement.lang = language;
        console.log(`🌐 Idioma aplicado: ${language}`);
    }
}

// Exportar instância singleton
export const preferencesService = new PreferencesService();

// Exportar classe para testes
export { PreferencesService };
