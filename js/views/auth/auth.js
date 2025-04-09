// Authentication module for Comedor Grupo Avika - Firebase v8 approach

// Importar utilidades comunes si están disponibles
const commonUtils = window.commonUtils || {};
const firebaseService = window.firebaseService;

// User Roles
const USER_ROLES = commonUtils.CONSTANTS ? commonUtils.CONSTANTS.USER_ROLES : {
    ADMIN: 'admin',
    COORDINATOR: 'coordinator',
    EMPLOYEE: 'employee'
};

/**
 * Check if route requires authentication and correct role
 * @param {string} requiredRole - Role required for access
 * @returns {boolean} - Whether user has access
 */
function checkAuth(requiredRole) {
    console.log(`Verificando autenticación para rol: ${requiredRole}`);
    
    // Asegurarnos de que el servicio de Firebase esté disponible
    if (!window.firebaseService) {
        console.warn('Servicio de Firebase no disponible. Redirigiendo a login...');
        redirectToLogin();
        return false;
    }
    
    // Normalizar el rol requerido
    let normalizedRole = requiredRole;
    if (requiredRole === 'admin') normalizedRole = USER_ROLES.ADMIN;
    if (requiredRole === 'coordinator') normalizedRole = USER_ROLES.COORDINATOR;
    
    // Verificar si hay un usuario en la sesión
    const currentUser = getCurrentUser();
    
    if (!currentUser || !currentUser.uid) {
        console.warn('No hay usuario autenticado');
        // Redirect to login page
        redirectToLogin();
        return false;
    }
    
    // Si no se requiere un rol específico, solo verificar autenticación
    if (!normalizedRole) {
        return true;
    }
    
    // Verificar si el usuario tiene el rol requerido
    if (currentUser.role !== normalizedRole) {
        console.warn(`Rol requerido: ${normalizedRole}, rol del usuario: ${currentUser.role}`);
        // Redirect to appropriate page based on role
        redirectBasedOnRole(currentUser.role);
        return false;
    }
    
    return true;
}

/**
 * Get current user data from session storage
 * @returns {Object|null} - User object or null if not logged in
 */
function getCurrentUserFromSession() {
    try {
        // Intentar obtener objeto de usuario completo
        const userJson = sessionStorage.getItem('currentUser');
        if (!userJson) {
            return null;
        }
        
        return JSON.parse(userJson);
    } catch (error) {
        console.error('Error al obtener usuario de la sesión:', error);
        return null;
    }
}

/**
 * Obtiene los datos del usuario actual
 * Función centralizada para acceder a los datos del usuario en toda la aplicación
 * @returns {Object} - Objeto con datos del usuario o un objeto vacío si no hay usuario
 */
function getCurrentUser() {
    const user = getCurrentUserFromSession();
    
    if (!user) {
        // Si no hay usuario en la sesión, intentar obtener solo el rol (compatibilidad)
        const role = sessionStorage.getItem('userRole');
        if (role) {
            return { role };
        }
        return {};
    }
    
    return user;
}

/**
 * Obtiene el rol del usuario actual
 * @returns {string|null} - Rol del usuario o null si no está autenticado
 */
function getCurrentUserRole() {
    const user = getCurrentUser();
    return user ? user.role : null;
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
    const currentPath = window.location.pathname;
    // Check if we're not already on the login page to avoid redirect loop
    if (!currentPath.includes('index.html') && currentPath !== '/') {
        window.location.href = getBasePath() + "index.html";
    }
}

/**
 * Get base path depending on current location
 * @returns {string} - Base path to use for redirects
 */
function getBasePath() {
    let basePath = "";
    
    // Determine if we're in a subfolder by checking the current path
    if (window.location.pathname.includes('/pages/')) {
        basePath = "../../";
    }
    
    return basePath;
}

/**
 * Redirect user based on their role
 * @param {string} role - User role
 */
function redirectBasedOnRole(role) {
    let basePath = getBasePath();
    
    switch (role) {
        case USER_ROLES.ADMIN:
            window.location.href = basePath + "pages/admin/dashboard.html";
            break;
        case USER_ROLES.COORDINATOR:
            window.location.href = basePath + "pages/coordinator/dashboard.html";
            break;
        case USER_ROLES.EMPLOYEE:
            window.location.href = basePath + "pages/employee/dashboard.html";
            break;
        default:
            showError("Rol de usuario no reconocido");
            // Sign out if role is invalid
            logout();
    }
}

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} csrfToken - CSRF token for security validation
 * @returns {Promise<object>} - User object if successful
 */
async function loginUser(email, password, csrfToken) {
    try {
        // Asegurarnos de que el servicio de Firebase esté disponible
        if (!window.firebaseService) {
            throw new Error('Servicio de Firebase no disponible');
        }
        
        // Show loader and disable button if they exist
        const loginButton = document.getElementById("loginButton");
        const loginLoader = document.getElementById("loginLoader");
        
        if (loginButton) loginButton.disabled = true;
        if (loginLoader) loginLoader.style.display = "block";
        
        // Clear previous errors
        clearError();
        
        // Validate inputs
        if (!email || !password) {
            throw new Error("Por favor ingrese su correo y contraseña");
        }
        
        // Validate CSRF token
        if (!csrfToken) {
            console.warn("Advertencia: Token CSRF no proporcionado");
        } else if (window.csrfProtection && !window.csrfProtection.verify(csrfToken)) {
            throw new Error("Error de seguridad: Token inválido. Por favor, recarga la página e intenta nuevamente.");
        }
        
        let userData;
        
        // Use firebase service to login
        userData = await window.firebaseService.login(email, password);
        
        if (!userData) {
            throw new Error("Error al obtener datos del usuario");
        }
        
        // Store user data in session
        sessionStorage.setItem("currentUser", JSON.stringify(userData));
        
        // For backwards compatibility
        sessionStorage.setItem("userId", userData.uid);
        sessionStorage.setItem("userEmail", userData.email);
        sessionStorage.setItem("userName", userData.displayName || userData.name || "");
        sessionStorage.setItem("userRole", userData.role);
        
        if (userData.departmentId) {
            sessionStorage.setItem("userDepartmentId", userData.departmentId);
            sessionStorage.setItem("userDepartment", userData.department || "");
        }
        
        // Regenerate CSRF token after successful login for enhanced security
        if (window.csrfProtection) {
            const newToken = window.csrfProtection.generateToken();
            window.csrfProtection.storeToken(newToken);
        }
        
        console.log("Login exitoso:", userData);
        
        // Redirect based on role
        redirectBasedOnRole(userData.role);
        
        return userData;
    } catch (error) {
        console.error("Error de autenticación:", error);
        
        // Reset UI
        const loginButton = document.getElementById("loginButton");
        const loginLoader = document.getElementById("loginLoader");
        
        if (loginButton) loginButton.disabled = false;
        if (loginLoader) loginLoader.style.display = "none";
        
        // Show friendly error message
        handleAuthError(error);
        
        throw error;
    }
}

/**
 * Handle authentication errors with friendly messages
 * @param {Error} error - Error object
 */
function handleAuthError(error) {
    let message = "Error de autenticación. Por favor intente nuevamente.";
    
    if (error.code) {
        switch (error.code) {
            case 'auth/user-not-found':
                message = "Usuario no encontrado. Verifique su correo electrónico.";
                break;
            case 'auth/wrong-password':
                message = "Contraseña incorrecta. Por favor intente nuevamente.";
                break;
            case 'auth/invalid-email':
                message = "Formato de correo electrónico inválido.";
                break;
            case 'auth/user-disabled':
                message = "Este usuario ha sido deshabilitado. Contacte al administrador.";
                break;
            case 'auth/too-many-requests':
                message = "Demasiados intentos fallidos. Por favor intente más tarde.";
                break;
            default:
                message = error.message || message;
        }
    } else if (error.message) {
        message = error.message;
    }
    
    showError(message);
}

/**
 * Display error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
    // Use common utils if available
    if (window.uiMessageHandler) {
        window.uiMessageHandler.showError(message);
        return;
    }
    
    // Fallback to direct DOM manipulation
    const errorElement = document.getElementById("loginError");
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = "block";
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            clearError();
        }, 5000);
    } else {
        alert(message);
    }
}

/**
 * Clear error message
 */
function clearError() {
    const errorElement = document.getElementById("loginError");
    if (errorElement) {
        errorElement.textContent = "";
        errorElement.style.display = "none";
    }
}

/**
 * Log out current user
 * Limpia toda la información de sesión, tokens y variables globales
 * @returns {Promise<void>}
 */
async function logout() {
    try {
        console.log("Cerrando sesión y limpiando datos...");
        
        // 1. Limpiar sessionStorage completamente
        sessionStorage.clear();
        
        // 2. Limpiar localStorage si se usa para almacenar información de sesión
        // Opcionalmente, podemos limpiar solo claves específicas relacionadas con la autenticación
        const authKeys = ['firebase:authUser', 'firebase:token', 'userToken', 'refreshToken'];
        authKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
            }
        });
        
        // 3. Limpiar cookies relacionadas con la autenticación
        document.cookie.split(';').forEach(cookie => {
            const name = cookie.trim().split('=')[0];
            if (name.includes('firebase') || name.includes('token') || name.includes('session')) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });
        
        // 4. Limpiar variables globales relacionadas con el usuario
        window.currentUser = null;
        
        // 5. Cerrar sesión en Firebase
        if (window.firebaseService && typeof window.firebaseService.logout === 'function') {
            await window.firebaseService.logout();
        } else if (window.firebase && window.firebase.auth) {
            // Fallback al método directo de Firebase si el servicio no está disponible
            await window.firebase.auth().signOut();
        }
        
        console.log("Sesión cerrada exitosamente");
        
        // 6. Redireccionar a la página de login
        window.location.href = getBasePath() + "index.html";
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        
        // Forzar redirección incluso si hubo un error
        window.location.href = getBasePath() + "index.html";
    }
}

/**
 * Verificar la autenticación del usuario y validar el token
 * Función centralizada para proteger rutas y vistas
 * @param {string} requiredRole - Rol requerido para acceder a la ruta (opcional)
 * @returns {Promise<boolean>} - Promesa que se resuelve con true si el usuario está autenticado y tiene el rol requerido
 */
async function validateAuthToken(requiredRole = null) {
    console.log(`Validando token de autenticación${requiredRole ? ` para rol: ${requiredRole}` : ''}`);
    
    try {
        // Verificar que el servicio de Firebase esté disponible
        if (!window.firebaseService) {
            console.error('Servicio de Firebase no disponible');
            redirectToLogin();
            return false;
        }
        
        // Verificar la validez del token
        const isTokenValid = await window.firebaseService.verifyAuthToken();
        
        if (!isTokenValid) {
            console.warn('Token de autenticación inválido o expirado');
            // Limpiar datos de sesión
            sessionStorage.clear();
            redirectToLogin();
            return false;
        }
        
        // Si no se requiere un rol específico, solo verificar autenticación
        if (!requiredRole) {
            return true;
        }
        
        // Normalizar el rol requerido
        let normalizedRole = requiredRole;
        if (requiredRole === 'admin') normalizedRole = USER_ROLES.ADMIN;
        if (requiredRole === 'coordinator') normalizedRole = USER_ROLES.COORDINATOR;
        
        // Verificar si el usuario tiene el rol requerido
        const hasRole = await window.firebaseService.verifyUserRole(normalizedRole);
        
        if (!hasRole) {
            console.warn(`El usuario no tiene el rol requerido: ${normalizedRole}`);
            
            // Obtener el rol actual del usuario
            const currentUser = getCurrentUser();
            
            // Redirigir según el rol del usuario
            if (currentUser && currentUser.role) {
                redirectBasedOnRole(currentUser.role);
            } else {
                redirectToLogin();
            }
            
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error al validar token de autenticación:', error);
        redirectToLogin();
        return false;
    }
}

/**
 * Proteger una ruta o vista verificando la autenticación y el rol
 * Esta función debe llamarse al inicio de cada página protegida
 * @param {string} requiredRole - Rol requerido para acceder a la ruta (opcional)
 * @returns {Promise<void>}
 */
async function protectRoute(requiredRole = null) {
    // Mostrar indicador de carga si está disponible
    if (window.commonUtils && window.commonUtils.showLoading) {
        window.commonUtils.showLoading();
    }
    
    try {
        const isValid = await validateAuthToken(requiredRole);
        
        if (!isValid) {
            // La redirección ya se maneja en validateAuthToken
            return;
        }
        
        // Si llegamos aquí, la autenticación es válida
        console.log('Autenticación válida, acceso permitido');
        
    } catch (error) {
        console.error('Error al proteger ruta:', error);
        redirectToLogin();
    } finally {
        // Ocultar indicador de carga si está disponible
        if (window.commonUtils && window.commonUtils.hideLoading) {
            window.commonUtils.hideLoading();
        }
    }
}

// Exportar las nuevas funciones
window.validateAuthToken = validateAuthToken;
window.protectRoute = protectRoute;

// Check if user is already logged in when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Ensure Firebase service is available
    if (!window.firebaseService) {
        console.warn('Servicio de Firebase no disponible. Redirigiendo a login...');
        redirectToLogin();
        return;
    }
    
    // Check if we're on login page
    const isLoginPage = window.location.pathname.includes('index.html') || 
                        window.location.pathname === '/' || 
                        window.location.pathname.endsWith('/');
    
    if (isLoginPage) {
        // If we're on login page and user is already logged in, redirect to appropriate dashboard
        const currentUser = getCurrentUserFromSession();
        if (currentUser && currentUser.uid) {
            redirectBasedOnRole(currentUser.role);
        }
        
        // Setup login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const csrfToken = document.getElementById('csrfToken').value;
                
                try {
                    await loginUser(email, password, csrfToken);
                } catch (error) {
                    // Error is already handled in loginUser
                    console.log("Error manejado en loginUser");
                }
            });
        }
    }
});

// Export functions for global use
window.checkAuth = checkAuth;
window.loginUser = loginUser;
window.logout = logout;
window.showError = showError;
window.clearError = clearError;
window.getCurrentUser = getCurrentUser;
window.getCurrentUserRole = getCurrentUserRole;