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
    if (currentLogLevel <= LogLevel.ERROR) {
        const isFirebaseError = error && error.name === 'FirebaseError';
        const errorCode = isFirebaseError ? error.code : 'unknown';
        const errorMessage = error.message || 'Unknown error';
        
        // Check if it's an index error
        const isIndexError = errorMessage.includes('index') || 
                            (isFirebaseError && errorCode === 'failed-precondition');
        
        // Create a more helpful message for index errors
        let helpfulMessage = errorMessage;
        if (isIndexError) {
            helpfulMessage = `Firebase index required: ${errorMessage}. Please create the required index in the Firebase console.`;
            
            // Log the URL to create the index if available in the error
            if (errorMessage.includes('https://console.firebase.google.com')) {
                const indexUrl = errorMessage.match(/(https:\/\/console\.firebase\.google\.com[^\s"]+)/);
                if (indexUrl && indexUrl[0]) {
                    info('Create the index here:', indexUrl[0]);
                }
            }
        }
        
        console.error(
            ...formatLog(`Firebase Error in ${operation}:`, [
                {
                    operation,
                    errorCode,
                    errorMessage: helpfulMessage,
                    ...additionalInfo,
                    originalError: error
                }
            ])
        );
    }
}

// Export the logger functions
const logger = {
    LogLevel,
    debug,
    info,
    warn,
    error,
    firebaseError
};

export default logger;
