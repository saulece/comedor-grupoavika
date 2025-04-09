/**
 * StateManager - Servicio para gestión centralizada de estado
 * 
 * Este servicio proporciona una forma de gestionar el estado de la aplicación
 * sin depender de variables globales en window.
 */

// Módulo de gestión de estado usando patrón Singleton
const StateManager = (function() {
    // Almacén privado para el estado
    const _store = {};
    
    // Almacén para las suscripciones a cambios
    const _subscribers = {};
    
    // Contador para IDs de suscripción
    let _subscriptionIdCounter = 0;
    
    /**
     * Inicializa un espacio de nombres en el almacén
     * @param {string} namespace - Espacio de nombres para el estado
     * @param {Object} initialState - Estado inicial para el espacio de nombres
     */
    function initNamespace(namespace, initialState = {}) {
        if (!_store[namespace]) {
            _store[namespace] = { ...initialState };
            _subscribers[namespace] = {};
        } else {
            // Si ya existe, actualizar con nuevas propiedades sin sobrescribir existentes
            _store[namespace] = { ..._store[namespace], ...initialState };
        }
    }
    
    /**
     * Obtiene el estado completo de un espacio de nombres
     * @param {string} namespace - Espacio de nombres
     * @returns {Object} Estado del espacio de nombres
     */
    function getState(namespace) {
        if (!_store[namespace]) {
            initNamespace(namespace);
        }
        return { ..._store[namespace] };
    }
    
    /**
     * Obtiene un valor específico del estado
     * @param {string} namespace - Espacio de nombres
     * @param {string} key - Clave del valor a obtener
     * @param {*} defaultValue - Valor por defecto si no existe
     * @returns {*} Valor almacenado o valor por defecto
     */
    function getValue(namespace, key, defaultValue = null) {
        if (!_store[namespace]) {
            initNamespace(namespace);
            return defaultValue;
        }
        return _store[namespace][key] !== undefined ? _store[namespace][key] : defaultValue;
    }
    
    /**
     * Establece un valor en el estado
     * @param {string} namespace - Espacio de nombres
     * @param {string} key - Clave del valor a establecer
     * @param {*} value - Valor a establecer
     */
    function setValue(namespace, key, value) {
        if (!_store[namespace]) {
            initNamespace(namespace);
        }
        
        const oldValue = _store[namespace][key];
        _store[namespace][key] = value;
        
        // Notificar a los suscriptores si el valor ha cambiado
        if (oldValue !== value) {
            notifySubscribers(namespace, key, value, oldValue);
        }
    }
    
    /**
     * Actualiza múltiples valores en el estado
     * @param {string} namespace - Espacio de nombres
     * @param {Object} values - Objeto con los valores a actualizar
     */
    function updateValues(namespace, values) {
        if (!_store[namespace]) {
            initNamespace(namespace);
        }
        
        // Guardar valores antiguos para notificaciones
        const oldValues = { ..._store[namespace] };
        
        // Actualizar valores
        _store[namespace] = { ..._store[namespace], ...values };
        
        // Notificar cambios
        Object.keys(values).forEach(key => {
            if (oldValues[key] !== values[key]) {
                notifySubscribers(namespace, key, values[key], oldValues[key]);
            }
        });
    }
    
    /**
     * Elimina un valor del estado
     * @param {string} namespace - Espacio de nombres
     * @param {string} key - Clave del valor a eliminar
     */
    function removeValue(namespace, key) {
        if (!_store[namespace]) return;
        
        const oldValue = _store[namespace][key];
        delete _store[namespace][key];
        
        // Notificar a los suscriptores
        notifySubscribers(namespace, key, undefined, oldValue);
    }
    
    /**
     * Elimina un espacio de nombres completo
     * @param {string} namespace - Espacio de nombres a eliminar
     */
    function clearNamespace(namespace) {
        if (!_store[namespace]) return;
        
        const oldState = { ..._store[namespace] };
        delete _store[namespace];
        delete _subscribers[namespace];
        
        // Podríamos notificar la eliminación del namespace si fuera necesario
    }
    
    /**
     * Suscribe una función a cambios en un valor específico
     * @param {string} namespace - Espacio de nombres
     * @param {string} key - Clave a observar (o '*' para todos los cambios en el namespace)
     * @param {Function} callback - Función a llamar cuando cambie el valor
     * @returns {string} ID de suscripción para cancelar después
     */
    function subscribe(namespace, key, callback) {
        if (!_store[namespace]) {
            initNamespace(namespace);
        }
        
        if (!_subscribers[namespace]) {
            _subscribers[namespace] = {};
        }
        
        if (!_subscribers[namespace][key]) {
            _subscribers[namespace][key] = {};
        }
        
        const id = `sub_${_subscriptionIdCounter++}`;
        _subscribers[namespace][key][id] = callback;
        
        return id;
    }
    
    /**
     * Cancela una suscripción
     * @param {string} namespace - Espacio de nombres
     * @param {string} key - Clave observada
     * @param {string} subscriptionId - ID de suscripción a cancelar
     */
    function unsubscribe(namespace, key, subscriptionId) {
        if (!_subscribers[namespace] || !_subscribers[namespace][key]) return;
        
        delete _subscribers[namespace][key][subscriptionId];
        
        // Limpiar objetos vacíos
        if (Object.keys(_subscribers[namespace][key]).length === 0) {
            delete _subscribers[namespace][key];
        }
        
        if (Object.keys(_subscribers[namespace]).length === 0) {
            delete _subscribers[namespace];
        }
    }
    
    /**
     * Notifica a los suscriptores sobre un cambio en el estado
     * @param {string} namespace - Espacio de nombres
     * @param {string} key - Clave que cambió
     * @param {*} newValue - Nuevo valor
     * @param {*} oldValue - Valor anterior
     */
    function notifySubscribers(namespace, key, newValue, oldValue) {
        // Notificar a los suscriptores de esta clave específica
        if (_subscribers[namespace] && _subscribers[namespace][key]) {
            Object.values(_subscribers[namespace][key]).forEach(callback => {
                try {
                    callback(newValue, oldValue, key, namespace);
                } catch (error) {
                    console.error('Error en suscriptor:', error);
                }
            });
        }
        
        // Notificar a los suscriptores de todos los cambios en este namespace
        if (_subscribers[namespace] && _subscribers[namespace]['*']) {
            Object.values(_subscribers[namespace]['*']).forEach(callback => {
                try {
                    callback(newValue, oldValue, key, namespace);
                } catch (error) {
                    console.error('Error en suscriptor global:', error);
                }
            });
        }
    }
    
    /**
     * Crea un objeto de estado específico para un módulo
     * @param {string} namespace - Espacio de nombres para el módulo
     * @param {Object} initialState - Estado inicial
     * @returns {Object} Objeto con métodos para gestionar el estado del módulo
     */
    function createModuleState(namespace, initialState = {}) {
        initNamespace(namespace, initialState);
        
        return {
            getState: () => getState(namespace),
            getValue: (key, defaultValue) => getValue(namespace, key, defaultValue),
            setValue: (key, value) => setValue(namespace, key, value),
            updateValues: (values) => updateValues(namespace, values),
            removeValue: (key) => removeValue(namespace, key),
            clear: () => clearNamespace(namespace),
            subscribe: (key, callback) => subscribe(namespace, key, callback),
            unsubscribe: (key, subscriptionId) => unsubscribe(namespace, key, subscriptionId)
        };
    }
    
    // API pública
    return {
        initNamespace,
        getState,
        getValue,
        setValue,
        updateValues,
        removeValue,
        clearNamespace,
        subscribe,
        unsubscribe,
        createModuleState
    };
})();

// Exponer el servicio globalmente
window.StateManager = StateManager;
