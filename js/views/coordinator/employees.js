// Employees.js - Coordinator Employee Management

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and role
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = '../../index.html';
            return;
        }
        
        // Check if user is coordinator
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'coordinator') {
            // Redirect non-coordinator users
            window.location.href = '../../index.html';
            return;
        }
        
        // Store user data
        const userData = userDoc.data();
        setCurrentUser(userData);
        setUserRole(userData.role);
        setUserBranch(userData.branch);
        
        // Display user info
        document.getElementById('userName').textContent = userData.displayName || 'Coordinador';
        
        // Get branch details
        const branchDoc = await db.collection('branches').doc(userData.branch).get();
        if (branchDoc.exists) {
            const branchData = branchDoc.data();
            document.getElementById('branchName').textContent = branchData.name;
            document.getElementById('branchNameTitle').textContent = branchData.name;
        }
        
        // Initialize employee management
        initEmployeeManagement(userData.branch, user.uid);
    });
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await logout();
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('Error logging out:', error);
            showError('Error al cerrar sesión. Intente nuevamente.');
        }
    });
});

// Initialize employee management
function initEmployeeManagement(branchId, coordinatorId) {
    // DOM elements
    const employeeTableBody = document.getElementById('employeeTableBody');
    const searchInput = document.getElementById('searchEmployee');
    const showInactiveCheckbox = document.getElementById('showInactiveEmployees');
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    const importEmployeesBtn = document.getElementById('importEmployeesBtn');
    const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
    
    // Modals
    const employeeModal = document.getElementById('employeeModal');
    const importModal = document.getElementById('importModal');
    const deleteModal = document.getElementById('deleteModal');
    
    // Employee form elements
    const employeeForm = document.getElementById('employeeForm');
    const employeeIdInput = document.getElementById('employeeId');
    const employeeNameInput = document.getElementById('employeeName');
    const employeePositionInput = document.getElementById('employeePosition');
    const employeeRestrictionsInput = document.getElementById('employeeRestrictions');
    const employeeActiveInput = document.getElementById('employeeActive');
    const modalTitle = document.getElementById('modalTitle');
    const saveEmployeeBtn = document.getElementById('saveEmployeeBtn');
    const cancelEmployeeBtn = document.getElementById('cancelEmployeeBtn');
    
    // Import elements
    const excelFileInput = document.getElementById('excelFile');
    const uploadExcelBtn = document.getElementById('uploadExcelBtn');
    const previewContainer = document.getElementById('previewContainer');
    const previewCount = document.getElementById('previewCount');
    const previewTableBody = document.getElementById('previewTableBody');
    const confirmImportBtn = document.getElementById('confirmImportBtn');
    const cancelImportBtn = document.getElementById('cancelImportBtn');
    
    // Delete elements
    const deleteEmployeeName = document.getElementById('deleteEmployeeName');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    
    // Close buttons for modals
    const closeButtons = document.querySelectorAll('.close-modal');
    
    // State
    let employees = [];
    let filteredEmployees = [];
    let importData = [];
    let currentEmployeeId = null;
    
    // Load employees
    loadEmployees();
    
    // Event listeners
    
    // Search input
    searchInput.addEventListener('input', filterEmployees);
    
    // Show inactive checkbox
    showInactiveCheckbox.addEventListener('change', filterEmployees);
    
    // Add employee button
    addEmployeeBtn.addEventListener('click', () => {
        // Reset form
        employeeForm.reset();
        employeeIdInput.value = '';
        modalTitle.textContent = 'Agregar Empleado';
        currentEmployeeId = null;
        
        // Show modal
        employeeModal.style.display = 'block';
    });
    
    // Save employee button (form submit)
    employeeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Validate form
            if (!employeeNameInput.value.trim()) {
                showError('Por favor ingrese el nombre del empleado.');
                return;
            }
            
            // Prepare employee data
            const employeeData = {
                name: employeeNameInput.value.trim(),
                position: employeePositionInput.value.trim(),
                dietaryRestrictions: employeeRestrictionsInput.value.trim(),
                active: employeeActiveInput.checked,
                branch: branchId
            };
            
            if (currentEmployeeId) {
                // Update existing employee
                await updateEmployee(currentEmployeeId, employeeData);
                showSuccess('Empleado actualizado correctamente.');
            } else {
                // Add new employee
                await addEmployee(employeeData, coordinatorId);
                showSuccess('Empleado agregado correctamente.');
            }
            
            // Close modal
            employeeModal.style.display = 'none';
            
            // Reload employees
            loadEmployees();
        } catch (error) {
            console.error('Error saving employee:', error);
            showError('Error al guardar empleado. Intente nuevamente.');
        }
    });
    
    // Cancel employee button
    cancelEmployeeBtn.addEventListener('click', () => {
        employeeModal.style.display = 'none';
    });
    
    // Import employees button
    importEmployeesBtn.addEventListener('click', () => {
        // Reset form
        excelFileInput.value = '';
        previewContainer.style.display = 'none';
        importData = [];
        
        // Show modal
        importModal.style.display = 'block';
    });
    
    // Upload Excel button
    uploadExcelBtn.addEventListener('click', () => {
        const file = excelFileInput.files[0];
        
        if (!file) {
            showError('Por favor seleccione un archivo Excel.');
            return;
        }
        
        // Check file extension
        const fileExt = file.name.split('.').pop().toLowerCase();
        if (fileExt !== 'xlsx') {
            showError('Por favor seleccione un archivo con formato .xlsx');
            return;
        }
        
        // Parse Excel file
        parseExcelFile(file)
            .then(data => {
                importData = data;
                
                // Show preview
                showImportPreview(data);
            })
            .catch(error => {
                console.error('Error parsing Excel:', error);
                showError(error.message || 'Error al procesar el archivo Excel.');
            });
    });
    
    // Confirm import button
    confirmImportBtn.addEventListener('click', async () => {
        if (importData.length === 0) {
            showError('No hay datos para importar.');
            return;
        }
        
        try {
            // Import employees
            const result = await importEmployees(importData, branchId, coordinatorId);
            
            // Close modal
            importModal.style.display = 'none';
            
            // Show success message
            showSuccess(`Se importaron ${result.total} empleados correctamente.`);
            
            // Reload employees
            loadEmployees();
        } catch (error) {
            console.error('Error importing employees:', error);
            showError('Error al importar empleados. Intente nuevamente.');
        }
    });
    
    // Cancel import button
    cancelImportBtn.addEventListener('click', () => {
        importModal.style.display = 'none';
    });
    
    // Download template button
    downloadTemplateBtn.addEventListener('click', () => {
        downloadEmployeeTemplate();
    });
    
    // Close buttons for all modals
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            employeeModal.style.display = 'none';
            importModal.style.display = 'none';
            deleteModal.style.display = 'none';
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === employeeModal) {
            employeeModal.style.display = 'none';
        } else if (e.target === importModal) {
            importModal.style.display = 'none';
        } else if (e.target === deleteModal) {
            deleteModal.style.display = 'none';
        }
    });
    
    // Confirm delete button
    confirmDeleteBtn.addEventListener('click', async () => {
        if (!currentEmployeeId) return;
        
        try {
            // Delete employee
            await deleteEmployee(currentEmployeeId);
            
            // Close modal
            deleteModal.style.display = 'none';
            
            // Show success message
            showSuccess('Empleado eliminado correctamente.');
            
            // Reload employees
            loadEmployees();
        } catch (error) {
            console.error('Error deleting employee:', error);
            showError('Error al eliminar empleado. Intente nuevamente.');
        }
    });
    
    // Cancel delete button
    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.style.display = 'none';
    });
    
    // Load employees from Firestore
    async function loadEmployees() {
        try {
            employeeTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando empleados...</td></tr>';
            
            // Get employees for branch
            const employeesSnapshot = await db.collection('employees')
                .where('branch', '==', branchId)
                .orderBy('name')
                .get();
            
            employees = [];
            
            employeesSnapshot.forEach(doc => {
                employees.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Update state
            setCurrentEmployees(employees);
            
            // Filter and display employees
            filterEmployees();
        } catch (error) {
            console.error('Error loading employees:', error);
            employeeTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        Error al cargar empleados. Intente nuevamente.
                    </td>
                </tr>
            `;
        }
    }
    
    // Filter employees based on search and active status
    function filterEmployees() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const showInactive = showInactiveCheckbox.checked;
        
        filteredEmployees = employees.filter(employee => {
            // Filter by active status
            if (!showInactive && !employee.active) {
                return false;
            }
            
            // Filter by search term
            if (searchTerm) {
                return (
                    employee.name.toLowerCase().includes(searchTerm) ||
                    (employee.position && employee.position.toLowerCase().includes(searchTerm)) ||
                    (employee.dietaryRestrictions && employee.dietaryRestrictions.toLowerCase().includes(searchTerm))
                );
            }
            
            return true;
        });
        
        // Display filtered employees
        displayEmployees();
    }
    
    // Display employees in table
    function displayEmployees() {
        if (filteredEmployees.length === 0) {
            employeeTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        No se encontraron empleados.
                    </td>
                </tr>
            `;
            return;
        }
        
        // Build table rows
        let html = '';
        
        filteredEmployees.forEach(employee => {
            html += `
                <tr>
                    <td>${employee.name}</td>
                    <td>${employee.position || '-'}</td>
                    <td>${employee.dietaryRestrictions || '-'}</td>
                    <td>${employee.active ? 
                        '<span class="status-badge status-active">Activo</span>' : 
                        '<span class="status-badge status-inactive">Inactivo</span>'
                    }</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-outline btn-sm" onclick="editEmployee('${employee.id}')">
                                <i class="material-icons">edit</i>
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="showDeleteConfirmation('${employee.id}', '${employee.name}')">
                                <i class="material-icons">delete</i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        employeeTableBody.innerHTML = html;
    }
    
    // Show import preview
    function showImportPreview(data) {
        if (data.length === 0) {
            showError('No hay datos para importar en el archivo.');
            return;
        }
        
        // Update preview count
        previewCount.textContent = data.length;
        
        // Build preview table
        let html = '';
        
        data.forEach(employee => {
            html += `
                <tr>
                    <td>${employee.name}</td>
                    <td>${employee.position || '-'}</td>
                    <td>${employee.dietaryRestrictions || '-'}</td>
                    <td>${employee.active ? 'Sí' : 'No'}</td>
                </tr>
            `;
        });
        
        previewTableBody.innerHTML = html;
        
        // Show preview container
        previewContainer.style.display = 'block';
    }
    
    // Make functions available globally for event handlers
    window.editEmployee = function(employeeId) {
        // Find employee
        const employee = employees.find(emp => emp.id === employeeId);
        
        if (!employee) return;
        
        // Fill form
        employeeIdInput.value = employee.id;
        employeeNameInput.value = employee.name || '';
        employeePositionInput.value = employee.position || '';
        employeeRestrictionsInput.value = employee.dietaryRestrictions || '';
        employeeActiveInput.checked = employee.active;
        
        // Update modal title
        modalTitle.textContent = 'Editar Empleado';
        
        // Store current employee ID
        currentEmployeeId = employeeId;
        
        // Show modal
        employeeModal.style.display = 'block';
    };
    
    window.showDeleteConfirmation = function(employeeId, employeeName) {
        // Set employee details
        deleteEmployeeName.textContent = employeeName;
        
        // Store current employee ID
        currentEmployeeId = employeeId;
        
        // Show modal
        deleteModal.style.display = 'block';
    };
    
    // Add employee function - CREATES THE EMPLOYEES COLLECTION
    async function addEmployee(employeeData, createdBy) {
        // Add to Firestore
        const employeeRef = await db.collection('employees').add({
            ...employeeData,
            createdBy: createdBy,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update branch employee count if employee is active
        if (employeeData.active) {
            await db.collection('branches').doc(employeeData.branch).update({
                employeeCount: firebase.firestore.FieldValue.increment(1)
            });
        }
        
        return employeeRef.id;
    }
    
    // Update employee
    async function updateEmployee(employeeId, employeeData) {
        // Get current employee data
        const employeeDoc = await db.collection('employees').doc(employeeId).get();
        
        if (!employeeDoc.exists) {
            throw new Error('Empleado no encontrado');
        }
        
        const currentData = employeeDoc.data();
        
        // Update employee
        await db.collection('employees').doc(employeeId).update({
            ...employeeData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update branch employee count if active status changed
        if (currentData.active !== employeeData.active) {
            // Increment if now active, decrement if now inactive
            const change = employeeData.active ? 1 : -1;
            
            await db.collection('branches').doc(employeeData.branch).update({
                employeeCount: firebase.firestore.FieldValue.increment(change)
            });
        }
    }
    
    // Delete employee
    async function deleteEmployee(employeeId) {
        // Get employee data
        const employeeDoc = await db.collection('employees').doc(employeeId).get();
        
        if (!employeeDoc.exists) {
            throw new Error('Empleado no encontrado');
        }
        
        const employeeData = employeeDoc.data();
        
        // Delete employee
        await db.collection('employees').doc(employeeId).delete();
        
        // Update branch employee count if employee was active
        if (employeeData.active) {
            await db.collection('branches').doc(employeeData.branch).update({
                employeeCount: firebase.firestore.FieldValue.increment(-1)
            });
        }
    }
    
    // Import employees
    async function importEmployees(employees, branchId, coordinatorId) {
        try {
            // Use batch write
            const batch = db.batch();
            let activeCount = 0;
            let successCount = 0;
            let errorCount = 0;
            
            // Add each employee
            for (const employee of employees) {
                try {
                    // Validate required fields
                    if (!employee.name || typeof employee.name !== 'string') {
                        console.error('Error en empleado:', 'Nombre inválido o vacío', employee);
                        errorCount++;
                        continue;
                    }
                    
                    const employeeRef = db.collection('employees').doc();
                    
                    // Determine if position indicates a coordinator role
                    const position = employee.position || '';
                    const isCoordinator = position.toLowerCase().includes('coordinador') || 
                                         position.toLowerCase().includes('coordinator');
                    
                    // Prepare employee data with proper validation
                    const employeeData = {
                        name: employee.name.trim(),
                        position: position.trim(),
                        dietaryRestrictions: employee.dietaryRestrictions ? employee.dietaryRestrictions.trim() : '',
                        active: employee.active !== undefined ? Boolean(employee.active) : true,
                        branch: branchId,
                        createdBy: coordinatorId,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    // If the employee is a coordinator, add role information
                    if (isCoordinator) {
                        employeeData.role = 'coordinator';
                    }
                    
                    batch.set(employeeRef, employeeData);
            
                    // Count active employees
                    if (employeeData.active !== false) {
                        activeCount++;
                    }
                    
                    successCount++;
                } catch (error) {
                    console.error('Error al procesar empleado:', error, employee);
                    errorCount++;
                }
            }
            
            // Only update branch if we have successfully added employees
            if (successCount > 0) {
                // Update branch employee count
                const branchRef = db.collection('branches').doc(branchId);
                batch.update(branchRef, {
                    employeeCount: firebase.firestore.FieldValue.increment(activeCount)
                });
                
                // Commit batch
                await batch.commit();
            }
            
            return {
                success: successCount > 0,
                total: successCount,
                active: activeCount,
                errors: errorCount
            };
        } catch (error) {
            console.error('Error en la importación de empleados:', error);
            throw new Error(`Error al importar empleados: ${error.message}`);
        }
    }
}