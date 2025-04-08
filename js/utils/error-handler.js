// Mu00f3dulo de manejo de errores para Comedor Grupo Avika

/**
 * Maneja errores de Firestore y devuelve mensajes amigables
 * @param {Error} error - Objeto de error
 * @param {string} defaultMessage - Mensaje predeterminado si no se puede determinar el tipo de error
 * @returns {string} - Mensaje de error amigable
 */
function handleFirestoreError(error, defaultMessage = "Ocurriu00f3 un error. Por favor intente de nuevo.") {
    console.error('Error de Firestore:', error);
    
    if (!error) return defaultMessage;
    
    // Errores comunes de Firestore
    if (error.code) {
        switch (error.code) {
            case 'permission-denied':
                return "No tiene permisos para realizar esta acciu00f3n.";
            case 'not-found':
                return "El recurso solicitado no existe.";
            case 'already-exists':
                return "Este recurso ya existe.";
            case 'resource-exhausted':
                return "Se ha excedido el lu00edmite de solicitudes. Por favor intente mu00e1s tarde.";
            case 'failed-precondition':
                return "La operaciu00f3n no puede realizarse en este momento.";
            case 'aborted':
                return "La operaciu00f3n fue abortada.";
            case 'out-of-range':
                return "La operaciu00f3n estu00e1 fuera de rango.";
            case 'unimplemented':
                return "Esta funcionalidad no estu00e1 implementada.";
            case 'internal':
                return "Error interno del servidor. Por favor intente mu00e1s tarde.";
            case 'unavailable':
                return "El servicio no estu00e1 disponible. Por favor verifique su conexiu00f3n a internet.";
            case 'data-loss':
                return "Se han perdido datos. Por favor contacte al administrador.";
            case 'unauthenticated':
                return "No estu00e1 autenticado. Por favor inicie sesiu00f3n nuevamente.";
            default:
                // Intentar extraer mu00e1s informaciu00f3n del mensaje de error
                break;
        }
    }
    
    // Errores relacionados con u00edndices
    if (error.message && error.message.includes('index')) {
        return "Se requiere una actualizaciu00f3n en la base de datos. Por favor contacte al administrador.";
    }
    
    // Errores de conexiu00f3n
    if (error.message && (error.message.includes('network') || error.message.includes('connection'))) {
        return "Error de conexiu00f3n. Por favor verifique su conexiu00f3n a internet.";
    }
    
    // Si no podemos identificar el error, devolvemos el mensaje predeterminado
    return defaultMessage;
}

/**
 * Muestra un mensaje de error en la interfaz de usuario
 * @param {string} message - Mensaje de error a mostrar
 * @param {number} duration - Duraciu00f3n en milisegundos para mostrar el mensaje (0 para no ocultar)
 */
function showUIError(message, duration = 5000) {
    const errorAlert = document.getElementById('error-alert');
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        
        // Ocultar despuu00e9s de la duraciu00f3n especificada (si no es 0)
        if (duration > 0) {
            setTimeout(() => {
                errorAlert.style.display = 'none';
            }, duration);
        }
    } else {
        // Si no hay elemento de alerta, mostramos en la consola
        console.error('UI Error:', message);
        // Y opcionalmente podemos usar alert para asegurarnos de que el usuario lo vea
        // alert(message);
    }
}

/**
 * Muestra un mensaje de u00e9xito en la interfaz de usuario
 * @param {string} message - Mensaje de u00e9xito a mostrar
 * @param {number} duration - Duraciu00f3n en milisegundos para mostrar el mensaje (0 para no ocultar)
 */
function showUISuccess(message, duration = 5000) {
    const successAlert = document.getElementById('success-alert');
    if (successAlert) {
        successAlert.textContent = message;
        successAlert.style.display = 'block';
        
        // Ocultar despuu00e9s de la duraciu00f3n especificada (si no es 0)
        if (duration > 0) {
            setTimeout(() => {
                successAlert.style.display = 'none';
            }, duration);
        }
    } else {
        // Si no hay elemento de alerta, mostramos en la consola
        console.log('UI Success:', message);
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
