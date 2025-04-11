// Error Handler - Centralizes error handling with improved Firebase error support
// Usar la variable global logger en lugar de importarla

/**
 * Custom error types
 */
class AppError extends Error {
    constructor(message, code = 'app-error') {
        super(message);
        this.name = 'AppError';
        this.code = code;
    }
}

class FirebaseError extends AppError {
    constructor(message, code, operation) {
        super(message, code);
        this.name = 'FirebaseError';
        this.operation = operation;
    }
}

class ExcelError extends AppError {
    constructor(message) {
        super(message, 'excel-error');
        this.name = 'ExcelError';
    }
}

/**
 * Handle Firebase errors with improved messages
 * @param {Error} error - The error object
 * @param {string} operation - The operation being performed
 * @param {Object} additionalInfo - Additional context information
 * @returns {Error} Processed error
 */
function handleFirebaseError(error, operation, additionalInfo = {}) {
    // Log the error with the logger
    if (window.logger) {
        window.logger.firebaseError(operation, error, additionalInfo);
    } else {
        console.error(`Firebase Error in ${operation}:`, error, additionalInfo);
    }
    
    // Check if it's an index error
    const isIndexError = error.message?.includes('index') || 
                        (error.code === 'failed-precondition');
    
    // Check if it's related to character encoding or normalization
    const isEncodingError = error.message?.includes('UTF') || 
                          error.message?.includes('encoding') ||
                          error.message?.includes('character') ||
                          error.message?.includes('invalid');
    
    // Create a more user-friendly message
    let userMessage = additionalInfo.userMessage || 'Error en la operación con la base de datos';
    
    if (isIndexError) {
        userMessage = additionalInfo.indexHelp || 'Se requiere una configuración adicional en la base de datos. Por favor, contacta al administrador.';
    } else if (error.code === 'permission-denied') {
        userMessage = 'No tienes permisos para realizar esta operación';
    } else if (error.code === 'not-found') {
        userMessage = 'No se encontró el recurso solicitado';
    } else if (isEncodingError) {
        userMessage = 'Error con caracteres especiales. Intente sin acentos o caracteres especiales.';
    } else if (error.code === 'invalid-argument') {
        userMessage = 'Datos inválidos. Verifique la información ingresada.';
    } else if (error.code === 'resource-exhausted') {
        userMessage = 'Se ha excedido el límite de operaciones. Intente más tarde.';
    }
    
    return {
        ...error,
        userMessage,
        operation
    };
}

/**
 * Handle Excel errors
 * @param {Error} error - The error object
 * @param {string} operation - The operation being performed
 * @returns {Error} Processed error
 */
function handleExcelError(error, operation) {
    // Log the error
    if (window.logger) {
        window.logger.error(`Excel Error in ${operation}:`, error);
    } else {
        console.error(`Excel Error in ${operation}:`, error);
    }
    
    // Create a user-friendly message
    let userMessage = 'Error al procesar el archivo Excel';
    
    if (error.message.includes('format')) {
        userMessage = 'El formato del archivo Excel no es válido';
    } else if (error.message.includes('missing')) {
        userMessage = 'Faltan columnas requeridas en el archivo Excel';
    }
    
    return new ExcelError(userMessage);
}

/**
 * Show error notification to user
 * @param {Error} error - The error object
 */
function showErrorNotification(error) {
    const message = error.userMessage || error.message || 'Ha ocurrido un error';
    
    // Use the global showError function if available
    if (typeof showError === 'function') {
        showError(message);
    } else if (typeof showNotification === 'function') {
        showNotification(message, { type: 'error' });
    } else {
        alert(message);
    }
    
    // Log the error to console for debugging
    console.error('Error details:', error);
}

/**
 * Normalize string to handle accented characters
 * @param {string} text - The text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Safely access nested properties without throwing errors
 * @param {Object} obj - The object to access
 * @param {string} path - The path to the property (e.g., 'user.profile.name')
 * @param {*} defaultValue - Default value if property doesn't exist
 * @returns {*} The property value or default value
 */
function safeGet(obj, path, defaultValue = null) {
    if (!obj || !path) return defaultValue;
    
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
        if (result === null || result === undefined || typeof result !== 'object') {
            return defaultValue;
        }
        result = result[key];
    }
    
    return result !== undefined ? result : defaultValue;
}

// Hacer disponible globalmente
window.errorHandler = {
    AppError,
    FirebaseError,
    ExcelError,
    handleFirebaseError,
    handleExcelError,
    showErrorNotification,
    normalizeText,
    safeGet
};
