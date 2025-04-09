// Coordinator Employees Management for Comedor Grupo Avika

// Ensure coordinator only access
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth(USER_ROLES.COORDINATOR)) {
        return;
    }
    
    // Initialize UI
    loadEmployees();
    setupEventListeners();
});

// Current user information
let currentUser = JSON.parse(sessionStorage.getItem('user'));
let currentEmployees = []; // Store employees list for the coordinator

// Setup event listeners
function setupEventListeners() {
    // Add employee button
    const addEmployeeBtn = document.getElementById('add-employee-btn');
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', showAddEmployeeModal);
    }
    
    // Add employee form
    const employeeForm = document.getElementById('employee-form');
    if (employeeForm) {
        employeeForm.addEventListener('submit', saveEmployee);
    }
    
    // Search employees
    const searchInput = document.getElementById('employee-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterEmployees);
    }
    
    // Import employees button
    const importBtn = document.getElementById('import-employees-btn');
    if (importBtn) {
        importBtn.addEventListener('click', showImportModal);
    }
    
    // Download template button
    const downloadTemplateBtn = document.getElementById('download-template-btn');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', downloadExcelTemplate);
    }
    
    // Import form submit
    const importForm = document.getElementById('import-form');
    if (importForm) {
        importForm.addEventListener('submit', importEmployeesFromExcel);
    }
    
    // Close modal buttons
    const closeModalButtons = document.querySelectorAll('.close-modal, .cancel-modal');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout(); // Función definida en auth.js
        });
    }
}

// Load employees for the coordinator's department
function loadEmployees() {
    // Usar el nuevo mu00f3dulo para mostrar el estado de carga
    window.errorHandler.toggleLoadingIndicator(true);
    
    console.log('Cargando empleados...');
    console.log('Usuario actual:', currentUser);
    
    // Clear employees list
    currentEmployees = [];
    
    // Verificar si tenemos la informaciu00f3n del usuario actual
    if (!currentUser || !currentUser.departmentId) {
        console.error('No se encontru00f3 informaciu00f3n del usuario o departamento');
        window.errorHandler.showUIError("Error: No se pudo identificar su departamento. Por favor inicie sesiu00f3n nuevamente.");
        window.errorHandler.toggleLoadingIndicator(false);
        return;
    }
    
    console.log('Buscando empleados para departamento:', currentUser.departmentId);
    
    // Usar el nuevo servicio de Firestore para obtener empleados
    window.firestoreServices.employee.getEmployeesByDepartment(currentUser.departmentId)
        .then(querySnapshot => {
            console.log(`Se encontraron ${querySnapshot.size} empleados`);
            
            querySnapshot.forEach(doc => {
                const employee = doc.data();
                employee.id = doc.id;
                currentEmployees.push(employee);
                console.log('Empleado cargado:', employee.name);
            });
            
            // Ordenar localmente por nombre
            currentEmployees.sort((a, b) => {
                return (a.name || '').localeCompare(b.name || '');
            });
            
            // Display employees
            displayEmployees(currentEmployees);
            
            // Hide loading state
            window.errorHandler.toggleLoadingIndicator(false);
        })
        .catch(error => {
            console.error("Error loading employees:", error);
            
            // Usar el nuevo mu00f3dulo de manejo de errores para mostrar un mensaje amigable
            const errorMessage = window.errorHandler.handleFirestoreError(
                error, 
                "Error al cargar la lista de empleados. Por favor intente de nuevo."
            );
            
            window.errorHandler.showUIError(errorMessage);
            window.errorHandler.toggleLoadingIndicator(false);
        });
}

// Display employees in the table
function displayEmployees(employees) {
    const employeesTable = document.getElementById('employees-table-body');
    if (!employeesTable) {
        console.error('No se encontru00f3 la tabla de empleados');
        return;
    }
    
    // Clear table
    employeesTable.innerHTML = '';
    
    // Check if there are any employees
    if (employees.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="5" class="text-center">No hay empleados asignados a su departamento.</td>
        `;
        employeesTable.appendChild(emptyRow);
        return;
    }
    
    // Display each employee
    employees.forEach(employee => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${employee.name || 'Sin nombre'}</td>
            <td>${employee.position || 'Sin posiciu00f3n'}</td>
            <td>${employee.email || 'Sin correo'}</td>
            <td>${employee.active ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-sm btn-primary edit-employee" data-id="${employee.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-employee" data-id="${employee.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        employeesTable.appendChild(row);
        
        // Add event listeners for edit and delete buttons
        const editBtn = row.querySelector('.edit-employee');
        if (editBtn) {
            editBtn.addEventListener('click', () => editEmployee(employee));
        }
        
        const deleteBtn = row.querySelector('.delete-employee');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => confirmDeleteEmployee(employee));
        }
    });
    
    // Update employee count
    updateEmployeeCount(employees.length);
}

// Filter employees by search term
function filterEmployees() {
    const searchTerm = document.getElementById('search-employees').value.toLowerCase();
    
    if (!searchTerm) {
        displayEmployees(currentEmployees);
        return;
    }
    
    const filteredEmployees = currentEmployees.filter(employee => {
        return (
            (employee.name && employee.name.toLowerCase().includes(searchTerm)) ||
            (employee.position && employee.position.toLowerCase().includes(searchTerm)) ||
            (employee.email && employee.email.toLowerCase().includes(searchTerm))
        );
    });
    
    displayEmployees(filteredEmployees);
}

// Update employee count
function updateEmployeeCount(count) {
    const countElement = document.getElementById('employee-count');
    if (countElement) {
        countElement.textContent = count;
    }
}

// Show add employee modal
function showAddEmployeeModal() {
    console.log('Mostrando modal para agregar empleado');
    
    const modal = document.getElementById('employee-modal');
    if (!modal) {
        console.error('Modal no encontrado');
        return;
    }
    
    // Reset form
    const form = document.getElementById('employee-form');
    if (form) {
        form.reset();
        form.removeAttribute('data-employee-id');
        
        // Set active checkbox to true by default for new employees
        const activeCheckbox = document.getElementById('employee-active');
        if (activeCheckbox) {
            activeCheckbox.checked = true;
        }
    }
    
    // Update modal title
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Agregar Empleado';
    }
    
    // Show modal
    modal.classList.add('active');
}

// Edit employee
function editEmployee(employee) {
    console.log('Editando empleado:', employee);
    
    const modal = document.getElementById('employee-modal');
    if (!modal) return;
    
    // Update form with employee data
    const form = document.getElementById('employee-form');
    if (form) {
        form.setAttribute('data-employee-id', employee.id);
        
        // Set form values
        const nameInput = document.getElementById('employee-name');
        const positionInput = document.getElementById('employee-position');
        const emailInput = document.getElementById('employee-email');
        const activeCheckbox = document.getElementById('employee-active');
        
        if (nameInput) nameInput.value = employee.name || '';
        if (positionInput) positionInput.value = employee.position || '';
        if (emailInput) emailInput.value = employee.email || '';
        if (activeCheckbox) activeCheckbox.checked = employee.active === true;
    }
    
    // Update modal title
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Editar Empleado';
    }
    
    // Show modal
    modal.classList.add('active');
}

// Close modal
function closeModal() {
    // Hide all modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('active');
    });
    
    // Reset forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.reset();
    });
}

// Save employee
async function saveEmployee(event) {
    event.preventDefault();
    console.log('Guardando empleado...');
    
    // Validate form
    if (!validateEmployeeForm()) {
        return;
    }
    
    // Mostrar estado de carga usando el nuevo mu00f3dulo
    window.errorHandler.toggleLoadingIndicator(true);
    
    // Get form values
    const name = document.getElementById('employee-name').value;
    const position = document.getElementById('employee-position').value;
    const email = document.getElementById('employee-email').value;
    const active = document.getElementById('employee-active').checked;
    
    console.log(`Datos del formulario: Nombre=${name}, Posiciu00f3n=${position}, Email=${email}, Activo=${active}`);
    
    // Get employee ID if editing
    const form = document.getElementById('employee-form');
    const employeeId = form.getAttribute('data-employee-id');
    
    // Create employee object
    const employee = {
        name: name,
        position: position,
        email: email,
        active: active,
        departmentId: currentUser.departmentId,
        department: currentUser.department,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    console.log('Objeto de empleado a guardar:', employee);
    
    try {
        // Usar el nuevo servicio de Firestore para guardar el empleado
        if (employeeId) {
            // Update existing employee
            console.log('Actualizando empleado existente con ID:', employeeId);
            await window.firestoreServices.employee.saveEmployee(employeeId, employee);
            window.errorHandler.showUISuccess('Empleado actualizado correctamente.');
        } else {
            // Add created timestamp for new employees
            employee.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // Create new employee
            console.log('Creando nuevo empleado');
            await window.firestoreServices.employee.saveEmployee(null, employee);
            window.errorHandler.showUISuccess('Empleado agregado correctamente.');
        }
        
        // Close modal
        closeModal();
        
        // Reload employees
        loadEmployees();
    } catch (error) {
        console.error("Error saving employee:", error);
        
        // Usar el nuevo mu00f3dulo de manejo de errores para mostrar un mensaje amigable
        const errorMessage = window.errorHandler.handleFirestoreError(
            error, 
            "Error al guardar el empleado. Por favor intente de nuevo."
        );
        
        window.errorHandler.showUIError(errorMessage);
        window.errorHandler.toggleLoadingIndicator(false);
    }
}

// Confirm delete employee
function confirmDeleteEmployee(employee) {
    console.log('Confirmando eliminaciu00f3n de empleado:', employee);
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('delete-confirmation-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'delete-confirmation-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Confirmar Eliminaciu00f3n</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Estu00e1 seguro de que desea eliminar a <strong id="delete-employee-name"></strong>?</p>
                    <p>Esta acciu00f3n no se puede deshacer.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary close-modal-btn">Cancelar</button>
                    <button id="confirm-delete-btn" class="btn btn-danger">Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add event listeners for the new modal
        const closeButtons = modal.querySelectorAll('.modal-close, .close-modal-btn');
        closeButtons.forEach(button => {
            button.addEventListener('click', closeModal);
        });
    }
    
    // Update employee name in modal
    const employeeNameElement = document.getElementById('delete-employee-name');
    if (employeeNameElement) {
        employeeNameElement.textContent = employee.name;
    }
    
    // Set delete button action
    const deleteButton = document.getElementById('confirm-delete-btn');
    if (deleteButton) {
        // Remove existing event listeners
        const newDeleteButton = deleteButton.cloneNode(true);
        deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);
        
        // Add new event listener
        newDeleteButton.addEventListener('click', () => {
            deleteEmployee(employee.id);
        });
    }
    
    // Show modal
    modal.classList.add('active');
}

// Delete employee
async function deleteEmployee(employeeId) {
    console.log('Eliminando empleado con ID:', employeeId);
    
    // Show loading state
    showLoadingState(true);
    
    try {
        // Delete employee from Firestore
        await window.db.collection('employees').doc(employeeId).delete();
        
        // Close modal
        closeModal();
        
        // Show success message
        showSuccessMessage('Empleado eliminado correctamente.');
        
        // Reload employees
        loadEmployees();
    } catch (error) {
        console.error("Error deleting employee:", error);
        let errorMessage = "Error al eliminar el empleado. ";
        
        if (error.code === 'permission-denied') {
            errorMessage += "No tiene permisos para realizar esta acciu00f3n.";
        } else {
            errorMessage += "Por favor intente de nuevo.";
        }
        
        showErrorMessage(errorMessage);
        showLoadingState(false);
    }
}

// Validate employee form
function validateEmployeeForm() {
    const name = document.getElementById('employee-name').value;
    const email = document.getElementById('employee-email').value;
    
    if (!name.trim()) {
        showErrorMessage('Por favor ingrese el nombre del empleado.');
        return false;
    }
    
    return true;
}

// Show loading state
function showLoadingState(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }
    
    // Disable buttons while loading
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        if (!button.classList.contains('modal-close')) {
            button.disabled = isLoading;
        }
    });
}

// Show error message
function showErrorMessage(message) {
    const errorAlert = document.getElementById('error-alert');
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    }
}

// Show success message
function showSuccessMessage(message) {
    const successAlert = document.getElementById('success-alert');
    if (successAlert) {
        successAlert.textContent = message;
        successAlert.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            successAlert.style.display = 'none';
        }, 5000);
    }
}

// Show import employees modal
function showImportModal() {
    const modal = document.getElementById('import-employees-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Download Excel template for employee import
function downloadExcelTemplate() {
    // Define the template structure con solo tres columnas
    const templateData = [
        ['Nombre Completo*', 'Puesto', 'Estado*'],
        ['Juan Pérez López', 'Operador', 'active'],
        ['María González Ruiz', 'Supervisor', 'active']
    ];
    
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados');
    
    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, 'plantilla_importacion_empleados.xlsx');
    
    showSuccessMessage('Plantilla descargada correctamente.');
}

// Validar formato del archivo Excel
function validateExcelFormat(data) {
    // Verificar que haya datos
    if (!data || !Array.isArray(data) || data.length < 2) {
        throw new Error('El archivo Excel está vacío o no tiene el formato correcto.');
    }
    
    // Verificar que tenga encabezados
    const headers = data[0];
    if (!Array.isArray(headers) || headers.length < 2) {
        throw new Error('El archivo Excel no tiene encabezados válidos.');
    }
    
    // Verificar columnas requeridas
    const nameIndex = headers.findIndex(header => header && header.toString().includes('Nombre'));
    const statusIndex = headers.findIndex(header => header && header.toString().includes('Estado'));
    
    if (nameIndex === -1 || statusIndex === -1) {
        throw new Error('El archivo Excel debe tener las columnas "Nombre Completo" y "Estado".');
    }
    
    return { nameIndex, statusIndex, positionIndex: headers.findIndex(header => header && header.toString().includes('Puesto')) };
}

// Import employees from Excel file
async function importEmployeesFromExcel(event) {
    event.preventDefault();
    
    try {
        // Verificar que XLSX esté definido
        if (typeof XLSX === 'undefined') {
            showErrorMessage('La biblioteca XLSX no está cargada correctamente. Por favor, recarga la página.');
            return;
        }
        
        // Verificar que tengamos un usuario actual con departamento
        if (!currentUser || !currentUser.departmentId) {
            console.error('No se encontró información del usuario o departamento');
            showErrorMessage('Error: No se pudo identificar su departamento. Por favor inicie sesión nuevamente.');
            return;
        }
        
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (!file) {
            showErrorMessage('Por favor selecciona un archivo Excel.');
            return;
        }
        
        // Check file extension
        const fileExt = file.name.split('.').pop().toLowerCase();
        if (fileExt !== 'xlsx' && fileExt !== 'xls') {
            showErrorMessage('El archivo debe ser un documento Excel (.xlsx, .xls).');
            return;
        }
        
        console.log('Procesando archivo:', file.name, 'tamaño:', file.size, 'bytes');
        
        // Show loading state
        showLoadingState(true);
    } catch (error) {
        console.error('Error en la validación inicial:', error);
        showErrorMessage('Error: ' + error.message);
        showLoadingState(false);
        return;
    }
    
    try {
        // Read the Excel file
        const excelData = await readExcelFile(file);
        console.log('Datos leídos del Excel:', excelData);
        
        // Validar formato del Excel
        const { nameIndex, positionIndex, statusIndex } = validateExcelFormat(excelData);
        
        // Get header row
        const headers = excelData[0];
        console.log('Encabezados encontrados:', headers);
        console.log('Índices de columnas - Nombre:', nameIndex, 'Puesto:', positionIndex, 'Estado:', statusIndex);
    
        // Process data rows
        const employees = [];
        const errors = [];
        
        for (let i = 1; i < excelData.length; i++) {
            const row = excelData[i];
            
            // Skip empty rows
            if (!row.length || !row[nameIndex]) {
                continue;
            }
            
            // Validate required fields
            if (!row[nameIndex]) {
                errors.push(`Fila ${i+1}: Falta el nombre del empleado.`);
                continue;
            }
            
            if (!row[statusIndex] || (row[statusIndex] !== 'active' && row[statusIndex] !== 'inactive')) {
                errors.push(`Fila ${i+1}: El estado debe ser 'active' o 'inactive'.`);
                continue;
            }
            
            // Generar un correo electrónico único basado en el nombre y un timestamp
            const timestamp = new Date().getTime();
            const nameParts = row[nameIndex].toLowerCase().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
            const email = `${firstName}.${lastName}${timestamp}@generado.com`;
            
            // Create employee object
            const employee = {
                name: row[nameIndex],
                email: email, // Correo generado automáticamente
                position: row[positionIndex] || '',
                status: row[statusIndex],
                departmentId: currentUser.departmentId
            };
            
            employees.push(employee);
        }
        
        // Show errors if any
        if (errors.length > 0) {
            showErrorMessage(`Se encontraron ${errors.length} errores en el archivo. Por favor corrige los errores y vuelve a intentarlo.`);
            console.error('Errores de importación:', errors);
            showLoadingState(false);
            return;
        }
        
        // Save employees to Firestore
        await saveEmployeesToFirestore(employees);
        
        // Close modal and show success message
        closeModal();
        showSuccessMessage(`Se importaron ${employees.length} empleados correctamente.`);
        
        // Reload employees list
        loadEmployees();
        
    } catch (error) {
        console.error('Error importing employees:', error);
        let errorMsg = 'Error al importar empleados. ';
        
        // Mensajes de error más específicos según el tipo de error
        if (error.message.includes('XLSX')) {
            errorMsg += 'Problema con la biblioteca de Excel. Intenta recargar la página.';
        } else if (error.message.includes('columnas')) {
            errorMsg += 'El formato del archivo no es correcto. Asegúrate de usar la plantilla proporcionada.';
        } else if (error.message.includes('vacío')) {
            errorMsg += 'El archivo parece estar vacío o dañado.';
        } else {
            errorMsg += error.message;
        }
        
        showErrorMessage(errorMsg);
        showLoadingState(false);
    }
}

// Read Excel file and return data as array
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // Verificar que XLSX esté definido
                if (typeof XLSX === 'undefined') {
                    throw new Error('La biblioteca XLSX no está cargada correctamente. Por favor, recarga la página.');
                }
                
                const data = e.target.result;
                // Usar try-catch específico para la lectura del Excel
                try {
                    const workbook = XLSX.read(data, { type: 'array' }); // Cambiado de 'binary' a 'array' para mayor compatibilidad
                    
                    // Verificar que el workbook tenga hojas
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        throw new Error('El archivo Excel no contiene hojas de cálculo.');
                    }
                    
                    // Get first sheet
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Verificar que la hoja tenga datos
                    if (!worksheet) {
                        throw new Error('La hoja de cálculo está vacía.');
                    }
                    
                    // Convert to array of arrays con opciones más robustas
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        defval: '',  // Valor por defecto para celdas vacías
                        blankrows: false // Ignorar filas vacías
                    });
                    
                    console.log('Datos Excel leídos correctamente:', jsonData.length, 'filas');
                    resolve(jsonData);
                } catch (xlsxError) {
                    console.error('Error al procesar el archivo Excel:', xlsxError);
                    reject(new Error('Error al procesar el archivo Excel: ' + xlsxError.message));
                }
            } catch (error) {
                console.error('Error general al leer el archivo:', error);
                reject(error);
            }
        };
        
        reader.onerror = function(error) {
            console.error('Error en FileReader:', error);
            reject(error);
        };
        
        // Cambiar el método de lectura para mayor compatibilidad
        reader.readAsArrayBuffer(file);
    });
}

// Save employees to Firestore
async function saveEmployeesToFirestore(employees) {
    // Get existing employees to check for duplicates
    const existingEmployees = await window.firestoreServices.employee.getEmployeesByDepartment(currentUser.departmentId);
    const existingEmails = {};
    
    existingEmployees.forEach(doc => {
        const employee = doc.data();
        existingEmails[employee.email] = doc.id;
    });
    
    // Create batch for Firestore operations
    const batch = window.db.batch();
    
    // Process each employee
    for (const employee of employees) {
        // Check if employee with this email already exists
        if (existingEmails[employee.email]) {
            // Update existing employee
            const docRef = window.db.collection('employees').doc(existingEmails[employee.email]);
            batch.update(docRef, employee);
        } else {
            // Add new employee
            const docRef = window.db.collection('employees').doc();
            batch.set(docRef, employee);
        }
    }
    
    // Commit the batch
    return batch.commit();
}
