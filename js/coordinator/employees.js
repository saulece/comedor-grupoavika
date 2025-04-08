// Coordinator Employees Management for Comedor Grupo Avika

// Ensure coordinator only access
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth(USER_ROLES.COORDINATOR)) {
        return;
    }
    
    // Set user name
    let userName = 'Coordinador';
    try {
        const userJson = sessionStorage.getItem('user');
        if (userJson) {
            const userObj = JSON.parse(userJson);
            userName = userObj.displayName || userName;
        }
    } catch (error) {
        console.error('Error parsing user data:', error);
    }
    
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = userName;
    }
    
    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Initialize UI
    loadEmployees();
    setupEventListeners();
});

// Current user information
let currentUser = null;
try {
    const userJson = sessionStorage.getItem('user');
    if (userJson) {
        currentUser = JSON.parse(userJson);
    } else {
        currentUser = {
            departmentId: sessionStorage.getItem('userDepartmentId'),
            department: sessionStorage.getItem('userDepartment')
        };
    }
} catch (error) {
    console.error('Error parsing user data:', error);
    currentUser = {};
}

let currentEmployees = []; // Store employees list for the coordinator
let currentPage = 1;
const PAGE_SIZE = 10;

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
    
    // Close modal buttons
    const closeModalButtons = document.querySelectorAll('.modal-close, .close-modal-btn, .cancel-modal');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeModal);
    });
    
    // Import/Export buttons
    const importBtn = document.getElementById('import-employees-btn');
    if (importBtn) {
        importBtn.addEventListener('click', showImportModal);
    }
    
    const exportBtn = document.getElementById('export-employees-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportEmployees);
    }
    
    // Pagination buttons
    const prevPageBtn = document.getElementById('prev-page');
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayEmployees(currentEmployees);
            }
        });
    }
    
    const nextPageBtn = document.getElementById('next-page');
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(currentEmployees.length / PAGE_SIZE);
            if (currentPage < totalPages) {
                currentPage++;
                displayEmployees(currentEmployees);
            }
        });
    }
    
    // Download template button
    const downloadTemplateBtn = document.getElementById('download-template-btn');
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', downloadEmployeeTemplate);
    }
    
    // Import form
    const importForm = document.getElementById('import-form');
    if (importForm) {
        importForm.addEventListener('submit', importEmployees);
    }
}

// Load employees for the coordinator's department
function loadEmployees() {
    // Show loading state
    showLoadingState(true);
    
    // Get department ID
    const departmentId = currentUser.departmentId;
    if (!departmentId) {
        showErrorMessage('No se pudo determinar su departamento. Por favor, cierre sesión y vuelva a ingresar.');
        showLoadingState(false);
        return;
    }
    
    // Clear employees list
    currentEmployees = [];
    
    // Get employees from Firestore
    window.db.collection('employees')
        .where('departmentId', '==', departmentId)
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

// Display employees in the table with pagination
function displayEmployees(employees) {
    const employeesTable = document.getElementById('employees-table-body');
    if (!employeesTable) return;
    
    // Clear table
    employeesTable.innerHTML = '';
    
    // Check if there are any employees
    if (employees.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="6" class="text-center">No hay empleados asignados a su departamento.</td>
        `;
        employeesTable.appendChild(emptyRow);
        updatePagination(0, 0, 0);
        updateEmployeeCount(0);
        return;
    }
    
    // Calculate pagination
    const totalEmployees = employees.length;
    const totalPages = Math.ceil(totalEmployees / PAGE_SIZE);
    
    // Adjust current page if needed
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    
    // Calculate start and end indices
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, totalEmployees);
    
    // Get current page of employees
    const pageEmployees = employees.slice(startIndex, endIndex);
    
    // Display each employee
    pageEmployees.forEach((employee, index) => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${startIndex + index + 1}</td>
            <td>${employee.name || '-'}</td>
            <td>${employee.position || '-'}</td>
            <td>${employee.email || '-'}</td>
            <td>${employee.active !== false ? 'Activo' : 'Inactivo'}</td>
            <td class="employee-actions">
                <button class="btn btn-sm btn-primary edit-employee-btn" data-id="${employee.id}">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger delete-employee-btn" data-id="${employee.id}">
                    <i class="fas fa-trash"></i> Eliminar
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
    
    // Update pagination
    updatePagination(startIndex + 1, endIndex, totalEmployees);
    
    // Update employee count
    updateEmployeeCount(totalEmployees);
}

// Update pagination information
function updatePagination(start, end, total) {
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
        pageInfo.textContent = `${start}-${end} de ${total}`;
    }
    
    const pageNumber = document.getElementById('page-number');
    if (pageNumber) {
        const totalPages = Math.ceil(total / PAGE_SIZE);
        pageNumber.textContent = `Página ${currentPage} de ${totalPages || 1}`;
    }
    
    const prevPageBtn = document.getElementById('prev-page');
    if (prevPageBtn) {
        prevPageBtn.disabled = currentPage <= 1;
    }
    
    const nextPageBtn = document.getElementById('next-page');
    if (nextPageBtn) {
        const totalPages = Math.ceil(total / PAGE_SIZE);
        nextPageBtn.disabled = currentPage >= totalPages;
    }
}

// Filter employees by search term
function filterEmployees() {
    const searchTerm = document.getElementById('employee-search').value.toLowerCase();
    
    if (!searchTerm) {
        // Show all employees
        displayEmployees(currentEmployees);
        return;
    }
    
    // Reset to first page
    currentPage = 1;
    
    // Filter employees by name, position, or email
    const filteredEmployees = currentEmployees.filter(employee => 
        (employee.name && employee.name.toLowerCase().includes(searchTerm)) || 
        (employee.position && employee.position.toLowerCase().includes(searchTerm)) ||
        (employee.email && employee.email.toLowerCase().includes(searchTerm))
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
    const modalTitle = document.getElementById('employee-modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Agregar Empleado';
    }
    
    // Reset form
    const form = document.getElementById('employee-form');
    if (form) {
        form.reset();
        
        // Reset hidden ID field
        const idField = document.getElementById('employee-id');
        if (idField) {
            idField.value = '';
        }
    }
    
    // Set active status default to active
    const statusSelect = document.getElementById('employee-status');
    if (statusSelect) {
        statusSelect.value = 'active';
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
    const modalTitle = document.getElementById('employee-modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Editar Empleado';
    }
    
    // Fill form with employee data
    const form = document.getElementById('employee-form');
    if (form) {
        // Set employee ID in form
        const idField = document.getElementById('employee-id');
        if (idField) {
            idField.value = employee.id;
        }
        
        // Fill form fields
        const nameField = document.getElementById('employee-name');
        if (nameField) nameField.value = employee.name || '';
        
        const emailField = document.getElementById('employee-email');
        if (emailField) emailField.value = employee.email || '';
        
        const positionField = document.getElementById('employee-position');
        if (positionField) positionField.value = employee.position || '';
        
        const statusSelect = document.getElementById('employee-status');
        if (statusSelect) {
            statusSelect.value = employee.active !== false ? 'active' : 'inactive';
        }
    }
    
    // Show modal
    modal.classList.add('active');
}

// Close modal
function closeModal(e) {
    if (e && e.preventDefault) {
        e.preventDefault();
    }
    
    // Get all modals
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
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
    const idField = document.getElementById('employee-id');
    const employeeId = idField ? idField.value : '';
    
    const nameField = document.getElementById('employee-name');
    const name = nameField ? nameField.value : '';
    
    const emailField = document.getElementById('employee-email');
    const email = emailField ? emailField.value : '';
    
    const positionField = document.getElementById('employee-position');
    const position = positionField ? positionField.value : '';
    
    const statusSelect = document.getElementById('employee-status');
    const active = statusSelect ? statusSelect.value === 'active' : true;
    
    // Create employee object
    const employee = {
        name: name,
        email: email,
        position: position,
        active: active,
        departmentId: currentUser.departmentId || sessionStorage.getItem('userDepartmentId'),
        department: currentUser.department || sessionStorage.getItem('userDepartment'),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (employeeId) {
            // Update existing employee
            await window.db.collection('employees').doc(employeeId).update(employee);
            showSuccessMessage('Empleado actualizado correctamente.');
        } else {
            // Add created timestamp for new employees
            employee.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            // Create new employee
            await window.db.collection('employees').add(employee);
            showSuccessMessage('Empleado agregado correctamente.');
        }
        
        // Close modal
        closeModal();
        
        // Reset page to first
        currentPage = 1;
        
        // Reload employees
        loadEmployees();
    } catch (error) {
        console.error("Error saving employee:", error);
        showErrorMessage("Error al guardar el empleado: " + error.message);
        showLoadingState(false);
    }
}

// Confirm delete employee
function confirmDeleteEmployee(employee) {
    // Get or create modal
    let modal = document.getElementById('delete-employee-modal');
    
    if (!modal) {
        console.error("Delete modal not found");
        if (confirm(`¿Está seguro de eliminar a ${employee.name}?`)) {
            deleteEmployee(employee.id);
        }
        return;
    }
    
    // Set employee name
    const nameEl = document.getElementById('delete-employee-name');
    if (nameEl) {
        nameEl.textContent = employee.name || 'este empleado';
    }
    
    // Set delete button action
    const confirmBtn = document.getElementById('confirm-delete-employee-btn');
    if (confirmBtn) {
        // Remove previous event listeners
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        
        // Add new event listener
        newBtn.addEventListener('click', () => {
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
        await window.db.collection('employees').doc(employeeId).delete();
        
        // Close modal
        closeModal();
        
        // Show success message
        showSuccessMessage('Empleado eliminado correctamente.');
        
        // Reload employees
        loadEmployees();
    } catch (error) {
        console.error("Error deleting employee:", error);
        showErrorMessage("Error al eliminar el empleado: " + error.message);
        showLoadingState(false);
    }
}

// Show import modal
function showImportModal() {
    const modal = document.getElementById('import-employees-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

// Download employee template
function downloadEmployeeTemplate() {
    // Create CSV content
    const csvContent = 'name,email,position\nJuan Pérez,juan@example.com,Analista\nMaría López,maria@example.com,Gerente';
    
    // Create download link
    const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'plantilla_empleados.csv');
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
}

// Import employees from file
function importEmployees(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('import-file');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showErrorMessage('Por favor seleccione un archivo para importar.');
        return;
    }
    
    const file = fileInput.files[0];
    
    // Show loading state
    showLoadingState(true);
    
    // Create file reader
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // Parse CSV
            const data = e.target.result;
            const employees = parseCSV(data);
            
            if (employees.length === 0) {
                throw new Error('No se encontraron datos válidos en el archivo.');
            }
            
            // Confirm import
            if (confirm(`¿Desea importar ${employees.length} empleados?`)) {
                importEmployeesToFirestore(employees);
            } else {
                showLoadingState(false);
            }
        } catch (error) {
            console.error('Error parsing file:', error);
            showErrorMessage('Error al procesar el archivo: ' + error.message);
            showLoadingState(false);
        }
    };
    
    reader.onerror = function() {
        showErrorMessage('Error al leer el archivo.');
        showLoadingState(false);
    };
    
    // Read file as text
    reader.readAsText(file);
}

// Parse CSV data
function parseCSV(csvData) {
    // Simple CSV parser (you might want to use a library like PapaParse)
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
    
    // Check required headers
    const requiredHeaders = ['name'];
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    
    if (missingHeaders.length > 0) {
        throw new Error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`);
    }
    
    // Parse rows
    const employees = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',');
        
        // Skip if no name
        if (!values[headers.indexOf('name')]) continue;
        
        const employee = {
            name: values[headers.indexOf('name')] || '',
            email: headers.includes('email') ? values[headers.indexOf('email')] || '' : '',
            position: headers.includes('position') ? values[headers.indexOf('position')] || '' : '',
            active: true
        };
        
        employees.push(employee);
    }
    
    return employees;
}

// Import employees to Firestore
async function importEmployeesToFirestore(employees) {
    try {
        // Get batch
        const batch = window.db.batch();
        
        // Add department info to each employee
        const departmentId = currentUser.departmentId || sessionStorage.getItem('userDepartmentId');
        const department = currentUser.department || sessionStorage.getItem('userDepartment');
        
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // Add employees to batch
        employees.forEach(employee => {
            const employeeRef = window.db.collection('employees').doc();
            batch.set(employeeRef, {
                ...employee,
                departmentId: departmentId,
                department: department,
                createdAt: timestamp,
                updatedAt: timestamp
            });
        });
        
        // Commit batch
        await batch.commit();
        
        // Show success message
        showSuccessMessage(`${employees.length} empleados importados correctamente.`);
        
        // Close modal
        closeModal();
        
        // Reload employees
        loadEmployees();
    } catch (error) {
        console.error('Error importing employees:', error);
        showErrorMessage('Error al importar los empleados: ' + error.message);
        showLoadingState(false);
    }
}

// Export employees to CSV
function exportEmployees() {
    // Show loading state
    showLoadingState(true);
    
    try {
        // Create CSV headers
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Nombre,Email,Posición,Estado\n';
        
        // Add employees
        currentEmployees.forEach(employee => {
            const row = [
                employee.name || '',
                employee.email || '',
                employee.position || '',
                employee.active !== false ? 'Activo' : 'Inactivo'
            ];
            
            // Escape fields if needed
            const escapedRow = row.map(field => {
                field = String(field).replace(/"/g, '""');
                return field.includes(',') ? `"${field}"` : field;
            });
            
            csvContent += escapedRow.join(',') + '\n';
        });
        
        // Create download link
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `empleados_${formatDateForFile(new Date())}.csv`);
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        
        // Show success message
        showSuccessMessage('Empleados exportados correctamente.');
    } catch (error) {
        console.error('Error exporting employees:', error);
        showErrorMessage('Error al exportar los empleados: ' + error.message);
    } finally {
        showLoadingState(false);
    }
}

// Format date for file names (YYYYMMDD)
function formatDateForFile(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// Validate employee form
function validateEmployeeForm() {
    const nameField = document.getElementById('employee-name');
    
    if (!nameField || !nameField.value.trim()) {
        showErrorMessage("El nombre del empleado es requerido.");
        return false;
    }
    
    const emailField = document.getElementById('employee-email');
    if (emailField && emailField.value.trim()) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailField.value.trim())) {
            showErrorMessage("Por favor ingrese un email válido.");
            return false;
        }
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
    document.querySelectorAll('button').forEach(button => {
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
    } else {
        // Fallback to alert
        alert('Error: ' + message);
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
    } else {
        // Fallback to alert
        alert('Éxito: ' + message);
    }
}