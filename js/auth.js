// Authentication module for Comedor Grupo Avika - Firebase v8 approach

// User Roles
const USER_ROLES = {
    ADMIN: 'admin',
    COORDINATOR: 'coordinator'
};

/**
 * Check if route requires authentication and correct role
 * @param {string} requiredRole - Role required for access
 * @returns {boolean} - Whether user has access
 */
function checkAuth(requiredRole) {
    const userRole = sessionStorage.getItem("userRole");
    const userId = sessionStorage.getItem("userId");
    
    if (!userId) {
        window.location.href = "../../index.html";
        return false;
    }
    
    if (requiredRole && userRole !== requiredRole) {
        // Redirect to appropriate dashboard
        redirectBasedOnRole(userRole);
        return false;
    }
    
    return true;
}

/**
 * Redirect user based on their role
 * @param {string} role - User role
 */
function redirectBasedOnRole(role) {
    switch (role) {
        case USER_ROLES.ADMIN:
            window.location.href = "pages/admin/dashboard.html";
            break;
        case USER_ROLES.COORDINATOR:
            window.location.href = "pages/coordinator/dashboard.html";
            break;
        default:
            showError("Rol de usuario no reconocido");
            // Sign out if role is invalid
            firebase.auth().signOut();
    }
}

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} - User object if successful
 */
async function loginUser(email, password) {
    try {
        // Show loader and disable button if they exist
        const loginButton = document.getElementById("loginButton");
        const loginLoader = document.getElementById("loginLoader");
        
        if (loginButton) loginButton.disabled = true;
        if (loginLoader) loginLoader.style.display = "block";
        
        // Attempt login
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get additional user information from Firestore
        const userDoc = await firebase.firestore().collection("users").doc(user.uid).get();
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Save important information in sessionStorage
            sessionStorage.setItem("userRole", userData.role);
            sessionStorage.setItem("userBranch", userData.branch || "");
            sessionStorage.setItem("userName", userData.name);
            sessionStorage.setItem("userEmail", user.email);
            sessionStorage.setItem("userId", user.uid);
            
            // Redirect based on role
            redirectBasedOnRole(userData.role);
        } else {
            throw new Error("User information not found");
        }
        
        return user;
    } catch (error) {
        console.error("Authentication error:", error);
        
        // Handle authentication errors
        handleAuthError(error);
        
        // Re-enable login button and hide loader
        const loginButton = document.getElementById("loginButton");
        const loginLoader = document.getElementById("loginLoader");
        
        if (loginButton) loginButton.disabled = false;
        if (loginLoader) loginLoader.style.display = "none";
        
        throw error;
    }
}

/**
 * Handle authentication errors with friendly messages
 * @param {Error} error - Error object
 */
function handleAuthError(error) {
    let errorMessage = "Error al iniciar sesión";
    
    // Custom error messages
    if (error.code === "auth/user-not-found") {
        errorMessage = "Usuario no encontrado";
    } else if (error.code === "auth/wrong-password") {
        errorMessage = "Contraseña incorrecta";
    } else if (error.code === "auth/invalid-email") {
        errorMessage = "Correo electrónico inválido";
    } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Demasiados intentos fallidos. Intenta más tarde";
    }
    
    // Show error message
    showError(errorMessage);
}

/**
 * Display error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
    const errorElement = document.getElementById("loginError");
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = "block";
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
 */
function logout() {
    firebase.auth().signOut()
        .then(() => {
            // Clear session storage
            sessionStorage.clear();
            // Redirect to login page
            window.location.href = "../../index.html";
        })
        .catch((error) => {
            console.error("Logout error:", error);
        });
}

// Check if user is already logged in when page loads
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        try {
            // Get user data including role
            const userDoc = await firebase.firestore().collection("users").doc(user.uid).get();
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Save user data to session storage if not already there
                if (!sessionStorage.getItem("userRole")) {
                    sessionStorage.setItem("userRole", userData.role);
                    sessionStorage.setItem("userBranch", userData.branch || "");
                    sessionStorage.setItem("userName", userData.name);
                    sessionStorage.setItem("userEmail", user.email);
                    sessionStorage.setItem("userId", user.uid);
                    
                    // Only redirect if we're on the login page
                    if (window.location.pathname.endsWith("index.html") || 
                        window.location.pathname === "/") {
                        redirectBasedOnRole(userData.role);
                    }
                }
            }
        } catch (error) {
            console.error("Error checking user role:", error);
        }
    }
}); 