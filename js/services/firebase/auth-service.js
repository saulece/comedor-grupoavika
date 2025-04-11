// Auth Service - Handles all authentication related operations

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - Firebase auth promise
 */
async function loginWithEmail(email, password) {
    // Verificar si estamos en modo desarrollo y si debemos usar usuarios de prueba
    if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE && 
        typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.useTestData) {
        
        // Registrar intento de login en modo desarrollo
        if (typeof devLog === 'function') {
            devLog(`Intento de login en modo desarrollo: ${email}`);
        }
        
        // Verificar si tenemos datos de prueba disponibles
        if (typeof TEST_USERS !== 'undefined') {
            // Buscar usuario de prueba por email
            const testUser = Object.values(TEST_USERS).find(user => user.email === email);
            
            if (testUser && testUser.password === password) {
                if (typeof devLog === 'function') {
                    devLog(`Login exitoso con usuario de prueba: ${email}`, testUser);
                }
                
                // Simular login exitoso
                return simulateTestUserLogin(testUser);
            }
        }
        
        // Si llegamos aquí, no se encontró un usuario de prueba válido
        // Continuar con el flujo normal de autenticación
    }
    
    // Flujo normal de autenticación
    return auth.signInWithEmailAndPassword(email, password);
}

/**
 * Simula el login de un usuario de prueba
 * @param {Object} testUser - Datos del usuario de prueba
 * @returns {Promise} - Promesa que simula el resultado de Firebase auth
 */
async function simulateTestUserLogin(testUser) {
    // Crear un objeto que simule el resultado de Firebase auth
    const userCredential = {
        user: {
            uid: testUser.uid,
            email: testUser.email,
            displayName: testUser.displayName,
            emailVerified: true,
            isAnonymous: false,
            metadata: {
                creationTime: new Date().toISOString(),
                lastSignInTime: new Date().toISOString()
            },
            providerData: [
                {
                    providerId: 'password',
                    uid: testUser.email,
                    displayName: testUser.displayName,
                    email: testUser.email,
                    phoneNumber: null,
                    photoURL: null
                }
            ],
            refreshToken: 'test-refresh-token',
            tenantId: null,
            delete: () => Promise.resolve(),
            getIdToken: () => Promise.resolve('test-id-token'),
            getIdTokenResult: () => Promise.resolve({
                token: 'test-id-token',
                authTime: new Date().toISOString(),
                issuedAtTime: new Date().toISOString(),
                expirationTime: new Date(Date.now() + 3600000).toISOString(),
                signInProvider: 'password',
                claims: {}
            }),
            reload: () => Promise.resolve(),
            toJSON: () => ({ ...testUser })
        }
    };
    
    // Guardar el usuario de prueba en localStorage para simular persistencia
    localStorage.setItem('dev_current_user', JSON.stringify(testUser));
    
    // Simular un pequeño retraso para que parezca una operación real
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return userCredential;
}

/**
 * Logout current user
 * @returns {Promise} - Firebase auth promise
 */
async function logout() {
    // Verificar si estamos en modo desarrollo con usuario de prueba
    if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE && 
        localStorage.getItem('dev_current_user')) {
        
        // Registrar logout en modo desarrollo
        if (typeof devLog === 'function') {
            devLog('Logout de usuario de prueba');
        }
        
        // Eliminar usuario de prueba del localStorage
        localStorage.removeItem('dev_current_user');
        
        // Simular un pequeño retraso
        await new Promise(resolve => setTimeout(resolve, 300));
        
        return Promise.resolve();
    }
    
    // Flujo normal de logout
    return auth.signOut();
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise} - Firebase auth promise
 */
async function resetPassword(email) {
    // Verificar si estamos en modo desarrollo
    if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE) {
        // Registrar solicitud de reseteo de contraseña en modo desarrollo
        if (typeof devLog === 'function') {
            devLog(`Solicitud de reseteo de contraseña para: ${email}`);
        }
        
        // Verificar si tenemos datos de prueba disponibles
        if (typeof TEST_USERS !== 'undefined') {
            // Buscar usuario de prueba por email
            const testUser = Object.values(TEST_USERS).find(user => user.email === email);
            
            if (testUser) {
                if (typeof devLog === 'function') {
                    devLog(`Reseteo de contraseña simulado para usuario de prueba: ${email}`);
                }
                
                // Simular un pequeño retraso
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                return Promise.resolve();
            }
        }
    }
    
    // Flujo normal de reseteo de contraseña
    return auth.sendPasswordResetEmail(email);
}

/**
 * Get current user role from Firestore
 * @returns {Promise<string>} - Returns user role (admin/coordinator)
 */
async function getCurrentUserRole() {
    // Verificar si estamos en modo desarrollo con usuario de prueba
    if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE) {
        // Verificar si hay un usuario de prueba en localStorage
        const devUserJson = localStorage.getItem('dev_current_user');
        if (devUserJson) {
            try {
                const devUser = JSON.parse(devUserJson);
                if (devUser && devUser.role) {
                    if (typeof devLog === 'function') {
                        devLog(`Obteniendo rol de usuario de prueba: ${devUser.role}`);
                    }
                    return devUser.role;
                }
            } catch (e) {
                console.error('Error parsing dev user JSON:', e);
            }
        }
        
        // Si estamos en modo desarrollo con bypass de validación de roles
        if (typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.bypassRoleValidation) {
            if (typeof devLog === 'function') {
                devLog('Bypass de validación de roles activado, devolviendo rol admin');
            }
            return 'admin'; // Devolver rol admin para permitir acceso a todas las secciones
        }
    }
    
    // Flujo normal para obtener el rol del usuario
    const user = auth.currentUser;
    
    if (!user) {
        return null;
    }
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            return userDoc.data().role;
        } else {
            console.error('User document not found in Firestore');
            return null;
        }
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
}

/**
 * Get current user branch
 * @returns {Promise<string>} - Returns user branch (for coordinators)
 */
async function getCurrentUserBranch() {
    // Verificar si estamos en modo desarrollo con usuario de prueba
    if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE) {
        // Verificar si hay un usuario de prueba en localStorage
        const devUserJson = localStorage.getItem('dev_current_user');
        if (devUserJson) {
            try {
                const devUser = JSON.parse(devUserJson);
                if (devUser && devUser.branch) {
                    if (typeof devLog === 'function') {
                        devLog(`Obteniendo sucursal de usuario de prueba: ${devUser.branch}`);
                    }
                    return devUser.branch;
                }
            } catch (e) {
                console.error('Error parsing dev user JSON:', e);
            }
        }
        
        // Si estamos en modo desarrollo con bypass de validación de roles
        if (typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.bypassRoleValidation) {
            if (typeof devLog === 'function') {
                devLog('Bypass de validación de roles activado, devolviendo sucursal de prueba');
            }
            return 'test-branch-1'; // Devolver sucursal de prueba
        }
    }
    
    // Flujo normal para obtener la sucursal del usuario
    const user = auth.currentUser;
    
    if (!user) {
        return null;
    }
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            return userDoc.data().branch || null;
        } else {
            console.error('User document not found in Firestore');
            return null;
        }
    } catch (error) {
        console.error('Error getting user branch:', error);
        return null;
    }
}

/**
 * Check if current user is admin
 * @returns {Promise<boolean>} - True if user is admin
 */
async function isUserAdmin() {
    // Verificar si estamos en modo desarrollo con bypass de validación de roles
    if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE && 
        typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.bypassRoleValidation) {
        if (typeof devLog === 'function') {
            devLog('Bypass de validación de roles activado, devolviendo true para isUserAdmin');
        }
        return true;
    }
    
    const role = await getCurrentUserRole();
    return role === 'admin';
}

/**
 * Check if current user is coordinator
 * @returns {Promise<boolean>} - True if user is coordinator
 */
async function isUserCoordinator() {
    // Verificar si estamos en modo desarrollo con bypass de validación de roles
    if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE && 
        typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.bypassRoleValidation) {
        if (typeof devLog === 'function') {
            devLog('Bypass de validación de roles activado, devolviendo true para isUserCoordinator');
        }
        return true;
    }
    
    const role = await getCurrentUserRole();
    return role === 'coordinator';
}

/**
 * Update user last login timestamp
 * @returns {Promise} - Firestore update promise
 */
async function updateLastLogin() {
    const user = auth.currentUser;
    
    if (!user) {
        return null;
    }
    
    return db.collection('users').doc(user.uid).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    });
}