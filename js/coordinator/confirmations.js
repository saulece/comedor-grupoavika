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
function initializeDatePickers() {
    const datePicker = document.getElementById('confirmation-date');
    
    if (datePicker) {
        // Set default to today
        const today = new Date();
        
        // Inicializar flatpickr en lugar de usar el input nativo
        flatpickr(datePicker, {
            dateFormat: "Y-m-d",
            locale: "es",
            defaultDate: today,
            minDate: today,
            maxDate: new Date().fp_incr(14), // 14 días desde hoy
            disableMobile: true, // Evitar problemas en dispositivos móviles
            onChange: function(selectedDates, dateStr) {
                // Cargar confirmaciones existentes para esta fecha
                loadExistingConfirmations(dateStr);
                // Mostrar el día de la semana
                showDayOfWeek(dateStr);
            }
        });
        
        // Mostrar el día de la semana para la fecha actual
        showDayOfWeek(formatDateInput(today));
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
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Adjust for JavaScript's Sunday-first indexing (we want Monday = 0)
    const adjustedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // Get the day name in Spanish with proper accents
    const dayName = DATE_FORMATS.ADMIN[adjustedDayIndex];
    
    // Display the day name
    const dayDisplay = document.createElement('div');
    dayDisplay.className = 'day-of-week';
    dayDisplay.textContent = dayName;
    
    // Find the date selector container
    const dateContainer = document.querySelector('.date-selector');
    
    // Remove any existing day display
    const existingDayDisplay = document.querySelector('.day-of-week');
    if (existingDayDisplay) {
        existingDayDisplay.remove();
    }
    
    // Add the day display after the date input
    if (dateContainer) {
        dateContainer.appendChild(dayDisplay);
    }
}

/**
 * Setup event listeners for interactive elements
 */
function setupEventListeners() {
    // Save confirmation button
    const saveButton = document.getElementById('submit-confirmation-btn');
    if (saveButton) {
        saveButton.addEventListener('click', saveConfirmation);
    }
    
    // Select all employees button
    const selectAllButton = document.getElementById('select-all-btn');
    if (selectAllButton) {
        selectAllButton.addEventListener('click', () => selectAllEmployees(true));
    }
    
    // Clear selection button
    const clearSelectionButton = document.getElementById('clear-selection-btn');
    if (clearSelectionButton) {
        clearSelectionButton.addEventListener('click', () => selectAllEmployees(false));
    }
    
    // Select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-employees');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', toggleAllEmployees);
    }
    
    // Employee search input
    const searchInput = document.getElementById('employee-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterEmployees);
    }
    
    // Close modal buttons
    const closeModalButtons = document.querySelectorAll('.close-modal');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = document.getElementById('confirmation-success-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // View dashboard button in success modal
    const viewDashboardButton = document.getElementById('view-dashboard-btn');
    if (viewDashboardButton) {
        viewDashboardButton.addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    }
    
    // Logout button
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            // Clear session data
            sessionStorage.clear();
            // Redirect to login page
            window.location.href = '../../index.html';
        });
    }
}

/**
 * Toggle all employees selection
 */
function toggleAllEmployees() {
    const selectAllCheckbox = document.getElementById('select-all-employees');
    const employeeCheckboxes = document.querySelectorAll('.employee-select');
    
    if (selectAllCheckbox) {
        // Apply the select-all checkbox state to all employee checkboxes
        const isChecked = selectAllCheckbox.checked;
        employeeCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        
        // Update the count of selected employees
        updateEmployeeCount();
    }
}

/**
 * Select all employees
 * @param {boolean} select - Whether to select or deselect all employees
 */
function selectAllEmployees(select = true) {
    const employeeCheckboxes = document.querySelectorAll('.employee-select');
    const selectAllCheckbox = document.getElementById('select-all-employees');
    
    // Set all checkboxes to the specified state
    employeeCheckboxes.forEach(checkbox => {
        checkbox.checked = select;
    });
    
    // Update the select-all checkbox state
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = select;
        selectAllCheckbox.indeterminate = false;
    }
    
    // Update the count of selected employees
    updateEmployeeCount();
}

/**
 * Display employees in the selection list
 * @param {Array} employees - List of employee objects
 */
function displayEmployees(employees) {
    const employeeListContainer = document.getElementById('employee-list');
    if (!employeeListContainer) return;
    
    // Clear existing content
    employeeListContainer.innerHTML = '';
    
    if (employees.length === 0) {
        employeeListContainer.innerHTML = '<div class="no-results">No se encontraron empleados</div>';
        return;
    }
    
    // Create a select all checkbox at the top
    const selectAllDiv = document.createElement('div');
    selectAllDiv.className = 'employee-item select-all-item';
    selectAllDiv.innerHTML = `
        <label class="checkbox-container">
            <input type="checkbox" id="select-all-employees" class="select-all-checkbox">
            <span class="checkmark"></span>
            <span class="employee-name"><strong>Seleccionar Todos</strong></span>
        </label>
    `;
    employeeListContainer.appendChild(selectAllDiv);
    
    // Add event listener to the select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-employees');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', toggleAllEmployees);
    }
    
    // Add each employee to the list
    employees.forEach(employee => {
        const employeeDiv = document.createElement('div');
        employeeDiv.className = 'employee-item';
        employeeDiv.innerHTML = `
            <label class="checkbox-container">
                <input type="checkbox" class="employee-select" data-employee-id="${employee.id}">
                <span class="checkmark"></span>
                <span class="employee-name">${employee.name}</span>
            </label>
        `;
        employeeListContainer.appendChild(employeeDiv);
    });
    
    // Add change event listeners to all employee checkboxes
    const employeeCheckboxes = document.querySelectorAll('.employee-select');
    employeeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateSelectAllCheckboxState();
            updateEmployeeCount();
        });
    });
    
    // Initialize the employee count
    updateEmployeeCount();
}

/**
 * Update the state of the select-all checkbox based on individual selections
 */
function updateSelectAllCheckboxState() {
    const selectAllCheckbox = document.getElementById('select-all-employees');
    const employeeCheckboxes = document.querySelectorAll('.employee-select');
    
    if (selectAllCheckbox && employeeCheckboxes.length > 0) {
        const checkedCount = Array.from(employeeCheckboxes).filter(cb => cb.checked).length;
        
        if (checkedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === employeeCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
}

/**
 * Filter employees by search term
 */
function filterEmployees() {
    const searchInput = document.getElementById('employee-search');
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
 * Update selected employee count
 */
function updateEmployeeCount() {
    const selectedCount = document.querySelectorAll('.employee-select:checked').length;
    const totalCount = document.querySelectorAll('.employee-select').length;
    
    const countDisplay = document.getElementById('selected-employee-count');
    if (countDisplay) {
        countDisplay.textContent = `${selectedCount} de ${totalCount} seleccionados`;
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