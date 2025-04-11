// Auth Service - Handles all authentication related operations
// Prevent duplicate declarations
if (typeof loginWithEmail !== 'function') {

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - Firebase auth promise
 */
function loginWithEmail(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}

/**
 * Logout current user
 * @returns {Promise} - Firebase auth promise
 */
function logout() {
    return auth.signOut();
}

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise} - Firebase auth promise
 */
function resetPassword(email) {
    return auth.sendPasswordResetEmail(email);
}

/**
 * Get current user role from Firestore
 * @returns {Promise<string>} - Returns user role (admin/coordinator)
 */
async function getCurrentUserRole() {
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
    const role = await getCurrentUserRole();
    return role === 'admin';
}

/**
 * Check if current user is coordinator
 * @returns {Promise<boolean>} - True if user is coordinator
 */
async function isUserCoordinator() {
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

// Cierre del bloque condicional para evitar declaraciones duplicadas
}