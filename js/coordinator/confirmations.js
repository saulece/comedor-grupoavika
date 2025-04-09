/**
 * Coordinator Confirmations Module
 * Manages the registration of daily meal confirmations for employees
 */

// Referencias a servicios y colecciones de Firebase
// Usar window para acceder a los objetos globales
const db = window.db;
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
    console.log("Inicializando m\u00f3dulo de confirmaciones...");
    
    // Check if user has correct role - we don't redefine USER_ROLES here, use the global one
    if (!checkAuth('coordinator')) {
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
            alert('Error: No se pudo identificar su departamento. Por favor inicie sesión nuevamente.');
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
    } catch (error) {
        console.error('Error al procesar datos del usuario:', error);
        alert('Error al cargar los datos del usuario. Por favor inicie sesión nuevamente.');
        setTimeout(() => {
            window.location.href = '../../index.html';
        }, 2000);
        return;
    }
    
    // Initialize components
    setupEventListeners();
    handleDatePicker();
    loadEmployees();
});

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
            sessionStorage.clear();
            window.location.href = '../../index.html';
        });
    }
}

/**
 * Handle the date picker initialization
 */
function handleDatePicker() {
    console.log("Inicializando selector de fecha...");
    
    const datePicker = document.getElementById('confirmation-date');
    if (!datePicker) {
        console.warn('Elemento de selector de fecha no encontrado');
        return;
    }
    
    // Set default to today
    const today = new Date();
    const formattedToday = formatDateInput(today);
    
    // Verificar si Flatpickr ya está inicializado
    if (typeof flatpickr === 'function' && !datePicker._flatpickr) {
        try {
            // Define day names with correct accents
            const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado'];
            
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
            
            console.log('Flatpickr inicializado correctamente');
        } catch (error) {
            console.error('Error al inicializar Flatpickr:', error);
            
            // Fallback to native date input
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
        }
    } else if (datePicker._flatpickr) {
        console.log('Flatpickr ya inicializado, añadiendo manejador...');
        const existingInstance = datePicker._flatpickr;
        existingInstance.config.onChange.push((selectedDates, dateStr) => {
            loadExistingConfirmations(dateStr);
            showDayOfWeek(dateStr);
        });
    } else {
        console.warn('Flatpickr no está disponible');
        // Usar input nativo
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
    }
    
    // Trigger initial load with today's date
    loadExistingConfirmations(formattedToday);
    showDayOfWeek(formattedToday);
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
    
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Day names with correct accents
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado'];
    const dayName = dayNames[dayOfWeek];
    
    console.log(`D\u00eda seleccionado: ${dayName} (\u00edndice: ${dayOfWeek})`);
    
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
    showLoadingState(true);
    
    // Verify we have the coordinator's department
    if (!currentUser || !currentUser.departmentId) {
        console.error('No se pudo determinar el departamento del coordinador');
        showErrorMessage('Error al cargar empleados: No se pudo determinar su departamento');
        showLoadingState(false);
        return;
    }
    
    console.log('Cargando empleados para departamento:', currentUser.departmentId);
    
    try {
        // Use Firestore to get employees
        console.log('Intentando cargar empleados usando Firestore...');
        employeesCollection
            .where('departmentId', '==', currentUser.departmentId)
            .get()
            .then(querySnapshot => {
                console.log(`Se encontraron ${querySnapshot.size} empleados`);
                
                const employees = [];
                querySnapshot.forEach(doc => {
                    const employee = doc.data();
                    employee.id = doc.id;
                    
                    // Solo incluir empleados activos o sin estado definido
                    if (employee.status !== 'inactive') {
                        employees.push(employee);
                    }
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
                
                console.log("Empleados cargados correctamente:", employees.length);
                showLoadingState(false);
                
                // Trigger initial date check
                const datePicker = document.getElementById('confirmation-date');
                if (datePicker && datePicker.value) {
                    loadExistingConfirmations(datePicker.value);
                }
            })
            .catch(error => {
                console.error("Error loading employees:", error);
                showErrorMessage("Error al cargar la lista de empleados. Por favor intente de nuevo.");
                showLoadingState(false);
            });
    } catch (error) {
        console.error("Error al cargar empleados:", error);
        showErrorMessage("Error al cargar empleados. Por favor intente de nuevo.");
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
        console.error('No se encontr\u00f3 el elemento employees-table-body');
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
        console.error('Fecha inv\u00e1lida para cargar confirmaciones');
        return;
    }
    
    console.log("Cargando confirmaciones para", dateString);
    showLoadingState(true);
    
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
                
                // Update estado en la interfaz principal
                if (estadoElement) {
                    estadoElement.textContent = 'No enviado';
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
            
            console.log('Confirmaci\u00f3n encontrada:', confirmationData);
            
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
                
                showInfoMessage(`Se carg\u00f3 la confirmaci\u00f3n existente con ${selectedEmployeeIds.length} empleados`);
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
    
    console.log("Guardando confirmaci\u00f3n...");
    
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
        
        console.log(`Guardando confirmaci\u00f3n para ${date} con ${selectedEmployeeIds.length} empleados`);
        
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
            showSuccessMessage('Confirmaci\u00f3n guardada correctamente.');
        } else {
            // Update existing confirmation
            const docRef = querySnapshot.docs[0].ref;
            confirmationId = docRef.id;
            await docRef.update(confirmationData);
            showSuccessMessage('Confirmaci\u00f3n actualizada correctamente.');
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
        
        console.log("Confirmaci\u00f3n guardada exitosamente");
    } catch (error) {
        console.error("Error saving confirmation:", error);
        showErrorMessage("Error al guardar la confirmaci\u00f3n. Por favor intente de nuevo.");
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
    const datePicker = document.getElementById('confirmation-date');
    if (!datePicker) {
        showErrorMessage("Error: No se encontr\u00f3 el selector de fecha.");
        return false;
    }
    
    const date = datePicker.value;
    
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
    const mainContent = document.querySelector('.main-content');
    
    // Espera un momento para asegurarnos que estamos en el mismo hilo de ejecuci\u00f3n
    setTimeout(() => {
        // Mostrar mensaje de carga en la tabla
        const employeeTableBody = document.getElementById('employees-table-body');
        if (employeeTableBody && isLoading) {
            // Solo si est\u00e1 cargando y no hay contenido
            if (employeeTableBody.childElementCount === 0) {
                employeeTableBody.innerHTML = `
                    <tr>
                        <td colspan="4" class="text-center">Cargando empleados...</td>
                    </tr>
                `;
            }
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
    }, 0);
}

/**
 * Show error message
 * @param {string} message - Error message to display
 * @param {number} duration - Duration in milliseconds to show the message
 */
function showErrorMessage(message, duration = 5000) {
    // Mostrar alerta con alert nativo (m\u00e1s sencillo y garantizado)
    alert(`Error: ${message}`);
    console.error(message);
}

/**
 * Show success message
 * @param {string} message - Success message to display
 * @param {number} duration - Duration in milliseconds to show the message
 */
function showSuccessMessage(message, duration = 3000) {
    // Mostrar alerta con alert nativo (m\u00e1s sencillo y garantizado)
    alert(`\u00c9xito: ${message}`);
    console.log(message);
}

/**
 * Show informational message
 * @param {string} message - Info message to display
 * @param {number} duration - Duration in milliseconds to show the message
 */
function showInfoMessage(message, duration = 5000) {
    console.log("INFO:", message);
    // No mostramos mensaje visual para no interrumpir al usuario
}