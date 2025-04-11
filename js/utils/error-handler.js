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
    
    // Create a more user-friendly message
    let userMessage = additionalInfo.userMessage || 'Error en la operación con la base de datos';
    
    if (isIndexError) {
        userMessage = additionalInfo.indexHelp || 'Se requiere una configuración adicional en la base de datos. Por favor, contacta al administrador.';
    } else if (error.code === 'permission-denied') {
        userMessage = 'No tienes permisos para realizar esta operación';
    } else if (error.code === 'not-found') {
        userMessage = 'No se encontró el recurso solicitado';
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
    } else {
        alert(message);
    }
}

// Hacer disponible globalmente
window.errorHandler = {
    AppError,
    FirebaseError,
    ExcelError,
    handleFirebaseError,
    handleExcelError,
    showErrorNotification
};
