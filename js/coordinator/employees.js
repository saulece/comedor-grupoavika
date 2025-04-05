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
    
    // Clear employees list
    currentEmployees = [];
    
    // Get employees from Firestore
    employeesCollection
        .where('departmentId', '==', currentUser.departmentId)
        .orderBy('name')
        .get()
        .then(querySnapshot => {
            querySnapshot.forEach(doc => {
                const employee = doc.data();
                employee.id = doc.id;
                currentEmployees.push(employee);
            });
            
            // Display employees
            displayEmployees(currentEmployees);
            
            // Hide loading state
            showLoadingState(false);
        })
        .catch(error => {
            console.error("Error loading employees:", error);
            showErrorMessage("Error al cargar la lista de empleados. Por favor intente de nuevo.");
            showLoadingState(false);
        });
}

// Display employees in the table
function displayEmployees(employees) {
    const employeesTable = document.getElementById('employees-table-body');
    if (!employeesTable) return;
    
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
            <td>${employee.name}</td>
            <td>${employee.position || '-'}</td>
            <td>${employee.email || '-'}</td>
            <td>${employee.active ? 'Activo' : 'Inactivo'}</td>
            <td class="employee-actions">
                <button class="btn btn-sm btn-primary edit-employee-btn" data-id="${employee.id}">
                    Editar
                </button>
                <button class="btn btn-sm btn-danger delete-employee-btn" data-id="${employee.id}">
                    Eliminar
                </button>
            </td>
        `;
        
        employeesTable.appendChild(row);
        
        // Add event listeners to action buttons
        const editBtn = row.querySelector('.edit-employee-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                editEmployee(employee);
            });
        }
        
        const deleteBtn = row.querySelector('.delete-employee-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                confirmDeleteEmployee(employee);
            });
        }
    });
    
    // Update employee count
    updateEmployeeCount(employees.length);
}

// Filter employees by search term
function filterEmployees() {
    const searchTerm = document.getElementById('search-employees').value.toLowerCase();
    
    if (!searchTerm) {
        // Show all employees
        displayEmployees(currentEmployees);
        return;
    }
    
    // Filter employees by name or position
    const filteredEmployees = currentEmployees.filter(employee => 
        employee.name.toLowerCase().includes(searchTerm) || 
        (employee.position && employee.position.toLowerCase().includes(searchTerm))
    );
    
    // Display filtered employees
    displayEmployees(filteredEmployees);
}

// Update employee count
function updateEmployeeCount(count) {
    const employeeCount = document.getElementById('employee-count');
    if (employeeCount) {
        employeeCount.textContent = count;
    }
}

// Show add employee modal
function showAddEmployeeModal() {
    // Get modal element
    const modal = document.getElementById('employee-modal');
    if (!modal) return;
    
    // Set modal title
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Agregar Empleado';
    }
    
    // Reset form
    const form = document.getElementById('employee-form');
    if (form) {
        form.reset();
        form.removeAttribute('data-employee-id');
    }
    
    // Set active checkbox default to true
    const activeCheckbox = document.getElementById('employee-active');
    if (activeCheckbox) {
        activeCheckbox.checked = true;
    }
    
    // Show modal
    modal.classList.add('active');
}

// Edit employee
function editEmployee(employee) {
    // Get modal element
    const modal = document.getElementById('employee-modal');
    if (!modal) return;
    
    // Set modal title
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Editar Empleado';
    }
    
    // Fill form with employee data
    const form = document.getElementById('employee-form');
    if (form) {
        // Set employee ID in form
        form.setAttribute('data-employee-id', employee.id);
        
        // Fill form fields
        document.getElementById('employee-name').value = employee.name || '';
        document.getElementById('employee-position').value = employee.position || '';
        document.getElementById('employee-email').value = employee.email || '';
        document.getElementById('employee-active').checked = employee.active !== false;
    }
    
    // Show modal
    modal.classList.add('active');
}

// Close modal
function closeModal() {
    const modal = document.getElementById('employee-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    const deleteModal = document.getElementById('delete-confirmation-modal');
    if (deleteModal) {
        deleteModal.classList.remove('active');
    }
}

// Save employee
async function saveEmployee(event) {
    event.preventDefault();
    
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
    
    try {
        if (employeeId) {
            // Update existing employee
            await employeesCollection.doc(employeeId).update(employee);
            showSuccessMessage('Empleado actualizado correctamente.');
        } else {
            // Add created timestamp for new employees
            employee.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // Create new employee
            await employeesCollection.add(employee);
            showSuccessMessage('Empleado agregado correctamente.');
        }
        
        // Close modal
        closeModal();
        
        // Reload employees
        loadEmployees();
    } catch (error) {
        console.error("Error saving employee:", error);
        showErrorMessage("Error al guardar el empleado. Por favor intente de nuevo.");
        showLoadingState(false);
    }
}

// Confirm delete employee
function confirmDeleteEmployee(employee) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('delete-confirmation-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'delete-confirmation-modal';
        modal.classList.add('modal');
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Confirmar Eliminación</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="delete-confirmation-message"></p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary close-modal-btn">Cancelar</button>
                    <button class="btn btn-danger" id="confirm-delete-btn">Eliminar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners to close buttons
        const closeButtons = modal.querySelectorAll('.modal-close, .close-modal-btn');
        closeButtons.forEach(button => {
            button.addEventListener('click', closeModal);
        });
    }
    
    // Set confirmation message
    const confirmationMessage = document.getElementById('delete-confirmation-message');
    if (confirmationMessage) {
        confirmationMessage.textContent = `¿Está seguro de eliminar a ${employee.name}?`;
    }
    
    // Set delete button action
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        // Remove previous event listeners
        const newConfirmBtn = confirmDeleteBtn.cloneNode(true);
        confirmDeleteBtn.parentNode.replaceChild(newConfirmBtn, confirmDeleteBtn);
        
        // Add new event listener
        newConfirmBtn.addEventListener('click', () => {
            deleteEmployee(employee.id);
        });
    }
    
    // Show modal
    modal.classList.add('active');
}

// Delete employee
async function deleteEmployee(employeeId) {
    // Show loading state
    showLoadingState(true);
    
    try {
        // Delete employee from Firestore
        await employeesCollection.doc(employeeId).delete();
        
        // Close modal
        closeModal();
        
        // Show success message
        showSuccessMessage('Empleado eliminado correctamente.');
        
        // Reload employees
        loadEmployees();
    } catch (error) {
        console.error("Error deleting employee:", error);
        showErrorMessage("Error al eliminar el empleado. Por favor intente de nuevo.");
        showLoadingState(false);
    }
}

// Validate employee form
function validateEmployeeForm() {
    const name = document.getElementById('employee-name');
    
    if (!name || !name.value.trim()) {
        showErrorMessage("El nombre del empleado es requerido.");
        return false;
    }
    
    return true;
}

// Show loading state
function showLoadingState(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
    
    // Disable buttons while loading
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = isLoading;
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