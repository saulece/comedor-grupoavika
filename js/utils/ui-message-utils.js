/**
 * Utilidades para manejo de mensajes y errores en la interfaz de usuario
 * Este módulo centraliza todas las funciones relacionadas con la visualización
 * de mensajes de error, éxito e información para asegurar consistencia
 */

const UIMessageUtils = (function() {
    // Constantes para duración de mensajes
    const MESSAGE_DURATION = {
        ERROR: 5000,   // 5 segundos
        SUCCESS: 3000, // 3 segundos
        INFO: 4000     // 4 segundos
    };
    
    // Referencias a elementos DOM para mensajes
    let errorElement = null;
    let successElement = null;
    let infoElement = null;
    let loadingElement = null;
    
    /**
     * Inicializar referencias a elementos DOM
     * Debe llamarse cuando el DOM esté listo
     */
    function init() {
        errorElement = document.getElementById('error-alert');
        successElement = document.getElementById('success-alert');
        infoElement = document.getElementById('info-alert');
        loadingElement = document.getElementById('loading-indicator');
    }
    
    /**
     * Mostrar mensaje de error
     * @param {string} message - Mensaje de error
     * @param {number} duration - Duración en ms (0 para no ocultar automáticamente)
     */
    function showError(message, duration = MESSAGE_DURATION.ERROR) {
        if (!errorElement) {
            errorElement = document.getElementById('error-alert');
            if (!errorElement) {
                console.error('Error element not found:', message);
                alert('Error: ' + message);
                return;
            }
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        if (duration > 0) {
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, duration);
        }
    }
    
    /**
     * Mostrar mensaje de éxito
     * @param {string} message - Mensaje de éxito
     * @param {number} duration - Duración en ms (0 para no ocultar automáticamente)
     */
    function showSuccess(message, duration = MESSAGE_DURATION.SUCCESS) {
        if (!successElement) {
            successElement = document.getElementById('success-alert');
            if (!successElement) {
                console.log('Success:', message);
                return;
            }
        }
        
        successElement.textContent = message;
        successElement.style.display = 'block';
        
        if (duration > 0) {
            setTimeout(() => {
                successElement.style.display = 'none';
            }, duration);
        }
    }
    
    /**
     * Mostrar mensaje informativo
     * @param {string} message - Mensaje informativo
     * @param {number} duration - Duración en ms (0 para no ocultar automáticamente)
     */
    function showInfo(message, duration = MESSAGE_DURATION.INFO) {
        if (!infoElement) {
            infoElement = document.getElementById('info-alert');
            if (!infoElement) {
                console.log('Info:', message);
                return;
            }
        }
        
        infoElement.textContent = message;
        infoElement.style.display = 'block';
        
        if (duration > 0) {
            setTimeout(() => {
                infoElement.style.display = 'none';
            }, duration);
        }
    }
    
    /**
     * Mostrar u ocultar indicador de carga
     * @param {boolean} isLoading - true para mostrar, false para ocultar
     */
    function toggleLoading(isLoading) {
        if (!loadingElement) {
            loadingElement = document.getElementById('loading-indicator');
            if (!loadingElement) {
                console.log('Loading indicator not found');
                return;
            }
        }
        
        loadingElement.style.display = isLoading ? 'block' : 'none';
    }
    
    /**
     * Manejar errores de Firebase con mensajes amigables
     * @param {Error} error - Objeto de error
     * @param {string} defaultMessage - Mensaje por defecto
     * @returns {string} - Mensaje de error formateado
     */
    function handleFirebaseError(error, defaultMessage = "Error en la operación") {
        let errorMessage = defaultMessage;
        
        if (error && error.code) {
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = 'Credenciales incorrectas. Verifique su correo y contraseña.';
                    break;
                case 'auth/email-already-in-use':
                    errorMessage = 'Este correo ya está registrado.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'La contraseña es demasiado débil. Use al menos 6 caracteres.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'El formato del correo electrónico no es válido.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Error de conexión. Verifique su conexión a internet.';
                    break;
                case 'permission-denied':
                    errorMessage = 'No tiene permisos para realizar esta operación.';
                    break;
                default:
                    errorMessage = `${defaultMessage}: ${error.message}`;
            }
        } else if (error && error.message) {
            errorMessage = `${defaultMessage}: ${error.message}`;
        }
        
        return errorMessage;
    }
    
    /**
     * Mostrar error de Firebase y registrarlo en consola
     * @param {Error} error - Objeto de error
     * @param {string} defaultMessage - Mensaje por defecto
     */
    function showFirebaseError(error, defaultMessage = "Error en la operación") {
        console.error(defaultMessage, error);
        const message = handleFirebaseError(error, defaultMessage);
        showError(message);
    }
    
    // API pública
    return {
        init,
        showError,
        showSuccess,
        showInfo,
        toggleLoading,
        handleFirebaseError,
        showFirebaseError,
        MESSAGE_DURATION
    };
})();

// Exportar para uso global
window.UIMessageUtils = UIMessageUtils;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    UIMessageUtils.init();
});
