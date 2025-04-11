// Logger utility - Centralizes logging with severity levels
// Automatically disables in production

/**
 * Logger levels
 * @enum {number}
 */
const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

/**
 * Current environment
 * @type {string}
 */
const environment = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1' ? 
                   'development' : 'production';

/**
 * Current log level
 * @type {LogLevel}
 */
const currentLogLevel = environment === 'production' ? LogLevel.ERROR : LogLevel.DEBUG;

/**
 * Format log message with timestamp
 * @param {string} message - Message to log
 * @param {any[]} args - Additional arguments
 * @returns {Array} Formatted log arguments
 */
function formatLog(message, args) {
    const timestamp = new Date().toISOString();
    return [`[${timestamp}] ${message}`, ...args];
}

/**
 * Debug level log
 * @param {string} message - Message to log
 * @param {...any} args - Additional arguments
 */
function debug(message, ...args) {
    if (currentLogLevel <= LogLevel.DEBUG) {
        console.debug(...formatLog(message, args));
    }
}

/**
 * Info level log
 * @param {string} message - Message to log
 * @param {...any} args - Additional arguments
 */
function info(message, ...args) {
    if (currentLogLevel <= LogLevel.INFO) {
        console.info(...formatLog(message, args));
    }
}

/**
 * Warning level log
 * @param {string} message - Message to log
 * @param {...any} args - Additional arguments
 */
function warn(message, ...args) {
    if (currentLogLevel <= LogLevel.WARN) {
        console.warn(...formatLog(message, args));
    }
}

/**
 * Error level log
 * @param {string} message - Message to log
 * @param {...any} args - Additional arguments
 */
function error(message, ...args) {
    if (currentLogLevel <= LogLevel.ERROR) {
        console.error(...formatLog(message, args));
    }
}

/**
 * Log Firebase error with additional context
 * @param {string} operation - Operation being performed
 * @param {Error} error - Error object
 * @param {Object} additionalInfo - Additional context information
 */
function firebaseError(operation, error, additionalInfo = {}) {
    const errorInfo = {
        operation,
        code: error.code || 'unknown',
        message: error.message || 'Unknown error',
        ...additionalInfo
    };
    
    // Log detailed error for development
    if (environment === 'development') {
        console.group(`Firebase Error: ${operation}`);
        console.error('Error details:', errorInfo);
        console.error('Original error:', error);
        console.groupEnd();
    } else {
        // Simplified logging for production
        error('Firebase operation failed', errorInfo);
    }
    
    // Return formatted error for UI display
    return {
        code: error.code || 'unknown',
        message: error.message || 'Unknown error',
        operation,
        timestamp: new Date().toISOString(),
        ...additionalInfo
    };
}

// Make logger available globally
window.logger = {
    LogLevel,
    debug,
    info,
    warn,
    error,
    firebaseError
};
