// Confirmaciones de comedor - Módulo para coordinadores
// Permite gestionar las confirmaciones diarias de comedor

// Variables globales
let selectedEmployeeIds = [];
let employeeList = [];
let currentUser = null;
let currentDate = new Date();

/**
 * Initialize the module when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log("Inicializando módulo de confirmaciones...");
    
    // Asegurarnos de que Firebase esté inicializado
    if (window.initializeFirebase) {
        window.initializeFirebase();
    }
    
    // Check if user has correct role
    if (!window.checkAuth) {
        console.error('La función de autenticación no está disponible');
        alert('Error: La función de autenticación no está disponible. Por favor recargue la página.');
        return;
    }
    
    if (!checkAuth(window.USER_ROLES ? window.USER_ROLES.COORDINATOR : 'coordinator')) {
        console.error('Acceso no autorizado a confirmaciones de coordinador');
        return;
    }
    
    // Get current user from session storage
    try {
        // Extract all possible user data from sessionStorage
        const userJson = sessionStorage.getItem('user');
        let user = {};
        
        if (userJson) {
            try {
                user = JSON.parse(userJson);
            } catch(e) {
                console.error("Error al parsear datos de usuario:", e);
            }
        }
        
        const userId = user.uid || sessionStorage.getItem('userId');
        const userName = user.displayName || sessionStorage.getItem('userName');
        const userEmail = user.email || sessionStorage.getItem('userEmail');
        const departmentId = user.departmentId || sessionStorage.getItem('userDepartmentId') || sessionStorage.getItem('userDepartment');
        const departmentName = user.department || sessionStorage.getItem('userDepartment');
        
        console.log("Datos del usuario obtenidos:", { userId, userName, departmentId });
        
        if (!userId || !departmentId) {
            console.error('Datos de sesión de usuario incompletos');
            
            // Usar error handler si está disponible
            if (window.errorHandler) {
                window.errorHandler.showUIError('Error: No se pudo identificar su departamento. Por favor inicie sesión nuevamente.');
            } else {
                alert('Error: No se pudo identificar su departamento. Por favor inicie sesión nuevamente.');
            }
            
            // Redirigir al login después de 2 segundos
            setTimeout(() => {
                window.location.href = '../../index.html';
            }, 2000);
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
        
        console.log('Usuario cargado correctamente:', currentUser);
        
        // Initialize the application
        setTimeout(() => {
            initializeApp();
        }, 100); // Pequeño retraso para asegurar que Firebase esté listo
    } catch (error) {
        console.error('Error al procesar datos del usuario:', error);
        
        // Usar error handler si está disponible
        if (window.errorHandler) {
            window.errorHandler.showUIError('Error al cargar los datos del usuario. Por favor inicie sesión nuevamente.');
        } else {
            alert('Error al cargar los datos del usuario. Por favor inicie sesión nuevamente.');
        }
        
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 2000);
        return;
    }
});

/**
 * Initialize the application after user data is loaded
 */
function initializeApp() {
    console.log('Inicializando aplicación...');
    
    // Initialize date picker
    initializeDatePicker();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load employees for the department
    loadEmployees();
}

/**
 * Initialize the date picker
 */
function initializeDatePicker() {
    console.log("Inicializando selector de fecha...");
    
    const datePicker = document.getElementById('confirmation-date');
    if (!datePicker) {
        console.error('No se encontró el elemento del selector de fecha');
        return;
    }
    
    const today = new Date();
    const formattedToday = window.dateUtils && window.dateUtils.formatDate ? 
        window.dateUtils.formatDate(today) : 
        formatDateInput(today);
    
    // Verificar si Flatpickr está disponible
    if (typeof flatpickr !== 'function') {
        console.error('Flatpickr no está disponible');
        // Usar input nativo como fallback
        datePicker.type = 'date';
        datePicker.value = formattedToday;
        datePicker.min = formattedToday;
        
        // Agregar evento change
        datePicker.addEventListener('change', function() {
            const dateStr = this.value;
            console.log("Fecha cambiada:", dateStr);
            showDayOfWeek(dateStr);
            loadExistingConfirmations(dateStr);
        });
        return;
    }
    
    // Inicializar Flatpickr
    try {
        // Definir nombres de días con acentos correctos usando Unicode
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado'];
        
        // Crear nueva instancia de Flatpickr
        const fp = flatpickr(datePicker, {
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
            onChange: function(selectedDates, dateStr) {
                console.log("Fecha seleccionada:", dateStr);
                showDayOfWeek(dateStr);
                loadExistingConfirmations(dateStr);
            }
        });
        
        console.log("Flatpickr inicializado correctamente:", fp);
        
        // Trigger inicial con la fecha actual
        if (formattedToday) {
            showDayOfWeek(formattedToday);
            loadExistingConfirmations(formattedToday);
        }
    } catch (error) {
        console.error("Error al inicializar Flatpickr:", error);
        // Usar input nativo como fallback
        datePicker.type = 'date';
        datePicker.value = formattedToday;
        datePicker.min = formattedToday;
        
        // Agregar evento change
        datePicker.addEventListener('change', function() {
            const dateStr = this.value;
            console.log("Fecha cambiada:", dateStr);
            showDayOfWeek(dateStr);
            loadExistingConfirmations(dateStr);
        });
    }
}

/**
 * Setup event listeners for interactive elements
 */
function setupEventListeners() {
    console.log("Configurando manejadores de eventos...");
    
    // Save confirmation button
    const saveButton = document.getElementById('submit-confirmation-btn');
    if (saveButton) {
        saveButton.addEventListener('click', saveConfirmation);
    } else {
        console.warn('Botón de guardar confirmación no encontrado');
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
    
    // Logout button
    const logoutButton = document.getElementById('logout-btn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            if (window.logout) {
                logout();
            } else {
                sessionStorage.clear();
                window.location.href = '../../index.html';
            }
        });
    }
}

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
 * Display day of week for selected date
 * @param {string} dateString - Date in YYYY-MM-DD format
 */
function showDayOfWeek(dateString) {
    if (!dateString || !isValidDateString(dateString)) return;
    
    // Usar dateUtils si está disponible
    let dayName;
    if (window.dateUtils && window.dateUtils.getDayOfWeek) {
        const date = new Date(dateString);
        dayName = window.dateUtils.getDayOfWeek(date);
    } else {
        const date = new Date(dateString);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        // Day names with correct accents
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado'];
        dayName = dayNames[dayOfWeek];
    }
    
    console.log(`Día seleccionado: ${dayName}`);
    
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
    const totalCount = employeeList.length;
    
    // Update selection count display
    const countDisplay = document.getElementById('selected-employee-count');
    if (countDisplay) {
        countDisplay.textContent = `${selectedCount} de ${totalCount} seleccionados`;
    }
    
    // Update confirmed count display
    const confirmedCountDisplay = document.getElementById('confirmed-count');
    if (confirmedCountDisplay) {
        confirmedCountDisplay.textContent = selectedCount;
    }
    
    // Update the counter in the UI
    const counterElement = document.querySelector('.Total.Empleados + div');
    if (counterElement) {
        counterElement.textContent = totalCount.toString();
    }
    
    // Update the confirmed counter in the UI
    const confirmedElement = document.querySelector('.Confirmados + div');
    if (confirmedElement) {
        confirmedElement.textContent = selectedCount.toString();
    }
}

/**
 * Load employees for the coordinator's department
 */
function loadEmployees() {
    console.log("Cargando empleados...");
    
    // Mostrar estado de carga
    if (window.errorHandler) {
        window.errorHandler.toggleLoadingIndicator(true);
    } else {
        showLoadingState(true);
    }
    
    // Verificar que tenemos el departamento del coordinador
    if (!currentUser || !currentUser.departmentId) {
        const errorMsg = 'No se pudo determinar el departamento del coordinador';
        console.error(errorMsg);
        
        if (window.errorHandler) {
            window.errorHandler.showUIError(errorMsg);
        } else {
            showErrorMessage(errorMsg);
        }
        
        if (window.errorHandler) {
            window.errorHandler.toggleLoadingIndicator(false);
        } else {
            showLoadingState(false);
        }
        return;
    }
    
    console.log('Cargando empleados para departamento:', currentUser.departmentId);
    
    // Intentar usar servicios de Firestore si están disponibles
    if (window.firestoreServices && window.firestoreServices.employee) {
        window.firestoreServices.employee.getEmployeesByDepartment(currentUser.departmentId)
            .then(querySnapshot => {
                processEmployeeQueryResults(querySnapshot);
            })
            .catch(error => {
                handleEmployeeLoadError(error);
            });
        return;
    }
    
    // Fallback al método directo si los servicios no están disponibles
    const db = window.db || firebase.firestore();
    db.collection('employees')
        .where('departmentId', '==', currentUser.departmentId)
        .get()
        .then(processEmployeeQueryResults)
        .catch(handleEmployeeLoadError);
}

/**
 * Process query results for employees
 * @param {FirebaseFirestore.QuerySnapshot} querySnapshot - Query results
 */
function processEmployeeQueryResults(querySnapshot) {
    console.log(`Se encontraron ${querySnapshot.size} empleados`);
    
    employeeList = [];
    querySnapshot.forEach(doc => {
        const employee = doc.data();
        employee.id = doc.id;
        
        // Solo incluir empleados activos o sin estado definido
        if (employee.status !== 'inactive' && employee.active !== false) {
            employeeList.push(employee);
        }
    });
    
    // Ordenar empleados por nombre
    employeeList.sort((a, b) => {
        return (a.name || '').localeCompare(b.name || '');
    });
    
    // Mostrar empleados en la UI
    displayEmployees(employeeList);
    
    // Actualizar contador de empleados
    const totalEmployeesCount = document.getElementById('total-employees-count');
    if (totalEmployeesCount) {
        totalEmployeesCount.textContent = employeeList.length;
    }
    
    console.log("Empleados cargados correctamente:", employeeList.length);
    
    // Ocultar estado de carga
    if (window.errorHandler) {
        window.errorHandler.toggleLoadingIndicator(false);
    } else {
        showLoadingState(false);
    }
    
    // Verificar fecha inicial
    const datePicker = document.getElementById('confirmation-date');
    if (datePicker && datePicker.value) {
        loadExistingConfirmations(datePicker.value);
    }
}

/**
 * Handle error when loading employees
 * @param {Error} error - Error object
 */
function handleEmployeeLoadError(error) {
    console.error("Error al cargar empleados:", error);
    
    // Usar error handler si está disponible
    if (window.errorHandler) {
        const errorMsg = window.errorHandler.handleFirestoreError(
            error, 
            "Error al cargar la lista de empleados. Por favor intente de nuevo."
        );
        window.errorHandler.showUIError(errorMsg);
        window.errorHandler.toggleLoadingIndicator(false);
    } else {
        showErrorMessage("Error al cargar la lista de empleados. Por favor intente de nuevo.");
        showLoadingState(false);
    }
}

/**
 * Display employees in the selection list
 * @param {Array} employees - List of employee objects
 */
function displayEmployees(employees) {
    console.log("Mostrando empleados en la interfaz...");
    
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
        updateEmployeeCount();
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
    
    console.log("Cargando confirmaciones para", dateString);
    
    // Mostrar estado de carga
    if (window.errorHandler) {
        window.errorHandler.toggleLoadingIndicator(true);
    } else {
        showLoadingState(true);
    }
    
    // Clear existing selected employees
    selectedEmployeeIds = [];
    
    // Update status indicator
    const statusElement = document.getElementById('confirmation-status');
    if (statusElement) {
        statusElement.textContent = 'Cargando...';
        statusElement.className = '';
    }
    
    // Update estado en la interfaz principal
    const estadoElement = document.querySelector('.Estado + div');
    if (estadoElement) {
        estadoElement.textContent = 'Cargando...';
    }
    
    // Intentar usar servicios de Firestore si están disponibles
    if (window.firestoreServices && window.firestoreServices.confirmation) {
        window.firestoreServices.confirmation.getConfirmationByDateAndDepartment(dateString, currentUser.departmentId)
            .then(processConfirmationsQueryResults)
            .catch(handleConfirmationsLoadError);
        return;
    }
    
    // Fallback al método directo si los servicios no están disponibles
    const db = window.db || firebase.firestore();
    db.collection('confirmations')
        .where('date', '==', dateString)
        .where('departmentId', '==', currentUser.departmentId)
        .get()
        .then(processConfirmationsQueryResults)
        .catch(handleConfirmationsLoadError);
}

/**
 * Process query results for confirmations
 * @param {FirebaseFirestore.QuerySnapshot} snapshot - Query results
 */
function processConfirmationsQueryResults(snapshot) {
    // Update status indicator
    const statusElement = document.getElementById('confirmation-status');
    const estadoElement = document.querySelector('.Estado + div');
    
    // Clear comments field
    const commentsField = document.getElementById('confirmation-comments');
    if (commentsField) {
        commentsField.value = '';
    }
    
    if (snapshot.empty) {
        console.log('No hay confirmaciones para esta fecha');
        
        // Update status
        if (statusElement) {
            statusElement.textContent = 'No enviado';
            statusElement.className = 'status-pending';
        }
        
        // Update estado en la interfaz principal
        if (estadoElement) {
            estadoElement.textContent = 'No enviado';
        }
        
        // Uncheck all checkboxes
        selectAllEmployees(false);
        
        if (window.errorHandler) {
            window.errorHandler.toggleLoadingIndicator(false);
        } else {
            showLoadingState(false);
            showInfoMessage('No hay confirmaciones registradas para esta fecha');
        }
        return;
    }
    
    // Get the first confirmation (should be only one per date/department)
    const confirmationDoc = snapshot.docs[0];
    const confirmationData = confirmationDoc.data();
    
    console.log('Confirmación encontrada:', confirmationData);
    
    // Load comments if they exist
    if (commentsField && confirmationData.comments) {
        commentsField.value = confirmationData.comments;
    }
    
    // Update status
    if (statusElement) {
        statusElement.textContent = 'Enviado';
        statusElement.className = 'status-completed';
    }
    
    // Update estado en la interfaz principal
    if (estadoElement) {
        estadoElement.textContent = 'Enviado';
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
        
        if (window.errorHandler) {
            window.errorHandler.toggleLoadingIndicator(false);
        } else {
            showLoadingState(false);
            showInfoMessage(`Se cargó la confirmación existente con ${selectedEmployeeIds.length} empleados`);
        }
    } else {
        if (window.errorHandler) {
            window.errorHandler.toggleLoadingIndicator(false);
        } else {
            showLoadingState(false);
        }
    }
}

/**
 * Handle error when loading confirmations
 * @param {Error} error - Error object
 */
function handleConfirmationsLoadError(error) {
    console.error('Error al cargar confirmaciones existentes:', error);
    
    // Usar error handler si está disponible
    if (window.errorHandler) {
        const errorMsg = window.errorHandler.handleFirestoreError(
            error, 
            "Error al cargar confirmaciones existentes."
        );
        window.errorHandler.showUIError(errorMsg);
        window.errorHandler.toggleLoadingIndicator(false);
    } else {
        showErrorMessage('Error al cargar confirmaciones existentes');
        showLoadingState(false);
    }
}

/**
 * Save confirmation data to Firestore
 * @param {Event} event - Form submission event
 */
async function saveConfirmation(event) {
    if (event) event.preventDefault();
    
    console.log("Guardando confirmación...");
    
    // Validate form
    if (!validateConfirmationForm()) {
        return;
    }
    
    // Show loading state
    if (window.errorHandler) {
        window.errorHandler.toggleLoadingIndicator(true);
    } else {
        showLoadingState(true);
    }
    
    try {
        // Get form values
        const dateInput = document.getElementById('confirmation-date');
        const commentsInput = document.getElementById('confirmation-comments');
        
        if (!dateInput) throw new Error('Date input not found');
        
        const date = dateInput.value;
        const comments = commentsInput ? commentsInput.value.trim() : '';
        
        console.log(`Guardando confirmación para ${date} con ${selectedEmployeeIds.length} empleados`);
        
        // Preparar datos de la confirmación
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
        
        // Intentar usar servicios de Firestore si están disponibles
        if (window.firestoreServices && window.firestoreServices.confirmation) {
            const snapshot = await window.firestoreServices.confirmation
                .getConfirmationByDateAndDepartment(date, currentUser.departmentId);
            
            if (snapshot.empty) {
                // Crear nueva confirmación
                confirmationData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await window.firestoreServices.confirmation.saveConfirmation(null, confirmationData);
            } else {
                // Actualizar confirmación existente
                confirmationId = snapshot.docs[0].id;
                await window.firestoreServices.confirmation.saveConfirmation(confirmationId, confirmationData);
            }
        } else {
            // Fallback al método directo
            // Check if we already have a confirmation for this date
            const querySnapshot = await firebase.firestore().collection('confirmations')
                .where('date', '==', date)
                .where('departmentId', '==', currentUser.departmentId)
                .get();
            
            if (querySnapshot.empty) {
                // Create new confirmation
                confirmationData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                const docRef = await firebase.firestore().collection('confirmations').add(confirmationData);
                confirmationId = docRef.id;
            } else {
                // Update existing confirmation
                const docRef = querySnapshot.docs[0].ref;
                confirmationId = docRef.id;
                await docRef.update(confirmationData);
            }
        }
        
        // Update UI status
        const statusElement = document.getElementById('confirmation-status');
        if (statusElement) {
            statusElement.textContent = 'Enviado';
            statusElement.className = 'status-completed';
        }
        
        // Update estado en la interfaz principal
        const estadoElement = document.querySelector('.Estado + div');
        if (estadoElement) {
            estadoElement.textContent = 'Enviado';
        }
        
        // Mostrar mensaje de éxito
        if (window.errorHandler) {
            window.errorHandler.showUISuccess("Confirmación guardada correctamente.");
        } else {
            showSuccessMessage("Confirmación guardada correctamente.");
        }
        
        console.log("Confirmación guardada exitosamente");
    } catch (error) {
        console.error("Error saving confirmation:", error);
        
        // Usar error handler si está disponible
        if (window.errorHandler) {
            const errorMsg = window.errorHandler.handleFirestoreError(
                error, 
                "Error al guardar la confirmación. Por favor intente de nuevo."
            );
            window.errorHandler.showUIError(errorMsg);
        } else {
            showErrorMessage("Error al guardar la confirmación. Por favor intente de nuevo.");
        }
    } finally {
        // Hide loading state
        if (window.errorHandler) {
            window.errorHandler.toggleLoadingIndicator(false);
        } else {
            showLoadingState(false);
        }
    }
}

/**
 * Validate confirmation form inputs
 * @returns {boolean} - Whether the form is valid
 */
function validateConfirmationForm() {
    // Get form values
    const datePicker = document.getElementById('confirmation-date');
    if (!datePicker) {
        if (window.errorHandler) {
            window.errorHandler.showUIError("Error: No se encontró el selector de fecha.");
        } else {
            showErrorMessage("Error: No se encontró el selector de fecha.");
        }
        return false;
    }
    
    const date = datePicker.value;
    
    // Check date
    if (!date) {
        if (window.errorHandler) {
            window.errorHandler.showUIError("Por favor seleccione una fecha.");
        } else {
            showErrorMessage("Por favor seleccione una fecha.");
        }
        return false;
    }
    
    // Check if at least one employee is selected
    if (selectedEmployeeIds.length === 0) {
        if (window.errorHandler) {
            window.errorHandler.showUIError("Por favor seleccione al menos un empleado.");
        } else {
            showErrorMessage("Por favor seleccione al menos un empleado.");
        }
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
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }
    
    // Disable interactive elements
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = isLoading;
    });
    
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        if (input.type !== 'checkbox') {
            input.disabled = isLoading;
        }
    });
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
        
        // Hide after duration
        if (duration > 0) {
            setTimeout(() => {
                errorAlert.style.display = 'none';
            }, duration);
        }
    } else {
        // Fallback a alert
        alert(`Error: ${message}`);
    }
    console.error(message);
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
        
        // Hide after duration
        if (duration > 0) {
            setTimeout(() => {
                successAlert.style.display = 'none';
            }, duration);
        }
    } else {
        // Fallback a alert
        alert(`Éxito: ${message}`);
    }
    console.log(message);
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
        
        // Hide after duration
        if (duration > 0) {
            setTimeout(() => {
                infoAlert.style.display = 'none';
            }, duration);
        }
    }
    console.log("INFO:", message);
}