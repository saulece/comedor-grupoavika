// Módulo de servicios de Firestore para Comedor Grupo Avika

/**
 * Obtiene una referencia a una colección de Firestore
 * @param {string} name - Nombre de la colección
 * @returns {object} - Referencia a la colección
 */
const getCollection = (name) => window.db.collection(name);

/**
 * Servicios para gestión de menús
 */
const menuService = {
    /**
     * Obtiene el menú para una semana específica
     * @param {string} weekStart - Fecha de inicio de la semana en formato YYYY-MM-DD
     * @returns {Promise} - Promesa con el documento del menú
     */
    getMenuForWeek: (weekStart) => getCollection('menus').doc(weekStart).get(),
    
    /**
     * Guarda un menú para una semana específica
     * @param {string} weekStart - Fecha de inicio de la semana en formato YYYY-MM-DD
     * @param {object} data - Datos del menú a guardar
     * @returns {Promise} - Promesa de la operación
     */
    saveMenu: (weekStart, data) => getCollection('menus').doc(weekStart).set(data, { merge: true }),
    
    /**
     * Publica un menú para una semana específica
     * @param {string} weekStart - Fecha de inicio de la semana en formato YYYY-MM-DD
     * @returns {Promise} - Promesa de la operación
     */
    publishMenu: (weekStart) => getCollection('menus').doc(weekStart).update({
        status: 'published',
        publishedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
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
    getEmployeesByDepartment: (departmentId) => 
        getCollection('employees').where('departmentId', '==', departmentId).get(),
    
    /**
     * Guarda un empleado
     * @param {string|null} employeeId - ID del empleado (null para crear nuevo)
     * @param {object} data - Datos del empleado
     * @returns {Promise} - Promesa de la operación
     */
    saveEmployee: (employeeId, data) => {
        if (employeeId) {
            return getCollection('employees').doc(employeeId).update(data);
        } else {
            return getCollection('employees').add(data);
        }
    },
    
    /**
     * Elimina un empleado
     * @param {string} employeeId - ID del empleado
     * @returns {Promise} - Promesa de la operación
     */
    deleteEmployee: (employeeId) => getCollection('employees').doc(employeeId).delete()
};

/**
 * Servicios para gestión de confirmaciones
 */
const confirmationService = {
    /**
     * Obtiene las confirmaciones para una semana y departamento específicos
     * @param {string} weekStart - Fecha de inicio de la semana en formato YYYY-MM-DD
     * @param {string} departmentId - ID del departamento
     * @returns {Promise} - Promesa con los documentos de confirmaciones
     */
    getConfirmationsForWeek: (weekStart, departmentId) => 
        getCollection('confirmations')
            .where('weekStart', '==', weekStart)
            .where('departmentId', '==', departmentId)
            .get(),
    
    /**
     * Guarda una confirmación
     * @param {string} confirmationId - ID de la confirmación
     * @param {object} data - Datos de la confirmación
     * @returns {Promise} - Promesa de la operación
     */
    saveConfirmation: (confirmationId, data) => 
        getCollection('confirmations').doc(confirmationId).set(data, { merge: true })
};

// Exportar servicios
window.firestoreServices = {
    menu: menuService,
    employee: employeeService,
    confirmation: confirmationService
};
