// Sistema de logging para Comedor Grupo Avika

/**
 * Niveles de log disponibles
 */
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

/**
 * Configuración del nivel de log actual
 * En producción, solo mostrar errores
 * En desarrollo, mostrar todos los logs
 */
const isProduction = window.location.hostname !== 'localhost' && 
                     !window.location.hostname.includes('127.0.0.1');
const currentLogLevel = isProduction ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG;

/**
 * Función principal de logging
 * @param {number} level - Nivel de log (de LOG_LEVELS)
 * @param {string} message - Mensaje a registrar
 * @param {any} data - Datos adicionales (opcional)
 */
function log(level, message, data) {
    if (level >= currentLogLevel) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}]`;
        
        switch (level) {
            case LOG_LEVELS.DEBUG:
                data ? console.debug(prefix, message, data) : console.debug(prefix, message);
                break;
            case LOG_LEVELS.INFO:
                data ? console.info(prefix, message, data) : console.info(prefix, message);
                break;
            case LOG_LEVELS.WARN:
                data ? console.warn(prefix, message, data) : console.warn(prefix, message);
                break;
            case LOG_LEVELS.ERROR:
                data ? console.error(prefix, message, data) : console.error(prefix, message);
                break;
        }
    }
}

/**
 * Funciones de conveniencia para cada nivel de log
 */
function debug(message, data) {
    log(LOG_LEVELS.DEBUG, message, data);
}

function info(message, data) {
    log(LOG_LEVELS.INFO, message, data);
}

function warn(message, data) {
    log(LOG_LEVELS.WARN, message, data);
}

function error(message, data) {
    log(LOG_LEVELS.ERROR, message, data);
}

// Exportar funciones como un módulo global
window.logger = {
    LOG_LEVELS,
    log,
    debug,
    info,
    warn,
    error
};
