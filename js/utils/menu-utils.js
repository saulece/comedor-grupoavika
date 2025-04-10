/**
 * Utilidades para manejo de menús en la aplicación
 * Este módulo centraliza todas las funciones relacionadas con menús
 * para evitar duplicación y asegurar consistencia en toda la aplicación
 */

const MenuUtils = (function() {
    // Constantes
    const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const DAYS_NORMALIZED = {
        'Lunes': 'lunes',
        'Martes': 'martes',
        'Miércoles': 'miercoles',
        'Jueves': 'jueves',
        'Viernes': 'viernes'
    };
    const DAYS_MAPPING = {
        'lunes': 'Lunes',
        'martes': 'Martes',
        'miercoles': 'Miércoles',
        'jueves': 'Jueves',
        'viernes': 'Viernes'
    };
    
    /**
     * Normalizar nombre de día (quitar acentos y convertir a minúsculas)
     * @param {string} day - Nombre del día
     * @returns {string} - Nombre normalizado
     */
    function normalizeDay(day) {
        if (!day) return '';
        
        // Quitar acentos y convertir a minúsculas
        const normalized = day.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
            
        return normalized;
    }
    
    /**
     * Normalizar datos del menú para asegurar consistencia
     * @param {Object} menuData - Datos del menú
     * @returns {Object} - Datos normalizados
     */
    function normalizeMenuData(menuData) {
        if (!menuData) return {};
        
        const normalized = {};
        
        // Copiar propiedades generales
        Object.keys(menuData).forEach(key => {
            if (key !== 'days' && !DAYS.includes(key) && !Object.values(DAYS_NORMALIZED).includes(key)) {
                normalized[key] = menuData[key];
            }
        });
        
        // Normalizar días
        normalized.days = {};
        
        // Procesar cada día
        DAYS.forEach(day => {
            const normalizedDay = DAYS_NORMALIZED[day];
            
            // Buscar el día en cualquiera de sus formas
            let dayData = menuData[day] || menuData[normalizedDay];
            
            // Si no existe, crear estructura vacía
            if (!dayData) {
                dayData = {
                    items: []
                };
            }
            
            // Guardar con clave normalizada
            normalized.days[normalizedDay] = dayData;
        });
        
        return normalized;
    }
    
    /**
     * Crear un menú vacío para una semana
     * @param {string} weekStartDate - Fecha de inicio de la semana (YYYY-MM-DD)
     * @returns {Object} - Estructura de menú vacío
     */
    function createEmptyMenu(weekStartDate) {
        const menu = {
            weekStart: weekStartDate,
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date(),
            days: {}
        };
        
        // Crear estructura para cada día
        DAYS.forEach(day => {
            const normalizedDay = DAYS_NORMALIZED[day];
            menu.days[normalizedDay] = {
                items: []
            };
        });
        
        return menu;
    }
    
    /**
     * Validar estructura de un menú
     * @param {Object} menuData - Datos del menú a validar
     * @returns {Object} - Resultado de la validación {isValid, errors}
     */
    function validateMenu(menuData) {
        const errors = [];
        
        // Validar propiedades básicas
        if (!menuData) {
            errors.push('Los datos del menú son nulos o indefinidos');
            return { isValid: false, errors };
        }
        
        if (!menuData.weekStart) {
            errors.push('Falta la fecha de inicio de la semana');
        } else if (!window.DateUtils.isValidDateString(menuData.weekStart)) {
            errors.push('La fecha de inicio de la semana no es válida');
        }
        
        if (!menuData.days) {
            errors.push('Falta la estructura de días del menú');
            return { isValid: false, errors };
        }
        
        // Validar cada día
        const requiredDays = Object.values(DAYS_NORMALIZED);
        const missingDays = requiredDays.filter(day => !menuData.days[day]);
        
        if (missingDays.length > 0) {
            errors.push(`Faltan días en el menú: ${missingDays.map(day => DAYS_MAPPING[day]).join(', ')}`);
        }
        
        // Validar que al menos un día tenga elementos
        const hasItems = Object.values(menuData.days).some(day => 
            day.items && day.items.length > 0 && day.items.some(item => item && item.trim() !== '')
        );
        
        if (!hasItems) {
            errors.push('El menú debe tener al menos un platillo');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Obtener estado del menú en formato legible
     * @param {string} status - Estado del menú
     * @returns {string} - Descripción del estado
     */
    function getMenuStatusText(status) {
        const statusMap = {
            'draft': 'Borrador',
            'published': 'Publicado',
            'archived': 'Archivado'
        };
        
        return statusMap[status] || 'Desconocido';
    }
    
    /**
     * Obtener clase CSS para el estado del menú
     * @param {string} status - Estado del menú
     * @returns {string} - Clase CSS
     */
    function getMenuStatusClass(status) {
        const classMap = {
            'draft': 'menu-status-draft',
            'published': 'menu-status-published',
            'archived': 'menu-status-archived'
        };
        
        return classMap[status] || '';
    }
    
    /**
     * Formatear menú para mostrar en la interfaz
     * @param {Object} menuData - Datos del menú
     * @returns {Object} - Menú formateado para mostrar
     */
    function formatMenuForDisplay(menuData) {
        if (!menuData) return null;
        
        const formatted = {
            weekStart: menuData.weekStart,
            status: menuData.status,
            statusText: getMenuStatusText(menuData.status),
            statusClass: getMenuStatusClass(menuData.status),
            days: {}
        };
        
        // Formatear fechas si están disponibles
        if (menuData.createdAt) {
            formatted.createdAt = typeof menuData.createdAt === 'string' 
                ? menuData.createdAt 
                : window.DateUtils.formatDateDisplay(menuData.createdAt);
        }
        
        if (menuData.updatedAt) {
            formatted.updatedAt = typeof menuData.updatedAt === 'string'
                ? menuData.updatedAt
                : window.DateUtils.formatDateDisplay(menuData.updatedAt);
        }
        
        if (menuData.publishedAt) {
            formatted.publishedAt = typeof menuData.publishedAt === 'string'
                ? menuData.publishedAt
                : window.DateUtils.formatDateDisplay(menuData.publishedAt);
        }
        
        // Formatear días
        DAYS.forEach(day => {
            const normalizedDay = DAYS_NORMALIZED[day];
            const dayData = menuData.days ? menuData.days[normalizedDay] : null;
            
            formatted.days[day] = {
                items: dayData && dayData.items ? [...dayData.items] : []
            };
        });
        
        return formatted;
    }
    
    /**
     * Comparar dos menús para detectar cambios
     * @param {Object} menu1 - Primer menú
     * @param {Object} menu2 - Segundo menú
     * @returns {boolean} - true si hay diferencias
     */
    function hasMenuChanged(menu1, menu2) {
        if (!menu1 || !menu2) return true;
        
        // Comparar propiedades básicas
        if (menu1.status !== menu2.status) return true;
        if (menu1.weekStart !== menu2.weekStart) return true;
        
        // Comparar días
        const days1 = menu1.days || {};
        const days2 = menu2.days || {};
        
        for (const dayKey of Object.values(DAYS_NORMALIZED)) {
            const day1 = days1[dayKey] || { items: [] };
            const day2 = days2[dayKey] || { items: [] };
            
            // Comparar cantidad de items
            if ((day1.items || []).length !== (day2.items || []).length) return true;
            
            // Comparar cada item
            for (let i = 0; i < (day1.items || []).length; i++) {
                if ((day1.items[i] || '') !== (day2.items[i] || '')) return true;
            }
        }
        
        return false;
    }
    
    // API pública
    return {
        DAYS,
        DAYS_NORMALIZED,
        DAYS_MAPPING,
        normalizeDay,
        normalizeMenuData,
        createEmptyMenu,
        validateMenu,
        getMenuStatusText,
        getMenuStatusClass,
        formatMenuForDisplay,
        hasMenuChanged
    };
})();

// Exportar para uso global
window.MenuUtils = MenuUtils;
