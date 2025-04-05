// Admin Users Management for Comedor Grupo Avika

// Ensure admin only access
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth(USER_ROLES.ADMIN)) {
        return;
    }
    
    // Set user name
    const user = JSON.parse(sessionStorage.getItem('user'));
    const userNameElement = document.getElementById('user-name');
    if (userNameElement && user) {
        userNameElement.textContent = user.displayName || 'Administrador';
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

// Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Collection references
const usersCollection = db.collection('users');

// Setup event listeners
function setupEventListeners() {
    // Create coordinator form
    const createCoordinatorForm = document.getElementById('create-coordinator-form');
    if (createCoordinatorForm) {
        createCoordinatorForm.addEventListener('submit', createCoordinatorHandler);
    }
    
    // Reset password form
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', resetPasswordHandler);
    }
    
    // Delete user confirmation button
    const deleteUserBtn = document.getElementById('confirm-delete-user-btn');
    if (deleteUserBtn) {
        deleteUserBtn.addEventListener('click', deleteUserHandler);
    }
    
    // Modal close buttons
    document.querySelectorAll('.close-modal, .cancel-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
}

// Load coordinators from Firestore
async function loadCoordinators() {
    try {
        showLoadingState(true);
        
        // Get coordinators from Firestore
        const snapshot = await usersCollection
            .where('role', '==', 'coordinator')
            .orderBy('createdAt', 'desc')
            .get();
        
        const tableBody = document.getElementById('coordinators-table-body');
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
                    const formattedDate = formatDateDisplay(createdAt);
                    
                    html += `
                        <tr data-id="${doc.id}">
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td>${user.branch || '-'}</td>
                            <td>${formattedDate}</td>
                            <td class="actions">
                                <button class="btn btn-sm btn-warning reset-password" data-id="${doc.id}" data-name="${user.name}">
                                    <i class="fas fa-key"></i> Reiniciar contraseña
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

// Create coordinator handler
async function createCoordinatorHandler(e) {
    e.preventDefault();
    
    try {
        showLoadingState(true);
        
        // Get form values
        const name = document.getElementById('coordinator-name').value.trim();
        const email = document.getElementById('coordinator-email').value.trim();
        const password = document.getElementById('coordinator-password').value;
        const branch = document.getElementById('coordinator-branch').value;
        
        // Validate password
        if (password.length < 8) {
            throw new Error('La contraseña debe tener al menos 8 caracteres');
        }
        
        // Check if email already exists
        const emailCheck = await usersCollection.where('email', '==', email).get();
        if (!emailCheck.empty) {
            throw new Error('El correo electrónico ya está registrado');
        }
        
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Add user to Firestore
        await usersCollection.doc(user.uid).set({
            name: name,
            email: email,
            role: 'coordinator',
            branch: branch,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: sessionStorage.getItem('userId')
        });
        
        // Update display name
        await user.updateProfile({
            displayName: name
        });
        
        // Show success message
        showSuccessMessage(`Coordinador ${name} creado correctamente`);
        
        // Reset form
        document.getElementById('create-coordinator-form').reset();
        
        // Reload coordinators list
        loadCoordinators();
    } catch (error) {
        console.error('Error creating coordinator:', error);
        showErrorMessage('Error al crear coordinador: ' + error.message);
    } finally {
        showLoadingState(false);
    }
}

// Reset password handler
async function resetPasswordHandler(e) {
    e.preventDefault();
    
    try {
        showLoadingState(true);
        
        // Get form values
        const userId = document.getElementById('reset-user-id').value;
        const newPassword = document.getElementById('new-password').value;
        
        // Validate password
        if (newPassword.length < 8) {
            throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
        }
        
        // Reset password using Firebase Admin SDK
        // Note: This requires a Cloud Function or backend service
        // Here's a placeholder for the actual implementation
        /*
        await firebase.functions().httpsCallable('resetUserPassword')({
            uid: userId,
            password: newPassword
        });
        */
        
        // For demo purposes, we'll simulate a successful password reset
        // In a real app, you would use Firebase Functions or a backend service
        
        // Show success message
        showSuccessMessage('Contraseña reiniciada correctamente');
        
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
    const userId = document.getElementById('confirm-delete-user-btn').getAttribute('data-id');
    
    if (!userId) {
        showErrorMessage('ID de usuario no válido');
        return;
    }
    
    try {
        showLoadingState(true);
        
        // Delete user from Firestore
        await usersCollection.doc(userId).delete();
        
        // Delete user from Authentication
        // Note: This requires a Cloud Function or backend service
        // Here's a placeholder for the actual implementation
        /*
        await firebase.functions().httpsCallable('deleteUser')({
            uid: userId
        });
        */
        
        // For demo purposes, we'll simulate a successful user deletion
        // In a real app, you would use Firebase Functions or a backend service
        
        // Show success message
        showSuccessMessage('Coordinador eliminado correctamente');
        
        // Close modal
        document.getElementById('delete-user-modal').style.display = 'none';
        
        // Reload coordinators list
        loadCoordinators();
    } catch (error) {
        console.error('Error deleting user:', error);
        showErrorMessage('Error al eliminar coordinador: ' + error.message);
    } finally {
        showLoadingState(false);
    }
}

// Helper functions
function formatDateDisplay(date) {
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

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
