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
        // Redirect to login page
        const currentPath = window.location.pathname;
        // Check if we're not already on the login page to avoid redirect loop
        if (!currentPath.includes('index.html') && currentPath !== '/') {
            window.location.href = getBasePath() + "index.html";
        }
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
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Validate user role
            if (!userData.role || (userData.role !== USER_ROLES.ADMIN && userData.role !== USER_ROLES.COORDINATOR)) {
                throw new Error("Invalid user role");
            }
            
            // Create a user object
            const userObject = {
                uid: user.uid,
                email: user.email,
                displayName: userData.name,
                role: userData.role,
                branch: userData.branch || "",
                department: userData.department || "",
                departmentId: userData.departmentId || ""
            };
            
            // Save as JSON string
            sessionStorage.setItem("user", JSON.stringify(userObject));
            
            // Also save individual properties for backwards compatibility
            sessionStorage.setItem("userId", user.uid);
            sessionStorage.setItem("userEmail", user.email);
            sessionStorage.setItem("userName", userData.name);
            sessionStorage.setItem("userRole", userData.role);
            sessionStorage.setItem("userBranch", userData.branch || "");
            sessionStorage.setItem("userDepartment", userData.department || "");
            sessionStorage.setItem("userDepartmentId", userData.departmentId || "");
            
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
    } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Error de conexión. Verifica tu conexión a internet";
    } else if (error.message) {
        errorMessage = error.message;
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
    } else {
        console.error(message);
        alert("Error: " + message);
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
            window.location.href = getBasePath() + "index.html";
        })
        .catch((error) => {
            console.error("Logout error:", error);
            alert("Error al cerrar sesión: " + error.message);
        });
}

// Check if user is already logged in when page loads
firebase.auth().onAuthStateChanged(async (user) => {
    // Only handle auth state if we're on the login page
    const isLoginPage = window.location.pathname.endsWith("index.html") || 
                        window.location.pathname === "/";
                       
    if (isLoginPage && user) {
        try {
            // Get user data including role
            const userDoc = await firebase.firestore().collection("users").doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                
                // Save user data to session storage if not already there
                if (!sessionStorage.getItem("userRole")) {
                    // Create a user object
                    const userObject = {
                        uid: user.uid,
                        email: user.email,
                        displayName: userData.name,
                        role: userData.role,
                        branch: userData.branch || "",
                        department: userData.department || "",
                        departmentId: userData.departmentId || ""
                    };
                    
                    // Save as JSON string
                    sessionStorage.setItem("user", JSON.stringify(userObject));
                    
                    // Also save individual properties
                    sessionStorage.setItem("userId", user.uid);
                    sessionStorage.setItem("userEmail", user.email);
                    sessionStorage.setItem("userName", userData.name);
                    sessionStorage.setItem("userRole", userData.role);
                    sessionStorage.setItem("userBranch", userData.branch || "");
                    sessionStorage.setItem("userDepartment", userData.department || "");
                    sessionStorage.setItem("userDepartmentId", userData.departmentId || "");
                    
                    // Redirect to appropriate dashboard
                    redirectBasedOnRole(userData.role);
                }
            }
        } catch (error) {
            console.error("Error checking user role:", error);
        }
    }
});