/**
 * Utilidades para manejo de fechas en la aplicación
 * Este módulo centraliza todas las funciones relacionadas con fechas
 * para evitar duplicación y asegurar consistencia en toda la aplicación
 */

const DateUtils = (function() {
    /**
     * Obtener el lunes de la semana actual o de una fecha específica
     * @param {Date} date - Fecha (opcional, por defecto es la fecha actual)
     * @returns {Date} - Fecha del lunes de la semana
     */
    function getMonday(date = new Date()) {
        date = new Date(date);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }

    /**
     * Obtener el viernes de la semana actual o de una fecha específica
     * @param {Date} date - Fecha (opcional, por defecto es la fecha actual)
     * @returns {Date} - Fecha del viernes de la semana
     */
    function getFriday(date = new Date()) {
        const monday = getMonday(date);
        const friday = new Date(monday);
        friday.setDate(monday.getDate() + 4);
        return friday;
    }

    /**
     * Formatear fecha como YYYY-MM-DD (formato para almacenamiento)
     * @param {Date|string} date - Fecha a formatear
     * @returns {string} - Fecha formateada en formato YYYY-MM-DD
     */
    function formatDate(date) {
        if (typeof date === 'string') {
            // Si ya es un string, verificar si tiene el formato correcto
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return date;
            }
            // Intentar convertir a Date
            date = new Date(date);
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Formatear fecha como DD/MM/YYYY (formato para mostrar al usuario)
     * @param {Date|string} date - Fecha a formatear
     * @returns {string} - Fecha formateada en formato DD/MM/YYYY
     */
    function formatDateDisplay(date) {
        if (typeof date === 'string') {
            // Si es un string en formato YYYY-MM-DD, convertir a Date
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                const [year, month, day] = date.split('-');
                return `${day}/${month}/${year}`;
            }
            // Intentar convertir a Date
            date = new Date(date);
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Formatear fecha para nombre de archivo (YYYYMMDD)
     * @param {Date} date - Fecha a formatear
     * @returns {string} - Fecha formateada en formato YYYYMMDD
     */
    function formatDateForFile(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }

    /**
     * Obtener el nombre del día de la semana
     * @param {Date} date - Fecha
     * @returns {string} - Nombre del día en español (con acento si corresponde)
     */
    function getDayOfWeek(date) {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[date.getDay()];
    }

    /**
     * Formatear nombre de día para mostrar
     * @param {string} day - Nombre del día (puede ser con o sin acentos)
     * @returns {string} - Nombre del día formateado correctamente
     */
    function formatDayDisplay(day) {
        const daysMapping = {
            'domingo': 'Domingo',
            'lunes': 'Lunes',
            'martes': 'Martes',
            'miercoles': 'Miércoles',
            'jueves': 'Jueves',
            'viernes': 'Viernes',
            'sabado': 'Sábado',
            // También incluir versiones ya formateadas
            'Domingo': 'Domingo',
            'Lunes': 'Lunes',
            'Martes': 'Martes',
            'Miércoles': 'Miércoles',
            'Jueves': 'Jueves',
            'Viernes': 'Viernes',
            'Sábado': 'Sábado'
        };
        
        // Normalizar el día (quitar acentos y convertir a minúsculas)
        const normalizedDay = day.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        
        return daysMapping[normalizedDay] || day;
    }

    /**
     * Verificar si una cadena es una fecha válida en formato YYYY-MM-DD
     * @param {string} dateString - Cadena de fecha a validar
     * @returns {boolean} - true si es una fecha válida
     */
    function isValidDateString(dateString) {
        if (typeof dateString !== 'string') {
            return false;
        }
        
        // Verificar formato YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return false;
        }
        
        // Verificar si es una fecha válida
        const [year, month, day] = dateString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && 
               date.getMonth() === month - 1 && 
               date.getDate() === day;
    }

    /**
     * Formatear rango de fechas para mostrar (semana)
     * @param {Date} startDate - Fecha de inicio (lunes)
     * @returns {Object} - Objeto con fechas formateadas
     */
    function formatWeekRange(startDate) {
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 4); // Viernes
        
        return {
            startFormatted: formatDateDisplay(startDate),
            endFormatted: formatDateDisplay(endDate),
            startISO: formatDate(startDate),
            endISO: formatDate(endDate),
            displayText: `Semana del ${formatDateDisplay(startDate)} al ${formatDateDisplay(endDate)}`
        };
    }

    /**
     * Comparar si dos fechas son el mismo día
     * @param {Date|string} date1 - Primera fecha
     * @param {Date|string} date2 - Segunda fecha
     * @returns {boolean} - true si son el mismo día
     */
    function isSameDay(date1, date2) {
        // Convertir a objetos Date si son strings
        if (typeof date1 === 'string') {
            date1 = new Date(date1);
        }
        if (typeof date2 === 'string') {
            date2 = new Date(date2);
        }
        
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    /**
     * Añadir días a una fecha
     * @param {Date} date - Fecha base
     * @param {number} days - Número de días a añadir (puede ser negativo)
     * @returns {Date} - Nueva fecha
     */
    function addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    // API pública
    return {
        getMonday,
        getFriday,
        formatDate,
        formatDateDisplay,
        formatDateForFile,
        getDayOfWeek,
        formatDayDisplay,
        isValidDateString,
        formatWeekRange,
        isSameDay,
        addDays
    };
})();

// Exportar para uso global
window.DateUtils = DateUtils;
