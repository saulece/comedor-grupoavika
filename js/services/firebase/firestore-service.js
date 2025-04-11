// Firestore Service - Handles all Firestore operations

// Cargar extensiones de desarrollo si estamos en modo desarrollo
if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE) {
    // Cargar script de desarrollo dinámicamente
    const devScript = document.createElement('script');
    devScript.src = '../../js/services/firebase/firestore-service-dev.js';
    devScript.onload = function() {
        if (typeof devLog === 'function') {
            devLog('Extensiones de Firestore para desarrollo cargadas correctamente');
        }
    };
    devScript.onerror = function() {
        console.warn('No se pudieron cargar las extensiones de Firestore para desarrollo');
    };
    document.head.appendChild(devScript);
}

/**
 * Get Firestore instance
 * @returns {Object} Firebase Firestore instance
 */
function getFirestore() {
    return firebase.firestore();
}

/**
 * Handle Firebase errors with better messages
 * @param {Error} error - The error object
 * @param {string} functionName - The function where the error occurred
 * @param {Object} options - Additional options
 * @returns {Object} Formatted error object
 */
function handleFirebaseError(error, functionName, options = {}) {
    console.error(`Error en ${functionName}:`, error);
    return {
        ...error,
        userMessage: options.userMessage || 'Ha ocurrido un error. Intente nuevamente más tarde.'
    };
}

/**
 * Get current weekly menu
 * @returns {Promise<Object>} Menu data
 */
async function getCurrentWeeklyMenu() {
    try {
        // Verificar si estamos en modo desarrollo con datos de prueba
        if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE && 
            typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.useTestData) {
            
            if (typeof devLog === 'function') {
                devLog('Obteniendo menú semanal de datos de prueba');
            }
            
            // Intentar usar la función simulateFirestoreQuery si está disponible
            if (typeof simulateFirestoreQuery === 'function') {
                const testMenus = await simulateFirestoreQuery('weeklyMenus', {
                    filters: [
                        { field: 'status', operator: 'in', value: ['published', 'in-progress'] }
                    ],
                    orderBy: { field: 'startDate', direction: 'desc' }
                });
                
                if (testMenus && testMenus.length > 0) {
                    if (typeof devLog === 'function') {
                        devLog('Menú semanal de prueba encontrado', testMenus[0]);
                    }
                    return testMenus[0];
                }
            }
            
            // Si no está disponible simulateFirestoreQuery, intentar con getTestDataForCollection
            if (typeof getTestDataForCollection === 'function') {
                const testMenus = getTestDataForCollection('weeklyMenus');
                if (testMenus && testMenus.length > 0) {
                    if (typeof devLog === 'function') {
                        devLog('Menú semanal de prueba encontrado', testMenus[0]);
                    }
                    return testMenus[0];
                }
            }
            
            // Si no se encontraron datos de prueba, continuar con el flujo normal
            if (typeof devLog === 'function') {
                devLog('No se encontraron datos de prueba para el menú semanal, usando flujo normal');
            }
        }
        
        // Get current date
        const today = new Date();
        
        // Log attempt to fetch menu
        if (window.logger) {
            window.logger.debug('Fetching current weekly menu');
        } else {
            console.log('Fetching current weekly menu');
        }
        
        // First try to find a menu where today falls within its date range
        const firestore = getFirestore();
        let menuSnapshot = await firestore.collection('weeklyMenus')
            .where('status', 'in', ['published', 'in-progress'])
            .orderBy('startDate', 'desc')
            .get();
        
        if (window.logger) {
            window.logger.debug(`Found ${menuSnapshot.size} menus`);
        } else {
            console.log(`Found ${menuSnapshot.size} menus`);
        }
        
        let menuDoc = null;
        
        // Find a menu where today is within the week range
        for (const doc of menuSnapshot.docs) {
            const menuData = doc.data();
            const startDate = menuData.startDate.toDate();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6); // End date is start date + 6 days
            
            if (today >= startDate && today <= endDate) {
                menuDoc = doc;
                console.log(`Found current week menu: ${doc.id}`);
                break;
            }
        }
        
        // If no current week menu found, get the most recent one
        if (!menuDoc && !menuSnapshot.empty) {
            menuDoc = menuSnapshot.docs[0];
            console.log(`No current week menu found, using most recent: ${menuDoc.id}`);
        }
        
        if (menuDoc) {
            const menuData = menuDoc.data();
            
            // Get daily menus
            const dailyMenusSnapshot = await firestore.collection('weeklyMenus')
                .doc(menuDoc.id)
                .collection('dailyMenus')
                .get();
            
            const dailyMenus = {};
            dailyMenusSnapshot.forEach(doc => {
                dailyMenus[doc.id] = doc.data();
            });
            
            return {
                id: menuDoc.id,
                ...menuData,
                dailyMenus
            };
        }
        
        console.log('No active weekly menu found');
        return null;
    } catch (error) {
        const formattedError = handleFirebaseError(error, 'getCurrentWeeklyMenu', {
            userMessage: 'No se pudo cargar el menú semanal. Intente nuevamente más tarde.'
        });
        
        console.error('Error getting current weekly menu:', formattedError);
        
        // Re-throw the error to be handled by the caller
        throw formattedError;
    }
}

/**
 * Get employees by branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array>} Employees array
 */
async function getEmployeesByBranch(branchId) {
    try {
        const firestore = getFirestore();
        const employeesSnapshot = await firestore.collection('employees')
            .where('branch', '==', branchId)
            .orderBy('name')
            .get();
        
        const employees = [];
        
        employeesSnapshot.forEach(doc => {
            employees.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return employees;
    } catch (error) {
        const formattedError = handleFirebaseError(error, 'getEmployeesByBranch');
        
        // Re-throw the error to be handled by the caller
        throw formattedError;
    }
}

/**
 * Get branch details
 * @param {string} branchId - Branch ID
 * @returns {Promise<Object>} Branch data
 */
async function getBranchDetails(branchId) {
    try {
        const firestore = getFirestore();
        const branchDoc = await firestore.collection('branches').doc(branchId).get();
        
        if (branchDoc.exists) {
            return {
                id: branchDoc.id,
                ...branchDoc.data()
            };
        }
        
        return null;
    } catch (error) {
        const formattedError = handleFirebaseError(error, 'getBranchDetails');
        
        // Re-throw the error to be handled by the caller
        throw formattedError;
    }
}

/**
 * Get confirmations for a week by branch
 * @param {string} weekId - Week ID
 * @param {string} branchId - Branch ID
 * @returns {Promise<Object>} Confirmation data
 */
async function getConfirmationsByBranch(weekId, branchId) {
    try {
        const firestore = getFirestore();
        const confirmationQuery = await firestore.collection('confirmations')
            .where('weekId', '==', weekId)
            .where('branchId', '==', branchId)
            .limit(1)
            .get();
        
        if (!confirmationQuery.empty) {
            const confirmationDoc = confirmationQuery.docs[0];
            return {
                id: confirmationDoc.id,
                ...confirmationDoc.data()
            };
        }
        
        return null;
    } catch (error) {
        const formattedError = handleFirebaseError(error, 'getConfirmationsByBranch');
        
        // Re-throw the error to be handled by the caller
        throw formattedError;
    }
}

/**
 * Submit confirmations for a branch
 * @param {string} weekId - Week ID
 * @param {string} branchId - Branch ID
 * @param {string} coordinatorId - Coordinator ID
 * @param {Array} employees - Employees with confirmation data
 * @returns {Promise<Object>} Result object
 */
async function submitConfirmations(weekId, branchId, coordinatorId, employees) {
    try {
        const firestore = getFirestore();
        
        // Check if confirmation already exists
        const confirmationQuery = await firestore.collection('confirmations')
            .where('weekId', '==', weekId)
            .where('branchId', '==', branchId)
            .limit(1)
            .get();
        
        let confirmationId;
        
        if (!confirmationQuery.empty) {
            // Update existing confirmation
            confirmationId = confirmationQuery.docs[0].id;
            await firestore.collection('confirmations').doc(confirmationId).update({
                employees,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Create new confirmation
            const confirmationRef = await firestore.collection('confirmations').add({
                weekId,
                branchId,
                coordinatorId,
                employees,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            confirmationId = confirmationRef.id;
            
            // Update confirmed count on menu
            const confirmedEmployees = employees.filter(emp => emp.days && emp.days.length > 0).length;
            await firestore.collection('weeklyMenus').doc(weekId).update({
                confirmedEmployees: firebase.firestore.FieldValue.increment(confirmedEmployees)
            });
        }
        
        return { success: true, confirmationId };
    } catch (error) {
        const formattedError = handleFirebaseError(error, 'submitConfirmations');
        
        // Re-throw the error to be handled by the caller
        throw formattedError;
    }
}

/**
 * Add employee to a branch
 * @param {Object} employeeData - Employee data
 * @param {string} coordinatorId - Coordinator ID
 * @returns {Promise<string>} Employee ID
 */
async function addEmployee(employeeData, coordinatorId) {
    try {
        const firestore = getFirestore();
        
        // Add employee to Firestore
        const employeeRef = await firestore.collection('employees').add({
            ...employeeData,
            createdBy: coordinatorId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update branch employee count if employee is active
        if (employeeData.active) {
            await firestore.collection('branches').doc(employeeData.branch).update({
                employeeCount: firebase.firestore.FieldValue.increment(1)
            });
        }
        
        return employeeRef.id;
    } catch (error) {
        const formattedError = handleFirebaseError(error, 'addEmployee');
        
        // Re-throw the error to be handled by the caller
        throw formattedError;
    }
}

/**
 * Update employee
 * @param {string} employeeId - Employee ID
 * @param {Object} employeeData - Updated employee data
 * @returns {Promise<void>}
 */
async function updateEmployee(employeeId, employeeData) {
    try {
        const firestore = getFirestore();
        
        // Get current employee data
        const employeeDoc = await firestore.collection('employees').doc(employeeId).get();
        
        if (!employeeDoc.exists) {
            throw new Error('Empleado no encontrado');
        }
        
        const currentData = employeeDoc.data();
        
        // Update employee
        await firestore.collection('employees').doc(employeeId).update({
            ...employeeData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update branch employee count if active status changed
        if (currentData.active !== employeeData.active) {
            // Increment if now active, decrement if now inactive
            const change = employeeData.active ? 1 : -1;
            
            await firestore.collection('branches').doc(employeeData.branch).update({
                employeeCount: firebase.firestore.FieldValue.increment(change)
            });
        }
    } catch (error) {
        const formattedError = handleFirebaseError(error, 'updateEmployee');
        
        // Re-throw the error to be handled by the caller
        throw formattedError;
    }
}

/**
 * Delete employee
 * @param {string} employeeId - Employee ID
 * @returns {Promise<void>}
 */
async function deleteEmployee(employeeId) {
    try {
        const firestore = getFirestore();
        
        // Get employee data
        const employeeDoc = await firestore.collection('employees').doc(employeeId).get();
        
        if (!employeeDoc.exists) {
            throw new Error('Empleado no encontrado');
        }
        
        const employeeData = employeeDoc.data();
        
        // Delete employee
        await firestore.collection('employees').doc(employeeId).delete();
        
        // Update branch employee count if employee was active
        if (employeeData.active) {
            await firestore.collection('branches').doc(employeeData.branch).update({
                employeeCount: firebase.firestore.FieldValue.increment(-1)
            });
        }
    } catch (error) {
        const formattedError = handleFirebaseError(error, 'deleteEmployee');
        
        // Re-throw the error to be handled by the caller
        throw formattedError;
    }
}

/**
 * Import employees from array
 * @param {Array} employees - Array of employee objects
 * @param {string} branchId - Branch ID
 * @param {string} coordinatorId - Coordinator ID
 * @returns {Promise<Object>} Result with counts
 */
async function importEmployees(employees, branchId, coordinatorId) {
    try {
        const firestore = getFirestore();
        const batch = firestore.batch();
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // Count active employees for branch count update
        let activeCount = 0;
        let successCount = 0;
        let errorCount = 0;
        
        // Create batch of employee documents
        for (const employee of employees) {
            try {
                // Validate required data
                if (!employee.name || typeof employee.name !== 'string') {
                    console.error('Invalid employee data: missing name', employee);
                    errorCount++;
                    continue;
                }
                
                const employeeRef = firestore.collection('employees').doc();
                
                // Check if position indicates a coordinator role
                const position = employee.position || '';
                const isCoordinator = position.toLowerCase().includes('coordinador') || 
                                     position.toLowerCase().includes('coordinator');
                
                // Prepare employee data with validation
                const employeeData = {
                    name: employee.name.trim(),
                    position: position.trim(),
                    dietaryRestrictions: employee.dietaryRestrictions ? employee.dietaryRestrictions.trim() : '',
                    branch: branchId,
                    active: employee.active === undefined ? true : Boolean(employee.active),
                    createdBy: coordinatorId,
                    createdAt: timestamp,
                    updatedAt: timestamp
                };
                
                // If employee is coordinator, add role information
                if (isCoordinator) {
                    employeeData.role = 'coordinator';
                }
                
                batch.set(employeeRef, employeeData);
                
                if (employeeData.active !== false) {
                    activeCount++;
                }
                
                successCount++;
            } catch (error) {
                console.error('Error processing employee during import', { error, employee });
                errorCount++;
            }
        }
        
        // Update branch employee count
        const branchRef = firestore.collection('branches').doc(branchId);
        batch.update(branchRef, {
            employeeCount: firebase.firestore.FieldValue.increment(activeCount)
        });
        
        // Only commit if there are successfully processed employees
        if (successCount > 0) {
            await batch.commit();
        } else {
            console.warn('No valid employees to import');
        }
        
        return {
            success: successCount > 0,
            total: successCount,
            active: activeCount,
            errors: errorCount
        };
    } catch (error) {
        const formattedError = handleFirebaseError(error, 'importEmployees');
        
        // Re-throw the error to be handled by the caller
        throw formattedError;
    }
}

/**
 * Get app settings
 * @returns {Promise<Object>} Settings object
 */
async function getAppSettings() {
    try {
        const firestore = getFirestore();
        const settingsDoc = await firestore.collection('settings').doc('appSettings').get();
        
        if (settingsDoc.exists) {
            return settingsDoc.data();
        }
        
        // Return default settings if not found
        return {
            confirmationWindow: {
                startDay: 'thursday',
                startHour: 16.17, // 16:10
                endDay: 'saturday',
                endHour: 10
            },
            mealCost: 50,
            branches: ['CDO', 'Ishinoka', 'Centenario', 'Delicias', 'Fuentes', 'Matriz', 'Corporativo']
        };
    } catch (error) {
        const formattedError = handleFirebaseError(error, 'getAppSettings');
        
        // Re-throw the error to be handled by the caller
        throw formattedError;
    }
}

// Make functions globally available
window.getFirestore = getFirestore;
window.getCurrentWeeklyMenu = getCurrentWeeklyMenu;
window.getEmployeesByBranch = getEmployeesByBranch;
window.getBranchDetails = getBranchDetails;
window.getConfirmationsByBranch = getConfirmationsByBranch;
window.submitConfirmations = submitConfirmations;
window.addEmployee = addEmployee;
window.updateEmployee = updateEmployee;
window.deleteEmployee = deleteEmployee;
window.importEmployees = importEmployees;
window.getAppSettings = getAppSettings;

// Also expose as a single object for more reliable access
window.firestoreService = {
    getFirestore,
    getCurrentWeeklyMenu,
    getEmployeesByBranch,
    getBranchDetails,
    getConfirmationsByBranch,
    submitConfirmations,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    importEmployees,
    getAppSettings
};