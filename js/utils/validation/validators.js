// Validators Utility for Comedor Grupo Avika

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} - True if the email is valid
 */
function isValidEmail(email) {
    if (!email) return false;
    
    // Basic regex for email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate that a string is not empty
 * @param {string} value - The string to validate
 * @returns {boolean} - True if the string is not empty
 */
function isNotEmpty(value) {
    return value !== null && value !== undefined && value.trim() !== '';
}

/**
 * Validate that a value is a number
 * @param {any} value - The value to validate
 * @returns {boolean} - True if the value is a number
 */
function isNumber(value) {
    if (value === null || value === undefined || value === '') return false;
    return !isNaN(parseFloat(value)) && isFinite(value);
}

/**
 * Validate that a number is positive
 * @param {number|string} value - The number to validate
 * @returns {boolean} - True if the number is positive
 */
function isPositive(value) {
    if (!isNumber(value)) return false;
    return parseFloat(value) > 0;
}

/**
 * Validate that a number is within a range
 * @param {number|string} value - The number to validate
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {boolean} - True if the number is within the range
 */
function isInRange(value, min, max) {
    if (!isNumber(value)) return false;
    const num = parseFloat(value);
    return num >= min && num <= max;
}

/**
 * Validate that a date is valid
 * @param {string} dateStr - The date string in YYYY-MM-DD format
 * @returns {boolean} - True if the date is valid
 */
function isValidDate(dateStr) {
    if (!dateStr) return false;
    
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

/**
 * Validate that a date is in the future
 * @param {string} dateStr - The date string in YYYY-MM-DD format
 * @returns {boolean} - True if the date is in the future
 */
function isFutureDate(dateStr) {
    if (!isValidDate(dateStr)) return false;
    
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return date > today;
}

/**
 * Validate that a date is in the past
 * @param {string} dateStr - The date string in YYYY-MM-DD format
 * @returns {boolean} - True if the date is in the past
 */
function isPastDate(dateStr) {
    if (!isValidDate(dateStr)) return false;
    
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return date < today;
}

/**
 * Validate a password for minimum requirements
 * @param {string} password - The password to validate
 * @param {number} minLength - Minimum length (default: 8)
 * @returns {boolean} - True if the password meets the minimum requirements
 */
function isStrongPassword(password, minLength = 8) {
    if (!password || typeof password !== 'string') return false;
    
    // Check minimum length
    if (password.length < minLength) return false;
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) return false;
    
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) return false;
    
    // Check for at least one number
    if (!/[0-9]/.test(password)) return false;
    
    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
    
    return true;
}

/**
 * Validate that a value has a minimum length
 * @param {string} value - The string to validate
 * @param {number} minLength - The minimum length
 * @returns {boolean} - True if the string has at least the minimum length
 */
function hasMinLength(value, minLength) {
    if (value === null || value === undefined) return false;
    return String(value).length >= minLength;
}

/**
 * Validate that a value has a maximum length
 * @param {string} value - The string to validate
 * @param {number} maxLength - The maximum length
 * @returns {boolean} - True if the string has at most the maximum length
 */
function hasMaxLength(value, maxLength) {
    if (value === null || value === undefined) return false;
    return String(value).length <= maxLength;
}

/**
 * Validate that a value exists in an array
 * @param {any} value - The value to check
 * @param {Array} array - The array to check against
 * @returns {boolean} - True if the value exists in the array
 */
function isInArray(value, array) {
    if (!Array.isArray(array)) return false;
    return array.includes(value);
}

/**
 * Validate a form object against a set of rules
 * @param {Object} formData - The form data to validate
 * @param {Object} validationRules - The validation rules
 * @returns {Object} - Validation result with isValid flag and errors object
 */
function validateForm(formData, validationRules) {
    const errors = {};
    let isValid = true;
    
    // Process each field in the validation rules
    for (const field in validationRules) {
        const rules = validationRules[field];
        const value = formData[field];
        
        // Skip if no rules for this field
        if (!rules) continue;
        
        // Process each rule for the current field
        for (const rule of rules) {
            let valid = true;
            let errorMessage = '';
            
            // Check rule type and validate accordingly
            switch (rule.type) {
                case 'required':
                    valid = isNotEmpty(value);
                    errorMessage = rule.message || 'Este campo es obligatorio';
                    break;
                    
                case 'email':
                    valid = !value || isValidEmail(value);
                    errorMessage = rule.message || 'Correo electrónico inválido';
                    break;
                    
                case 'number':
                    valid = !value || isNumber(value);
                    errorMessage = rule.message || 'Debe ser un número';
                    break;
                    
                case 'positive':
                    valid = !value || isPositive(value);
                    errorMessage = rule.message || 'Debe ser un número positivo';
                    break;
                    
                case 'range':
                    valid = !value || isInRange(value, rule.min, rule.max);
                    errorMessage = rule.message || `Debe estar entre ${rule.min} y ${rule.max}`;
                    break;
                    
                case 'minLength':
                    valid = !value || hasMinLength(value, rule.length);
                    errorMessage = rule.message || `Debe tener al menos ${rule.length} caracteres`;
                    break;
                    
                case 'maxLength':
                    valid = !value || hasMaxLength(value, rule.length);
                    errorMessage = rule.message || `Debe tener como máximo ${rule.length} caracteres`;
                    break;
                    
                case 'date':
                    valid = !value || isValidDate(value);
                    errorMessage = rule.message || 'Fecha inválida';
                    break;
                    
                case 'futureDate':
                    valid = !value || isFutureDate(value);
                    errorMessage = rule.message || 'La fecha debe ser futura';
                    break;
                    
                case 'pastDate':
                    valid = !value || isPastDate(value);
                    errorMessage = rule.message || 'La fecha debe ser pasada';
                    break;
                    
                case 'password':
                    valid = !value || isStrongPassword(value, rule.minLength || 8);
                    errorMessage = rule.message || 'La contraseña no cumple los requisitos mínimos';
                    break;
                    
                case 'inArray':
                    valid = !value || isInArray(value, rule.array);
                    errorMessage = rule.message || 'Valor no permitido';
                    break;
                    
                case 'custom':
                    if (typeof rule.validator === 'function') {
                        valid = rule.validator(value, formData);
                        errorMessage = rule.message || 'Valor inválido';
                    }
                    break;
            }
            
            // If validation failed, add error and set isValid to false
            if (!valid) {
                if (!errors[field]) {
                    errors[field] = [];
                }
                errors[field].push(errorMessage);
                isValid = false;
            }
        }
    }
    
    return { isValid, errors };
}

// Export validation patterns for reuse
const ValidationPatterns = {
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    NAME: /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]{2,50}$/,
    PHONE: /^(\+?\d{1,3}[- ]?)?\d{10}$/,
    NUMERIC: /^\d+$/,
    DATE: /^\d{4}-\d{2}-\d{2}$/
};

// Export all validators as a global object
window.validators = {
    isValidEmail,
    isNotEmpty,
    isNumber,
    isPositive,
    isInRange,
    isValidDate,
    isFutureDate,
    isPastDate,
    isStrongPassword,
    hasMinLength,
    hasMaxLength,
    isInArray,
    validateForm,
    ValidationPatterns
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.validators;
}