import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useUserPreferences';
import { Button } from '@/components/ui/button';

/**
 * Toggle de Tema
 * 
 * Botão para alternar entre tema claro e escuro
 * Salva preferência automaticamente
 */
export function ThemeToggle() {
    const { theme, setTheme, loading } = useTheme();

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    if (loading) {
        return null;
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={`Mudar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
        >
            {theme === 'light' ? (
                <Moon className="h-5 w-5" />
            ) : (
                <Sun className="h-5 w-5" />
            )}
        </Button>
    );
}
