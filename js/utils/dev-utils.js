/**
 * Utilidades para el modo desarrollo
 * Este archivo contiene funciones de ayuda para el modo desarrollo
 */

/**
 * Verifica si una validación de fecha debe ser omitida en modo desarrollo
 * @param {Date} date - La fecha a validar
 * @param {string} validationType - Tipo de validación (confirmationStart, confirmationEnd, etc.)
 * @returns {boolean} - True si la validación debe ser omitida
 */
function shouldBypassDateValidation(date, validationType) {
    // Verificar si estamos en modo desarrollo con bypass de fechas
    if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE && 
        typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.bypassDateValidations) {
        
        if (typeof devLog === 'function') {
            devLog(`Bypass de validación de fecha (${validationType}): ${date}`);
        }
        
        return true;
    }
    
    return false;
}

/**
 * Verifica si una operación debe usar datos de prueba
 * @returns {boolean} - True si se deben usar datos de prueba
 */
function shouldUseTestData() {
    return typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE && 
           typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.useTestData;
}

/**
 * Verifica si el bypass de autenticación está activado
 * @returns {boolean} - True si el bypass de autenticación está activado
 */
function isAuthBypassEnabled() {
    return typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE && 
           typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.bypassAuth;
}

/**
 * Verifica si el bypass de roles está activado
 * @returns {boolean} - True si el bypass de roles está activado
 */
function isRoleBypassEnabled() {
    return typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE && 
           typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.bypassRoleValidation;
}

/**
 * Obtiene el usuario de desarrollo actual
 * @returns {Object|null} - Usuario de desarrollo o null si no hay ninguno
 */
function getCurrentDevUser() {
    if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE) {
        try {
            const devUserJson = localStorage.getItem('dev_current_user');
            if (devUserJson) {
                return JSON.parse(devUserJson);
            }
        } catch (e) {
            console.error('Error al obtener usuario de desarrollo:', e);
        }
    }
    return null;
}

/**
 * Muestra un mensaje de desarrollo en la consola
 * @param {string} message - Mensaje a mostrar
 * @param {any} data - Datos adicionales (opcional)
 */
function logDevMessage(message, data = null) {
    if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE && 
        typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.enableDevLogs) {
        
        if (typeof devLog === 'function') {
            devLog(message, data);
        } else {
            console.log(`[DEV] ${message}`, data ? data : '');
        }
        
        // Actualizar el panel de desarrollo si existe
        if (typeof updateDevLog === 'function') {
            updateDevLog(message);
        }
    }
}

// Exportar funciones para uso global
window.shouldBypassDateValidation = shouldBypassDateValidation;
window.shouldUseTestData = shouldUseTestData;
window.isAuthBypassEnabled = isAuthBypassEnabled;
window.isRoleBypassEnabled = isRoleBypassEnabled;
window.getCurrentDevUser = getCurrentDevUser;
window.logDevMessage = logDevMessage;
