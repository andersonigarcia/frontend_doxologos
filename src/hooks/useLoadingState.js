import { useState, useCallback } from 'react';

/**
 * Hook customizado para gerenciar estados de loading de operações assíncronas
 * Previne múltiplas operações simultâneas e fornece feedback visual
 * 
 * @returns {Object} - Objeto com métodos e estados de loading
 * 
 * @example
 * const { isLoading, startLoading, stopLoading, withLoading } = useLoadingState();
 * 
 * // Uso manual
 * startLoading('saveData');
 * await saveData();
 * stopLoading();
 * 
 * // Uso com wrapper
 * await withLoading('saveData', async () => {
 *   await saveData();
 * });
 */
export const useLoadingState = () => {
    const [loadingStates, setLoadingStates] = useState({});
    
    /**
     * Inicia o estado de loading para uma operação específica
     * @param {string} key - Identificador único da operação
     * @param {*} id - ID opcional do item sendo processado
     */
    const startLoading = useCallback((key, id = null) => {
        setLoadingStates(prev => ({
            ...prev,
            [key]: { isLoading: true, id }
        }));
    }, []);
    
    /**
     * Para o estado de loading para uma operação específica
     * @param {string} key - Identificador único da operação
     */
    const stopLoading = useCallback((key) => {
        setLoadingStates(prev => {
            const newState = { ...prev };
            delete newState[key];
            return newState;
        });
    }, []);
    
    /**
     * Para todos os estados de loading
     */
    const stopAllLoading = useCallback(() => {
        setLoadingStates({});
    }, []);
    
    /**
     * Verifica se uma operação específica está em loading
     * @param {string} key - Identificador único da operação
     * @returns {boolean}
     */
    const isLoading = useCallback((key) => {
        return loadingStates[key]?.isLoading || false;
    }, [loadingStates]);
    
    /**
     * Verifica se qualquer operação está em loading
     * @returns {boolean}
     */
    const isAnyLoading = useCallback(() => {
        return Object.keys(loadingStates).length > 0;
    }, [loadingStates]);
    
    /**
     * Obtém o ID do item sendo processado em uma operação
     * @param {string} key - Identificador único da operação
     * @returns {*}
     */
    const getLoadingId = useCallback((key) => {
        return loadingStates[key]?.id || null;
    }, [loadingStates]);
    
    /**
     * Wrapper para executar função assíncrona com loading automático
     * @param {string} key - Identificador único da operação
     * @param {Function} fn - Função assíncrona a ser executada
     * @param {*} id - ID opcional do item sendo processado
     * @returns {Promise<*>} - Resultado da função
     */
    const withLoading = useCallback(async (key, fn, id = null) => {
        // Prevenir operações simultâneas da mesma key
        if (loadingStates[key]?.isLoading) {
            console.warn(`Operação "${key}" já está em andamento`);
            return;
        }
        
        startLoading(key, id);
        try {
            const result = await fn();
            return result;
        } finally {
            stopLoading(key);
        }
    }, [loadingStates, startLoading, stopLoading]);
    
    return {
        // Estados
        loadingStates,
        
        // Métodos de controle
        startLoading,
        stopLoading,
        stopAllLoading,
        
        // Métodos de verificação
        isLoading,
        isAnyLoading,
        getLoadingId,
        
        // Wrapper
        withLoading
    };
};

/**
 * Hook especializado para operações em itens de lista (CRUD)
 * Gerencia loading por ID de item
 * 
 * @returns {Object} - Objeto com métodos e estados de loading para items
 * 
 * @example
 * const { isItemLoading, withItemLoading } = useItemLoadingState();
 * 
 * await withItemLoading('delete', itemId, async () => {
 *   await deleteItem(itemId);
 * });
 * 
 * // No render
 * <Button disabled={isItemLoading('delete', itemId)}>Delete</Button>
 */
export const useItemLoadingState = () => {
    const [itemLoadingStates, setItemLoadingStates] = useState({});
    
    const startItemLoading = useCallback((operation, itemId) => {
        setItemLoadingStates(prev => ({
            ...prev,
            [`${operation}-${itemId}`]: true
        }));
    }, []);
    
    const stopItemLoading = useCallback((operation, itemId) => {
        setItemLoadingStates(prev => {
            const newState = { ...prev };
            delete newState[`${operation}-${itemId}`];
            return newState;
        });
    }, []);
    
    const isItemLoading = useCallback((operation, itemId) => {
        return itemLoadingStates[`${operation}-${itemId}`] || false;
    }, [itemLoadingStates]);
    
    const isAnyItemLoading = useCallback(() => {
        return Object.keys(itemLoadingStates).length > 0;
    }, [itemLoadingStates]);
    
    const withItemLoading = useCallback(async (operation, itemId, fn) => {
        const key = `${operation}-${itemId}`;
        
        if (itemLoadingStates[key]) {
            console.warn(`Operação "${operation}" no item "${itemId}" já está em andamento`);
            return;
        }
        
        startItemLoading(operation, itemId);
        try {
            const result = await fn();
            return result;
        } finally {
            stopItemLoading(operation, itemId);
        }
    }, [itemLoadingStates, startItemLoading, stopItemLoading]);
    
    return {
        itemLoadingStates,
        startItemLoading,
        stopItemLoading,
        isItemLoading,
        isAnyItemLoading,
        withItemLoading
    };
};

export default useLoadingState;
