// Firebase Service - Servicio centralizado para operaciones de Firebase
// Este servicio encapsula todas las interacciones con Firebase para mejorar la consistencia y mantenibilidad

/**
 * Servicio centralizado para operaciones de Firebase
 * Esta clase gestiona todas las interacciones con Firebase Firestore y Authentication
 * para proporcionar una interfaz consistente y fácil de usar en toda la aplicación.
 * 
 * @class
 */
class FirebaseService {
    /**
     * Crea una nueva instancia del servicio de Firebase
     * e intenta inicializarlo automáticamente.
     * 
     * @constructor
     */
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
     * Inicializa el servicio de Firebase configurando la conexión
     * y estableciendo referencias a las colecciones principales.
     * Función crítica para el correcto funcionamiento de la aplicación.
     * 
     * @returns {boolean} - true si la inicialización fue exitosa, false en caso contrario
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
     * Reintenta la inicialización si falló previamente
     * 
     * @returns {boolean} - true si la inicialización fue exitosa, false en caso contrario
     */
    reinitialize() {
        this.initialized = false;
        return this.initialize();
    }
    
    /**
     * Maneja errores de Firebase, incluyendo errores de permisos
     * 
     * @private
     * @param {Error} error - Error a manejar
     * @param {string} operacion - Descripción de la operación que falló
     * @param {boolean} lanzarError - Si se debe lanzar el error después de manejarlo
     * @throws {Error} Si lanzarError es true
     */
    _handleError(error, operacion = 'realizar operación', lanzarError = true) {
        console.error(`Error al ${operacion}:`, error);
        
        // Usar utilidades de seguridad si están disponibles
        if (window.firebaseSecurityUtils && window.firebaseSecurityUtils.manejarErrorPermisos) {
            window.firebaseSecurityUtils.manejarErrorPermisos(error, operacion);
        } else {
            // Manejo básico de errores si las utilidades no están disponibles
            let mensaje = `Error al ${operacion}: ${error.message}`;
            
            // Detectar errores de permisos
            if (error.code === 'permission-denied') {
                mensaje = `No tienes permisos para ${operacion}. Contacta al administrador si crees que deberías tener acceso.`;
            }
            
            // Mostrar error si hay un servicio de errores disponible
            if (window.errorService && window.errorService.showError) {
                window.errorService.showError(mensaje);
            } else {
                console.error(mensaje);
            }
        }
        
        // Lanzar el error para manejo adicional si es necesario
        if (lanzarError) {
            throw error;
        }
    }
    
    /**
     * Obtiene la instancia de Firestore
     * Función crítica para acceder a la base de datos
     * 
     * @returns {FirebaseFirestore.Firestore|null} - Instancia de Firestore o null si no está inicializado
     */
    getFirestore() {
        if (!this.initialized && !this.initialize()) {
            console.error("Firebase no está inicializado correctamente");
            return null;
        }
        return this.db;
    }
    
    /**
     * Obtiene la instancia de Auth
     * 
     * @returns {FirebaseAuth.Auth|null} - Instancia de Auth o null si no está inicializado
     */
    getAuth() {
        if (!this.initialized && !this.initialize()) {
            console.error("Firebase no está inicializado correctamente");
            return null;
        }
        return this.auth;
    }
    
    /**
     * Obtiene una colección específica de Firestore
     * Función crítica para acceder a las colecciones de la base de datos
     * 
     * @param {string} collectionName - Nombre de la colección ('employees', 'menus', 'confirmations', 'users')
     * @returns {FirebaseFirestore.CollectionReference|null} - Referencia a la colección o null si no existe
     * @example
     * // Obtener la colección de menús
     * const menusCollection = firebaseService.getCollection('menus');
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
     * Obtiene un timestamp del servidor
     * 
     * @returns {FirebaseFirestore.FieldValue|Date} - Timestamp del servidor o Date actual como fallback
     */
    getServerTimestamp() {
        if (!this.initialized && !this.initialize()) {
            console.error("Firebase no está inicializado correctamente");
            return new Date(); // Fallback a fecha local
        }
        
        return firebase.firestore.FieldValue.serverTimestamp();
    }
    
    /**
     * Inicia sesión con email y contraseña
     * 
     * @param {string} email - Email del usuario
     * @param {string} password - Contraseña del usuario
     * @returns {Promise<Object>} - Promesa con los datos del usuario
     * @throws {Error} Si la autenticación falla o Firebase no está inicializado
     */
    async login(email, password) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Obtener datos adicionales del usuario desde Firestore
            const userDoc = await this.collections.users.doc(user.uid).get()
                .catch(error => {
                    // Si hay un error de permisos al leer el documento de usuario,
                    // podría ser porque las reglas de seguridad están aplicadas pero
                    // el usuario aún no tiene un rol asignado
                    this._handleError(error, "obtener datos de usuario", false);
                    return { exists: false, data: () => ({}) };
                });
            
            let userData = {};
            
            if (userDoc.exists) {
                userData = userDoc.data();
            } else {
                console.warn(`No se encontraron datos adicionales para el usuario ${user.uid}`);
            }
            
            // Combinar datos de autenticación con datos de Firestore
            const combinedUserData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || userData.displayName || email.split('@')[0],
                role: userData.role || 'employee', // Rol por defecto
                ...userData
            };
            
            // Guardar datos del usuario en localStorage para acceso rápido
            localStorage.setItem('currentUser', JSON.stringify(combinedUserData));
            
            return combinedUserData;
        } catch (error) {
            this._handleError(error, "iniciar sesión");
        }
    }
    
    /**
     * Cerrar sesión del usuario actual
     * 
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
     * 
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
     * 
     * @returns {boolean} - true si hay un usuario autenticado
     */
    isAuthenticated() {
        return this.getCurrentUser() !== null;
    }
    
    /**
     * Obtener menú por fecha de inicio de semana
     * Recupera los datos de un menú semanal desde Firestore
     * 
     * @async
     * @param {string} weekStartDate - Fecha de inicio de semana en formato YYYY-MM-DD
     * @returns {Promise<Object|null>} - Datos del menú o null si no existe
     * @throws {Error} Si Firebase no está inicializado o hay un error en la consulta
     * @example
     * // Obtener el menú de la semana actual
     * const menu = await firebaseService.getMenuByWeek('2023-05-15');
     * // Los datos incluyen días con acentos normalizados (ej: "miercoles" en lugar de "miércoles")
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
            this._handleError(error, `obtener menú para la semana ${weekStartDate}`);
        }
    }
    
    /**
     * Guardar menú
     * Almacena o actualiza un menú semanal en Firestore
     * 
     * @async
     * @param {string} weekStartDate - Fecha de inicio de semana en formato YYYY-MM-DD
     * @param {Object} menuData - Datos del menú a guardar
     * @returns {Promise<string>} - ID del documento (igual a weekStartDate)
     * @throws {Error} Si Firebase no está inicializado o hay un error al guardar
     * @example
     * // Guardar un menú con el día miércoles
     * await firebaseService.saveMenu('2023-05-15', {
     *   miercoles: { items: ['Sopa', 'Pollo'] },
     *   // Nota: Las claves deben estar normalizadas (sin acentos)
     *   // Usar commonUtils.TextUtils.normalizeMenuData() antes de guardar
     * });
     */
    async saveMenu(weekStartDate, menuData) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            // Verificar permisos primero con una lectura
            await this.collections.menus.doc(weekStartDate).get();
            
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
            this._handleError(error, `guardar menú para la semana ${weekStartDate}`);
        }
    }
    
    /**
     * Publicar menú
     * Cambia el estado de un menú a "published" y actualiza su timestamp
     * 
     * @async
     * @param {string} weekStartDate - Fecha de inicio de semana en formato YYYY-MM-DD
     * @returns {Promise<void>}
     * @throws {Error} Si Firebase no está inicializado o hay un error al publicar
     * @example
     * // Publicar el menú de la semana actual
     * await firebaseService.publishMenu('2023-05-15');
     */
    async publishMenu(weekStartDate) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            // Verificar permisos primero con una lectura
            await this.collections.menus.doc(weekStartDate).get();
            
            await this.collections.menus.doc(weekStartDate).update({
                status: 'published',
                updatedAt: this.getServerTimestamp()
            });
        } catch (error) {
            this._handleError(error, `publicar menú para la semana ${weekStartDate}`);
        }
    }
    
    /**
     * Obtener confirmación por fecha y departamento
     * 
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
            this._handleError(error, `obtener confirmación para ${date} y ${departmentId}`);
        }
    }
    
    /**
     * Guardar confirmación
     * 
     * @param {string|null} confirmationId - ID de la confirmación (null para crear nueva)
     * @param {Object} confirmationData - Datos de la confirmación
     * @returns {Promise<string>} - ID del documento
     */
    async saveConfirmation(confirmationId, confirmationData) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            // Añadir timestamps
            confirmationData.updatedAt = this.getServerTimestamp();
            
            if (!confirmationId) {
                // Es una nueva confirmación
                confirmationData.createdAt = this.getServerTimestamp();
                const docRef = await this.collections.confirmations.add(confirmationData);
                return docRef.id;
            } else {
                // Actualizar confirmación existente
                await this.collections.confirmations.doc(confirmationId).update(confirmationData);
                return confirmationId;
            }
        } catch (error) {
            this._handleError(error, "guardar confirmación");
        }
    }
    
    /**
     * Obtener empleados por departamento
     * 
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
            this._handleError(error, `obtener empleados del departamento ${departmentId}`);
        }
    }
    
    /**
     * Guardar empleado
     * 
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
            this._handleError(error, `guardar empleado ${employeeId}`);
        }
    }
    
    /**
     * Eliminar empleado
     * 
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
            this._handleError(error, `eliminar empleado ${employeeId}`);
        }
    }
    
    /**
     * Obtener confirmaciones por fecha
     * 
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
            this._handleError(error, `obtener confirmaciones para ${date}`);
        }
    }
    
    /**
     * Obtener confirmaciones por departamento y fecha
     * 
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
            this._handleError(error, `obtener confirmación para ${departmentId} y ${date}`);
        }
    }
    
    /**
     * Verificar la validez del token de autenticación actual
     * 
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
     * 
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
     * 
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
    
    /**
     * Obtener un documento específico de una colección
     * 
     * @param {string} collectionName - Nombre de la colección
     * @param {string} docId - ID del documento
     * @param {boolean} [includeId=true] - Si se debe incluir el ID en el resultado
     * @returns {Promise<Object|null>} - Promesa con los datos del documento o null si no existe
     * @throws {Error} Si ocurre un error durante la operación
     * @example
     * // Obtener un menú específico
     * const menu = await firebaseService.getDocument('menus', 'menu1');
     */
    async getDocument(collectionName, docId, includeId = true) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            const collection = this.getCollection(collectionName);
            if (!collection) {
                throw new Error(`Colección ${collectionName} no encontrada`);
            }
            
            const doc = await collection.doc(docId).get();
            
            if (!doc.exists) {
                return null;
            }
            
            if (includeId) {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            } else {
                return doc.data();
            }
        } catch (error) {
            this._handleError(error, `obtener documento ${docId} de ${collectionName}`);
        }
    }
    
    /**
     * Obtener todos los documentos de una colección con opciones de filtrado
     * 
     * @param {string} collectionName - Nombre de la colección
     * @param {Object} [options={}] - Opciones de consulta
     * @param {Array<Array<string|FirebaseFirestore.WhereFilterOp|any>>} [options.where] - Condiciones de filtrado
     * @param {Array<string|FirebaseFirestore.OrderByDirection>} [options.orderBy] - Campo y dirección para ordenar
     * @param {number} [options.limit] - Límite de resultados
     * @returns {Promise<Array<Object>>} - Promesa con array de documentos
     * @throws {Error} Si ocurre un error durante la operación
     * @example
     * // Obtener todos los menús de la semana actual
     * const menus = await firebaseService.getDocuments('menus', {
     *   where: [['week', '==', '2025-04-07']]
     * });
     */
    async getDocuments(collectionName, options = {}) {
        if (!this.initialized && !this.initialize()) {
            throw new Error("Firebase no está inicializado correctamente");
        }
        
        try {
            let query = this.getCollection(collectionName);
            
            // Aplicar filtros where
            if (options.where && Array.isArray(options.where)) {
                for (const condition of options.where) {
                    if (Array.isArray(condition) && condition.length === 3) {
                        query = query.where(condition[0], condition[1], condition[2]);
                    }
                }
            }
            
            // Aplicar ordenamiento
            if (options.orderBy && Array.isArray(options.orderBy) && options.orderBy.length === 2) {
                query = query.orderBy(options.orderBy[0], options.orderBy[1]);
            }
            
            // Aplicar límite
            if (options.limit && typeof options.limit === 'number') {
                query = query.limit(options.limit);
            }
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                return [];
            }
            
            const documents = [];
            snapshot.forEach(doc => {
                documents.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return documents;
        } catch (error) {
            this._handleError(error, `obtener documentos de ${collectionName}`);
        }
    }
}

// Crear instancia global del servicio
window.firebaseService = new FirebaseService();

// Exportar la instancia para uso en módulos
export default window.firebaseService;
