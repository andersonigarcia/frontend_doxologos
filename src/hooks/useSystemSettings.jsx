import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook to manage system settings stored in the database.
 * @param {string} [key] - Optional specific key to listen to. If not provided, fetches all settings.
 */
export const useSystemSettings = (key = null) => {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch initial settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                let query = supabase.from('system_settings').select('*');

                if (key) {
                    query = query.eq('key', key);
                }

                const { data, error } = await query;

                if (error) throw error;

                // Transform array to object { key: value }
                const settingsMap = (data || []).reduce((acc, curr) => {
                    acc[curr.key] = curr.value;
                    return acc;
                }, {});

                setSettings(prev => ({ ...prev, ...settingsMap }));
            } catch (err) {
                console.error('Error fetching system settings:', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();

        // Subscribe to changes
        const subscription = supabase
            .channel('public:system_settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, (payload) => {
                if (key && payload.new.key !== key) return;

                setSettings(prev => ({
                    ...prev,
                    [payload.new.key]: payload.new.value
                }));
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [key]);

    /**
     * Update a system setting
     * @param {string} settingKey 
     * @param {any} value 
     */
    const updateSetting = async (settingKey, value) => {
        try {
            const { error } = await supabase
                .from('system_settings')
                .upsert({
                    key: settingKey,
                    value: value,
                    updated_at: new Date()
                });

            if (error) throw error;

            // Optimistic update
            setSettings(prev => ({ ...prev, [settingKey]: value }));
            return { error: null };
        } catch (err) {
            console.error('Error updating setting:', err);
            return { error: err };
        }
    };

    return {
        settings,
        loading,
        error,
        updateSetting,
        // Helper to get a specific value with default
        getSetting: (k, defaultValue) => settings[k] ?? defaultValue
    };
};
