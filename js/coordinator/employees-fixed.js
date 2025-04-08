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
    const searchInput = document.getElementById('search-employees');
    if (searchInput) {
        searchInput.addEventListener('input', filterEmployees);
    }
    
    // Close modal buttons
    const closeModalButtons = document.querySelectorAll('.modal-close, .close-modal-btn');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });
}

// Load employees for the coordinator's department
function loadEmployees() {
    // Show loading state
    showLoadingState(true);
    
    console.log('Cargando empleados...');
    console.log('Usuario actual:', currentUser);
    
    // Clear employees list
    currentEmployees = [];
    
    // Verificar si tenemos la informaciu00f3n del usuario actual
    if (!currentUser || !currentUser.departmentId) {
        console.error('No se encontru00f3 informaciu00f3n del usuario o departamento');
        showErrorMessage("Error: No se pudo identificar su departamento. Por favor inicie sesiu00f3n nuevamente.");
        showLoadingState(false);
        return;
    }
    
    console.log('Buscando empleados para departamento:', currentUser.departmentId);
    
    // Get employees from Firestore - Sin ordenamiento para evitar problemas de u00edndice
    window.db.collection('employees')
        .where('departmentId', '==', currentUser.departmentId)
        .get()
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
            showLoadingState(false);
        })
        .catch(error => {
            console.error("Error loading employees:", error);
            let errorMessage = "Error al cargar la lista de empleados. ";
            
            if (error.code === 'permission-denied') {
                errorMessage += "No tiene permisos para acceder a esta informaciu00f3n.";
            } else if (error.message && error.message.includes('index')) {
                errorMessage += "Se requiere un u00edndice en la base de datos. Por favor contacte al administrador.";
            } else {
                errorMessage += "Por favor intente de nuevo.";
            }
            
            showErrorMessage(errorMessage);
            showLoadingState(false);
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
    
    // Show loading state
    showLoadingState(true);
    
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
        if (employeeId) {
            // Update existing employee
            console.log('Actualizando empleado existente con ID:', employeeId);
            await window.db.collection('employees').doc(employeeId).update(employee);
            showSuccessMessage('Empleado actualizado correctamente.');
        } else {
            // Add created timestamp for new employees
            employee.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // Create new employee
            console.log('Creando nuevo empleado');
            await window.db.collection('employees').add(employee);
            showSuccessMessage('Empleado agregado correctamente.');
        }
        
        // Close modal
        closeModal();
        
        // Reload employees
        loadEmployees();
    } catch (error) {
        console.error("Error saving employee:", error);
        let errorMessage = "Error al guardar el empleado. ";
        
        if (error.code === 'permission-denied') {
            errorMessage += "No tiene permisos para realizar esta acciu00f3n.";
        } else {
            errorMessage += "Por favor intente de nuevo.";
        }
        
        showErrorMessage(errorMessage);
        showLoadingState(false);
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
