// Módulo de manejo de errores para Comedor Grupo Avika

/**
 * Maneja errores de Firestore y devuelve mensajes amigables
 * @param {Error} error - Objeto de error
 * @param {string} defaultMessage - Mensaje predeterminado si no se puede determinar el tipo de error
 * @returns {string} - Mensaje de error amigable
 */
function handleFirestoreError(error, defaultMessage = "Ocurrió un error. Por favor intente de nuevo.") {
    if (window.logger && window.logger.error) {
        window.logger.error('Error de Firestore:', error);
    } else {
        console.error('Error de Firestore:', error);
    }
    
    if (!error) return defaultMessage;
    
    // Errores comunes de Firestore
    if (error.code) {
        switch (error.code) {
            case 'permission-denied':
                return "No tiene permisos para realizar esta acción.";
            case 'not-found':
                return "El recurso solicitado no existe.";
            case 'already-exists':
                return "Este recurso ya existe.";
            case 'resource-exhausted':
                return "Se ha excedido el límite de solicitudes. Por favor intente más tarde.";
            case 'failed-precondition':
                return "La operación no puede realizarse en este momento.";
            case 'aborted':
                return "La operación fue abortada.";
            case 'out-of-range':
                return "La operación está fuera de rango.";
            case 'unimplemented':
                return "Esta funcionalidad no está implementada.";
            case 'internal':
                return "Error interno del servidor. Por favor intente más tarde.";
            case 'unavailable':
                return "El servicio no está disponible. Por favor verifique su conexión a internet.";
            case 'data-loss':
                return "Se han perdido datos. Por favor contacte al administrador.";
            case 'unauthenticated':
                return "No está autenticado. Por favor inicie sesión nuevamente.";
            default:
                // Intentar extraer más información del mensaje de error
                break;
        }
    }
    
    // Errores relacionados con índices
    if (error.message && error.message.includes('index')) {
        return "Se requiere una actualización en la base de datos. Por favor contacte al administrador.";
    }
    
    // Errores de conexión
    if (error.message && (error.message.includes('network') || error.message.includes('connection'))) {
        return "Error de conexión. Por favor verifique su conexión a internet.";
    }
    
    // Si no podemos identificar el error, devolvemos el mensaje predeterminado
    return defaultMessage;
}

/**
 * Muestra un mensaje de error en la interfaz de usuario
 * @param {string} message - Mensaje de error a mostrar
 * @param {number} duration - Duración en milisegundos para mostrar el mensaje (0 para no ocultar)
 */
function showUIError(message, duration = 5000) {
    // Primero intentar con el elemento de error estándar
    const errorAlert = document.getElementById('error-alert');
    
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        
        // Ocultar después de la duración especificada (si no es 0)
        if (duration > 0) {
            setTimeout(() => {
                errorAlert.style.display = 'none';
            }, duration);
        }
    } else {
        // Si no hay elemento de alerta, usar console.error
        console.error('UI Error:', message);
        // Y usar alert como fallback para asegurarnos de que el usuario lo vea
        alert('Error: ' + message);
    }
}

/**
 * Muestra un mensaje de éxito en la interfaz de usuario
 * @param {string} message - Mensaje de éxito a mostrar
 * @param {number} duration - Duración en milisegundos para mostrar el mensaje (0 para no ocultar)
 */
function showUISuccess(message, duration = 5000) {
    const successAlert = document.getElementById('success-alert');
    if (successAlert) {
        successAlert.textContent = message;
        successAlert.style.display = 'block';
        
        // Ocultar después de la duración especificada (si no es 0)
        if (duration > 0) {
            setTimeout(() => {
                successAlert.style.display = 'none';
            }, duration);
        }
    } else {
        // Si no hay elemento de alerta, usar console
        console.log('Success:', message);
        // Y usar alert como fallback si es necesario
        alert('Éxito: ' + message);
    }
}

/**
 * Muestra u oculta un indicador de carga
 * @param {boolean} isLoading - Si se debe mostrar el indicador de carga
 */
function toggleLoadingIndicator(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }
    
    // Opcionalmente, deshabilitar botones mientras se carga
    const buttons = document.querySelectorAll('button:not(.modal-close):not(.close-modal-btn)');
    buttons.forEach(button => {
        button.disabled = isLoading;
    });
}

// Exportar funciones
window.errorHandler = {
    handleFirestoreError,
    showUIError,
    showUISuccess,
    toggleLoadingIndicator
};