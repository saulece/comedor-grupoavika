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
    loadCoordinators();
});

// Referencia a las colecciones usando las variables globales
const usersCollection = window.db ? window.db.collection('users') : null;

// Setup event listeners
function setupEventListeners() {
    // Create coordinator form
    const createCoordinatorForm = document.getElementById('create-coordinator-form');
    if (createCoordinatorForm) {
        createCoordinatorForm.addEventListener('submit', createCoordinatorHandler);
    } else {
        // Si no encuentra el formulario por ID, intentar por otra vía
        const createBtn = document.querySelector('button[type="submit"]');
        if (createBtn) {
            createBtn.addEventListener('click', function(e) {
                e.preventDefault();
                createCoordinatorByForm();
            });
        }
    }
    
    // Buttons in modals
    setupModalButtons();
}

// Setup modal buttons
function setupModalButtons() {
    // Reset password form
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', resetPasswordHandler);
    }
    
    // Delete confirmation button
    const deleteUserBtn = document.getElementById('confirm-delete-user-btn');
    if (deleteUserBtn) {
        deleteUserBtn.addEventListener('click', deleteUserHandler);
    }
    
    // Close modal buttons
    document.querySelectorAll('.close-modal, .cancel-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
}

// Function to create coordinator by getting form data directly
function createCoordinatorByForm() {
    // Get form elements by their labels or placeholders
    const nameInput = document.querySelector('input[placeholder*="nombre"], input[placeholder*="Nombre"]');
    const emailInput = document.querySelector('input[type="email"], input[placeholder*="correo"], input[placeholder*="Correo"]');
    const passwordInput = document.querySelector('input[type="password"], input[placeholder*="contraseña"], input[placeholder*="Contraseña"]');
    const branchSelect = document.querySelector('select');
    
    if (!nameInput || !emailInput || !passwordInput || !branchSelect) {
        showErrorMessage('No se pudieron encontrar todos los campos del formulario');
        return;
    }
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const branch = branchSelect.value;
    
    if (!name || !email || !password || !branch) {
        showErrorMessage('Por favor complete todos los campos');
        return;
    }
    
    createCoordinator(name, email, password, branch);
}

// Function to create a coordinator with the given data
async function createCoordinator(name, email, password, branch) {
    try {
        showLoadingState(true);
        
        if (!window.auth || !window.db) {
            throw new Error('Firebase no está inicializado correctamente');
        }
        
        // Check if email already exists
        const emailCheck = await window.db.collection('users').where('email', '==', email).get();
        if (!emailCheck.empty) {
            throw new Error('El correo electrónico ya está registrado');
        }
        
        // Create user in Firebase Auth
        const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Add user to Firestore
        await window.db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            role: 'coordinator',
            branch: branch,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: sessionStorage.getItem('userId')
        });
        
        // Show success message
        showSuccessMessage(`Coordinador ${name} creado correctamente`);
        
        // Reset form
        document.querySelectorAll('input').forEach(input => {
            if (input.type !== 'submit' && input.type !== 'button') {
                input.value = '';
            }
        });
        
        // Reload coordinators list
        loadCoordinators();
    } catch (error) {
        console.error('Error creating coordinator:', error);
        showErrorMessage('Error al crear coordinador: ' + error.message);
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
        
        if (!window.db) {
            throw new Error('Firebase no está inicializado correctamente');
        }
        
        // Get coordinators from Firestore
        const snapshot = await window.db.collection('users')
            .where('role', '==', 'coordinator')
            .get();
        
        const tableBody = document.querySelector('tbody');
        if (tableBody) {
            if (snapshot.empty) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No hay coordinadores registrados</td>
                    </tr>
                `;
            } else {
                let html = '';
                snapshot.forEach(doc => {
                    const user = doc.data();
                    const createdAt = user.createdAt ? new Date(user.createdAt.seconds * 1000) : new Date();
                    const formattedDate = createdAt.toLocaleDateString();
                    
                    html += `
                        <tr data-id="${doc.id}">
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td>${user.branch || '-'}</td>
                            <td>${formattedDate}</td>
                            <td class="actions">
                                <button class="btn btn-sm btn-warning reset-password" data-id="${doc.id}" data-name="${user.name}">
                                    <i class="fas fa-key"></i> Reiniciar
                                </button>
                                <button class="btn btn-sm btn-danger delete-user" data-id="${doc.id}" data-name="${user.name}">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                tableBody.innerHTML = html;
                
                // Setup action buttons
                setupActionButtons();
            }
        }
        
        showLoadingState(false);
    } catch (error) {
        console.error('Error loading coordinators:', error);
        showErrorMessage('Error al cargar los coordinadores: ' + error.message);
        showLoadingState(false);
    }
}

// Setup action buttons for each user row
function setupActionButtons() {
    // Reset password buttons
    document.querySelectorAll('.reset-password').forEach(button => {
        button.addEventListener('click', e => {
            const userId = e.currentTarget.getAttribute('data-id');
            const userName = e.currentTarget.getAttribute('data-name');
            
            // Set modal elements
            document.getElementById('reset-user-id').value = userId;
            document.getElementById('reset-user-name').textContent = userName;
            
            // Show modal
            document.getElementById('reset-password-modal').style.display = 'block';
        });
    });
    
    // Delete user buttons
    document.querySelectorAll('.delete-user').forEach(button => {
        button.addEventListener('click', e => {
            const userId = e.currentTarget.getAttribute('data-id');
            const userName = e.currentTarget.getAttribute('data-name');
            
            // Set modal elements
            document.getElementById('delete-user-name').textContent = userName;
            
            // Store ID in button for later use
            document.getElementById('confirm-delete-user-btn').setAttribute('data-id', userId);
            
            // Show modal
            document.getElementById('delete-user-modal').style.display = 'block';
        });
    });
}

// Reset password handler
async function resetPasswordHandler(e) {
    if (e) e.preventDefault();
    
    try {
        showLoadingState(true);
        
        // Get form values
        const userId = document.getElementById('reset-user-id').value;
        const newPassword = document.getElementById('new-password').value;
        
        // Validate password
        if (newPassword.length < 8) {
            throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
        }
        
        // Reset password using Cloud Function (not implemented in client)
        // This would typically be done through a Firebase Cloud Function
        showSuccessMessage('Función no implementada: para resetear contraseñas se requiere una Cloud Function');
        
        // Close modal
        document.getElementById('reset-password-modal').style.display = 'none';
        
        // Reset form
        document.getElementById('reset-password-form').reset();
    } catch (error) {
        console.error('Error resetting password:', error);
        showErrorMessage('Error al reiniciar contraseña: ' + error.message);
    } finally {
        showLoadingState(false);
    }
}

// Delete user handler
async function deleteUserHandler() {
    try {
        showLoadingState(true);
        
        const userId = document.getElementById('confirm-delete-user-btn').getAttribute('data-id');
        
        if (!userId) {
            throw new Error('ID de usuario no válido');
        }
        
        if (!window.db) {
            throw new Error('Firebase no está inicializado correctamente');
        }
        
        // Delete user from Firestore
        await window.db.collection('users').doc(userId).delete();
        
        // Note: To fully delete from Authentication requires a Cloud Function
        showSuccessMessage('Usuario eliminado de Firestore. La eliminación completa requiere una Cloud Function.');
        
        // Close modal
        document.getElementById('delete-user-modal').style.display = 'none';
        
        // Reload coordinators list
        loadCoordinators();
    } catch (error) {
        console.error('Error deleting user:', error);
        showErrorMessage('Error al eliminar usuario: ' + error.message);
    } finally {
        showLoadingState(false);
    }
}

// Show loading state
function showLoadingState(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
    
    // Toggle button states
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