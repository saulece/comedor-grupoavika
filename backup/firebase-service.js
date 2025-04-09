// Firebase Service - Servicio centralizado para operaciones de Firebase
// Este servicio encapsula todas las interacciones con Firebase para mejorar la consistencia y mantenibilidad

/**
 * Servicio centralizado para operaciones de Firebase
 */
class FirebaseService {
    constructor() {
        this.initialized = false;
        this.db = null;
        this.auth = null;
        this.collections = {
            employees: null,
            menus: null,
            confirmations: null,
            users: null
        };
        
        // Inicializar automáticamente si Firebase está disponible
        this.initialize();
    }
    
    /**
     * Inicializar el servicio de Firebase
     * @returns {boolean} - Si la inicialización fue exitosa
     */
    initialize() {
        if (this.initialized) return true;
        
        try {
            if (typeof firebase === 'undefined') {
                console.error("Firebase no está disponible. Asegúrese de incluir los scripts de Firebase.");
                return false;
            }
            
            // Obtener la configuración de Firebase
            const firebaseConfig = {
                apiKey: "AIzaSyCIyAwAEqFEw_bcqmun5BlNjVPiRy2-bMs",
                authDomain: "comedor-grupoavika.firebaseapp.com",
                databaseURL: "https://comedor-grupoavika-default-rtdb.firebaseio.com",
                projectId: "comedor-grupoavika",
                storageBucket: "comedor-grupoavika.appspot.com",
                messagingSenderId: "277401445097",
                appId: "1:277401445097:web:f1da7e5c8b3f3ab3570678",
                measurementId: "G-P3ZDJJQVW9"
            };
            
            // Verificar si Firebase ya está inicializado
            if (!firebase.apps || firebase.apps.length === 0) {
                // Inicializar Firebase directamente
                firebase.initializeApp(firebaseConfig);
                console.log("Firebase inicializado por FirebaseService");
            } else {
                console.log("Firebase ya estaba inicializado");
            }
            
            // Obtener referencias a los servicios de Firebase
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            
            // Inicializar referencias a colecciones
            this.collections.employees = this.db.collection('employees');
            this.collections.menus = this.db.collection('menus');
            this.collections.confirmations = this.db.collection('confirmations');
            this.collections.users = this.db.collection('users');
            
            this.initialized = true;
            console.log("Servicio de Firebase inicializado correctamente");
            
            // Establecer variable global para compatibilidad
            window.firebaseInitialized = true;
            
            // Exponer instancias para compatibilidad con código existente
            window.db = this.db;
            
            return true;
        } catch (error) {
            console.error("Error al inicializar el servicio de Firebase:", error);
            return false;
        }
    }
    
    /**
     * Reintentar inicialización si falló previamente
     * @returns {boolean} - Si la inicialización fue exitosa
     */
    reinitialize() {
        this.initialized = false;
        return this.initialize();
    }
    
    /**
     * Obtener instancia de Firestore
     * @returns {FirebaseFirestore.Firestore} - Instancia de Firestore o null si no está inicializado
     */
    getFirestore() {
        if (!this.initialized && !this.initialize()) {
            console.error("Firebase no está inicializado correctamente");
            return null;
        }
        return this.db;
    }
    
    /**
     * Obtener instancia de Auth
     * @returns {FirebaseAuth.Auth} - Instancia de Auth o null si no está inicializado
     */
    getAuth() {
        if (!this.initialized && !this.initialize()) {
            console.error("Firebase no está inicializado correctamente");
            return null;
        }
        return this.auth;
    }
    
    /**
     * Obtener una colección específica
     * @param {string} collectionName - Nombre de la colección ('employees', 'menus', 'confirmations', 'users')
     * @returns {FirebaseFirestore.CollectionReference} - Referencia a la colección o null si no existe
     */
    getCollection(collectionName) {
        if (!this.initialized && !this.initialize()) {
            console.error("Firebase no está inicializado correctamente");
            return null;
        }
        
        if (this.collections[collectionName]) {
            return this.collections[collectionName];
        } else {
            // Si la colección no está predefinida, intentar obtenerla directamente
            return this.db.collection(collectionName);
        }
    }
    
    /**
     * Obtener un timestamp del servidor
     * @returns {FirebaseFirestore.FieldValue} - Timestamp del servidor o Date actual como fallback
     */
    getServerTimestamp() {
        if (!this.initialized && !this.initialize()) {
            console.error("Firebase no está inicializado correctamente");
            return new Date(); // Fallback a fecha local
        }
        
        return firebase.firestore.FieldValue.serverTimestamp();
    }
    
    /**
     * Iniciar sesión con email y contraseña
     * @param {string} email - Email del usuario
     * @param {string} password - Contraseña del usuario
     * @returns {Promise<Object>} - Promesa con los datos del usuario
     */
    async login(email, password) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Obtener datos adicionales del usuario desde Firestore
            const userDoc = await this.collections.users.doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                return {
                    uid: user.uid,
                    email: user.email,
                    ...userData
                };
            } else {
                throw new Error("No se encontraron datos del usuario");
            }
        } catch (error) {
            console.error("Error de autenticación:", error);
            throw error;
        }
    }
    
    /**
     * Cerrar sesión del usuario actual
     * @returns {Promise<void>} - Promesa que se resuelve cuando se completa el cierre de sesión
     */
    async logout() {
        try {
            console.log("Cerrando sesión en Firebase...");
            
            if (!this.auth) {
                console.warn("Auth no está inicializado, no se puede cerrar sesión");
                return;
            }
            
            // Limpiar cualquier estado interno del servicio
            this._clearAuthState();
            
            // Cerrar sesión en Firebase
            await this.auth.signOut();
            
            console.log("Sesión cerrada en Firebase exitosamente");
        } catch (error) {
            console.error("Error al cerrar sesión en Firebase:", error);
            throw error;
        }
    }
    
    /**
     * Limpiar estado interno de autenticación
     * @private
     */
    _clearAuthState() {
        // Limpiar cualquier caché o estado interno relacionado con la autenticación
        this.currentUser = null;
        
        // Reiniciar listeners de autenticación si es necesario
        if (this._authUnsubscribe) {
            this._authUnsubscribe();
            this._authUnsubscribe = null;
        }
    }
    
    /**
     * Obtener usuario actual
     * @returns {FirebaseAuth.User|null} - Usuario actual o null si no hay sesión
     */
    getCurrentUser() {
        if (!this.initialized && !this.initialize()) {
            console.error("Firebase no está inicializado correctamente");
            return null;
        }
        
        return this.auth.currentUser;
    }
    
    /**
     * Verificar si hay un usuario autenticado
     * @returns {boolean} - true si hay un usuario autenticado
     */
    isAuthenticated() {
        return this.getCurrentUser() !== null;
    }
    
    // OPERACIONES PARA MENÚS
    
    /**
     * Obtener menú por fecha de inicio de semana
     * @param {string} weekStartDate - Fecha de inicio de semana en formato YYYY-MM-DD
     * @returns {Promise<Object>} - Datos del menú
     */
    async getMenuByWeek(weekStartDate) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            const menuDoc = await this.collections.menus.doc(weekStartDate).get();
            if (menuDoc.exists) {
                return {
                    id: menuDoc.id,
                    ...menuDoc.data()
                };
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error al obtener menú:", error);
            throw error;
        }
    }
    
    /**
     * Guardar menú
     * @param {string} weekStartDate - Fecha de inicio de semana en formato YYYY-MM-DD
     * @param {Object} menuData - Datos del menú
     * @returns {Promise<string>} - ID del documento
     */
    async saveMenu(weekStartDate, menuData) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            // Añadir timestamps
            menuData.updatedAt = this.getServerTimestamp();
            
            const menuRef = this.collections.menus.doc(weekStartDate);
            const menuDoc = await menuRef.get();
            
            if (!menuDoc.exists) {
                // Es un nuevo menú
                menuData.createdAt = this.getServerTimestamp();
                await menuRef.set(menuData);
            } else {
                // Actualizar menú existente
                await menuRef.update(menuData);
            }
            
            return weekStartDate;
        } catch (error) {
            console.error("Error al guardar menú:", error);
            throw error;
        }
    }
    
    /**
     * Publicar menú
     * @param {string} weekStartDate - Fecha de inicio de semana en formato YYYY-MM-DD
     * @returns {Promise<void>}
     */
    async publishMenu(weekStartDate) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            await this.collections.menus.doc(weekStartDate).update({
                published: true,
                publishedAt: this.getServerTimestamp()
            });
        } catch (error) {
            console.error("Error al publicar menú:", error);
            throw error;
        }
    }
    
    // OPERACIONES PARA CONFIRMACIONES
    
    /**
     * Obtener confirmación por fecha y departamento
     * @param {string} date - Fecha en formato YYYY-MM-DD
     * @param {string} departmentId - ID del departamento
     * @returns {Promise<FirebaseFirestore.QuerySnapshot>} - Snapshot con los resultados
     */
    async getConfirmationByDateAndDepartment(date, departmentId) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            return await this.collections.confirmations
                .where('date', '==', date)
                .where('departmentId', '==', departmentId)
                .get();
        } catch (error) {
            console.error("Error al obtener confirmación:", error);
            throw error;
        }
    }
    
    /**
     * Guardar confirmación
     * @param {string|null} confirmationId - ID de la confirmación (null para crear nueva)
     * @param {Object} confirmationData - Datos de la confirmación
     * @returns {Promise<string>} - ID del documento
     */
    async saveConfirmation(confirmationId, confirmationData) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            // Añadir timestamp de actualización
            confirmationData.updatedAt = this.getServerTimestamp();
            
            if (!confirmationId) {
                // Crear nueva confirmación
                confirmationData.createdAt = this.getServerTimestamp();
                const docRef = await this.collections.confirmations.add(confirmationData);
                return docRef.id;
            } else {
                // Actualizar confirmación existente
                await this.collections.confirmations.doc(confirmationId).update(confirmationData);
                return confirmationId;
            }
        } catch (error) {
            console.error("Error al guardar confirmación:", error);
            throw error;
        }
    }
    
    // OPERACIONES PARA EMPLEADOS
    
    /**
     * Obtener empleados por departamento
     * @param {string} departmentId - ID del departamento
     * @returns {Promise<Array>} - Lista de empleados
     */
    async getEmployeesByDepartment(departmentId) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            const snapshot = await this.collections.employees
                .where('departmentId', '==', departmentId)
                .get();
                
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error("Error al obtener empleados:", error);
            throw error;
        }
    }
    
    /**
     * Guardar empleado
     * @param {string|null} employeeId - ID del empleado (null para crear nuevo)
     * @param {Object} employeeData - Datos del empleado
     * @returns {Promise<string>} - ID del documento
     */
    async saveEmployee(employeeId, employeeData) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            // Añadir timestamp de actualización
            employeeData.updatedAt = this.getServerTimestamp();
            
            if (!employeeId) {
                // Crear nuevo empleado
                employeeData.createdAt = this.getServerTimestamp();
                const docRef = await this.collections.employees.add(employeeData);
                return docRef.id;
            } else {
                // Actualizar empleado existente
                await this.collections.employees.doc(employeeId).update(employeeData);
                return employeeId;
            }
        } catch (error) {
            console.error("Error al guardar empleado:", error);
            throw error;
        }
    }
    
    /**
     * Eliminar empleado
     * @param {string} employeeId - ID del empleado
     * @returns {Promise<void>}
     */
    async deleteEmployee(employeeId) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            await this.collections.employees.doc(employeeId).delete();
        } catch (error) {
            console.error("Error al eliminar empleado:", error);
            throw error;
        }
    }
    
    // OPERACIONES PARA CONFIRMACIONES
    
    /**
     * Obtener confirmaciones por fecha
     * @param {string} date - Fecha en formato YYYY-MM-DD
     * @returns {Promise<FirebaseFirestore.QuerySnapshot>} - Snapshot con los resultados
     */
    async getConfirmationsByDate(date) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            return await this.collections.confirmations
                .where('date', '==', date)
                .get();
        } catch (error) {
            console.error("Error al obtener confirmaciones:", error);
            throw error;
        }
    }
    
    /**
     * Obtener confirmaciones por departamento y fecha
     * @param {string} departmentId - ID del departamento
     * @param {string} date - Fecha en formato YYYY-MM-DD
     * @returns {Promise<Object|null>} - Datos de la confirmación o null si no existe
     */
    async getConfirmationByDepartmentAndDate(departmentId, date) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            const querySnapshot = await this.collections.confirmations
                .where('departmentId', '==', departmentId)
                .where('date', '==', date)
                .limit(1)
                .get();
            
            if (querySnapshot.empty) {
                return null;
            }
            
            const doc = querySnapshot.docs[0];
            return {
                id: doc.id,
                ...doc.data()
            };
        } catch (error) {
            console.error("Error al obtener confirmación:", error);
            throw error;
        }
    }
    
    /**
     * Guardar o actualizar confirmación
     * @param {Object} confirmationData - Datos de la confirmación
     * @returns {Promise<string>} - ID del documento
     */
    async saveConfirmation(confirmationData) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            // Verificar si ya existe una confirmación para este departamento y fecha
            let confirmationId = null;
            
            if (confirmationData.departmentId && confirmationData.date) {
                const existingConfirmation = await this.getConfirmationByDepartmentAndDate(
                    confirmationData.departmentId,
                    confirmationData.date
                );
                
                if (existingConfirmation) {
                    confirmationId = existingConfirmation.id;
                }
            }
            
            // Añadir timestamps
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            confirmationData.updatedAt = timestamp;
            
            let docRef;
            
            if (confirmationId) {
                // Actualizar confirmación existente
                docRef = this.collections.confirmations.doc(confirmationId);
                await docRef.update(confirmationData);
            } else {
                // Crear nueva confirmación
                confirmationData.createdAt = timestamp;
                docRef = await this.collections.confirmations.add(confirmationData);
            }
            
            return docRef.id;
        } catch (error) {
            console.error("Error al guardar confirmación:", error);
            throw error;
        }
    }
    
    /**
     * Verificar la validez del token de autenticación actual
     * @returns {Promise<boolean>} - Promesa que se resuelve con true si el token es válido
     */
    async verifyAuthToken() {
        try {
            if (!this.initialized && !this.initialize()) {
                console.error("Firebase no está inicializado correctamente");
                return false;
            }
            
            if (!this.auth) {
                console.error("Auth no está inicializado");
                return false;
            }
            
            // Obtener el usuario actual
            const currentUser = this.auth.currentUser;
            
            if (!currentUser) {
                console.warn("No hay usuario autenticado");
                return false;
            }
            
            // Verificar si el token está expirado
            try {
                // Forzar la actualización del token para verificar su validez
                await currentUser.getIdToken(true);
                
                // Si llegamos aquí, el token es válido
                return true;
            } catch (tokenError) {
                console.error("Error al verificar token:", tokenError);
                return false;
            }
        } catch (error) {
            console.error("Error al verificar autenticación:", error);
            return false;
        }
    }
    
    /**
     * Obtener el token de ID del usuario actual
     * @param {boolean} forceRefresh - Si se debe forzar la actualización del token
     * @returns {Promise<string|null>} - Promesa con el token o null si no hay usuario
     */
    async getIdToken(forceRefresh = false) {
        try {
            if (!this.initialized && !this.initialize()) {
                console.error("Firebase no está inicializado correctamente");
                return null;
            }
            
            if (!this.auth || !this.auth.currentUser) {
                console.warn("No hay usuario autenticado");
                return null;
            }
            
            // Obtener el token de ID
            return await this.auth.currentUser.getIdToken(forceRefresh);
        } catch (error) {
            console.error("Error al obtener token:", error);
            return null;
        }
    }
    
    /**
     * Verificar si el usuario actual tiene un rol específico
     * @param {string} requiredRole - Rol requerido
     * @returns {Promise<boolean>} - Promesa que se resuelve con true si el usuario tiene el rol
     */
    async verifyUserRole(requiredRole) {
        try {
            if (!this.initialized && !this.initialize()) {
                console.error("Firebase no está inicializado correctamente");
                return false;
            }
            
            if (!this.auth || !this.auth.currentUser) {
                console.warn("No hay usuario autenticado");
                return false;
            }
            
            // Obtener el ID del usuario actual
            const uid = this.auth.currentUser.uid;
            
            // Obtener los datos del usuario desde Firestore
            const userDoc = await this.collections.users.doc(uid).get();
            
            if (!userDoc.exists) {
                console.warn("No se encontraron datos del usuario en Firestore");
                return false;
            }
            
            const userData = userDoc.data();
            
            // Verificar si el usuario tiene el rol requerido
            return userData.role === requiredRole;
        } catch (error) {
            console.error("Error al verificar rol del usuario:", error);
            return false;
        }
    }
}

// Crear instancia global del servicio
window.firebaseService = new FirebaseService();

// Exportar la instancia para uso en módulos
export default window.firebaseService;
