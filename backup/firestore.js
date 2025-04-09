// Módulo de servicios de Firestore para Comedor Grupo Avika

// Referencia al servicio centralizado de Firebase
const firebaseService = window.firebaseService;

/**
 * Obtiene una referencia a una colección de Firestore
 * @param {string} name - Nombre de la colección
 * @returns {object} - Referencia a la colección
 */
function getCollection(name) {
    if (!firebaseService) {
        console.error(`Error: Servicio de Firebase no disponible al intentar acceder a la colección ${name}`);
        return null;
    }
    return firebaseService.getCollection(name);
}

/**
 * Servicios para gestión de menús
 */
const menuService = {
    /**
     * Obtiene el menú para una semana específica
     * @param {string} weekStart - Fecha de inicio de la semana en formato YYYY-MM-DD
     * @returns {Promise} - Promesa con el documento del menú
     */
    getMenuForWeek: (weekStart) => {
        const collection = getCollection('menus');
        if (!collection) return Promise.reject(new Error('Servicio de Firebase no disponible'));
        return collection.doc(weekStart).get();
    },
    
    /**
     * Guarda un menú para una semana específica
     * @param {string} weekStart - Fecha de inicio de la semana en formato YYYY-MM-DD
     * @param {object} data - Datos del menú a guardar
     * @returns {Promise} - Promesa de la operación
     */
    saveMenu: (weekStart, data) => {
        const collection = getCollection('menus');
        if (!collection) return Promise.reject(new Error('Servicio de Firebase no disponible'));
        return collection.doc(weekStart).set(data, { merge: true });
    },
    
    /**
     * Publica un menú para una semana específica
     * @param {string} weekStart - Fecha de inicio de la semana en formato YYYY-MM-DD
     * @returns {Promise} - Promesa de la operación
     */
    publishMenu: (weekStart) => {
        const collection = getCollection('menus');
        if (!collection) return Promise.reject(new Error('Servicio de Firebase no disponible'));
        return collection.doc(weekStart).update({
            status: 'published',
            publishedAt: firebaseService.getFirestore().FieldValue.serverTimestamp()
        });
    },
    
    /**
     * Normaliza los datos del menú para asegurar consistencia
     * @param {object} menuData - Datos del menú a normalizar
     * @returns {object} - Datos del menú normalizados
     * @deprecated Use commonUtils.TextUtils.normalizeMenuData instead
     */
    normalizeMenuData: (menuData) => {
        // Usar la función centralizada en commonUtils
        if (window.commonUtils && window.commonUtils.TextUtils && window.commonUtils.TextUtils.normalizeMenuData) {
            return window.commonUtils.TextUtils.normalizeMenuData(menuData);
        }
        
        // Fallback a la implementación original
        const normalizedData = {...menuData};
        
        // Asegurar que todos los días tengan un array de items válido
        const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        
        days.forEach(day => {
            if (!normalizedData[day]) {
                normalizedData[day] = { items: [] };
            } else if (!normalizedData[day].items) {
                normalizedData[day].items = [];
            }
        });
        
        return normalizedData;
    }
};

/**
 * Servicios para gestión de empleados
 */
const employeeService = {
    /**
     * Obtiene los empleados para un departamento específico
     * @param {string} departmentId - ID del departamento
     * @returns {Promise} - Promesa con los documentos de empleados
     */
    getEmployeesByDepartment: (departmentId) => {
        const collection = getCollection('employees');
        if (!collection) return Promise.reject(new Error('Servicio de Firebase no disponible'));
        return collection.where('departmentId', '==', departmentId).get();
    },
    
    /**
     * Guarda un empleado
     * @param {string|null} employeeId - ID del empleado (null para crear nuevo)
     * @param {object} data - Datos del empleado
     * @returns {Promise} - Promesa de la operación
     */
    saveEmployee: (employeeId, data) => {
        const collection = getCollection('employees');
        if (!collection) return Promise.reject(new Error('Servicio de Firebase no disponible'));
        
        if (employeeId) {
            return collection.doc(employeeId).update(data);
        } else {
            return collection.add(data);
        }
    },
    
    /**
     * Elimina un empleado
     * @param {string} employeeId - ID del empleado
     * @returns {Promise} - Promesa de la operación
     */
    deleteEmployee: (employeeId) => {
        const collection = getCollection('employees');
        if (!collection) return Promise.reject(new Error('Servicio de Firebase no disponible'));
        return collection.doc(employeeId).delete();
    }
};

/**
 * Servicios para gestión de confirmaciones
 */
const confirmationService = {
    /**
     * Obtiene las confirmaciones para una semana y departamento específicos
     * @param {string} startDate - Fecha de inicio en formato YYYY-MM-DD
     * @param {string} endDate - Fecha de fin en formato YYYY-MM-DD
     * @param {string} departmentId - ID del departamento
     * @returns {Promise} - Promesa con los documentos de confirmaciones
     */
    getConfirmationsForDateRange: (startDate, endDate, departmentId) => {
        const collection = getCollection('confirmations');
        if (!collection) return Promise.reject(new Error('Servicio de Firebase no disponible'));
        
        let query = collection
            .where('date', '>=', startDate)
            .where('date', '<=', endDate);
            
        if (departmentId) {
            query = query.where('departmentId', '==', departmentId);
        }
        
        return query.get();
    },
    
    /**
     * Obtiene una confirmación específica por fecha y departamento
     * @param {string} date - Fecha en formato YYYY-MM-DD
     * @param {string} departmentId - ID del departamento
     * @returns {Promise} - Promesa con el documento de confirmación
     */
    getConfirmationByDateAndDepartment: (date, departmentId) => {
        const collection = getCollection('confirmations');
        if (!collection) return Promise.reject(new Error('Servicio de Firebase no disponible'));
        
        return collection
            .where('date', '==', date)
            .where('departmentId', '==', departmentId)
            .get();
    },
    
    /**
     * Guarda una confirmación
     * @param {string|null} confirmationId - ID de la confirmación (null para crear nueva)
     * @param {object} data - Datos de la confirmación
     * @returns {Promise} - Promesa de la operación
     */
    saveConfirmation: (confirmationId, data) => {
        const collection = getCollection('confirmations');
        if (!collection) return Promise.reject(new Error('Servicio de Firebase no disponible'));
        
        if (confirmationId) {
            return collection.doc(confirmationId).update(data);
        } else {
            return collection.add(data);
        }
    }
};

/**
 * Servicios para gestión de usuarios
 */
const userService = {
    /**
     * Obtiene todos los usuarios con rol de coordinador
     * @returns {Promise} - Promesa con los documentos de usuarios
     */
    getCoordinators: () => {
        const collection = getCollection('users');
        if (!collection) return Promise.reject(new Error('Servicio de Firebase no disponible'));
        
        return collection
            .where('role', '==', 'coordinator')
            .get();
    },
    
    /**
     * Guarda un usuario
     * @param {string|null} userId - ID del usuario (null para crear nuevo)
     * @param {object} data - Datos del usuario
     * @returns {Promise} - Promesa de la operación
     */
    saveUser: (userId, data) => {
        const collection = getCollection('users');
        if (!collection) return Promise.reject(new Error('Servicio de Firebase no disponible'));
        
        if (userId) {
            return collection.doc(userId).update(data);
        } else {
            return collection.add(data);
        }
    },
    
    /**
     * Elimina un usuario
     * @param {string} userId - ID del usuario
     * @returns {Promise} - Promesa de la operación
     */
    deleteUser: (userId) => {
        const collection = getCollection('users');
        if (!collection) return Promise.reject(new Error('Servicio de Firebase no disponible'));
        return collection.doc(userId).delete();
    }
};

// Exportar servicios
window.firestoreServices = {
    menu: menuService,
    employee: employeeService,
    confirmation: confirmationService,
    user: userService,
    
    // También exportamos funciones útiles
    getCollection
};