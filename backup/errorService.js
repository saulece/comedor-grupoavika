/**
 * Error Service - Servicio centralizado para manejo de errores
 * 
 * Este servicio proporciona una forma estandarizada de manejar errores en toda la aplicación,
 * incluyendo registro, notificación al usuario y clasificación de errores.
 */

// Tipos de errores
const ERROR_TYPES = {
    VALIDATION: 'validation',     // Errores de validación de datos
    NETWORK: 'network',           // Errores de red/conexión
    AUTH: 'auth',                 // Errores de autenticación
    PERMISSION: 'permission',     // Errores de permisos
    DATABASE: 'database',         // Errores de base de datos
    FIREBASE: 'firebase',         // Errores específicos de Firebase
    UI: 'ui',                     // Errores de interfaz de usuario
    BUSINESS: 'business',         // Errores de lógica de negocio
    UNKNOWN: 'unknown'            // Errores desconocidos
};

// Niveles de severidad
const ERROR_SEVERITY = {
    INFO: 'info',         // Informativo, no es realmente un error
    WARNING: 'warning',   // Advertencia, la operación puede continuar
    ERROR: 'error',       // Error, la operación no puede continuar
    CRITICAL: 'critical'  // Error crítico, puede requerir reinicio o intervención manual
};

/**
 * Clase que representa un error estandarizado en la aplicación
 */
class AppError extends Error {
    /**
     * @param {string} message - Mensaje de error
     * @param {string} type - Tipo de error (de ERROR_TYPES)
     * @param {string} severity - Severidad del error (de ERROR_SEVERITY)
     * @param {Error|null} originalError - Error original que causó este error
     * @param {Object} context - Información adicional sobre el contexto del error
     */
    constructor(message, type = ERROR_TYPES.UNKNOWN, severity = ERROR_SEVERITY.ERROR, originalError = null, context = {}) {
        super(message);
        this.name = 'AppError';
        this.type = type;
        this.severity = severity;
        this.originalError = originalError;
        this.context = context;
        this.timestamp = new Date();
        
        // Capturar stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AppError);
        }
    }
}

/**
 * Servicio principal de manejo de errores
 */
class ErrorService {
    constructor() {
        // Referencias a elementos UI para mostrar mensajes
        this.errorElement = null;
        this.successElement = null;
        this.infoElement = null;
        this.warningElement = null;
        
        // Configuración
        this.config = {
            logToConsole: true,
            showUIAlerts: true,
            defaultDuration: 5000,
            useNativeAlert: false,
            captureGlobalErrors: true
        };
        
        // Historial de errores (para debugging)
        this.errorHistory = [];
        this.maxHistorySize = 50;
        
        // Inicializar captura de errores globales si está habilitado
        if (this.config.captureGlobalErrors) {
            this._setupGlobalErrorHandling();
        }
    }
    
    /**
     * Inicializa el servicio con configuración personalizada
     * @param {Object} config - Configuración personalizada
     */
    init(config = {}) {
        this.config = { ...this.config, ...config };
        
        // Buscar elementos UI para alertas
        this._findUIElements();
        
        return this;
    }
    
    /**
     * Busca elementos UI para mostrar alertas
     * @private
     */
    _findUIElements() {
        this.errorElement = document.getElementById('error-alert');
        this.successElement = document.getElementById('success-alert');
        this.infoElement = document.getElementById('info-alert');
        this.warningElement = document.getElementById('warning-alert');
    }
    
    /**
     * Configura manejadores para errores globales no capturados
     * @private
     */
    _setupGlobalErrorHandling() {
        // Capturar errores no manejados
        window.addEventListener('error', (event) => {
            this.handleError(
                event.error || new Error(event.message),
                'Error no capturado',
                ERROR_TYPES.UNKNOWN,
                ERROR_SEVERITY.ERROR,
                { 
                    source: event.filename,
                    line: event.lineno,
                    column: event.colno
                }
            );
            
            // No prevenir el comportamiento por defecto
            return false;
        });
        
        // Capturar rechazos de promesas no manejados
        window.addEventListener('unhandledrejection', (event) => {
            const error = event.reason instanceof Error 
                ? event.reason 
                : new Error(String(event.reason));
            
            this.handleError(
                error,
                'Promesa rechazada no manejada',
                ERROR_TYPES.UNKNOWN,
                ERROR_SEVERITY.ERROR
            );
            
            // No prevenir el comportamiento por defecto
            return false;
        });
    }
    
    /**
     * Registra un error en el historial
     * @param {AppError} error - Error a registrar
     * @private
     */
    _logToHistory(error) {
        this.errorHistory.unshift(error);
        
        // Limitar tamaño del historial
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.pop();
        }
    }
    
    /**
     * Registra un error en la consola
     * @param {AppError} error - Error a registrar
     * @private
     */
    _logToConsole(error) {
        if (!this.config.logToConsole) return;
        
        const prefix = `[${error.timestamp.toISOString()}] [${error.severity.toUpperCase()}] [${error.type}]`;
        
        // Usar el logger si está disponible
        if (window.logger) {
            switch (error.severity) {
                case ERROR_SEVERITY.INFO:
                    window.logger.info(prefix, error.message, { error });
                    break;
                case ERROR_SEVERITY.WARNING:
                    window.logger.warn(prefix, error.message, { error });
                    break;
                case ERROR_SEVERITY.ERROR:
                case ERROR_SEVERITY.CRITICAL:
                    window.logger.error(prefix, error.message, { error });
                    break;
                default:
                    window.logger.error(prefix, error.message, { error });
            }
        } else {
            // Fallback a console nativo
            switch (error.severity) {
                case ERROR_SEVERITY.INFO:
                    console.info(prefix, error.message, error);
                    break;
                case ERROR_SEVERITY.WARNING:
                    console.warn(prefix, error.message, error);
                    break;
                case ERROR_SEVERITY.ERROR:
                case ERROR_SEVERITY.CRITICAL:
                    console.error(prefix, error.message, error);
                    break;
                default:
                    console.error(prefix, error.message, error);
            }
        }
    }
    
    /**
     * Muestra un mensaje en la interfaz de usuario
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de mensaje (error, success, info, warning)
     * @param {number} duration - Duración en ms (0 para no ocultar automáticamente)
     * @private
     */
    _showUIMessage(message, type = 'error', duration = this.config.defaultDuration) {
        if (!this.config.showUIAlerts) return;
        
        // Refrescar referencias a elementos UI (por si se crearon después de la inicialización)
        if (!this.errorElement || !this.successElement || !this.infoElement || !this.warningElement) {
            this._findUIElements();
        }
        
        let element = null;
        
        // Seleccionar el elemento adecuado según el tipo
        switch (type) {
            case 'error':
                element = this.errorElement;
                break;
            case 'success':
                element = this.successElement;
                break;
            case 'info':
                element = this.infoElement;
                break;
            case 'warning':
                element = this.warningElement;
                break;
            default:
                element = this.errorElement;
        }
        
        // Mostrar mensaje en el elemento UI si existe
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            
            // Ocultar después de la duración especificada (si no es 0)
            if (duration > 0) {
                setTimeout(() => {
                    element.style.display = 'none';
                }, duration);
            }
        } else if (this.config.useNativeAlert) {
            // Fallback a alert nativo si está habilitado
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${message}`);
        }
    }
    
    /**
     * Maneja un error, registrándolo y mostrando notificaciones
     * @param {Error} error - Error original
     * @param {string} message - Mensaje amigable para el usuario
     * @param {string} type - Tipo de error (de ERROR_TYPES)
     * @param {string} severity - Severidad del error (de ERROR_SEVERITY)
     * @param {Object} context - Información adicional sobre el contexto del error
     * @returns {AppError} - El error estandarizado
     */
    handleError(error, message, type = ERROR_TYPES.UNKNOWN, severity = ERROR_SEVERITY.ERROR, context = {}) {
        // Si el error ya es un AppError, usarlo directamente
        const appError = error instanceof AppError 
            ? error 
            : new AppError(
                message || (error ? error.message : 'Error desconocido'),
                type,
                severity,
                error,
                context
            );
        
        // Registrar el error
        this._logToHistory(appError);
        this._logToConsole(appError);
        
        // Mostrar mensaje en UI según la severidad
        if (severity !== ERROR_SEVERITY.INFO) {
            const uiType = severity === ERROR_SEVERITY.WARNING ? 'warning' : 'error';
            this._showUIMessage(appError.message, uiType);
        }
        
        return appError;
    }
    
    /**
     * Maneja un error de Firebase y devuelve un mensaje amigable
     * @param {Error} error - Error de Firebase
     * @param {string} defaultMessage - Mensaje predeterminado
     * @returns {AppError} - El error estandarizado
     */
    handleFirebaseError(error, defaultMessage = "Ocurrió un error. Por favor intente de nuevo.") {
        let message = defaultMessage;
        let type = ERROR_TYPES.FIREBASE;
        
        if (error && error.code) {
            // Mapear códigos de error de Firebase a mensajes amigables
            switch (error.code) {
                case 'permission-denied':
                    message = "No tiene permisos para realizar esta acción.";
                    type = ERROR_TYPES.PERMISSION;
                    break;
                case 'not-found':
                    message = "El recurso solicitado no existe.";
                    type = ERROR_TYPES.DATABASE;
                    break;
                case 'already-exists':
                    message = "Este recurso ya existe.";
                    type = ERROR_TYPES.DATABASE;
                    break;
                case 'resource-exhausted':
                    message = "Se ha excedido el límite de solicitudes. Por favor intente más tarde.";
                    break;
                case 'failed-precondition':
                    message = "La operación no puede realizarse en este momento.";
                    break;
                case 'aborted':
                    message = "La operación fue abortada.";
                    break;
                case 'out-of-range':
                    message = "La operación está fuera de rango.";
                    break;
                case 'unimplemented':
                    message = "Esta funcionalidad no está implementada.";
                    break;
                case 'internal':
                    message = "Error interno del servidor. Por favor intente más tarde.";
                    break;
                case 'unavailable':
                    message = "El servicio no está disponible. Por favor verifique su conexión a internet.";
                    type = ERROR_TYPES.NETWORK;
                    break;
                case 'data-loss':
                    message = "Se han perdido datos. Por favor contacte al administrador.";
                    type = ERROR_TYPES.DATABASE;
                    break;
                case 'unauthenticated':
                    message = "No está autenticado. Por favor inicie sesión nuevamente.";
                    type = ERROR_TYPES.AUTH;
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    message = "Correo electrónico o contraseña incorrectos.";
                    type = ERROR_TYPES.AUTH;
                    break;
                case 'auth/email-already-in-use':
                    message = "Este correo electrónico ya está registrado.";
                    type = ERROR_TYPES.AUTH;
                    break;
                case 'auth/weak-password':
                    message = "La contraseña es demasiado débil.";
                    type = ERROR_TYPES.AUTH;
                    break;
                case 'auth/invalid-email':
                    message = "El correo electrónico no es válido.";
                    type = ERROR_TYPES.AUTH;
                    break;
                case 'auth/user-disabled':
                    message = "Esta cuenta ha sido deshabilitada.";
                    type = ERROR_TYPES.AUTH;
                    break;
                case 'auth/requires-recent-login':
                    message = "Esta operación es sensible y requiere autenticación reciente. Inicie sesión nuevamente.";
                    type = ERROR_TYPES.AUTH;
                    break;
                default:
                    // Si no reconocemos el código, usar el mensaje predeterminado
                    break;
            }
        } else if (error && error.message) {
            // Intentar extraer información útil del mensaje de error
            if (error.message.includes('network') || error.message.includes('connection')) {
                message = "Error de conexión. Por favor verifique su conexión a internet.";
                type = ERROR_TYPES.NETWORK;
            } else if (error.message.includes('index')) {
                message = "Se requiere una actualización en la base de datos. Por favor contacte al administrador.";
                type = ERROR_TYPES.DATABASE;
            }
        }
        
        return this.handleError(
            error,
            message,
            type,
            ERROR_SEVERITY.ERROR,
            { source: 'firebase' }
        );
    }
    
    /**
     * Maneja un error de validación
     * @param {string} message - Mensaje de error
     * @param {Object} validationErrors - Detalles de los errores de validación
     * @returns {AppError} - El error estandarizado
     */
    handleValidationError(message, validationErrors = {}) {
        return this.handleError(
            new Error(message),
            message,
            ERROR_TYPES.VALIDATION,
            ERROR_SEVERITY.WARNING,
            { validationErrors }
        );
    }
    
    /**
     * Muestra un mensaje de éxito
     * @param {string} message - Mensaje a mostrar
     * @param {number} duration - Duración en ms (0 para no ocultar automáticamente)
     */
    showSuccess(message, duration = this.config.defaultDuration) {
        this._showUIMessage(message, 'success', duration);
        
        // Registrar como info
        const successInfo = new AppError(
            message,
            'success',
            ERROR_SEVERITY.INFO
        );
        
        this._logToHistory(successInfo);
        this._logToConsole(successInfo);
    }
    
    /**
     * Muestra un mensaje informativo
     * @param {string} message - Mensaje a mostrar
     * @param {number} duration - Duración en ms (0 para no ocultar automáticamente)
     */
    showInfo(message, duration = this.config.defaultDuration) {
        this._showUIMessage(message, 'info', duration);
        
        // Registrar como info
        const infoMessage = new AppError(
            message,
            'info',
            ERROR_SEVERITY.INFO
        );
        
        this._logToHistory(infoMessage);
        this._logToConsole(infoMessage);
    }
    
    /**
     * Muestra un mensaje de advertencia
     * @param {string} message - Mensaje a mostrar
     * @param {number} duration - Duración en ms (0 para no ocultar automáticamente)
     */
    showWarning(message, duration = this.config.defaultDuration) {
        this._showUIMessage(message, 'warning', duration);
        
        // Registrar como warning
        const warningMessage = new AppError(
            message,
            'warning',
            ERROR_SEVERITY.WARNING
        );
        
        this._logToHistory(warningMessage);
        this._logToConsole(warningMessage);
    }
    
    /**
     * Muestra u oculta un indicador de carga
     * @param {boolean} isLoading - Si se debe mostrar el indicador de carga
     */
    toggleLoading(isLoading) {
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
    
    /**
     * Obtiene el historial de errores
     * @returns {Array<AppError>} - Historial de errores
     */
    getErrorHistory() {
        return [...this.errorHistory];
    }
    
    /**
     * Limpia el historial de errores
     */
    clearErrorHistory() {
        this.errorHistory = [];
    }
}

// Crear instancia única del servicio
const errorService = new ErrorService();

// Exportar como global
window.errorService = errorService;

// Exportar constantes y clases
window.ERROR_TYPES = ERROR_TYPES;
window.ERROR_SEVERITY = ERROR_SEVERITY;
window.AppError = AppError;

// Para compatibilidad con el código existente, crear alias al errorHandler
window.errorHandler = {
    handleFirestoreError: (error, defaultMessage) => {
        const appError = errorService.handleFirebaseError(error, defaultMessage);
        return appError.message;
    },
    showUIError: (message, duration) => {
        errorService._showUIMessage(message, 'error', duration);
    },
    showUISuccess: (message, duration) => {
        errorService._showUIMessage(message, 'success', duration);
    },
    toggleLoadingIndicator: (isLoading) => {
        errorService.toggleLoading(isLoading);
    }
};
