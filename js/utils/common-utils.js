// Common Utilities - Utilidades comunes para el sistema de comedor
// Este módulo centraliza funciones de utilidad usadas en múltiples partes de la aplicación

// Crear un namespace para las utilidades comunes
const commonUtils = (function() {
    /**
     * Constantes globales
     */
    const CONSTANTS = {
        // Nombres de días con acentos correctos
        DAYS: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
        
        // Mapeo de nombres de días normalizados (sin acentos) a nombres con acentos
        DAYS_MAPPING: {
            'domingo': 'Domingo',
            'lunes': 'Lunes',
            'martes': 'Martes',
            'miercoles': 'Miércoles',
            'jueves': 'Jueves',
            'viernes': 'Viernes',
            'sabado': 'Sábado'
        },
        
        // Mapeo inverso (con acentos a sin acentos)
        DAYS_NORMALIZED: {
            'Domingo': 'domingo',
            'Lunes': 'lunes',
            'Martes': 'martes',
            'Miércoles': 'miercoles',
            'Jueves': 'jueves',
            'Viernes': 'viernes',
            'Sábado': 'sabado'
        },
        
        // Días de la semana para mostrar en la interfaz (array para compatibilidad)
        DIAS_SEMANA: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
        
        // Roles de usuario
        USER_ROLES: {
            ADMIN: 'admin',
            COORDINATOR: 'coordinator',
            EMPLOYEE: 'employee'
        },
        
        // Duración de mensajes
        MESSAGE_DURATION: {
            ERROR: 5000,
            SUCCESS: 3000,
            INFO: 4000
        },
        
        // Estados de confirmación
        CONFIRMATION_STATUS: {
            PENDING: 'pending',
            CONFIRMED: 'confirmed',
            REJECTED: 'rejected',
            CANCELLED: 'cancelled'
        }
    };
    
    /**
     * Clase para manejar errores y mensajes en la UI
     */
    class UIMessageHandler {
        constructor() {
            // Inicializar referencias a elementos de mensajes
            this.errorElement = document.getElementById('error-alert');
            this.successElement = document.getElementById('success-alert');
            this.infoElement = document.getElementById('info-alert');
            this.loadingElement = document.getElementById('loading-indicator');
        }
        
        /**
         * Mostrar mensaje de error
         * @param {string} message - Mensaje de error
         * @param {number} duration - Duración en ms (0 para no ocultar automáticamente)
         */
        showError(message, duration = CONSTANTS.MESSAGE_DURATION.ERROR) {
            if (!this.errorElement) {
                this.errorElement = document.getElementById('error-alert');
                if (!this.errorElement) {
                    console.error('Error element not found:', message);
                    alert('Error: ' + message);
                    return;
                }
            }
            
            this.errorElement.textContent = message;
            this.errorElement.style.display = 'block';
            
            if (duration > 0) {
                setTimeout(() => {
                    this.errorElement.style.display = 'none';
                }, duration);
            }
        }
        
        /**
         * Mostrar mensaje de éxito
         * @param {string} message - Mensaje de éxito
         * @param {number} duration - Duración en ms (0 para no ocultar automáticamente)
         */
        showSuccess(message, duration = CONSTANTS.MESSAGE_DURATION.SUCCESS) {
            if (!this.successElement) {
                this.successElement = document.getElementById('success-alert');
                if (!this.successElement) {
                    console.log('Success:', message);
                    return;
                }
            }
            
            this.successElement.textContent = message;
            this.successElement.style.display = 'block';
            
            if (duration > 0) {
                setTimeout(() => {
                    this.successElement.style.display = 'none';
                }, duration);
            }
        }
        
        /**
         * Mostrar mensaje informativo
         * @param {string} message - Mensaje informativo
         * @param {number} duration - Duración en ms (0 para no ocultar automáticamente)
         */
        showInfo(message, duration = CONSTANTS.MESSAGE_DURATION.INFO) {
            if (!this.infoElement) {
                this.infoElement = document.getElementById('info-alert');
                if (!this.infoElement) {
                    console.log('Info:', message);
                    return;
                }
            }
            
            this.infoElement.textContent = message;
            this.infoElement.style.display = 'block';
            
            if (duration > 0) {
                setTimeout(() => {
                    this.infoElement.style.display = 'none';
                }, duration);
            }
        }
        
        /**
         * Mostrar u ocultar indicador de carga
         * @param {boolean} isLoading - true para mostrar, false para ocultar
         */
        toggleLoading(isLoading) {
            if (!this.loadingElement) {
                this.loadingElement = document.getElementById('loading-indicator');
                if (!this.loadingElement) {
                    console.log('Loading indicator not found');
                    return;
                }
            }
            
            this.loadingElement.style.display = isLoading ? 'block' : 'none';
        }
        
        /**
         * Manejar errores de Firebase con mensajes amigables
         * @param {Error} error - Objeto de error
         * @param {string} defaultMessage - Mensaje por defecto
         * @returns {string} - Mensaje de error formateado
         */
        handleFirebaseError(error, defaultMessage = "Error en la operación") {
            let errorMessage = defaultMessage;
            
            if (error && error.code) {
                switch (error.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage = 'Credenciales incorrectas. Verifique su correo y contraseña.';
                        break;
                    case 'auth/email-already-in-use':
                        errorMessage = 'Este correo ya está registrado.';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'La contraseña es demasiado débil. Use al menos 6 caracteres.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'El formato del correo electrónico no es válido.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Error de conexión. Verifique su conexión a internet.';
                        break;
                    case 'permission-denied':
                        errorMessage = 'No tiene permisos para realizar esta operación.';
                        break;
                    default:
                        errorMessage = `${defaultMessage}: ${error.message}`;
                }
            } else if (error && error.message) {
                errorMessage = `${defaultMessage}: ${error.message}`;
            }
            
            return errorMessage;
        }
    }
    
    /**
     * Utilidades para normalización de texto y caracteres
     */
    const TextUtils = {
        /**
         * Normaliza un texto eliminando acentos y caracteres especiales.
         * Función crítica para el manejo correcto de nombres de días con acentos.
         * 
         * @param {string} text - Texto a normalizar
         * @returns {string} - Texto normalizado en minúsculas, sin acentos y sin espacios al inicio/final
         * @example
         * // Retorna "miercoles"
         * normalizeText("Miércoles");
         */
        normalizeText(text) {
            if (!text) return '';
            
            return String(text).toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim();
        },
        
        /**
         * Normaliza la estructura de datos del menú para asegurar consistencia.
         * Función crítica para el manejo correcto de menús con días acentuados.
         * 
         * @param {Object} menuData - Datos del menú a normalizar
         * @returns {Object} - Datos del menú normalizados con claves de días sin acentos
         * @example
         * // Convierte {"Miércoles": {items: ["Sopa"]}} a {"miercoles": {items: ["Sopa"]}}
         * normalizeMenuData({"Miércoles": {items: ["Sopa"]}});
         */
        normalizeMenuData(menuData) {
            if (!menuData) return {};
            
            const normalizedData = {};
            
            // Normalizar claves de días
            for (const key in menuData) {
                const normalizedKey = this.normalizeText(key).replace(/\s+/g, "");
                normalizedData[normalizedKey] = menuData[key];
            }
            
            // Asegurar que todos los días tengan un array de items válido
            const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
            
            days.forEach(day => {
                if (!normalizedData[day]) {
                    normalizedData[day] = { items: [] };
                } else if (!normalizedData[day].items) {
                    normalizedData[day].items = [];
                }
            });
            
            return normalizedData;
        }
    };

    /**
     * Utilidades para manejo de fechas
     */
    const DateUtils = {
        /**
         * Obtener el lunes de la semana actual o de una fecha específica
         * 
         * @param {Date} date - Fecha (opcional, por defecto es la fecha actual)
         * @returns {Date} - Fecha del lunes de la semana
         * @example
         * // Retorna la fecha del lunes de la semana actual
         * getMonday();
         */
        getMonday(date = new Date()) {
            if (!date || !(date instanceof Date)) {
                return null;
            }
            
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(date);
            monday.setDate(diff);
            return monday;
        },
        
        /**
         * Formatear fecha como YYYY-MM-DD (formato para almacenamiento)
         * 
         * @param {Date|string} date - Fecha a formatear
         * @returns {string} - Fecha formateada en formato YYYY-MM-DD
         * @example
         * // Retorna "2025-04-09"
         * formatDate(new Date(2025, 3, 9));
         */
        formatDate(date) {
            if (!date) return '';
            
            // Si ya es una cadena, verificar si tiene el formato correcto
            if (typeof date === 'string') {
                if (this.isValidDateString(date)) {
                    return date;
                }
                return '';
            }
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
        },
        
        /**
         * Formatear fecha como DD/MM/YYYY (formato para mostrar al usuario)
         * 
         * @param {Date|string} date - Fecha a formatear
         * @returns {string} - Fecha formateada en formato DD/MM/YYYY
         * @example
         * // Retorna "09/04/2025"
         * formatDateDisplay(new Date(2025, 3, 9));
         * // También funciona con strings en formato YYYY-MM-DD
         * formatDateDisplay("2025-04-09");
         */
        formatDateDisplay(date) {
            if (!date) return '';
            
            if (typeof date === 'string') {
                // Convertir de YYYY-MM-DD a DD/MM/YYYY
                const parts = date.split('-');
                if (parts.length === 3) {
                    return `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                return date;
            }
            
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            
            return `${day}/${month}/${year}`;
        },
        
        /**
         * Verificar si una cadena es una fecha válida en formato YYYY-MM-DD
         * 
         * @param {string} dateString - Cadena de fecha a validar
         * @returns {boolean} - true si es una fecha válida
         * @example
         * // Retorna true
         * isValidDateString("2025-04-09");
         * // Retorna false
         * isValidDateString("2025/04/09");
         */
        isValidDateString(dateString) {
            if (!dateString || typeof dateString !== 'string') {
                return false;
            }
            
            // Verificar formato YYYY-MM-DD
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                return false;
            }
            
            // Verificar que sea una fecha válida
            const parts = dateString.split('-');
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-11
            const day = parseInt(parts[2], 10);
            
            const date = new Date(year, month, day);
            
            return date.getFullYear() === year &&
                   date.getMonth() === month &&
                   date.getDate() === day;
        },
        
        /**
         * Obtener el nombre del día de la semana
         * 
         * @param {Date} date - Fecha
         * @returns {string} - Nombre del día (con acento si corresponde)
         * @throws {Error} Si la fecha no es válida
         * @example
         * // Retorna "Miércoles" (si date es un miércoles)
         * getDayOfWeek(new Date(2025, 3, 9));
         */
        getDayOfWeek(date) {
            if (!date) {
                throw new Error('Fecha no válida');
            }
            
            const dayIndex = date.getDay();
            return CONSTANTS.DAYS[dayIndex];
        },
        
        /**
         * Normalizar nombre de día (quitar acentos y convertir a minúsculas).
         * Función crítica para el manejo correcto de nombres de días con acentos.
         * 
         * @param {string} day - Nombre del día
         * @returns {string} - Nombre normalizado sin acentos y en minúsculas
         * @example
         * // Retorna "miercoles"
         * normalizeDayName("Miércoles");
         * // También funciona con nombres ya normalizados
         * normalizeDayName("miercoles");
         */
        normalizeDayName(day) {
            if (!day) return '';
            
            // Usar la función de normalización de texto
            return TextUtils.normalizeText(day).replace(/\s+/g, "");
        },
        
        /**
         * Obtener nombre de día con formato correcto (con acento si corresponde).
         * Función crítica para mostrar correctamente los nombres de días con acentos.
         * 
         * @param {string} day - Nombre del día (normalizado o no)
         * @returns {string} - Nombre del día con formato correcto y acentos
         * @example
         * // Retorna "Miércoles"
         * formatDayName("miercoles");
         * // También funciona con nombres ya formateados
         * formatDayName("Miércoles");
         */
        formatDayName(day) {
            if (!day) return '';
            
            // Normalizar primero para asegurar consistencia
            const normalizedDay = this.normalizeDayName(day);
            
            // Obtener el nombre formateado del mapeo
            return CONSTANTS.DAYS_MAPPING[normalizedDay] || day;
        },
        
        /**
         * Comparar dos nombres de día para verificar si son iguales.
         * Función crítica para comparar días con y sin acentos.
         * 
         * @param {string} day1 - Primer nombre de día
         * @param {string} day2 - Segundo nombre de día
         * @returns {boolean} - true si los días son iguales (ignorando acentos y mayúsculas)
         * @example
         * // Retorna true
         * areDaysEqual("Miércoles", "miercoles");
         * // Retorna false
         * areDaysEqual("Lunes", "Martes");
         */
        areDaysEqual(day1, day2) {
            if (!day1 || !day2) return false;
            
            // Normalizar ambos nombres para comparar
            const normalizedDay1 = this.normalizeDayName(day1);
            const normalizedDay2 = this.normalizeDayName(day2);
            
            return normalizedDay1 === normalizedDay2;
        },
        
        /**
         * Obtener fecha a partir de una cadena en formato YYYY-MM-DD
         * 
         * @param {string} dateString - Cadena de fecha
         * @returns {Date|null} - Objeto Date o null si no es válida
         * @example
         * // Retorna la fecha correspondiente
         * parseDate("2025-04-09");
         */
        parseDate(dateString) {
            if (!this.isValidDateString(dateString)) {
                return null;
            }
            
            const [year, month, day] = dateString.split('-').map(Number);
            return new Date(year, month - 1, day);
        },
        
        /**
         * Obtener el viernes de la semana actual o de una fecha específica
         * 
         * @param {Date} date - Fecha (opcional, por defecto es la fecha actual)
         * @returns {Date} - Fecha del viernes de la semana
         * @example
         * // Retorna la fecha del viernes de la semana actual
         * getFriday();
         */
        getFriday(date = new Date()) {
            const monday = this.getMonday(date);
            const friday = new Date(monday);
            friday.setDate(monday.getDate() + 4); // Sumar 4 días al lunes
            return friday;
        },
        
        /**
         * Formatear rango de fechas (lunes a viernes) para mostrar
         * 
         * @param {Date} startDate - Fecha de inicio (lunes)
         * @returns {Object} - Objeto con fechas formateadas
         * @example
         * // Retorna un objeto con fechas formateadas
         * formatWeekRange(new Date(2025, 3, 7));
         */
        formatWeekRange(startDate) {
            const monday = startDate instanceof Date ? startDate : this.getMonday();
            const friday = this.getFriday(monday);
            
            return {
                start: monday,
                end: friday,
                startFormatted: this.formatDateDisplay(monday),
                endFormatted: this.formatDateDisplay(friday),
                startDB: this.formatDate(monday),
                rangeDisplay: `${this.formatDateDisplay(monday)} - ${this.formatDateDisplay(friday)}`
            };
        }
    };
    
    /**
     * Utilidades para validación de datos
     */
    const ValidationUtils = {
        /**
         * Validar dirección de correo electrónico
         * 
         * @param {string} email - Correo electrónico a validar
         * @returns {boolean} - true si es válido
         * @example
         * // Retorna true
         * isValidEmail("correo@example.com");
         */
        isValidEmail(email) {
            if (!email || typeof email !== 'string') {
                return false;
            }
            
            // Expresión regular para validar correo electrónico
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        },
        
        /**
         * Validar que un campo no esté vacío
         * 
         * @param {string} value - Valor a validar
         * @returns {boolean} - true si no está vacío
         * @example
         * // Retorna true
         * isNotEmpty("Hola");
         */
        isNotEmpty(value) {
            if (value === null || value === undefined) {
                return false;
            }
            
            if (typeof value === 'string') {
                return value.trim() !== '';
            }
            
            if (Array.isArray(value)) {
                return value.length > 0;
            }
            
            return true;
        },
        
        /**
         * Validar que un valor sea numérico
         * 
         * @param {any} value - Valor a validar
         * @returns {boolean} - true si es numérico
         * @example
         * // Retorna true
         * isNumeric(123);
         */
        isNumeric(value) {
            if (value === null || value === undefined || value === '') {
                return false;
            }
            
            if (typeof value === 'number') {
                return !isNaN(value);
            }
            
            if (typeof value === 'string') {
                // Permitir números con decimales y negativos
                return /^-?\d+(\.\d+)?$/.test(value);
            }
            
            return false;
        },
        
        /**
         * Validar que un número esté dentro de un rango
         * 
         * @param {number} value - Valor a validar
         * @param {number} min - Valor mínimo (inclusive)
         * @param {number} max - Valor máximo (inclusive)
         * @returns {boolean} - true si está dentro del rango
         * @example
         * // Retorna true
         * isInRange(5, 1, 10);
         */
        isInRange(value, min, max) {
            if (!this.isNumeric(value)) {
                return false;
            }
            
            const numValue = Number(value);
            return numValue >= min && numValue <= max;
        },
        
        /**
         * Validar que una cadena tenga una longitud dentro de un rango
         * 
         * @param {string} value - Cadena a validar
         * @param {number} minLength - Longitud mínima (inclusive)
         * @param {number} maxLength - Longitud máxima (inclusive)
         * @returns {boolean} - true si la longitud está dentro del rango
         * @example
         * // Retorna true
         * hasValidLength("Hola", 3, 10);
         */
        hasValidLength(value, minLength, maxLength) {
            if (typeof value !== 'string') {
                return false;
            }
            
            const length = value.trim().length;
            return length >= minLength && length <= maxLength;
        },
        
        /**
         * Validar un formulario completo
         * 
         * @param {Object} formData - Datos del formulario
         * @param {Object} validationRules - Reglas de validación
         * @returns {Object} - Resultado de la validación con errores
         * @example
         * // Ejemplo de uso
         * const formData = { name: "Juan", email: "juan@example.com" };
         * const validationRules = {
         *   name: { required: true, minLength: 3 },
         *   email: { required: true, email: true }
         * };
         * const result = validateForm(formData, validationRules);
         */
        validateForm(formData, validationRules) {
            const errors = {};
            let isValid = true;
            
            for (const [field, rules] of Object.entries(validationRules)) {
                const value = formData[field];
                
                // Validar campo requerido
                if (rules.required && !this.isNotEmpty(value)) {
                    errors[field] = rules.requiredMessage || 'Este campo es obligatorio';
                    isValid = false;
                    continue;
                }
                
                // Validar correo electrónico
                if (rules.email && this.isNotEmpty(value) && !this.isValidEmail(value)) {
                    errors[field] = rules.emailMessage || 'Correo electrónico no válido';
                    isValid = false;
                    continue;
                }
                
                // Validar longitud mínima
                if (rules.minLength && this.isNotEmpty(value) && !this.hasValidLength(value, rules.minLength, Number.MAX_SAFE_INTEGER)) {
                    errors[field] = rules.minLengthMessage || `Debe tener al menos ${rules.minLength} caracteres`;
                    isValid = false;
                    continue;
                }
                
                // Validar longitud máxima
                if (rules.maxLength && this.isNotEmpty(value) && !this.hasValidLength(value, 0, rules.maxLength)) {
                    errors[field] = rules.maxLengthMessage || `No debe exceder ${rules.maxLength} caracteres`;
                    isValid = false;
                    continue;
                }
                
                // Validar rango numérico
                if (rules.range && this.isNotEmpty(value) && !this.isInRange(value, rules.range[0], rules.range[1])) {
                    errors[field] = rules.rangeMessage || `Debe estar entre ${rules.range[0]} y ${rules.range[1]}`;
                    isValid = false;
                    continue;
                }
                
                // Validar fecha
                if (rules.date && this.isNotEmpty(value) && !DateUtils.isValidDateString(value)) {
                    errors[field] = rules.dateMessage || 'Fecha no válida';
                    isValid = false;
                    continue;
                }
                
                // Validar patrón personalizado
                if (rules.pattern && this.isNotEmpty(value) && !rules.pattern.test(value)) {
                    errors[field] = rules.patternMessage || 'Formato no válido';
                    isValid = false;
                    continue;
                }
                
                // Validar con función personalizada
                if (rules.validator && this.isNotEmpty(value)) {
                    const isValidCustom = rules.validator(value, formData);
                    if (!isValidCustom) {
                        errors[field] = rules.validatorMessage || 'Valor no válido';
                        isValid = false;
                        continue;
                    }
                }
            }
            
            return {
                isValid,
                errors
            };
        }
    };

    /**
     * Utilidades para manipulación del DOM
     */
    const DOMUtils = {
        /**
         * Crear un elemento con atributos y contenido
         * 
         * @param {string} tag - Etiqueta HTML
         * @param {Object} attributes - Atributos del elemento
         * @param {string|Node|Array} content - Contenido (texto, nodo o array de nodos)
         * @returns {HTMLElement} - Elemento creado
         * @example
         * // Ejemplo de uso
         * const element = createElement("div", { className: "container" }, "Hola");
         */
        createElement(tag, attributes = {}, content = null) {
            const element = document.createElement(tag);
            
            // Establecer atributos
            for (const [attr, value] of Object.entries(attributes)) {
                if (attr === 'className') {
                    element.className = value;
                } else if (attr === 'dataset') {
                    for (const [key, val] of Object.entries(value)) {
                        element.dataset[key] = val;
                    }
                } else if (attr === 'style' && typeof value === 'object') {
                    for (const [prop, val] of Object.entries(value)) {
                        element.style[prop] = val;
                    }
                } else if (attr.startsWith('on') && typeof value === 'function') {
                    const eventName = attr.substring(2).toLowerCase();
                    element.addEventListener(eventName, value);
                } else {
                    element.setAttribute(attr, value);
                }
            }
            
            // Establecer contenido
            if (content !== null) {
                if (typeof content === 'string') {
                    element.textContent = content;
                } else if (content instanceof Node) {
                    element.appendChild(content);
                } else if (Array.isArray(content)) {
                    for (const child of content) {
                        if (typeof child === 'string') {
                            element.appendChild(document.createTextNode(child));
                        } else if (child instanceof Node) {
                            element.appendChild(child);
                        }
                    }
                }
            }
            
            return element;
        },
        
        /**
         * Limpiar el contenido de un elemento
         * 
         * @param {HTMLElement} element - Elemento a limpiar
         * @example
         * // Ejemplo de uso
         * const element = document.getElementById("myElement");
         * clearElement(element);
         */
        clearElement(element) {
            if (!element || !(element instanceof HTMLElement)) {
                return;
            }
            
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        },
        
        /**
         * Añadir delegación de eventos a un contenedor
         * 
         * @param {HTMLElement} container - Elemento contenedor
         * @param {string} eventType - Tipo de evento (click, change, etc.)
         * @param {string} selector - Selector CSS para filtrar elementos
         * @param {Function} handler - Función manejadora
         * @example
         * // Ejemplo de uso
         * const container = document.getElementById("myContainer");
         * addEventDelegate(container, "click", ".myButton", () => {
         *   console.log("Botón clickeado");
         * });
         */
        addEventDelegate(container, eventType, selector, handler) {
            if (!container || !(container instanceof HTMLElement)) {
                return;
            }
            
            container.addEventListener(eventType, function(event) {
                const targets = container.querySelectorAll(selector);
                
                for (const target of targets) {
                    if (target === event.target || target.contains(event.target)) {
                        handler.call(target, event);
                        break;
                    }
                }
            });
        },
        
        /**
         * Mostrar u ocultar un elemento
         * 
         * @param {HTMLElement} element - Elemento a mostrar/ocultar
         * @param {boolean} show - true para mostrar, false para ocultar
         * @example
         * // Ejemplo de uso
         * const element = document.getElementById("myElement");
         * toggleElement(element, true);
         */
        toggleElement(element, show) {
            if (!element || !(element instanceof HTMLElement)) {
                return;
            }
            
            element.style.display = show ? 'block' : 'none';
        }
    };
    
    /**
     * Función para manejar errores de manera consistente
     * 
     * @param {Error} error - Objeto de error
     * @param {string} defaultMessage - Mensaje de error por defecto
     * @example
     * // Ejemplo de uso
     * handleError(new Error("Error al cargar datos"), "Error al cargar datos");
     */
    function handleError(error, defaultMessage = 'Se produjo un error') {
        console.error(defaultMessage, error);
        
        let errorMessage = defaultMessage;
        
        if (error && error.message) {
            errorMessage = `${defaultMessage}: ${error.message}`;
        }
        
        if (window.uiMessageHandler) {
            window.uiMessageHandler.showError(errorMessage);
        } else {
            console.error(errorMessage);
            alert(errorMessage);
        }
    }

    // Crear instancia global del manejador de mensajes UI
    const uiMessageHandler = new UIMessageHandler();
    
    // Exportar API pública
    return {
        CONSTANTS,
        UIMessageHandler,
        TextUtils,
        DateUtils,
        ValidationUtils,
        DOMUtils,
        handleError,
        
        // Exportar instancia del manejador de mensajes
        showError: uiMessageHandler.showError.bind(uiMessageHandler),
        showSuccess: uiMessageHandler.showSuccess.bind(uiMessageHandler),
        showInfo: uiMessageHandler.showInfo.bind(uiMessageHandler),
        showLoading: uiMessageHandler.toggleLoading.bind(uiMessageHandler, true),
        hideLoading: uiMessageHandler.toggleLoading.bind(uiMessageHandler, false),
        toggleLoading: uiMessageHandler.toggleLoading.bind(uiMessageHandler)
    };
})();

// Exportar como variable global
window.commonUtils = commonUtils;
