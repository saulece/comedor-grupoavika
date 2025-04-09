/**
 * Utilidades para manejar la seguridad y permisos de Firebase
 * Este módulo proporciona funciones para trabajar con las reglas de seguridad
 * y manejar errores relacionados con permisos.
 */

// Importar utilidades comunes si están disponibles
const commonUtils = window.commonUtils || {};
const errorService = window.errorService || {
    showError: (msg) => console.error(msg)
};

/**
 * Maneja errores de Firebase relacionados con permisos
 * 
 * @param {Error} error - Error de Firebase
 * @param {string} operacion - Descripción de la operación que falló
 * @param {Function} callback - Función a ejecutar después de manejar el error
 * @returns {boolean} - true si el error fue manejado, false en caso contrario
 */
function manejarErrorPermisos(error, operacion = 'acceder a este recurso', callback = null) {
    if (!error) return false;
    
    // Verificar si es un error de permisos
    if (error.code === 'permission-denied') {
        const mensaje = `No tienes permisos para ${operacion}. Contacta al administrador si crees que deberías tener acceso.`;
        errorService.showError(mensaje);
        
        if (callback && typeof callback === 'function') {
            callback(mensaje);
        }
        
        return true;
    }
    
    return false;
}

/**
 * Ejecuta una operación de Firebase con manejo de errores de permisos
 * 
 * @param {Function} operacion - Función que realiza la operación de Firebase
 * @param {string} descripcion - Descripción de la operación para mensajes de error
 * @param {Function} onSuccess - Callback a ejecutar si la operación es exitosa
 * @param {Function} onError - Callback a ejecutar si hay un error no relacionado con permisos
 * @returns {Promise} - Promesa que se resuelve con el resultado de la operación
 */
async function ejecutarConSeguridad(operacion, descripcion, onSuccess, onError) {
    try {
        const resultado = await operacion();
        
        if (onSuccess && typeof onSuccess === 'function') {
            onSuccess(resultado);
        }
        
        return resultado;
    } catch (error) {
        console.error(`Error al ${descripcion}:`, error);
        
        // Si es un error de permisos, manejarlo específicamente
        if (!manejarErrorPermisos(error, descripcion)) {
            // Si no es un error de permisos, usar el callback de error genérico
            if (onError && typeof onError === 'function') {
                onError(error);
            } else {
                errorService.showError(`Error al ${descripcion}: ${error.message}`);
            }
        }
        
        throw error;
    }
}

/**
 * Verifica si el usuario actual tiene un rol específico
 * 
 * @param {string} rolRequerido - Rol requerido ('admin', 'coordinator', 'employee')
 * @param {boolean} mostrarError - Si se debe mostrar un mensaje de error
 * @returns {boolean} - true si el usuario tiene el rol requerido
 */
function verificarRol(rolRequerido, mostrarError = true) {
    // Obtener usuario actual
    const currentUser = window.getCurrentUser ? window.getCurrentUser() : null;
    
    if (!currentUser || !currentUser.uid) {
        if (mostrarError) {
            errorService.showError('Debes iniciar sesión para acceder a esta función');
        }
        return false;
    }
    
    // Normalizar el rol requerido
    let rolNormalizado = rolRequerido;
    const USER_ROLES = commonUtils.CONSTANTS ? commonUtils.CONSTANTS.USER_ROLES : {
        ADMIN: 'admin',
        COORDINATOR: 'coordinator',
        EMPLOYEE: 'employee'
    };
    
    if (rolRequerido === 'admin') rolNormalizado = USER_ROLES.ADMIN;
    if (rolRequerido === 'coordinator') rolNormalizado = USER_ROLES.COORDINATOR;
    if (rolRequerido === 'employee') rolNormalizado = USER_ROLES.EMPLOYEE;
    
    // Verificar el rol
    if (currentUser.role !== rolNormalizado) {
        if (mostrarError) {
            errorService.showError(`No tienes permisos para acceder a esta función. Se requiere rol: ${rolNormalizado}`);
        }
        return false;
    }
    
    return true;
}

// Exportar funciones
window.firebaseSecurityUtils = {
    manejarErrorPermisos,
    ejecutarConSeguridad,
    verificarRol
};
