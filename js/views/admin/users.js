// Admin Users Management for Comedor Grupo Avika

// Ensure admin only access
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth(USER_ROLES.ADMIN)) {
        return;
    }
    
    // Set user name
    let userName = 'Administrador';
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
    
    // Initialize the UI
    setupEventListeners();
    setupPasswordValidation();
    loadCoordinators();
    
    // Proteger todos los formularios con CSRF
    if (window.csrfProtection) {
        window.csrfProtection.protectAllForms();
    }
});

// Referencia al servicio centralizado de Firebase
const firebaseService = window.firebaseService;

// Setup event listeners
function setupEventListeners() {
    // Create coordinator form
    const createCoordinatorForm = document.getElementById('create-coordinator-form');
    if (createCoordinatorForm) {
        createCoordinatorForm.addEventListener('submit', createCoordinatorHandler);
        
        // Configurar validación de formulario
        if (window.formValidator) {
            new window.formValidator.FormValidator(createCoordinatorForm, {
                'coordinator-name': {
                    required: true,
                    pattern: 'NAME',
                    minLength: 3,
                    maxLength: 50,
                    message: 'Ingresa un nombre válido (solo letras, espacios y algunos caracteres especiales)'
                },
                'coordinator-email': {
                    required: true,
                    pattern: 'EMAIL',
                    message: 'Ingresa un correo electrónico válido'
                },
                'coordinator-password': {
                    required: true,
                    pattern: 'PASSWORD',
                    minLength: 8,
                    message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número'
                },
                'coordinator-branch': {
                    required: true,
                    message: 'Selecciona una sucursal'
                }
            });
        }
    } else {
        // Si no encuentra el formulario por ID, intentar por otra vía
        const createBtn = document.querySelector('button[type="submit"]');
        if (createBtn) {
            createBtn.addEventListener('click', createCoordinatorByForm);
        }
    }
    
    // Setup modal buttons
    setupModalButtons();
}

// Setup password validation
function setupPasswordValidation() {
    // Validación en tiempo real para contraseñas
    const passwordFields = document.querySelectorAll('.password-field');
    
    passwordFields.forEach(field => {
        const isResetField = field.id === 'new-password';
        const reqPrefix = isResetField ? 'reset-' : '';
        
        field.addEventListener('input', () => {
            const value = field.value;
            
            // Verificar longitud
            const reqLength = document.getElementById(`${reqPrefix}req-length`);
            if (reqLength) {
                if (value.length >= 8) {
                    reqLength.classList.add('met');
                } else {
                    reqLength.classList.remove('met');
                }
            }
            
            // Verificar mayúscula
            const reqUppercase = document.getElementById(`${reqPrefix}req-uppercase`);
            if (reqUppercase) {
                if (/[A-Z]/.test(value)) {
                    reqUppercase.classList.add('met');
                } else {
                    reqUppercase.classList.remove('met');
                }
            }
            
            // Verificar minúscula
            const reqLowercase = document.getElementById(`${reqPrefix}req-lowercase`);
            if (reqLowercase) {
                if (/[a-z]/.test(value)) {
                    reqLowercase.classList.add('met');
                } else {
                    reqLowercase.classList.remove('met');
                }
            }
            
            // Verificar número
            const reqNumber = document.getElementById(`${reqPrefix}req-number`);
            if (reqNumber) {
                if (/\d/.test(value)) {
                    reqNumber.classList.add('met');
                } else {
                    reqNumber.classList.remove('met');
                }
            }
        });
    });
}

// Setup modal buttons
function setupModalButtons() {
    // Close modal buttons
    const closeButtons = document.querySelectorAll('.close-modal, .cancel-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Reset password form
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', resetPasswordHandler);
        
        // Configurar validación de formulario
        if (window.formValidator) {
            new window.formValidator.FormValidator(resetPasswordForm, {
                'new-password': {
                    required: true,
                    pattern: 'PASSWORD',
                    minLength: 8,
                    message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número'
                }
            });
        }
    }
}

// Function to create coordinator by getting form data directly
function createCoordinatorByForm() {
    const nameInput = document.getElementById('coordinator-name');
    const emailInput = document.getElementById('coordinator-email');
    const passwordInput = document.getElementById('coordinator-password');
    const branchInput = document.getElementById('coordinator-branch');
    
    if (!nameInput || !emailInput || !passwordInput || !branchInput) {
        showErrorMessage('No se pudieron encontrar todos los campos del formulario');
        return;
    }
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const branch = branchInput.value;
    
    createCoordinator(name, email, password, branch);
}

// Function to create a coordinator with the given data
async function createCoordinator(name, email, password, branch) {
    try {
        // Validar datos
        if (!name || !email || !password || !branch) {
            showErrorMessage('Por favor, complete todos los campos');
            return;
        }
        
        // Validar formato de correo electrónico
        if (!window.formValidator.ValidationPatterns.EMAIL.test(email)) {
            showErrorMessage('Por favor, ingresa un correo electrónico válido');
            return;
        }
        
        // Validar contraseña
        if (!window.formValidator.ValidationPatterns.PASSWORD.test(password)) {
            showErrorMessage('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número');
            return;
        }
        
        // Mostrar estado de carga
        showLoadingState(true);
        
        // Obtener token CSRF
        const csrfToken = window.csrfProtection ? window.csrfProtection.getToken() : null;
        
        // Crear usuario en Firebase Auth y Firestore
        const userData = {
            name,
            email,
            password,
            role: 'coordinator',
            branch,
            departments: [branch],
            createdAt: new Date().toISOString()
        };
        
        // Usar el servicio de Firebase para crear el usuario
        const result = await firebaseService.createUser(userData, csrfToken);
        
        if (!result || !result.uid) {
            throw new Error('No se pudo crear el usuario');
        }
        
        // Mostrar mensaje de éxito
        showSuccessMessage(`Coordinador ${name} creado exitosamente`);
        
        // Limpiar formulario
        const form = document.getElementById('create-coordinator-form');
        if (form) {
            form.reset();
        }
        
        // Recargar lista de coordinadores
        loadCoordinators();
        
    } catch (error) {
        console.error('Error al crear coordinador:', error);
        showErrorMessage(error.message || 'Error al crear coordinador');
    } finally {
        showLoadingState(false);
    }
}

// Create coordinator handler
async function createCoordinatorHandler(e) {
    e.preventDefault();
    
    // Get form values
    const name = document.getElementById('coordinator-name').value.trim();
    const email = document.getElementById('coordinator-email').value.trim();
    const password = document.getElementById('coordinator-password').value;
    const branch = document.getElementById('coordinator-branch').value;
    
    createCoordinator(name, email, password, branch);
}

// Load coordinators from Firestore
async function loadCoordinators() {
    try {
        showLoadingState(true);
        
        if (!firebaseService || !firebaseService.db) {
            throw new Error('Servicio de Firebase no disponible');
        }
        
        // Obtener token CSRF
        const csrfToken = window.csrfProtection ? window.csrfProtection.getToken() : null;
        
        // Get coordinators from Firestore
        const coordinators = await firebaseService.getCoordinators(csrfToken);
        
        // Update table
        const tableBody = document.getElementById('coordinators-table-body');
        if (!tableBody) {
            throw new Error('No se pudo encontrar la tabla de coordinadores');
        }
        
        if (!coordinators || coordinators.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No hay coordinadores registrados</td>
                </tr>
            `;
            return;
        }
        
        // Sort coordinators by name
        coordinators.sort((a, b) => {
            const nameA = a.name || a.displayName || '';
            const nameB = b.name || b.displayName || '';
            return nameA.localeCompare(nameB);
        });
        
        // Create table rows
        let html = '';
        coordinators.forEach(coordinator => {
            const name = coordinator.name || coordinator.displayName || 'Sin nombre';
            const email = coordinator.email || 'Sin correo';
            const branch = coordinator.branch || coordinator.department || 'No asignada';
            const createdAt = coordinator.createdAt ? new Date(coordinator.createdAt).toLocaleDateString() : 'Desconocida';
            
            html += `
                <tr data-id="${coordinator.uid}">
                    <td>${name}</td>
                    <td>${email}</td>
                    <td>${branch}</td>
                    <td>${createdAt}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-warning reset-password-btn" data-id="${coordinator.uid}" data-name="${name}">
                            <i class="fas fa-key"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-user-btn" data-id="${coordinator.uid}" data-name="${name}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        
        // Setup action buttons
        setupActionButtons();
        
    } catch (error) {
        console.error('Error al cargar coordinadores:', error);
        showErrorMessage(error.message || 'Error al cargar coordinadores');
    } finally {
        showLoadingState(false);
    }
}

// Setup action buttons for each user row
function setupActionButtons() {
    // Reset password buttons
    const resetPasswordButtons = document.querySelectorAll('.reset-password-btn');
    resetPasswordButtons.forEach(button => {
        button.addEventListener('click', () => {
            const userId = button.getAttribute('data-id');
            const userName = button.getAttribute('data-name');
            
            // Set user data in modal
            document.getElementById('reset-user-id').value = userId;
            document.getElementById('reset-user-name').textContent = userName;
            
            // Show modal
            document.getElementById('reset-password-modal').style.display = 'block';
        });
    });
    
    // Delete user buttons
    const deleteUserButtons = document.querySelectorAll('.delete-user-btn');
    deleteUserButtons.forEach(button => {
        button.addEventListener('click', () => {
            const userId = button.getAttribute('data-id');
            const userName = button.getAttribute('data-name');
            
            // Set user data in modal
            document.getElementById('delete-user-name').textContent = userName;
            
            // Setup confirm button
            const confirmButton = document.getElementById('confirm-delete-user-btn');
            confirmButton.onclick = () => deleteUserHandler(userId);
            
            // Show modal
            document.getElementById('delete-user-modal').style.display = 'block';
        });
    });
}

// Reset password handler
async function resetPasswordHandler(e) {
    e.preventDefault();
    
    try {
        // Get user id and new password
        const userId = document.getElementById('reset-user-id').value;
        const newPassword = document.getElementById('new-password').value;
        
        if (!userId || !newPassword) {
            throw new Error('Datos incompletos');
        }
        
        // Validar contraseña
        if (!window.formValidator.ValidationPatterns.PASSWORD.test(newPassword)) {
            showErrorMessage('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número');
            return;
        }
        
        // Show loading state
        showLoadingState(true);
        
        // Obtener token CSRF
        const csrfToken = window.csrfProtection ? window.csrfProtection.getToken() : null;
        
        // Reset password
        await firebaseService.resetUserPassword(userId, newPassword, csrfToken);
        
        // Hide modal
        document.getElementById('reset-password-modal').style.display = 'none';
        
        // Show success message
        showSuccessMessage('Contraseña restablecida exitosamente');
        
    } catch (error) {
        console.error('Error al restablecer contraseña:', error);
        
        // Show error in modal
        const errorElement = document.getElementById('reset-password-error');
        if (errorElement) {
            errorElement.textContent = error.message || 'Error al restablecer contraseña';
            errorElement.style.display = 'block';
        }
    } finally {
        showLoadingState(false);
    }
}

// Delete user handler
async function deleteUserHandler(userId) {
    try {
        if (!userId) {
            throw new Error('ID de usuario no válido');
        }
        
        // Show loading state
        showLoadingState(true);
        
        // Obtener token CSRF
        const csrfToken = window.csrfProtection ? window.csrfProtection.getToken() : null;
        
        // Delete user
        await firebaseService.deleteUser(userId, csrfToken);
        
        // Hide modal
        document.getElementById('delete-user-modal').style.display = 'none';
        
        // Show success message
        showSuccessMessage('Usuario eliminado exitosamente');
        
        // Reload coordinators
        loadCoordinators();
        
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        showErrorMessage(error.message || 'Error al eliminar usuario');
    } finally {
        showLoadingState(false);
    }
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
        button.disabled = isLoading;
    });
}

// Show error message
function showErrorMessage(message) {
    // Try to show in specific error element
    const errorElement = document.getElementById('create-coordinator-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        // Fallback to alert
        alert(message);
    }
}

// Show success message
function showSuccessMessage(message) {
    // Try to show in specific success element
    const successElement = document.getElementById('create-coordinator-success');
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 5000);
    } else {
        // Fallback to alert
        alert(message);
    }
}