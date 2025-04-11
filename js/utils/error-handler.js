// Error Handler - Centralizes error handling with improved Firebase error support
import logger from './logger.js';

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
    logger.firebaseError(operation, error, additionalInfo);
    
    // Check if it's an index error
    const isIndexError = error.message?.includes('index') || 
                        (error.code === 'failed-precondition');
    
    // Create a more user-friendly message
    let userMessage = 'Error en la operación con la base de datos';
    
    if (isIndexError) {
        userMessage = 'Se requiere una configuración adicional en la base de datos. Por favor, contacta al administrador.';
    } else if (error.code === 'permission-denied') {
        userMessage = 'No tienes permisos para realizar esta operación';
    } else if (error.code === 'not-found') {
        userMessage = 'El recurso solicitado no existe';
    } else if (error.code === 'network-request-failed') {
        userMessage = 'Error de conexión. Verifica tu conexión a internet';
    }
    
    return new FirebaseError(userMessage, error.code, operation);
}

/**
 * Handle Excel errors
 * @param {Error} error - The error object
 * @param {string} operation - The operation being performed
 * @returns {Error} Processed error
 */
function handleExcelError(error, operation) {
    logger.error(`Excel Error in ${operation}:`, error);
    
    let userMessage = 'Error al procesar el archivo Excel';
    
    if (error.message.includes('format')) {
        userMessage = 'El formato del archivo Excel no es válido';
    } else if (error.message.includes('read')) {
        userMessage = 'No se puede leer el archivo Excel';
    }
    
    return new ExcelError(userMessage);
}

/**
 * Show error notification to user
 * @param {Error} error - The error object
 */
function showErrorNotification(error) {
    // Use the showError function if it exists in the global scope
    if (typeof showError === 'function') {
        showError(error.message);
    } else if (typeof showNotification === 'function') {
        showNotification(error.message, { type: 'error' });
    } else {
        alert(error.message);
    }
}

// Export error handling functions and classes
export {
    AppError,
    FirebaseError,
    ExcelError,
    handleFirebaseError,
    handleExcelError,
    showErrorNotification
};
