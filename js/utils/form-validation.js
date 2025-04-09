/**
 * Módulo de validación de formularios y seguridad CSRF
 * Este módulo proporciona funciones para validar entradas de formularios
 * y proteger contra ataques CSRF (Cross-Site Request Forgery)
 */

// Importar utilidades comunes si están disponibles
const commonUtils = window.commonUtils || {};
const errorService = window.errorService || {
    showError: (msg) => console.error(msg)
};

/**
 * Objeto con patrones de validación comunes
 */
const ValidationPatterns = {
    // Correo electrónico: formato básico usuario@dominio.com
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    
    // Contraseña: al menos 8 caracteres, una mayúscula, una minúscula y un número
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    
    // Nombre: solo letras, espacios y algunos caracteres especiales (para acentos)
    NAME: /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]{2,50}$/,
    
    // Teléfono: formato internacional o nacional
    PHONE: /^(\+?\d{1,3}[- ]?)?\d{10}$/,
    
    // Solo números
    NUMERIC: /^\d+$/,
    
    // Fecha en formato YYYY-MM-DD
    DATE_ISO: /^\d{4}-\d{2}-\d{2}$/
};

/**
 * Mensajes de error para validaciones
 */
const ValidationMessages = {
    REQUIRED: "Este campo es obligatorio",
    EMAIL: "Ingresa un correo electrónico válido",
    PASSWORD: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número",
    NAME: "Ingresa un nombre válido (solo letras, espacios y algunos caracteres especiales)",
    PHONE: "Ingresa un número de teléfono válido",
    NUMERIC: "Este campo solo acepta números",
    DATE: "Ingresa una fecha válida en formato YYYY-MM-DD",
    MIN_LENGTH: (min) => `Este campo debe tener al menos ${min} caracteres`,
    MAX_LENGTH: (max) => `Este campo no debe exceder los ${max} caracteres`,
    MATCH: "Los campos no coinciden"
};

/**
 * Clase para validación de formularios
 */
class FormValidator {
    /**
     * Constructor
     * @param {HTMLFormElement} form - Elemento de formulario a validar
     * @param {Object} rules - Reglas de validación
     * @param {Object} options - Opciones adicionales
     */
    constructor(form, rules, options = {}) {
        this.form = form;
        this.rules = rules;
        this.options = {
            validateOnBlur: true,
            validateOnSubmit: true,
            showErrorsImmediately: true,
            ...options
        };
        
        this.errors = {};
        this.setupListeners();
    }
    
    /**
     * Configura los listeners para validación en tiempo real
     */
    setupListeners() {
        if (!this.form) return;
        
        // Validar al enviar el formulario
        if (this.options.validateOnSubmit) {
            this.form.addEventListener('submit', (e) => {
                const isValid = this.validateAll();
                if (!isValid) {
                    e.preventDefault();
                    this.showErrors();
                }
            });
        }
        
        // Validar al perder el foco
        if (this.options.validateOnBlur) {
            Object.keys(this.rules).forEach(fieldName => {
                const field = this.form.elements[fieldName];
                if (field) {
                    field.addEventListener('blur', () => {
                        this.validateField(fieldName);
                        if (this.options.showErrorsImmediately) {
                            this.showFieldError(fieldName);
                        }
                    });
                }
            });
        }
    }
    
    /**
     * Valida un campo específico
     * @param {string} fieldName - Nombre del campo a validar
     * @returns {boolean} - true si el campo es válido
     */
    validateField(fieldName) {
        const field = this.form.elements[fieldName];
        if (!field) return true;
        
        const value = field.value.trim();
        const fieldRules = this.rules[fieldName];
        
        // Limpiar error previo
        this.errors[fieldName] = null;
        
        // Validar requerido
        if (fieldRules.required && !value) {
            this.errors[fieldName] = ValidationMessages.REQUIRED;
            return false;
        }
        
        // Si el campo está vacío y no es requerido, se considera válido
        if (!value && !fieldRules.required) {
            return true;
        }
        
        // Validar longitud mínima
        if (fieldRules.minLength && value.length < fieldRules.minLength) {
            this.errors[fieldName] = ValidationMessages.MIN_LENGTH(fieldRules.minLength);
            return false;
        }
        
        // Validar longitud máxima
        if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
            this.errors[fieldName] = ValidationMessages.MAX_LENGTH(fieldRules.maxLength);
            return false;
        }
        
        // Validar con patrón
        if (fieldRules.pattern) {
            const pattern = typeof fieldRules.pattern === 'string' 
                ? ValidationPatterns[fieldRules.pattern] 
                : fieldRules.pattern;
                
            if (pattern && !pattern.test(value)) {
                this.errors[fieldName] = fieldRules.message || ValidationMessages[fieldRules.pattern] || "Formato inválido";
                return false;
            }
        }
        
        // Validar que coincida con otro campo
        if (fieldRules.match) {
            const matchField = this.form.elements[fieldRules.match];
            if (matchField && value !== matchField.value.trim()) {
                this.errors[fieldName] = ValidationMessages.MATCH;
                return false;
            }
        }
        
        // Validación personalizada
        if (fieldRules.validate && typeof fieldRules.validate === 'function') {
            const customValidation = fieldRules.validate(value, this.form);
            if (customValidation !== true) {
                this.errors[fieldName] = customValidation || "Validación personalizada fallida";
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Valida todos los campos del formulario
     * @returns {boolean} - true si todos los campos son válidos
     */
    validateAll() {
        let isValid = true;
        
        Object.keys(this.rules).forEach(fieldName => {
            const fieldIsValid = this.validateField(fieldName);
            isValid = isValid && fieldIsValid;
        });
        
        return isValid;
    }
    
    /**
     * Muestra el error de un campo específico
     * @param {string} fieldName - Nombre del campo
     */
    showFieldError(fieldName) {
        const field = this.form.elements[fieldName];
        if (!field) return;
        
        // Buscar o crear el elemento de error
        let errorElement = field.parentNode.querySelector('.field-error');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'field-error';
            field.parentNode.appendChild(errorElement);
        }
        
        // Mostrar u ocultar el error
        if (this.errors[fieldName]) {
            errorElement.textContent = this.errors[fieldName];
            errorElement.style.display = 'block';
            field.classList.add('error');
        } else {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
            field.classList.remove('error');
        }
    }
    
    /**
     * Muestra todos los errores del formulario
     */
    showErrors() {
        Object.keys(this.errors).forEach(fieldName => {
            if (this.errors[fieldName]) {
                this.showFieldError(fieldName);
            }
        });
        
        // Si hay errores, mostrar el primero en el servicio de errores
        const firstError = Object.values(this.errors).find(error => error);
        if (firstError && errorService && errorService.showError) {
            errorService.showError(firstError);
        }
    }
    
    /**
     * Limpia todos los errores del formulario
     */
    clearErrors() {
        this.errors = {};
        
        // Limpiar elementos de error en el DOM
        const errorElements = this.form.querySelectorAll('.field-error');
        errorElements.forEach(element => {
            element.textContent = '';
            element.style.display = 'none';
        });
        
        // Limpiar clases de error en los campos
        Object.keys(this.rules).forEach(fieldName => {
            const field = this.form.elements[fieldName];
            if (field) {
                field.classList.remove('error');
            }
        });
    }
}

/**
 * Clase para protección CSRF
 */
class CSRFProtection {
    /**
     * Constructor
     */
    constructor() {
        this.tokenName = 'csrf_token';
        this.headerName = 'X-CSRF-Token';
    }
    
    /**
     * Genera un token CSRF
     * @returns {string} - Token CSRF generado
     */
    generateToken() {
        const randomPart = Math.random().toString(36).substring(2, 15);
        const timePart = new Date().getTime().toString(36);
        return `${randomPart}_${timePart}`;
    }
    
    /**
     * Almacena el token CSRF en localStorage
     * @param {string} token - Token CSRF a almacenar
     */
    storeToken(token) {
        localStorage.setItem(this.tokenName, token);
    }
    
    /**
     * Obtiene el token CSRF almacenado
     * @returns {string|null} - Token CSRF o null si no existe
     */
    getToken() {
        return localStorage.getItem(this.tokenName);
    }
    
    /**
     * Verifica si un token CSRF es válido
     * @param {string} token - Token CSRF a verificar
     * @returns {boolean} - true si el token es válido
     */
    verifyToken(token) {
        const storedToken = this.getToken();
        return storedToken && token === storedToken;
    }
    
    /**
     * Inicializa la protección CSRF
     * Genera y almacena un nuevo token si no existe
     * @returns {string} - Token CSRF
     */
    initialize() {
        let token = this.getToken();
        
        if (!token) {
            token = this.generateToken();
            this.storeToken(token);
        }
        
        return token;
    }
    
    /**
     * Añade el token CSRF a un formulario
     * @param {HTMLFormElement} form - Formulario al que añadir el token
     */
    protectForm(form) {
        if (!form) return;
        
        // Inicializar token si no existe
        const token = this.initialize();
        
        // Buscar campo de token existente
        let tokenField = form.querySelector(`input[name="${this.tokenName}"]`);
        
        // Crear campo si no existe
        if (!tokenField) {
            tokenField = document.createElement('input');
            tokenField.type = 'hidden';
            tokenField.name = this.tokenName;
            form.appendChild(tokenField);
        }
        
        // Establecer valor del token
        tokenField.value = token;
    }
    
    /**
     * Añade el token CSRF a una solicitud fetch
     * @param {Object} options - Opciones de fetch
     * @returns {Object} - Opciones de fetch con token CSRF añadido
     */
    protectFetch(options = {}) {
        // Inicializar token si no existe
        const token = this.initialize();
        
        // Crear headers si no existen
        if (!options.headers) {
            options.headers = {};
        }
        
        // Añadir token al header
        options.headers[this.headerName] = token;
        
        return options;
    }
    
    /**
     * Verifica un token CSRF recibido
     * @param {string} token - Token CSRF a verificar
     * @returns {boolean} - true si el token es válido
     */
    verify(token) {
        return this.verifyToken(token);
    }
}

// Crear instancias globales
window.formValidator = {
    ValidationPatterns,
    ValidationMessages,
    FormValidator
};

window.csrfProtection = new CSRFProtection();

// Función para proteger todos los formularios en la página
function protectAllForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        window.csrfProtection.protectForm(form);
    });
}

// Proteger formularios cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', protectAllForms);

// Exportar para uso en módulos
export { ValidationPatterns, ValidationMessages, FormValidator, CSRFProtection };
