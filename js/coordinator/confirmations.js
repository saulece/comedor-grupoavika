/**
 * Coordinator Confirmations Module
 * Manages the registration of daily meal confirmations for employees
 */

// Constants
const USER_ROLES = {
    ADMIN: 'admin',
    COORDINATOR: 'coordinator'
};

// References a servicios y colecciones de Firebase
const db = window.db;
const auth = window.auth;
const employeesCollection = window.employeesCollection;
const confirmationsCollection = window.confirmationsCollection;

// Current user information
let currentUser = null;
let employeeList = []; // Store employee list for the coordinator
let selectedEmployeeIds = []; // Track selected employee IDs for easier operations

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
        // Extract all possible user data from sessionStorage
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        const userId = user.uid || sessionStorage.getItem('userId');
        const userName = user.displayName || sessionStorage.getItem('userName');
        const userEmail = user.email || sessionStorage.getItem('userEmail');
        const departmentId = user.departmentId || sessionStorage.getItem('userDepartmentId') || sessionStorage.getItem('userDepartment');
        const departmentName = user.department || sessionStorage.getItem('userDepartment');
        
        if (!userId || !departmentId) {
            console.error('User session data incomplete');
            window.location.href = '../../index.html';
            return;
        }
        
        currentUser = {
            uid: userId,
            displayName: userName,
            email: userEmail,
            departmentId: departmentId,
            departmentName: departmentName
        };
        
        // Set user name in UI
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = userName || 'Coordinador';
        }
        
        // Log successful user load
        console.log('Usuario cargado correctamente:', currentUser);
    } catch (error) {
        console.error('Error al procesar datos del usuario:', error);
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
            // If Flatpickr is initialized, use its API
            if (datePicker._flatpickr) {
                datePicker._flatpickr.setDate(dateParam);
            } else {
                // Fallback to standard input
                datePicker.value = dateParam;
                // Load existing confirmations for this date
                loadExistingConfirmations(dateParam);
            }
        }
    }
});

/**
 * Format date object to YYYY-MM-DD string
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
function formatDateInput(date) {
    if (!date || !(date instanceof Date)) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Check if a string is a valid date in YYYY-MM-DD format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} Whether the string is a valid date
 */
function isValidDateString(dateString) {
    if (!dateString || typeof dateString !== 'string') return false;
    
    // Check format (YYYY-MM-DD)
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    // Check if it's a valid date
    const parts = dateString.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
    const day = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    return date.getFullYear() === year &&
           date.getMonth() === month &&
           date.getDate() === day;
}

/**
 * Initialize date picker with appropriate constraints
 */
function initializeDatePickers() {
    const datePicker = document.getElementById('confirmation-date');
    
    if (!datePicker) {
        console.warn('Date picker element not found');
        return;
    }
    
    // Set default to today
    const today = new Date();
    const formattedToday = formatDateInput(today);
    
    // Check if Flatpickr is already initialized from HTML
    if (datePicker._flatpickr) {
        console.log('Flatpickr ya está inicializado en HTML, usando instancia existente');
        
        // Add our custom onChange handler to existing instance
        const existingInstance = datePicker._flatpickr;
        const existingOnChange = existingInstance.config.onChange;
        
        existingInstance.config.onChange = function(selectedDates, dateStr, instance) {
            // Call original onChange if it exists
            if (existingOnChange) {
                existingOnChange.call(this, selectedDates, dateStr, instance);
            }
            
            console.log('Fecha seleccionada (handler añadido):', dateStr);
            loadExistingConfirmations(dateStr);
            showDayOfWeek(dateStr);
        };
        
        // Trigger initial load
        showDayOfWeek(formattedToday);
        loadExistingConfirmations(formattedToday);
        return;
    }
    
    console.log('Inicializando nuevo Flatpickr desde JS');
    
    // Define day names with correct accents
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    try {
        // Initialize flatpickr
        flatpickr(datePicker, {
            dateFormat: "Y-m-d",
            locale: {
                firstDayOfWeek: 1,
                weekdays: {
                    shorthand: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
                    longhand: diasSemana
                }
            },
            defaultDate: formattedToday,
            minDate: formattedToday,
            maxDate: new Date().fp_incr(14), // 14 days from today
            disableMobile: true,
            onChange: function(selectedDates, dateStr) {
                console.log('Fecha seleccionada:', dateStr);
                loadExistingConfirmations(dateStr);
                showDayOfWeek(dateStr);
            }
        });
        
        // Show day of week for initial date
        showDayOfWeek(formattedToday);
        
        // Load existing confirmations for initial date
        loadExistingConfirmations(formattedToday);
        
        console.log('Flatpickr inicializado correctamente');
    } catch (error) {
        console.error('Error al inicializar Flatpickr:', error);
        
        // Fallback to native date input if Flatpickr fails
        datePicker.type = 'date';
        datePicker.value = formattedToday;
        datePicker.min = formattedToday;
        datePicker.max = formatDateInput(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000));
        
        datePicker.addEventListener('change', function() {
            const selectedDate = this.value;
            if (selectedDate) {
                loadExistingConfirmations(selectedDate);
                showDayOfWeek(selectedDate);
            }
        });
        
        // Trigger initial load
        loadExistingConfirmations(formattedToday);
        showDayOfWeek(formattedToday);
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
    
    // Day names with correct accents
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = dayNames[dayOfWeek];
    
    console.log(`Día seleccionado: ${dayName} (índice: ${dayOfWeek})`);
    
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
        
        // Clear or populate the selectedEmployeeIds array
        if (!isChecked) {
            selectedEmployeeIds = [];
        } else {
            selectedEmployeeIds = [];
            employeeCheckboxes.forEach(checkbox => {
                const employeeId = checkbox.getAttribute('data-employee-id');
                if (employeeId) {
                    selectedEmployeeIds.push(employeeId);
                }
            });
        }
        
        // Update UI checkboxes
        employeeCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        
        // Update employee count
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
    
    // Clear the selected employees array
    if (!select) {
        selectedEmployeeIds = [];
    } else {
        selectedEmployeeIds = [];
        // Add all visible employee IDs to the selected array
        employeeCheckboxes.forEach(checkbox => {
            const employeeId = checkbox.getAttribute('data-employee-id');
            if (employeeId) {
                selectedEmployeeIds.push(employeeId);
            }
        });
    }
    
    // Set all checkboxes to the specified state
    employeeCheckboxes.forEach(checkbox => {
        checkbox.checked = select;
    });
    
    // Update the select-all checkbox state
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = select;
        selectAllCheckbox.indeterminate = false;
    }
    
    // Update employee count
    updateEmployeeCount();
}

/**
 * Update the state of the select-all checkbox based on individual selections
 */
function updateSelectAllCheckboxState() {
    const selectAllCheckbox = document.getElementById('select-all-employees');
    const employeeCheckboxes = document.querySelectorAll('.employee-select');
    
    if (selectAllCheckbox && employeeCheckboxes.length > 0) {
        const checkedCount = selectedEmployeeIds.length;
        
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
        (employee.name && employee.name.toLowerCase().includes(searchTerm)) || 
        (employee.position && employee.position.toLowerCase().includes(searchTerm))
    );
    
    // Display filtered list
    displayEmployees(filteredEmployees);
}

/**
 * Update selected employee count
 */
function updateEmployeeCount() {
    const selectedCount = selectedEmployeeIds.length;
    const totalCount = document.querySelectorAll('.employee-select').length;
    
    const countDisplay = document.getElementById('selected-employee-count');
    if (countDisplay) {
        countDisplay.textContent = `${selectedCount} de ${totalCount} seleccionados`;
    }
    
    // Update confirmed count display
    const confirmedCountDisplay = document.getElementById('confirmed-count');
    if (confirmedCountDisplay) {
        confirmedCountDisplay.textContent = selectedCount;
    }
}

/**
 * Load employees for the coordinator's department
 */
function loadEmployees() {
    showLoadingState(true);
    
    // Verify we have the coordinator's department
    if (!currentUser || !currentUser.departmentId) {
        console.error('No se pudo determinar el departamento del coordinador');
        showErrorMessage('Error al cargar empleados: No se pudo determinar su departamento');
        showLoadingState(false);
        return;
    }
    
    console.log('Cargando empleados para departamento:', currentUser.departmentId);
    
    // Use Firestore to get employees
    employeesCollection
        .where('departmentId', '==', currentUser.departmentId)
        .where('status', '==', 'active')  // Only get active employees
        .get()
        .then(querySnapshot => {
            console.log(`Se encontraron ${querySnapshot.size} empleados`);
            
            const employees = [];
            querySnapshot.forEach(doc => {
                const employee = doc.data();
                employee.id = doc.id;
                employees.push(employee);
            });
            
            // Sort employees by name
            employees.sort((a, b) => {
                return (a.name || '').localeCompare(b.name || '');
            });
            
            // Store for later use
            employeeList = employees;
            
            // Display employees in UI
            displayEmployees(employees);
            
            // Update total employees count
            const totalEmployeesCount = document.getElementById('total-employees-count');
            if (totalEmployeesCount) {
                totalEmployeesCount.textContent = employees.length;
            }
            
            // Hide loading state
            showLoadingState(false);
        })
        .catch(error => {
            console.error("Error loading employees:", error);
            showErrorMessage("Error al cargar la lista de empleados. Por favor intente de nuevo.");
            showLoadingState(false);
        });
}

/**
 * Display employees in the selection list
 * @param {Array} employees - List of employee objects
 */
function displayEmployees(employees) {
    const employeeTableBody = document.getElementById('employees-table-body');
    if (!employeeTableBody) {
        console.error('No se encontró el elemento employees-table-body');
        return;
    }
    
    // Clear existing content
    employeeTableBody.innerHTML = '';
    
    if (employees.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="4" class="text-center">No hay empleados registrados</td>`;
        employeeTableBody.appendChild(emptyRow);
        return;
    }
    
    // Add each employee to the table
    employees.forEach(employee => {
        const row = document.createElement('tr');
        row.setAttribute('data-employee-id', employee.id);
        
        // Check if this employee is selected
        const isChecked = selectedEmployeeIds.includes(employee.id);
        
        // Create the row content with all cells
        row.innerHTML = `
            <td class="select-column">
                <label class="checkbox-container">
                    <input type="checkbox" class="employee-select" data-employee-id="${employee.id}" ${isChecked ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
            </td>
            <td>${employee.name || 'N/A'}</td>
            <td>${employee.position || 'N/A'}</td>
            <td>${employee.department || 'General'}</td>
        `;
        
        employeeTableBody.appendChild(row);
    });
    
    // Add event listeners to employee checkboxes
    const employeeCheckboxes = employeeTableBody.querySelectorAll('.employee-select');
    employeeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const employeeId = checkbox.getAttribute('data-employee-id');
            
            if (checkbox.checked) {
                // Add to selected list if not already there
                if (!selectedEmployeeIds.includes(employeeId)) {
                    selectedEmployeeIds.push(employeeId);
                }
            } else {
                // Remove from selected list
                const index = selectedEmployeeIds.indexOf(employeeId);
                if (index !== -1) {
                    selectedEmployeeIds.splice(index, 1);
                }
            }
            
            updateSelectAllCheckboxState();
            updateEmployeeCount();
        });
    });
    
    // Update employee count
    updateEmployeeCount();
    updateSelectAllCheckboxState();
}

/**
 * Load existing confirmations for a specific date
 * @param {string} dateString - Date in YYYY-MM-DD format
 */
function loadExistingConfirmations(dateString) {
    if (!dateString || !isValidDateString(dateString)) {
        console.error('Fecha inválida para cargar confirmaciones');
        return;
    }
    
    showLoadingState(true);
    
    // Clear existing selected employees
    selectedEmployeeIds = [];
    
    // Update status indicator
    const statusElement = document.getElementById('confirmation-status');
    if (statusElement) {
        statusElement.textContent = 'Cargando...';
        statusElement.className = '';
    }
    
    // Query existing confirmations for this date and department
    confirmationsCollection
        .where('date', '==', dateString)
        .where('departmentId', '==', currentUser.departmentId)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('No hay confirmaciones para esta fecha');
                
                // Update status
                if (statusElement) {
                    statusElement.textContent = 'No enviado';
                    statusElement.className = 'status-pending';
                }
                
                // Clear comments field
                const commentsField = document.getElementById('confirmation-comments');
                if (commentsField) {
                    commentsField.value = '';
                }
                
                // Uncheck all checkboxes
                selectAllEmployees(false);
                
                showInfoMessage('No hay confirmaciones registradas para esta fecha');
                showLoadingState(false);
                return;
            }
            
            // Get the first confirmation (should be only one per date/department)
            const confirmationDoc = snapshot.docs[0];
            const confirmationData = confirmationDoc.data();
            
            console.log('Confirmación encontrada:', confirmationData);
            
            // Load comments if they exist
            const commentsField = document.getElementById('confirmation-comments');
            if (commentsField && confirmationData.comments) {
                commentsField.value = confirmationData.comments;
            }
            
            // Update status
            if (statusElement) {
                statusElement.textContent = 'Enviado';
                statusElement.className = 'status-completed';
            }
            
            // Get selected employees array
            if (confirmationData.employees && Array.isArray(confirmationData.employees)) {
                selectedEmployeeIds = [...confirmationData.employees];
                
                // Update UI checkboxes based on saved data
                const employeeCheckboxes = document.querySelectorAll('.employee-select');
                employeeCheckboxes.forEach(checkbox => {
                    const employeeId = checkbox.getAttribute('data-employee-id');
                    checkbox.checked = selectedEmployeeIds.includes(employeeId);
                });
                
                // Update UI
                updateSelectAllCheckboxState();
                updateEmployeeCount();
                
                showInfoMessage(`Se cargó la confirmación existente con ${selectedEmployeeIds.length} empleados`);
            }
            
            showLoadingState(false);
        })
        .catch(error => {
            console.error('Error al cargar confirmaciones existentes:', error);
            showErrorMessage('Error al cargar confirmaciones existentes');
            showLoadingState(false);
        });
}

/**
 * Save confirmation data to Firestore
 * @param {Event} event - Form submission event
 */
async function saveConfirmation(event) {
    if (event) event.preventDefault();
    
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
        
        // Check if we already have a confirmation for this date
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
            employees: selectedEmployeeIds,
            confirmedCount: selectedEmployeeIds.length, // Add a count field for easier querying
            comments: comments,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        let confirmationId;
        
        if (querySnapshot.empty) {
            // Create new confirmation
            confirmationData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await confirmationsCollection.add(confirmationData);
            confirmationId = docRef.id;
            showSuccessMessage('Confirmación guardada correctamente.');
        } else {
            // Update existing confirmation
            const docRef = querySnapshot.docs[0].ref;
            confirmationId = docRef.id;
            await docRef.update(confirmationData);
            showSuccessMessage('Confirmación actualizada correctamente.');
        }
        
        // Update UI status
        const statusElement = document.getElementById('confirmation-status');
        if (statusElement) {
            statusElement.textContent = 'Enviado';
            statusElement.className = 'status-completed';
        }
        
        // Show success modal with count
        const successModal = document.getElementById('confirmation-success-modal');
        const modalConfirmedCount = document.getElementById('modal-confirmed-count');
        
        if (successModal && modalConfirmedCount) {
            modalConfirmedCount.textContent = selectedEmployeeIds.length;
            successModal.style.display = 'block';
        }
        
        // Update confirmation history if it exists on the page
        updateConfirmationHistory();
    } catch (error) {
        console.error("Error saving confirmation:", error);
        showErrorMessage("Error al guardar la confirmación. Por favor intente de nuevo.");
    } finally {
        // Hide loading state
        showLoadingState(false);
    }
}

/**
 * Update confirmation history table if it exists on the page
 */
function updateConfirmationHistory() {
    const historyBody = document.getElementById('confirmation-history-body');
    if (!historyBody) return; // Not on this page
    
    // Query recent confirmations
    confirmationsCollection
        .where('coordinatorId', '==', currentUser.uid)
        .orderBy('date', 'desc')
        .limit(5)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                historyBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">No hay confirmaciones registradas</td>
                    </tr>
                `;
                return;
            }
            
            let historyHTML = '';
            snapshot.forEach(doc => {
                const confirmation = doc.data();
                const confirmedCount = confirmation.confirmedCount || (confirmation.employees ? confirmation.employees.length : 0);
                const createdDate = confirmation.createdAt ? new Date(confirmation.createdAt.seconds * 1000) : new Date();
                
                historyHTML += `
                    <tr>
                        <td>${confirmation.date}</td>
                        <td>${confirmedCount}</td>
                        <td class="status-completed">Enviado</td>
                        <td>${createdDate.toLocaleString()}</td>
                    </tr>
                `;
            });
            
            historyBody.innerHTML = historyHTML;
        })
        .catch(error => {
            console.error('Error loading confirmation history:', error);
        });
}

/**
 * Validate confirmation form inputs
 * @returns {boolean} - Whether the form is valid
 */
function validateConfirmationForm() {
    // Get form values
    const date = document.getElementById('confirmation-date').value;
    
    // Check date
    if (!date) {
        showErrorMessage("Por favor seleccione una fecha.");
        return false;
    }
    
    // Check if at least one employee is selected
    if (selectedEmployeeIds.length === 0) {
        showErrorMessage("Por favor seleccione al menos un empleado.");
        return false;
    }
    
    return true;
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