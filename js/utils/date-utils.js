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
    const day = date.getDay();
    const daysToAdd = day === 0 ? 1 : 8 - day;
    const nextMonday = new Date(date);
    nextMonday.setDate(date.getDate() + daysToAdd);
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
 * Format a relative date (today, yesterday, tomorrow, or DMY format)
 * @param {Date} date - Date to format
 * @returns {string} Formatted relative date
 */
function formatRelativeDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    if (compareDate.getTime() === today.getTime()) {
        return 'Hoy';
    } else if (compareDate.getTime() === yesterday.getTime()) {
        return 'Ayer';
    } else if (compareDate.getTime() === tomorrow.getTime()) {
        return 'Mañana';
    } else {
        return formatDateDMY(date);
    }
}

/**
 * Calculate time difference in a human readable format
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {string} Human readable time difference
 */
function getTimeDifference(date1, date2) {
    const diff = Math.abs(date2 - date1);
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        return `${days} día${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        return `${hours} hora${hours !== 1 ? 's' : ''}`;
    } else {
        return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
}

/**
 * Check if a date is within a specified range
 * @param {Date} date - Date to check
 * @param {Date} startDate - Start of range
 * @param {Date} endDate - End of range
 * @returns {boolean} True if date is within range
 */
function isDateInRange(date, startDate, endDate) {
    return date >= startDate && date <= endDate;
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