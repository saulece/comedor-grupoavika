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
    return !isNaN(Number(value));
}

/**
 * Validate that a number is positive
 * @param {number|string} value - The number to validate
 * @returns {boolean} - True if the number is positive
 */
function isPositive(value) {
    if (!isNumber(value)) return false;
    return Number(value) > 0;
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
    const numValue = Number(value);
    return numValue >= min && numValue <= max;
}

/**
 * Validate that a date is valid
 * @param {string} dateStr - The date string in YYYY-MM-DD format
 * @returns {boolean} - True if the date is valid
 */
function isValidDate(dateStr) {
    if (!dateStr) return false;
    
    // Try to create a date from the string
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
    today.setHours(0, 0, 0, 0); // Reset time part for comparison
    
    return date >= today;
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
    today.setHours(0, 0, 0, 0); // Reset time part for comparison
    
    return date < today;
}

/**
 * Validate a password for minimum requirements
 * @param {string} password - The password to validate
 * @param {number} minLength - Minimum length (default: 8)
 * @returns {boolean} - True if the password meets the minimum requirements
 */
function isStrongPassword(password, minLength = 8) {
    if (!password) return false;
    
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
    if (!value) return false;
    return value.length >= minLength;
}

/**
 * Validate that a value has a maximum length
 * @param {string} value - The string to validate
 * @param {number} maxLength - The maximum length
 * @returns {boolean} - True if the string has at most the maximum length
 */
function hasMaxLength(value, maxLength) {
    if (!value) return true; // Empty string has 0 length
    return value.length <= maxLength;
}

/**
 * Validate that a value exists in an array
 * @param {any} value - The value to check
 * @param {Array} array - The array to check against
 * @returns {boolean} - True if the value exists in the array
 */
function isInArray(value, array) {
    if (!array || !Array.isArray(array)) return false;
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
    
    for (const field in validationRules) {
        const rules = validationRules[field];
        const value = formData[field];
        
        // Required check
        if (rules.required && !isNotEmpty(value)) {
            errors[field] = rules.requiredMessage || 'Este campo es requerido';
            isValid = false;
            continue; // Skip other validations if required check failed
        }
        
        // Skip other validations if value is empty and not required
        if (!isNotEmpty(value) && !rules.required) {
            continue;
        }
        
        // Email check
        if (rules.email && !isValidEmail(value)) {
            errors[field] = rules.emailMessage || 'Correo electrónico no válido';
            isValid = false;
        }
        
        // Number check
        if (rules.number && !isNumber(value)) {
            errors[field] = rules.numberMessage || 'Debe ser un número';
            isValid = false;
        }
        
        // Positive number check
        if (rules.positive && !isPositive(value)) {
            errors[field] = rules.positiveMessage || 'Debe ser un número positivo';
            isValid = false;
        }
        
        // Range check
        if (rules.min !== undefined && rules.max !== undefined && !isInRange(value, rules.min, rules.max)) {
            errors[field] = rules.rangeMessage || `Debe estar entre ${rules.min} y ${rules.max}`;
            isValid = false;
        }
        
        // Min length check
        if (rules.minLength && !hasMinLength(value, rules.minLength)) {
            errors[field] = rules.minLengthMessage || `Debe tener al menos ${rules.minLength} caracteres`;
            isValid = false;
        }
        
        // Max length check
        if (rules.maxLength && !hasMaxLength(value, rules.maxLength)) {
            errors[field] = rules.maxLengthMessage || `Debe tener como máximo ${rules.maxLength} caracteres`;
            isValid = false;
        }
        
        // Date check
        if (rules.date && !isValidDate(value)) {
            errors[field] = rules.dateMessage || 'Fecha no válida';
            isValid = false;
        }
        
        // Future date check
        if (rules.futureDate && !isFutureDate(value)) {
            errors[field] = rules.futureDateMessage || 'La fecha debe ser en el futuro';
            isValid = false;
        }
        
        // Past date check
        if (rules.pastDate && !isPastDate(value)) {
            errors[field] = rules.pastDateMessage || 'La fecha debe ser en el pasado';
            isValid = false;
        }
        
        // Strong password check
        if (rules.strongPassword && !isStrongPassword(value, rules.minLength || 8)) {
            errors[field] = rules.strongPasswordMessage || 'La contraseña no cumple con los requisitos mínimos';
            isValid = false;
        }
        
        // Custom validator
        if (rules.validator && typeof rules.validator === 'function') {
            const isValidCustom = rules.validator(value, formData);
            if (!isValidCustom) {
                errors[field] = rules.validatorMessage || 'Valor no válido';
                isValid = false;
            }
        }
    }
    
    return {
        isValid,
        errors
    };
}

// Export functions for use in other scripts
// These will be available globally 