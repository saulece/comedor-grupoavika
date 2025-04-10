// Auth.js - Handles login page interaction

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('loginError');
    const forgotPasswordLink = document.getElementById('forgotPassword');
    
    // Check if user is already logged in
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Update last login timestamp
            await updateLastLogin();
            
            // Redirect based on role
            const role = await getCurrentUserRole();
            
            if (role === 'admin') {
                window.location.href = 'pages/admin/dashboard.html';
            } else if (role === 'coordinator') {
                window.location.href = 'pages/coordinator/dashboard.html';
            } else {
                // Unknown role, logout user
                logout();
                loginError.textContent = 'Error: Rol de usuario no válido.';
            }
        }
    });
    
    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Clear previous error messages
        loginError.textContent = '';
        
        // Simple validation
        if (!email || !password) {
            loginError.textContent = 'Por favor, complete todos los campos.';
            return;
        }
        
        try {
            // Attempt to login
            await loginWithEmail(email, password);
            // Auth state change will handle redirection
        } catch (error) {
            console.error('Login error:', error);
            
            // Handle different error codes
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    loginError.textContent = 'Correo electrónico o contraseña incorrectos.';
                    break;
                case 'auth/too-many-requests':
                    loginError.textContent = 'Demasiados intentos fallidos. Intente más tarde.';
                    break;
                default:
                    loginError.textContent = 'Error al iniciar sesión. Intente nuevamente.';
            }
        }
    });
    
    // Forgot password functionality
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        
        if (!email) {
            loginError.textContent = 'Ingrese su correo electrónico para restablecer la contraseña.';
            return;
        }
        
        try {
            await resetPassword(email);
            loginError.textContent = '';
            alert('Se ha enviado un correo para restablecer su contraseña.');
        } catch (error) {
            console.error('Password reset error:', error);
            
            switch (error.code) {
                case 'auth/user-not-found':
                    loginError.textContent = 'No existe una cuenta con este correo electrónico.';
                    break;
                case 'auth/invalid-email':
                    loginError.textContent = 'Correo electrónico inválido.';
                    break;
                default:
                    loginError.textContent = 'Error al enviar correo. Intente nuevamente.';
            }
        }
    });
});