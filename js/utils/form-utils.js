// Form Utilities - Functions for handling forms

/**
 * Get form data as an object
 * @param {HTMLFormElement} form - Form element
 * @returns {Object} Form data as object
 */
function getFormData(form) {
    if (!form || !(form instanceof HTMLFormElement)) {
        console.error('Invalid form element');
        return {};
    }
    
    const formData = new FormData(form);
    const data = {};
    
    // Process each form field
    formData.forEach((value, key) => {
        // Handle checkbox values
        if (form.elements[key].type === 'checkbox') {
            data[key] = form.elements[key].checked;
        } else {
            // Handle other form fields
            data[key] = value;
        }
    });
    
    return data;
}

/**
 * Set form data from an object
 * @param {HTMLFormElement} form - Form element
 * @param {Object} data - Data to set in form
 */
function setFormData(form, data) {
    if (!form || !(form instanceof HTMLFormElement)) {
        console.error('Invalid form element');
        return;
    }
    
    if (!data || typeof data !== 'object') {
        console.error('Invalid data object');
        return;
    }
    
    // Set values for each form field
    Object.entries(data).forEach(([key, value]) => {
        const field = form.elements[key];
        
        if (!field) return;
        
        // Handle different field types
        if (field.type === 'checkbox') {
            field.checked = !!value;
        } else if (field.type === 'radio') {
            const radio = form.querySelector(`input[name="${key}"][value="${value}"]`);
            if (radio) radio.checked = true;
        } else if (field.tagName === 'SELECT' && field.multiple) {
            const values = Array.isArray(value) ? value : [value];
            Array.from(field.options).forEach(option => {
                option.selected = values.includes(option.value);
            });
        } else {
            field.value = value || '';
        }
    });
}

/**
 * Reset form
 * @param {HTMLFormElement} form - Form element
 */
function resetForm(form) {
    if (!form || !(form instanceof HTMLFormElement)) {
        console.error('Invalid form element');
        return;
    }
    
    form.reset();
}

/**
 * Disable form
 * @param {HTMLFormElement} form - Form element
 * @param {boolean} disabled - Whether to disable form
 */
function disableForm(form, disabled = true) {
    if (!form || !(form instanceof HTMLFormElement)) {
        console.error('Invalid form element');
        return;
    }
    
    const elements = form.elements;
    
    for (let i = 0; i < elements.length; i++) {
        elements[i].disabled = disabled;
    }
}

/**
 * Add form validation
 * @param {HTMLFormElement} form - Form element
 * @param {Function} validationFunction - Function to validate form
 * @param {Function} submitCallback - Function to call on successful submit
 */
function addFormValidation(form, validationFunction, submitCallback) {
    if (!form || !(form instanceof HTMLFormElement)) {
        console.error('Invalid form element');
        return;
    }
    
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        
        const formData = getFormData(form);
        const validationResult = validationFunction(formData);
        
        if (validationResult.valid) {
            submitCallback(formData);
        } else {
            // Show validation errors
            showFormErrors(form, validationResult.errors);
        }
    });
}

/**
 * Show form errors
 * @param {HTMLFormElement} form - Form element
 * @param {Object|Array} errors - Error messages (object with field keys or array)
 */
function showFormErrors(form, errors) {
    if (!form || !(form instanceof HTMLFormElement)) {
        console.error('Invalid form element');
        return;
    }
    
    // Clear previous errors
    clearFormErrors(form);
    
    // Form-level error container
    let formErrorContainer = form.querySelector('.form-errors');
    
    if (!formErrorContainer) {
        formErrorContainer = document.createElement('div');
        formErrorContainer.className = 'form-errors';
        form.insertBefore(formErrorContainer, form.firstChild);
    }
    
    // Handle different error formats
    if (Array.isArray(errors)) {
        // Array of errors, show at form level
        if (errors.length > 0) {
            const errorList = document.createElement('ul');
            errors.forEach(error => {
                const errorItem = document.createElement('li');
                errorItem.textContent = error;
                errorList.appendChild(errorItem);
            });
            formErrorContainer.appendChild(errorList);
        }
    } else if (typeof errors === 'object') {
        // Object of errors, show at field level
        Object.entries(errors).forEach(([field, message]) => {
            const fieldElement = form.elements[field];
            
            if (fieldElement) {
                // Find or create error element for this field
                const fieldContainer = fieldElement.closest('.form-group') || fieldElement.parentNode;
                
                if (fieldContainer) {
                    fieldContainer.classList.add('error');
                    
                    let fieldError = fieldContainer.querySelector('.field-error');
                    
                    if (!fieldError) {
                        fieldError = document.createElement('div');
                        fieldError.className = 'field-error';
                        fieldContainer.appendChild(fieldError);
                    }
                    
                    fieldError.textContent = message;
                }
            } else {
                // Field not found, add to form-level errors
                const errorItem = document.createElement('div');
                errorItem.textContent = `${field}: ${message}`;
                formErrorContainer.appendChild(errorItem);
            }
        });
    } else if (typeof errors === 'string') {
        // Single error message
        formErrorContainer.textContent = errors;
    }
}

/**
 * Clear form errors
 * @param {HTMLFormElement} form - Form element
 */
function clearFormErrors(form) {
    if (!form || !(form instanceof HTMLFormElement)) {
        console.error('Invalid form element');
        return;
    }
    
    // Clear form-level errors
    const formErrorContainer = form.querySelector('.form-errors');
    if (formErrorContainer) {
        formErrorContainer.innerHTML = '';
    }
    
    // Clear field-level errors
    const errorFields = form.querySelectorAll('.form-group.error, .field-error');
    errorFields.forEach(element => {
        if (element.classList.contains('error')) {
            element.classList.remove('error');
        } else {
            element.parentNode.removeChild(element);
        }
    });
}

/**
 * Serialize form to URL parameters
 * @param {HTMLFormElement} form - Form element
 * @returns {string} URL parameters string
 */
function serializeForm(form) {
    if (!form || !(form instanceof HTMLFormElement)) {
        console.error('Invalid form element');
        return '';
    }
    
    const formData = new FormData(form);
    const params = new URLSearchParams();
    
    formData.forEach((value, key) => {
        params.append(key, value);
    });
    
    return params.toString();
}

/**
 * Populate form from URL parameters
 * @param {HTMLFormElement} form - Form element
 * @param {string} queryString - URL query string
 */
function populateFormFromQuery(form, queryString) {
    if (!form || !(form instanceof HTMLFormElement)) {
        console.error('Invalid form element');
        return;
    }
    
    if (!queryString) {
        queryString = window.location.search;
    }
    
    const params = new URLSearchParams(queryString);
    const data = {};
    
    params.forEach((value, key) => {
        data[key] = value;
    });
    
    setFormData(form, data);
}

/**
 * Create checkbox group from array of options
 * @param {Object} config - Configuration
 * @param {string} config.name - Field name
 * @param {Array} config.options - Array of options (objects with value and label)
 * @param {Array} config.selectedValues - Array of selected values
 * @param {string} config.containerClass - CSS class for container
 * @returns {HTMLElement} Container element with checkboxes
 */
function createCheckboxGroup(config) {
    const { name, options, selectedValues = [], containerClass = 'checkbox-group' } = config;
    
    if (!name || !options || !Array.isArray(options)) {
        console.error('Invalid configuration for checkbox group');
        return null;
    }
    
    const container = document.createElement('div');
    container.className = containerClass;
    
    options.forEach(option => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = name;
        checkbox.value = option.value;
        checkbox.checked = selectedValues.includes(option.value);
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(option.label));
        container.appendChild(label);
    });
    
    return container;
}

/**
 * Create radio group from array of options
 * @param {Object} config - Configuration
 * @param {string} config.name - Field name
 * @param {Array} config.options - Array of options (objects with value and label)
 * @param {string} config.selectedValue - Selected value
 * @param {string} config.containerClass - CSS class for container
 * @returns {HTMLElement} Container element with radio buttons
 */
function createRadioGroup(config) {
    const { name, options, selectedValue, containerClass = 'radio-group' } = config;
    
    if (!name || !options || !Array.isArray(options)) {
        console.error('Invalid configuration for radio group');
        return null;
    }
    
    const container = document.createElement('div');
    container.className = containerClass;
    
    options.forEach(option => {
        const label = document.createElement('label');
        label.className = 'radio-label';
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = name;
        radio.value = option.value;
        radio.checked = option.value === selectedValue;
        
        label.appendChild(radio);
        label.appendChild(document.createTextNode(option.label));
        container.appendChild(label);
    });
    
    return container;
}

/**
 * Get selected values from checkbox group
 * @param {string} name - Field name
 * @param {HTMLFormElement} form - Form element
 * @returns {Array} Array of selected values
 */
function getSelectedCheckboxValues(name, form) {
    if (!name) {
        console.error('Field name is required');
        return [];
    }
    
    const checkboxes = form ?
        form.querySelectorAll(`input[name="${name}"]:checked`) :
        document.querySelectorAll(`input[name="${name}"]:checked`);
    
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Set selected values for checkbox group
 * @param {string} name - Field name
 * @param {Array} values - Values to select
 * @param {HTMLFormElement} form - Form element
 */
function setSelectedCheckboxValues(name, values, form) {
    if (!name || !Array.isArray(values)) {
        console.error('Field name and values array are required');
        return;
    }
    
    const checkboxes = form ?
        form.querySelectorAll(`input[name="${name}"]`) :
        document.querySelectorAll(`input[name="${name}"]`);
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = values.includes(checkbox.value);
    });
}