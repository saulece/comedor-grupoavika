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
let currentUser = null;
let currentEmployees = []; // Store employees list for the coordinator

// Obtener la información del usuario desde sessionStorage
try {
    const userId = sessionStorage.getItem('userId');
    const userName = sessionStorage.getItem('userName');
    const userEmail = sessionStorage.getItem('userEmail');
    
    // Intentar obtener el departamento de múltiples fuentes posibles
    const departmentId = sessionStorage.getItem('userDepartmentId') || 
                         sessionStorage.getItem('userDepartment') || 
                         sessionStorage.getItem('departmentId');
    
    console.log('Datos de sesión:', {
        userId,
        userName,
        userEmail,
        departmentId,
        allKeys: Object.keys(sessionStorage)
    });
    
    if (userId) {
        currentUser = {
            uid: userId,
            displayName: userName,
            email: userEmail,
            departmentId: departmentId
        };
        console.log('Usuario cargado correctamente:', currentUser);
    } else {
        console.error('No se encontró información del usuario en la sesión');
    }
} catch (error) {
    console.error('Error al obtener la información del usuario:', error);
}

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
    // Mostrar estado de carga
    if (window.errorHandler && window.errorHandler.toggleLoadingIndicator) {
        window.errorHandler.toggleLoadingIndicator(true);
    } else {
        // Fallback si el módulo de error no está disponible
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
    }
    
    console.log('Cargando empleados...');
    console.log('Usuario actual:', currentUser);
    
    // Clear employees list
    currentEmployees = [];
    
    // Verificar si tenemos la información del usuario actual
    if (!currentUser || !currentUser.departmentId) {
        console.error('No se encontró información del usuario o departamento');
        
        // Intentar obtener la información del usuario nuevamente desde sessionStorage
        try {
            const userId = sessionStorage.getItem('userId');
            const userName = sessionStorage.getItem('userName');
            const userEmail = sessionStorage.getItem('userEmail');
            const departmentId = sessionStorage.getItem('userDepartment');
            
            if (userId) {
                currentUser = {
                    uid: userId,
                    displayName: userName,
                    email: userEmail,
                    departmentId: departmentId
                };
                console.log('Usuario recuperado de sessionStorage:', currentUser);
            } else {
                // Mostrar error y salir si no hay información de departamento
                if (window.errorHandler && window.errorHandler.showUIError) {
                    window.errorHandler.showUIError("Error: No se pudo identificar su departamento. Por favor inicie sesión nuevamente.");
                } else {
                    alert("Error: No se pudo identificar su departamento. Por favor inicie sesión nuevamente.");
                }
                
                if (window.errorHandler && window.errorHandler.toggleLoadingIndicator) {
                    window.errorHandler.toggleLoadingIndicator(false);
                } else {
                    const loadingIndicator = document.getElementById('loading-indicator');
                    if (loadingIndicator) loadingIndicator.style.display = 'none';
                }
                return;
            }
        } catch (error) {
            console.error('Error al recuperar información del usuario:', error);
            if (window.errorHandler && window.errorHandler.showUIError) {
                window.errorHandler.showUIError("Error al recuperar información del usuario. Por favor inicie sesión nuevamente.");
            } else {
                alert("Error al recuperar información del usuario. Por favor inicie sesión nuevamente.");
            }
            
            if (window.errorHandler && window.errorHandler.toggleLoadingIndicator) {
                window.errorHandler.toggleLoadingIndicator(false);
            } else {
                const loadingIndicator = document.getElementById('loading-indicator');
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            }
            return;
        }
    }
    
    console.log('Buscando empleados para departamento:', currentUser.departmentId);
    
    // Verificar si el servicio de Firestore está disponible
    if (!window.firestoreServices || !window.firestoreServices.employee || !window.firestoreServices.employee.getEmployeesByDepartment) {
        console.error('El servicio de Firestore no está disponible');
        
        // Fallback: usar directamente Firestore si el servicio no está disponible
        const db = window.db || firebase.firestore();
        db.collection('employees')
            .where('departmentId', '==', currentUser.departmentId)
            .get()
            .then(processEmployees)
            .catch(handleEmployeeLoadError);
        return;
    }
    
    // Usar el servicio de Firestore para obtener empleados
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
    try {
        // Usar el módulo excel-handler si está disponible
        if (window.excelHandler && window.excelHandler.generateEmployeeTemplate) {
            const templateBlob = window.excelHandler.generateEmployeeTemplate();
            const url = URL.createObjectURL(templateBlob);
            
            // Crear un enlace temporal para la descarga
            const a = document.createElement('a');
            a.href = url;
            a.download = 'plantilla_empleados.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            window.logger?.info('Plantilla de empleados descargada');
            return;
        }
        
        // Fallback si el módulo no está disponible
        if (typeof XLSX === 'undefined') {
            throw new Error('La biblioteca XLSX no está cargada correctamente. Por favor, recarga la página.');
        }
        
        // Crear una hoja de cálculo
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['Nombre Completo', 'Puesto', 'Estado'],
            ['Juan Pérez López', 'Operador', 'active'],
            ['María González Ruiz', 'Supervisor', 'active']
        ]);
        
        // Crear un libro de trabajo y añadir la hoja
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados');
        
        // Generar el archivo
        XLSX.writeFile(workbook, 'plantilla_empleados.xlsx');
        window.logger?.info('Plantilla de empleados descargada (método fallback)');
    } catch (error) {
        window.logger?.error('Error al generar la plantilla', error);
        
        // Usar el módulo de manejo de errores si está disponible
        if (window.errorHandler && window.errorHandler.showUIError) {
            window.errorHandler.showUIError('Error al generar la plantilla: ' + error.message);
        } else {
            showErrorMessage('Error al generar la plantilla: ' + error.message);
        }
    }
}

// Validar formato del archivo Excel - Función mantenida para compatibilidad
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
        // Usar el módulo de manejo de errores para mostrar el indicador de carga
        if (window.errorHandler && window.errorHandler.toggleLoadingIndicator) {
            window.errorHandler.toggleLoadingIndicator(true);
        } else {
            showLoadingState(true);
        }
        
        // Intentar obtener el departamento de múltiples fuentes si no está en currentUser
        if (!currentUser || !currentUser.departmentId) {
            console.log('Intentando recuperar información del departamento...');
            
            // Intentar obtener el ID del departamento de varias fuentes posibles
            const departmentId = sessionStorage.getItem('userDepartmentId') || 
                                 sessionStorage.getItem('userDepartment') || 
                                 sessionStorage.getItem('departmentId');
            
            if (departmentId) {
                console.log('Departamento recuperado de sessionStorage:', departmentId);
                if (!currentUser) {
                    currentUser = {
                        departmentId: departmentId
                    };
                } else {
                    currentUser.departmentId = departmentId;
                }
            } else {
                console.error('No se encontró información del departamento en ninguna fuente');
                throw new Error('No se pudo identificar su departamento. Por favor inicie sesión nuevamente.');
            }
        }
        
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (!file) {
            throw new Error('Por favor selecciona un archivo Excel.');
        }
        
        // Verificar que la biblioteca XLSX esté disponible usando el módulo excel-handler
        if (window.excelHandler && !window.excelHandler.isXLSXAvailable()) {
            throw new Error('La biblioteca XLSX no está disponible. Por favor, recarga la página.');
        }
        
        // Check file extension
        const fileExt = file.name.split('.').pop().toLowerCase();
        if (fileExt !== 'xlsx' && fileExt !== 'xls') {
            throw new Error('El archivo debe ser un documento Excel (.xlsx, .xls).');
        }
        
        window.logger?.info('Procesando archivo Excel', { 
            nombre: file.name, 
            tamaño: file.size 
        });
        
        // Leer el archivo Excel usando el módulo excel-handler si está disponible
        let excelData;
        if (window.excelHandler && window.excelHandler.readExcelFile) {
            excelData = await window.excelHandler.readExcelFile(file);
        } else {
            excelData = await readExcelFile(file); // Fallback a la función local
        }
        
        window.logger?.debug('Datos leídos del Excel', { filas: excelData.length });
        
        // Validar formato del Excel y procesar los datos
        const { employees, errors } = processExcelData(excelData);
        
        // Mostrar errores si los hay
        if (errors.length > 0) {
            window.logger?.error('Errores de importación de empleados', { errores: errors });
            throw new Error(`Se encontraron ${errors.length} errores en el archivo. Por favor corrige los errores y vuelve a intentarlo.`);
        }
        
        // Guardar empleados en Firestore
        await saveEmployeesToFirestore(employees);
        
        // Cerrar modal y mostrar mensaje de éxito
        closeModal();
        
        // Mostrar mensaje de éxito usando el módulo error-handler si está disponible
        if (window.errorHandler && window.errorHandler.showUISuccess) {
            window.errorHandler.showUISuccess(`Se importaron ${employees.length} empleados correctamente.`);
        } else {
            showSuccessMessage(`Se importaron ${employees.length} empleados correctamente.`);
        }
        
        // Recargar lista de empleados
        loadEmployees();
        
    } catch (error) {
        window.logger?.error('Error al importar empleados', error);
        
        // Usar el módulo de manejo de errores para mostrar el error
        let errorMessage;
        if (window.errorHandler && window.errorHandler.handleExcelError) {
            errorMessage = window.errorHandler.handleExcelError(error);
        } else {
            errorMessage = error.message || 'Error desconocido al importar empleados';
        }
        
        if (window.errorHandler && window.errorHandler.showUIError) {
            window.errorHandler.showUIError(errorMessage);
        } else {
            showErrorMessage(errorMessage);
        }
    } finally {
        // Ocultar indicador de carga
        if (window.errorHandler && window.errorHandler.toggleLoadingIndicator) {
            window.errorHandler.toggleLoadingIndicator(false);
        } else {
            showLoadingState(false);
        }
    }
}

/**
 * Procesa los datos del Excel y crea objetos de empleado
 * @param {Array} excelData - Datos del Excel como array de arrays
 * @returns {Object} - Objeto con arrays de empleados y errores
 */
function processExcelData(excelData) {
    // Validar que haya datos
    if (!excelData || !Array.isArray(excelData) || excelData.length < 2) {
        throw new Error('El archivo Excel está vacío o no tiene el formato correcto.');
    }
    
    // Obtener índices de columnas
    const headers = excelData[0];
    const nameIndex = headers.findIndex(header => header && header.toString().includes('Nombre'));
    const positionIndex = headers.findIndex(header => header && header.toString().includes('Puesto'));
    const statusIndex = headers.findIndex(header => header && header.toString().includes('Estado'));
    
    // Verificar columnas requeridas
    if (nameIndex === -1 || statusIndex === -1) {
        throw new Error('El archivo Excel debe tener las columnas "Nombre Completo" y "Estado".');
    }
    
    window.logger?.debug('Índices de columnas encontrados', { 
        nombre: nameIndex, 
        puesto: positionIndex, 
        estado: statusIndex 
    });
    
    const employees = [];
    const errors = [];
    
    // Procesar filas de datos (omitir la fila de encabezados)
    for (let i = 1; i < excelData.length; i++) {
        const row = excelData[i];
        
        // Omitir filas vacías
        if (!row.length || !row[nameIndex]) {
            continue;
        }
        
        // Validar campos requeridos
        if (!row[nameIndex]) {
            errors.push(`Fila ${i+1}: Falta el nombre del empleado.`);
            continue;
        }
        
        if (!row[statusIndex] || (row[statusIndex] !== 'active' && row[statusIndex] !== 'inactive')) {
            errors.push(`Fila ${i+1}: El estado debe ser 'active' o 'inactive'.`);
            continue;
        }
        
        // Generar correo electrónico único
        const email = generateUniqueEmail(row[nameIndex]);
        
        // Crear objeto de empleado
        const employee = {
            name: row[nameIndex],
            email: email,
            position: positionIndex !== -1 ? (row[positionIndex] || '') : '',
            status: row[statusIndex],
            departmentId: currentUser.departmentId,
            department: currentUser.department,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        employees.push(employee);
    }
    
    return { employees, errors };
}

/**
 * Genera un correo electrónico único basado en el nombre
 * @param {string} fullName - Nombre completo del empleado
 * @returns {string} - Correo electrónico único
 */
function generateUniqueEmail(fullName) {
    const timestamp = new Date().getTime().toString().slice(-6); // Usar solo los últimos 6 dígitos
    
    // Normalizar el nombre (quitar acentos y caracteres especiales)
    const normalizedName = fullName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const nameParts = normalizedName.toLowerCase().split(' ').filter(part => part.length > 0);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    
    // Usar solo la primera letra del apellido si es muy largo
    const lastNamePart = lastName.length > 10 ? lastName.substring(0, 1) : lastName;
    
    return `${firstName}.${lastNamePart}${timestamp}@generado.com`;
}

// Save employees to Firestore
async function saveEmployeesToFirestore(employees) {
    try {
        console.log('Guardando empleados en Firestore con departamento:', currentUser.departmentId);
        
        // Verificar que tengamos un ID de departamento válido
        if (!currentUser || !currentUser.departmentId) {
            throw new Error('No se pudo identificar el departamento para guardar los empleados');
        }
        
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
            // Asegurarse de que cada empleado tenga la información del departamento
            employee.departmentId = currentUser.departmentId;
            employee.department = currentUser.department || sessionStorage.getItem('userDepartmentName');
            employee.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // Check if employee with this email already exists
            if (existingEmails[employee.email]) {
                // Update existing employee
                const docRef = window.db.collection('employees').doc(existingEmails[employee.email]);
                batch.update(docRef, employee);
            } else {
                // Add new employee
                employee.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                const docRef = window.db.collection('employees').doc();
                batch.set(docRef, employee);
            }
        }
        
        // Commit the batch
        return batch.commit();
    } catch (error) {
        console.error('Error al guardar empleados en Firestore:', error);
        throw error; // Re-lanzar el error para manejarlo en la función que llamó a esta
    }
}

/**
 * Procesa los resultados de la consulta de empleados cuando se usa el fallback directo a Firestore
 * @param {QuerySnapshot} querySnapshot - Resultados de la consulta de Firestore
 */
function processEmployees(querySnapshot) {
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
    
    // Ocultar estado de carga
    if (window.errorHandler && window.errorHandler.toggleLoadingIndicator) {
        window.errorHandler.toggleLoadingIndicator(false);
    } else {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
    
    // Actualizar contador de empleados
    updateEmployeeCount(currentEmployees.length);
}

/**
 * Maneja errores al cargar empleados cuando se usa el fallback directo a Firestore
 * @param {Error} error - Error ocurrido durante la carga
 */
function handleEmployeeLoadError(error) {
    console.error('Error al cargar empleados:', error);
    
    // Mostrar mensaje de error
    if (window.errorHandler && window.errorHandler.showUIError) {
        window.errorHandler.showUIError(`Error al cargar empleados: ${error.message}`);
    } else {
        alert(`Error al cargar empleados: ${error.message}`);
    }
    
    // Ocultar estado de carga
    if (window.errorHandler && window.errorHandler.toggleLoadingIndicator) {
        window.errorHandler.toggleLoadingIndicator(false);
    } else {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
    
    // Mostrar lista vacía
    displayEmployees([]);
    updateEmployeeCount(0);
}

// Read Excel file and return data as array - Función mantenida para compatibilidad
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
                    
                    // Usar logger si está disponible
                    if (window.logger) {
                        window.logger.info('Datos Excel leídos correctamente', { filas: jsonData.length });
                    } else {
                        console.log('Datos Excel leídos correctamente:', jsonData.length, 'filas');
                    }
                    
                    resolve(jsonData);
                } catch (xlsxError) {
                    // Usar logger si está disponible
                    if (window.logger) {
                        window.logger.error('Error al procesar el archivo Excel', xlsxError);
                    } else {
                        console.error('Error al procesar el archivo Excel:', xlsxError);
                    }
                    
                    reject(new Error('Error al procesar el archivo Excel: ' + xlsxError.message));
                }
            } catch (error) {
                // Usar logger si está disponible
                if (window.logger) {
                    window.logger.error('Error general al leer el archivo', error);
                } else {
                    console.error('Error general al leer el archivo:', error);
                }
                
                reject(error);
            }
        };
        
        reader.onerror = function(error) {
            // Usar logger si está disponible
            if (window.logger) {
                window.logger.error('Error en FileReader', error);
            } else {
                console.error('Error en FileReader:', error);
            }
            
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
