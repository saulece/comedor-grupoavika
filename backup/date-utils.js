// Módulo de utilidades para manejo de fechas y días para Comedor Grupo Avika

/**
 * Formatos de días de la semana utilizados en la aplicación
 */
const DATE_FORMATS = {
    // Formato usado en el módulo de administrador (con mayúsculas y acentos)
    ADMIN: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    
    // Formato usado en el módulo de coordinador (minúsculas sin acentos)
    COORDINATOR: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
};

/**
 * Convierte un día del formato de administrador al formato de coordinador
 * @param {string} day - Día en formato de administrador (ej: 'Lunes')
 * @returns {string} - Día en formato de coordinador (ej: 'lunes')
 */
function adminToCoordinatorFormat(day) {
    const index = DATE_FORMATS.ADMIN.indexOf(day);
    return index >= 0 ? DATE_FORMATS.COORDINATOR[index] : day.toLowerCase();
}

/**
 * Convierte un día del formato de coordinador al formato de administrador
 * @param {string} day - Día en formato de coordinador (ej: 'lunes')
 * @returns {string} - Día en formato de administrador (ej: 'Lunes')
 */
function coordinatorToAdminFormat(day) {
    const index = DATE_FORMATS.COORDINATOR.indexOf(day.toLowerCase());
    return index >= 0 ? DATE_FORMATS.ADMIN[index] : day;
}

/**
 * Obtiene el lunes de la semana actual
 * @param {Date} date - Fecha de referencia
 * @returns {Date} - Fecha del lunes de la semana
 */
function getMonday(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para domingo
    return new Date(date.setDate(diff));
}

/**
 * Formatea una fecha como YYYY-MM-DD (formato para Firestore)
 * @param {Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formatea una fecha para mostrar (DD/MM/YYYY)
 * @param {Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
function formatDateDisplay(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Exportar funciones como un módulo global
window.dateUtils = {
    DATE_FORMATS,
    adminToCoordinatorFormat,
    coordinatorToAdminFormat,
    getMonday,
    formatDate,
    formatDateDisplay
};
