/**
 * Coordinator Confirmations Module
 * Manages the registration of daily meal confirmations for employees
 */

// Constants
const USER_ROLES = {
    ADMIN: 'admin',
    COORDINATOR: 'coordinator'
};

// Referencias a servicios y colecciones de Firebase
const db = window.db;
const auth = window.auth;
const employeesCollection = window.employeesCollection;
const confirmationsCollection = window.confirmationsCollection;

// Current user information
let currentUser = null;
let employeeList = []; // Store employee list for the coordinator

/**
 * Initialize the module when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Check if user has correct role
    if (!checkAuth(USER_ROLES.COORDINATOR)) {
        console.error('Unauthorized access to coordinator confirmations');
        return;
    }
    
    // Get current user from session storage
    try {
        // Usar sessionStorage para obtener el usuario actual
        const userId = sessionStorage.getItem('userId');
        const userName = sessionStorage.getItem('userName');
        const userEmail = sessionStorage.getItem('userEmail');
        const departmentId = sessionStorage.getItem('userDepartment');
        
        if (!userId) {
            console.error('User session data not found');
            window.location.href = '../../index.html';
            return;
        }
        
        currentUser = {
            uid: userId,
            displayName: userName,
            email: userEmail,
            departmentId: departmentId
        };
    } catch (error) {
        console.error('Error parsing user data:', error);
        window.location.href = '../../index.html';
        return;
    }
    
    // Initialize components
    initializeDatePickers();
    loadEmployees();
    setupEventListeners();
    
    // Check if there's a date in the URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    if (dateParam) {
        const datePicker = document.getElementById('confirmation-date');
        if (datePicker && isValidDateString(dateParam)) {
            datePicker.value = dateParam;
            // Load existing confirmations for this date
            loadExistingConfirmations(dateParam);
        }
    }
});

/**
 * Validate if a string is a valid date format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - Whether the date string is valid
 */
function isValidDateString(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

/**
 * Initialize date picker with appropriate constraints
 */
/**
 * Initialize date picker with appropriate constraints
 */
function initializeDatePickers() {
    const datePicker = document.getElementById('confirmation-date');
    
    if (datePicker) {
        // Set default to today
        const today = new Date();
        datePicker.value = formatDateInput(today);
        
        // Set min to today
        datePicker.min = formatDateInput(today);
        
        // Set max to 14 days from now (aumentado a 14 días para dar más flexibilidad)
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 14);
        datePicker.max = formatDateInput(maxDate);
        
        // Add change event listener to load existing confirmations
        datePicker.addEventListener('change', () => {
            loadExistingConfirmations(datePicker.value);
        });
    } else {
        console.warn('Date picker element not found');
    }
}
/**
 * Display day of week for selected date
 * @param {string} dateString - Date in YYYY-MM-DD format
 */
function showDayOfWeek(dateString) {
    if (!dateString || !isValidDateString(dateString)) return;
    
    const date = new Date(dateString);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayOfWeek = days[date.getDay()];
    
    const dayDisplay = document.getElementById('day-of-week-display');
    if (dayDisplay) {
        dayDisplay.textContent = dayOfWeek;
    } else {
        // Create the element if it doesn't exist
        const dateContainer = document.querySelector('.date-selector');
        if (dateContainer) {
            const newDisplay = document.createElement('div');
            newDisplay.id = 'day-of-week-display';
            newDisplay.className = 'day-of-week';
            newDisplay.textContent = dayOfWeek;
            dateContainer.appendChild(newDisplay);
        }
    }
}
/**
 * Setup event listeners for interactive elements
 */
// Add change event listener to load existing confirmations
datePicker.addEventListener('change', () => {
    loadExistingConfirmations(datePicker.value);
    showDayOfWeek(datePicker.value);
});

// También muestra el día actual al cargar la página
showDayOfWeek(formatDateInput(new Date()));
/**
 * Setup event listeners for interactive elements
 */
function setupEventListeners() {
    // Confirmation form submission
    const confirmationForm = document.getElementById('confirmation-form');
    if (confirmationForm) {
        confirmationForm.addEventListener('submit', saveConfirmation);
    } else {
        const submitBtn = document.getElementById('submit-confirmation-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                e.preventDefault();
                saveConfirmation(e);
            });
        }
    }
    
    // Select/deselect all employees
    const selectAllCheckbox = document.getElementById('select-all-employees');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', toggleAllEmployees);
    } else {
        const selectAllBtn = document.getElementById('select-all-btn');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', function() {
                selectAllEmployees(true);
            });
        }
    }
    
    // Clear selection button
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', function() {
            selectAllEmployees(false);
        });
    }
    
    // Search employees
    const searchInput = document.getElementById('employee-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterEmployees);
    }
    
    // Date picker
    const datePicker = document.getElementById('confirmation-date');
    if (datePicker) {
        // Initialize Flatpickr if available
        if (window.flatpickr) {
            window.flatpickr(datePicker, {
                dateFormat: 'Y-m-d',
                minDate: 'today',
                maxDate: new Date().fp_incr(14), // 14 days from now
                locale: 'es',
                onChange: function(selectedDates) {
                    if (selectedDates && selectedDates[0]) {
                        loadExistingConfirmations(formatDate(selectedDates[0]));
                        showDayOfWeek(formatDate(selectedDates[0]));
                    }
                }
            });
        } else {
            // Fallback to regular date input
            datePicker.addEventListener('change', function() {
                loadExistingConfirmations(this.value);
                showDayOfWeek(this.value);
            });
        }
        
        // Set initial date value (today)
        datePicker.value = formatDateInput(new Date());
        showDayOfWeek(datePicker.value);
    }
    
    // Employee checkboxes - add event delegation to handle employee selection changes
    const employeeListContainer = document.getElementById('employees-list');
    if (employeeListContainer) {
        employeeListContainer.addEventListener('change', function(event) {
            if (event.target.classList.contains('employee-select') || 
                event.target.type === 'checkbox') {
                updateEmployeeCount();
            }
        });
    }
    
    // Dashboard button in success modal
    const viewDashboardBtn = document.getElementById('view-dashboard-btn');
    if (viewDashboardBtn) {
        viewDashboardBtn.addEventListener('click', function() {
            window.location.href = 'dashboard.html';
        });
    }
}

// Helper to select or deselect all employees
function selectAllEmployees(select) {
    const checkboxes = document.querySelectorAll('#employees-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = select;
    });
    updateEmployeeCount();
}

// Display day of week for selected date
function showDayOfWeek(dateString) {
    if (!dateString || !isValidDateString(dateString)) return;
    
    const date = new Date(dateString);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayOfWeek = days[date.getDay()];
    
    const dayDisplay = document.getElementById('day-of-week-display');
    if (dayDisplay) {
        dayDisplay.textContent = dayOfWeek;
    } else {
        // Create the element if it doesn't exist
        const dateContainer = document.querySelector('.date-selector');
        if (dateContainer) {
            const newDisplay = document.createElement('div');
            newDisplay.id = 'day-of-week-display';
            newDisplay.className = 'day-of-week';
            newDisplay.textContent = dayOfWeek;
            dateContainer.appendChild(newDisplay);
        }
    }
}
function displayEmployees(employees) {
    const employeeListContainer = document.getElementById('employee-list');
    if (!employeeListContainer) {
        console.warn('Employee list container not found');
        return;
    }
    
    // Clear previous list
    employeeListContainer.innerHTML = '';
    
    // Check if there are any employees
    if (employees.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.classList.add('empty-list-message');
        emptyMessage.textContent = 'No hay empleados activos asignados a su departamento.';
        
        employeeListContainer.appendChild(emptyMessage);
        return;
    }
    
    // Create employee checkboxes
    employees.forEach(employee => {
        const employeeItem = document.createElement('div');
        employeeItem.classList.add('employee-item');
        
        employeeItem.innerHTML = `
            <label class="employee-checkbox">
                <input type="checkbox" class="employee-select" value="${employee.id}" data-name="${employee.name}">
                <span class="employee-name">${employee.name}</span>
                ${employee.position ? `<span class="employee-position">${employee.position}</span>` : ''}
            </label>
        `;
        
        employeeListContainer.appendChild(employeeItem);
    });
    
    // Update employee count
    updateEmployeeCount();
}

/**
 * Filter employees by search term
 */
function filterEmployees() {
    const searchInput = document.getElementById('search-employees');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        // If search is empty, show all employees
        displayEmployees(employeeList);
        return;
    }
    
    // Filter employees by name or position
    const filteredEmployees = employeeList.filter(employee => 
        employee.name.toLowerCase().includes(searchTerm) || 
        (employee.position && employee.position.toLowerCase().includes(searchTerm))
    );
    
    // Display filtered list
    displayEmployees(filteredEmployees);
}

/**
 * Toggle all employees selection
 */
function toggleAllEmployees() {
    const selectAllCheckbox = document.getElementById('select-all-employees');
    if (!selectAllCheckbox) return;
    
    const employeeCheckboxes = document.querySelectorAll('.employee-select');
    
    employeeCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    // Update employee count
    updateEmployeeCount();
}

/**
 * Update selected employee count
 */
function updateEmployeeCount() {
    const selectedCount = document.querySelectorAll('.employee-select:checked').length;
    const totalCount = document.querySelectorAll('.employee-select').length;
    
    const countDisplay = document.getElementById('selected-employee-count');
    if (countDisplay) {
        countDisplay.textContent = `${selectedCount} de ${totalCount} seleccionados`;
    }
    
    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('select-all-employees');
    if (selectAllCheckbox && totalCount > 0) {
        selectAllCheckbox.checked = selectedCount === totalCount;
        selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
    }
}

/**
 * Save confirmation data to Firestore
 * @param {Event} event - Form submission event
 */
async function saveConfirmation(event) {
    event.preventDefault();
    
    // Validate form
    if (!validateConfirmationForm()) {
        return;
    }
    
    // Show loading state
    showLoadingState(true);
    
    try {
        // Get form values
        const dateInput = document.getElementById('confirmation-date');
        const commentsInput = document.getElementById('confirmation-comments');
        
        if (!dateInput) throw new Error('Date input not found');
        
        const date = dateInput.value;
        const comments = commentsInput ? commentsInput.value.trim() : '';
        
        // Get selected employees
        const selectedEmployees = [];
        const employeeCheckboxes = document.querySelectorAll('.employee-select:checked');
        
        employeeCheckboxes.forEach(checkbox => {
            selectedEmployees.push({
                id: checkbox.value,
                name: checkbox.getAttribute('data-name') || 'Unknown Employee'
            });
        });
        
        // Check if we already have a confirmation for this date - convertido a v8
        const querySnapshot = await confirmationsCollection
            .where('date', '==', date)
            .where('departmentId', '==', currentUser.departmentId)
            .get();
        
        // Prepare confirmation data
        const confirmationData = {
            date: date,
            departmentId: currentUser.departmentId,
            departmentName: currentUser.departmentName || 'Unknown Department',
            coordinatorId: currentUser.uid,
            coordinatorName: currentUser.displayName || currentUser.email,
            employees: selectedEmployees,
            comments: comments,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (querySnapshot.empty) {
            // Create new confirmation - convertido a v8
            confirmationData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await confirmationsCollection.add(confirmationData);
            showSuccessMessage('Confirmación guardada correctamente.');
        } else {
            // Update existing confirmation - convertido a v8
            const docRef = querySnapshot.docs[0].ref;
            await docRef.set(confirmationData, { merge: true });
            showSuccessMessage('Confirmación actualizada correctamente.');
        }
        
        // Reset form after successful save
        resetConfirmationForm();
    } catch (error) {
        console.error("Error saving confirmation:", error);
        showErrorMessage("Error al guardar la confirmación. Por favor intente de nuevo.");
    } finally {
        // Hide loading state
        showLoadingState(false);
    }
}

/**
 * Validate confirmation form inputs
 * @returns {boolean} - Whether the form is valid
 */
function validateConfirmationForm() {
    // Get form values
    const date = document.getElementById('confirmation-date').value;
    const selectedEmployees = document.querySelectorAll('.employee-select:checked');
    
    // Check date
    if (!date) {
        showErrorMessage("Por favor seleccione una fecha.");
        return false;
    }
    
    // Check if at least one employee is selected
    if (selectedEmployees.length === 0) {
        showErrorMessage("Por favor seleccione al menos un empleado.");
        return false;
    }
    
    return true;
}

/**
 * Reset confirmation form to default state
 */
function resetConfirmationForm() {
    // Reset date to today if needed
    const datePicker = document.getElementById('confirmation-date');
    if (datePicker) {
        // Keep current date selection
    }
    
    // Clear comments
    const commentsField = document.getElementById('confirmation-comments');
    if (commentsField) {
        commentsField.value = '';
    }
    
    // Uncheck all employee checkboxes
    const employeeCheckboxes = document.querySelectorAll('.employee-select');
    employeeCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Uncheck "select all" checkbox
    const selectAllCheckbox = document.getElementById('select-all-employees');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    }
    
    // Update employee count
    updateEmployeeCount();
}

/**
 * Format date for input elements (YYYY-MM-DD)
 * @param {Date} date - Date object to format
 * @returns {string} - Formatted date string
 */
function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Show loading state
 * @param {boolean} isLoading - Whether to show or hide loading indicator
 */
function showLoadingState(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    const mainContent = document.getElementById('main-content');
    
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }
    
    if (mainContent) {
        mainContent.style.opacity = isLoading ? '0.5' : '1';
        mainContent.style.pointerEvents = isLoading ? 'none' : 'auto';
    }
}

/**
 * Show error message
 * @param {string} message - Error message to display
 * @param {number} duration - Duration in milliseconds to show the message
 */
function showErrorMessage(message, duration = 5000) {
    const errorAlert = document.getElementById('error-alert');
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        
        // Hide after specified duration
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, duration);
    }
}

/**
 * Show success message
 * @param {string} message - Success message to display
 * @param {number} duration - Duration in milliseconds to show the message
 */
function showSuccessMessage(message, duration = 3000) {
    const successAlert = document.getElementById('success-alert');
    if (successAlert) {
        successAlert.textContent = message;
        successAlert.style.display = 'block';
        
        // Hide after specified duration
        setTimeout(() => {
            successAlert.style.display = 'none';
        }, duration);
    }
}

/**
 * Show informational message
 * @param {string} message - Info message to display
 * @param {number} duration - Duration in milliseconds to show the message
 */
function showInfoMessage(message, duration = 5000) {
    const infoAlert = document.getElementById('info-alert');
    if (infoAlert) {
        infoAlert.textContent = message;
        infoAlert.style.display = 'block';
        
        // Hide after specified duration
        setTimeout(() => {
            infoAlert.style.display = 'none';
        }, duration);
    }
}

// Expose functions for use in other modules if needed
window.confirmationsModule = {
    loadEmployees,
    saveConfirmation,
    formatDateInput
};