// Validation Utils - Functions for form and data validation

/**
 * Validate required field
 * @param {string} value - Field value
 * @param {string} fieldName - Field name for error message
 * @returns {Object} Validation result { valid: boolean, message: string }
 */
function validateRequired(value, fieldName) {
    const trimmedValue = String(value || '').trim();
    
    if (!trimmedValue) {
        return {
            valid: false,
            message: `El campo ${fieldName} es requerido.`
        };
    }
    
    return { valid: true };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} Validation result { valid: boolean, message: string }
 */
function validateEmail(email) {
    const trimmedEmail = String(email || '').trim();
    
    if (!trimmedEmail) {
        return {
            valid: false,
            message: 'El correo electrónico es requerido.'
        };
    }
    
    // Simple email regex - for a more comprehensive check, consider a library
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(trimmedEmail)) {
        return {
            valid: false,
            message: 'Por favor ingrese un correo electrónico válido.'
        };
    }
    
    return { valid: true };
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @param {number} options.minLength - Minimum password length
 * @param {boolean} options.requireSpecial - Require special characters
 * @param {boolean} options.requireNumbers - Require numbers
 * @param {boolean} options.requireUppercase - Require uppercase letters
 * @returns {Object} Validation result { valid: boolean, message: string }
 */
function validatePassword(password, options = {}) {
    const minLength = options.minLength || 6;
    const requireSpecial = options.requireSpecial !== false;
    const requireNumbers = options.requireNumbers !== false;
    const requireUppercase = options.requireUppercase !== false;
    
    if (!password) {
        return {
            valid: false,
            message: 'La contraseña es requerida.'
        };
    }
    
    if (password.length < minLength) {
        return {
            valid: false,
            message: `La contraseña debe tener al menos ${minLength} caracteres.`
        };
    }
    
    if (requireNumbers && !/\d/.test(password)) {
        return {
            valid: false,
            message: 'La contraseña debe contener al menos un número.'
        };
    }
    
    if (requireUppercase && !/[A-Z]/.test(password)) {
        return {
            valid: false,
            message: 'La contraseña debe contener al menos una letra mayúscula.'
        };
    }
    
    if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return {
            valid: false,
            message: 'La contraseña debe contener al menos un carácter especial.'
        };
    }
    
    return { valid: true };
}

/**
 * Validate date format
 * @param {string} date - Date string to validate (YYYY-MM-DD)
 * @returns {Object} Validation result { valid: boolean, message: string }
 */
function validateDate(date) {
    if (!date) {
        return {
            valid: false,
            message: 'La fecha es requerida.'
        };
    }
    
    // Check format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (!dateRegex.test(date)) {
        return {
            valid: false,
            message: 'La fecha debe estar en formato YYYY-MM-DD.'
        };
    }
    
    // Check if date is valid
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        return {
            valid: false,
            message: 'La fecha ingresada no es válida.'
        };
    }
    
    return { valid: true };
}

/**
 * Validate numeric value
 * @param {string|number} value - Value to validate
 * @param {Object} options - Validation options
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @returns {Object} Validation result { valid: boolean, message: string }
 */
function validateNumber(value, options = {}) {
    if (value === null || value === undefined || value === '') {
        return {
            valid: false,
            message: 'El valor numérico es requerido.'
        };
    }
    
    const numValue = Number(value);
    
    if (isNaN(numValue)) {
        return {
            valid: false,
            message: 'Por favor ingrese un valor numérico válido.'
        };
    }
    
    if (options.min !== undefined && numValue < options.min) {
        return {
            valid: false,
            message: `El valor debe ser mayor o igual a ${options.min}.`
        };
    }
    
    if (options.max !== undefined && numValue > options.max) {
        return {
            valid: false,
            message: `El valor debe ser menor o igual a ${options.max}.`
        };
    }
    
    return { valid: true };
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {Object} Validation result { valid: boolean, message: string }
 */
function validateUrl(url) {
    const trimmedUrl = String(url || '').trim();
    
    if (!trimmedUrl) {
        return {
            valid: false,
            message: 'La URL es requerida.'
        };
    }
    
    // URL regex pattern
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    
    if (!urlRegex.test(trimmedUrl)) {
        return {
            valid: false,
            message: 'Por favor ingrese una URL válida.'
        };
    }
    
    return { valid: true };
}

/**
 * Validate a form element
 * @param {HTMLElement} element - Form element to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result { valid: boolean, message: string }
 */
function validateFormElement(element, options = {}) {
    const value = element.value;
    const type = element.type;
    const required = element.required;
    
    // Skip validation if not required and empty
    if (!required && (!value || value.trim() === '')) {
        return { valid: true };
    }
    
    // Validate based on input type
    switch (type) {
        case 'email':
            return validateEmail(value);
        
        case 'password':
            return validatePassword(value, options);
        
        case 'date':
            return validateDate(value);
        
        case 'number':
            return validateNumber(value, options);
        
        case 'url':
            return validateUrl(value);
        
        default:
            // Text, textarea, etc.
            if (required) {
                return validateRequired(value, element.name || 'campo');
            }
            return { valid: true };
    }
}

/**
 * Display validation error for a form element
 * @param {HTMLElement} element - Form element
 * @param {string} message - Error message
 */
function showValidationError(element, message) {
    // Get parent form group
    const formGroup = element.closest('.form-group');
    
    if (!formGroup) return;
    
    // Add error class
    formGroup.classList.add('error');
    
    // Check if error element already exists
    let errorElement = formGroup.querySelector('.form-error');
    
    if (!errorElement) {
        // Create error element
        errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        formGroup.appendChild(errorElement);
    }
    
    // Set error message
    errorElement.textContent = message;
    
    // Highlight input
    element.setAttribute('aria-invalid', 'true');
}

/**
 * Clear validation error for a form element
 * @param {HTMLElement} element - Form element
 */
function clearValidationError(element) {
    // Get parent form group
    const formGroup = element.closest('.form-group');
    
    if (!formGroup) return;
    
    // Remove error class
    formGroup.classList.remove('error');
    
    // Remove error message
    const errorElement = formGroup.querySelector('.form-error');
    if (errorElement) {
        errorElement.remove();
    }
    
    // Remove invalid attribute
    element.removeAttribute('aria-invalid');
}

/**
 * Validate entire form
 * @param {HTMLFormElement} form - Form element
 * @param {Object} options - Validation options for specific fields
 * @returns {boolean} True if form is valid
 */
function validateForm(form, options = {}) {
    if (!form || !(form instanceof HTMLFormElement)) {
        console.error('Invalid form element provided to validateForm');
        return false;
    }
    
    let isValid = true;
    const elements = form.elements;
    
    // Clear all previous errors
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        clearValidationError(element);
    }
    
    // Validate each element
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const name = element.name;
        
        // Skip elements without name
        if (!name) continue;
        
        // Skip buttons and non-input elements
        if (element.type === 'button' || element.type === 'submit' || element.type === 'reset') {
            continue;
        }
        
        // Get element-specific options
        const elementOptions = options[name] || {};
        
        // Validate element
        const result = validateFormElement(element, elementOptions);
        
        if (!result.valid) {
            showValidationError(element, result.message);
            isValid = false;
        }
    }
    
    return isValid;
}

/**
 * Normaliza un texto eliminando acentos y convirtiendo a minúsculas
 * @param {string} text - Texto a normalizar
 * @returns {string} Texto normalizado
 */
function normalizeText(text) {
    if (!text) return '';
    return String(text).toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Valida si un día de la semana es válido
 * @param {string} day - Nombre del día
 * @returns {Object} Resultado de validación { valid: boolean, message: string, normalizedDay: string }
 */
function validateDayOfWeek(day) {
    if (!day) {
        return {
            valid: false,
            message: 'El día de la semana es requerido.',
            normalizedDay: ''
        };
    }
    
    const normalized = normalizeText(day);
    
    const validDaysMap = {
        'lunes': 'monday',
        'martes': 'tuesday',
        'miercoles': 'wednesday',
        'jueves': 'thursday',
        'viernes': 'friday',
        'sabado': 'saturday',
        'domingo': 'sunday',
        'monday': 'monday',
        'tuesday': 'tuesday',
        'wednesday': 'wednesday',
        'thursday': 'thursday',
        'friday': 'friday',
        'saturday': 'saturday',
        'sunday': 'sunday'
    };
    
    if (!validDaysMap[normalized]) {
        return {
            valid: false,
            message: 'Día de la semana inválido.',
            normalizedDay: ''
        };
    }
    
    return {
        valid: true,
        normalizedDay: validDaysMap[normalized]
    };
}

/**
 * Convierte un día en español a su equivalente en inglés
 * @param {string} day - Nombre del día en español
 * @returns {string} Nombre del día en inglés
 */
function mapDayToEnglish(day) {
    const validation = validateDayOfWeek(day);
    return validation.valid ? validation.normalizedDay : '';
}

// Hacer disponible globalmente
window.validationUtils = {
    validateRequired,
    validateEmail,
    validatePassword,
    validateDate,
    validateNumber,
    validateUrl,
    validateFormElement,
    showValidationError,
    clearValidationError,
    validateForm,
    normalizeText,
    validateDayOfWeek,
    mapDayToEnglish
};