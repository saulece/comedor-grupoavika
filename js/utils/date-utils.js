// Date Utilities

/**
 * Format a date to YYYY-MM-DD
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDateYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Format a date to DD/MM/YYYY
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDateDMY(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

/**
 * Format a date with time DD/MM/YYYY HH:MM
 * @param {Date} date - Date object
 * @returns {string} Formatted date and time string
 */
function formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Get Monday of the current week
 * @param {Date} [date=new Date()] - Optional date to get Monday from
 * @returns {Date} Monday of the week
 */
function getMondayOfWeek(date = new Date()) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    
    return new Date(date.setDate(diff));
}

/**
 * Get Friday of the current week
 * @param {Date} [date=new Date()] - Optional date to get Friday from
 * @returns {Date} Friday of the week
 */
function getFridayOfWeek(date = new Date()) {
    const monday = getMondayOfWeek(date);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    
    return friday;
}

/**
 * Get next Monday
 * @param {Date} [date=new Date()] - Optional date to calculate from
 * @returns {Date} Next Monday
 */
function getNextMonday(date = new Date()) {
    const currentMonday = getMondayOfWeek(date);
    const nextMonday = new Date(currentMonday);
    nextMonday.setDate(currentMonday.getDate() + 7);
    
    return nextMonday;
}

/**
 * Get day name in Spanish
 * @param {number} dayIndex - Day index (0-6)
 * @returns {string} Day name in Spanish
 */
function getDayName(dayIndex) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayIndex];
}

/**
 * Get short day name in Spanish
 * @param {number} dayIndex - Day index (0-6)
 * @returns {string} Short day name in Spanish
 */
function getShortDayName(dayIndex) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[dayIndex];
}

/**
 * Get month name in Spanish
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} Month name in Spanish
 */
function getMonthName(monthIndex) {
    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[monthIndex];
}

/**
 * Format time from Date object (HH:MM)
 * @param {Date} date - Date object
 * @returns {string} Formatted time
 */
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
}

/**
 * Normaliza el nombre del día eliminando acentos y convirtiendo a minúsculas
 * @param {string} dayName - Nombre del día
 * @returns {string} Nombre del día normalizado
 */
function normalizeDayName(dayName) {
    if (!dayName) return '';
    // Convertir a minúsculas y eliminar acentos
    return dayName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Obtiene el nombre del día normalizado a partir de su índice
 * @param {number} dayIndex - Índice del día (0-6)
 * @returns {string} Nombre del día normalizado
 */
function getNormalizedDayName(dayIndex) {
    return normalizeDayName(getDayName(dayIndex));
}

// Hacer las funciones disponibles globalmente
window.dateUtils = {
    formatDateYMD,
    formatDateDMY,
    formatDateTime,
    getMondayOfWeek,
    getFridayOfWeek,
    getNextMonday,
    getDayName,
    getShortDayName,
    getMonthName,
    formatTime,
    normalizeDayName,
    getNormalizedDayName
};