// Firestore Service - Handles all Firestore operations
import logger from '../../utils/logger.js';
import { handleFirebaseError } from '../../utils/error-handler.js';

/**
 * Get current weekly menu
 * @returns {Promise<Object>} Menu data
 */
async function getCurrentWeeklyMenu() {
    try {
        // Get current date
        const today = new Date();
        
        logger.debug('Fetching current weekly menu');
        
        // First try to find a menu where today falls within its date range
        let menuSnapshot = await db.collection('weeklyMenus')
            .where('status', 'in', ['published', 'in-progress'])
            .orderBy('startDate', 'desc')
            .get();
        
        logger.debug(`Found ${menuSnapshot.size} menus`);
        
        let menuDoc = null;
        
        // Find a menu where today is within the week range
        for (const doc of menuSnapshot.docs) {
            const menuData = doc.data();
            const startDate = menuData.startDate.toDate();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6); // End date is start date + 6 days
            
            logger.debug(`Checking menu ${doc.id}: ${startDate.toDateString()} to ${endDate.toDateString()}`);
            
            if (today >= startDate && today <= endDate) {
                menuDoc = doc;
                logger.info(`Found current week menu: ${doc.id}`);
                break;
            }
        }
        
        // If no current week menu found, get the most recent one
        if (!menuDoc && !menuSnapshot.empty) {
            menuDoc = menuSnapshot.docs[0];
            logger.info(`No current week menu found, using most recent: ${menuDoc.id}`);
        }
        
        if (menuDoc) {
            const menuData = menuDoc.data();
            
            logger.debug('Found weekly menu', { id: menuDoc.id, status: menuData.status });
            
            // Get daily menus
            const dailyMenusSnapshot = await db.collection('weeklyMenus')
                .doc(menuDoc.id)
                .collection('dailyMenus')
                .get();
            
            logger.debug(`Found ${dailyMenusSnapshot.size} daily menus`);
            
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
        
        logger.info('No active weekly menu found');
        return null;
    } catch (error) {
        const handledError = handleFirebaseError(error, 'getCurrentWeeklyMenu', {
            indexHelp: 'Es posible que necesites crear un índice compuesto para la colección "weeklyMenus" con los campos "status" y "startDate"',
            userMessage: 'No se pudo cargar el menú semanal. Intente nuevamente más tarde.'
        });
        
        logger.error('Error getting current weekly menu', handledError);
        
        // Re-throw the error to be handled by the caller
        throw handledError;
    }
}

/**
 * Get employees by branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array>} Employees array
 */
async function getEmployeesByBranch(branchId) {
    try {
        logger.debug('Fetching employees by branch', { branchId });
        
        const employeesSnapshot = await db.collection('employees')
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
        
        logger.debug('Fetched employees', { count: employees.length });
        return employees;
    } catch (error) {
        const handledError = handleFirebaseError(error, 'getEmployeesByBranch');
        
        // Re-throw the error to be handled by the caller
        throw handledError;
    }
}

/**
 * Get branch details
 * @param {string} branchId - Branch ID
 * @returns {Promise<Object>} Branch data
 */
async function getBranchDetails(branchId) {
    try {
        logger.debug('Fetching branch details', { branchId });
        
        const branchDoc = await db.collection('branches').doc(branchId).get();
        
        if (branchDoc.exists) {
            logger.debug('Found branch', { id: branchDoc.id });
            return {
                id: branchDoc.id,
                ...branchDoc.data()
            };
        }
        
        logger.info('Branch not found');
        return null;
    } catch (error) {
        const handledError = handleFirebaseError(error, 'getBranchDetails');
        
        // Re-throw the error to be handled by the caller
        throw handledError;
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
        logger.debug('Fetching confirmations by branch', { weekId, branchId });
        
        const confirmationQuery = await db.collection('confirmations')
            .where('weekId', '==', weekId)
            .where('branchId', '==', branchId)
            .limit(1)
            .get();
        
        if (!confirmationQuery.empty) {
            const confirmationDoc = confirmationQuery.docs[0];
            logger.debug('Found confirmation', { id: confirmationDoc.id });
            return {
                id: confirmationDoc.id,
                ...confirmationDoc.data()
            };
        }
        
        logger.info('No confirmations found');
        return null;
    } catch (error) {
        const handledError = handleFirebaseError(error, 'getConfirmationsByBranch');
        
        // Re-throw the error to be handled by the caller
        throw handledError;
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
        logger.debug('Submitting confirmations', { weekId, branchId });
        
        // Check if confirmation already exists
        const existingQuery = await db.collection('confirmations')
            .where('weekId', '==', weekId)
            .where('branchId', '==', branchId)
            .limit(1)
            .get();
        
        const batch = db.batch();
        let confirmationId;
        
        if (!existingQuery.empty) {
            // Update existing confirmation
            confirmationId = existingQuery.docs[0].id;
            const confirmationRef = db.collection('confirmations').doc(confirmationId);
            
            batch.update(confirmationRef, {
                employees,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                coordinatorId
            });
        } else {
            // Create new confirmation
            const confirmationRef = db.collection('confirmations').doc();
            confirmationId = confirmationRef.id;
            
            batch.set(confirmationRef, {
                weekId,
                branchId,
                coordinatorId,
                employees,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Increment confirmedEmployees count on weekly menu
            const weeklyMenuRef = db.collection('weeklyMenus').doc(weekId);
            batch.update(weeklyMenuRef, {
                confirmedEmployees: firebase.firestore.FieldValue.increment(
                    employees.filter(emp => emp.days.length > 0).length
                )
            });
        }
        
        await batch.commit();
        
        logger.debug('Confirmations submitted', { confirmationId });
        return { success: true, confirmationId };
    } catch (error) {
        const handledError = handleFirebaseError(error, 'submitConfirmations');
        
        // Re-throw the error to be handled by the caller
        throw handledError;
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
        logger.debug('Adding employee', { employeeData });
        
        const employeeRef = db.collection('employees').doc();
        
        await employeeRef.set({
            ...employeeData,
            createdBy: coordinatorId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update branch employee count
        const branchRef = db.collection('branches').doc(employeeData.branch);
        
        if (employeeData.active) {
            await branchRef.update({
                employeeCount: firebase.firestore.FieldValue.increment(1)
            });
        }
        
        logger.debug('Employee added', { id: employeeRef.id });
        return employeeRef.id;
    } catch (error) {
        const handledError = handleFirebaseError(error, 'addEmployee');
        
        // Re-throw the error to be handled by the caller
        throw handledError;
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
        logger.debug('Updating employee', { employeeId });
        
        // Get employee data before update
        const employeeDoc = await db.collection('employees').doc(employeeId).get();
        const oldData = employeeDoc.data();
        
        // Update employee
        await db.collection('employees').doc(employeeId).update({
            ...employeeData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // If branch changed or active status changed, update branch counts
        if (oldData.branch !== employeeData.branch || oldData.active !== employeeData.active) {
            const batch = db.batch();
            
            // Decrement old branch count if was active
            if (oldData.active) {
                const oldBranchRef = db.collection('branches').doc(oldData.branch);
                batch.update(oldBranchRef, {
                    employeeCount: firebase.firestore.FieldValue.increment(-1)
                });
            }
            
            // Increment new branch count if active
            if (employeeData.active) {
                const newBranchRef = db.collection('branches').doc(employeeData.branch);
                batch.update(newBranchRef, {
                    employeeCount: firebase.firestore.FieldValue.increment(1)
                });
            }
            
            await batch.commit();
        }
        
        logger.debug('Employee updated', { id: employeeId });
    } catch (error) {
        const handledError = handleFirebaseError(error, 'updateEmployee');
        
        // Re-throw the error to be handled by the caller
        throw handledError;
    }
}

/**
 * Delete employee
 * @param {string} employeeId - Employee ID
 * @returns {Promise<void>}
 */
async function deleteEmployee(employeeId) {
    try {
        logger.debug('Deleting employee', { employeeId });
        
        // Get employee data before deletion
        const employeeDoc = await db.collection('employees').doc(employeeId).get();
        
        if (!employeeDoc.exists) {
            throw new Error('Empleado no encontrado');
        }
        
        const employeeData = employeeDoc.data();
        
        // Delete employee
        await db.collection('employees').doc(employeeId).delete();
        
        // Update branch count if employee was active
        if (employeeData.active) {
            await db.collection('branches').doc(employeeData.branch).update({
                employeeCount: firebase.firestore.FieldValue.increment(-1)
            });
        }
        
        logger.debug('Employee deleted', { id: employeeId });
    } catch (error) {
        const handledError = handleFirebaseError(error, 'deleteEmployee');
        
        // Re-throw the error to be handled by the caller
        throw handledError;
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
        logger.debug('Importing employees', { count: employees.length });
        
        const batch = db.batch();
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        
        // Count active employees for branch count update
        let activeCount = 0;
        
        // Create batch of employee documents
        for (const employee of employees) {
            const employeeRef = db.collection('employees').doc();
            
            batch.set(employeeRef, {
                name: employee.name,
                position: employee.position || '',
                dietaryRestrictions: employee.dietaryRestrictions || '',
                branch: branchId,
                active: employee.active === undefined ? true : employee.active,
                createdBy: coordinatorId,
                createdAt: timestamp
            });
            
            if (employee.active !== false) {
                activeCount++;
            }
        }
        
        // Update branch employee count
        const branchRef = db.collection('branches').doc(branchId);
        batch.update(branchRef, {
            employeeCount: firebase.firestore.FieldValue.increment(activeCount)
        });
        
        await batch.commit();
        
        logger.debug('Employees imported', { count: employees.length });
        return {
            success: true,
            total: employees.length,
            active: activeCount
        };
    } catch (error) {
        const handledError = handleFirebaseError(error, 'importEmployees');
        
        // Re-throw the error to be handled by the caller
        throw handledError;
    }
}

/**
 * Get app settings
 * @returns {Promise<Object>} Settings object
 */
async function getAppSettings() {
    try {
        logger.debug('Fetching app settings');
        
        const settingsDoc = await db.collection('settings').doc('appSettings').get();
        
        if (settingsDoc.exists) {
            logger.debug('Found app settings');
            return settingsDoc.data();
        }
        
        // Return default settings if not found
        logger.info('No app settings found, using defaults');
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
        const handledError = handleFirebaseError(error, 'getAppSettings');
        
        // Re-throw the error to be handled by the caller
        throw handledError;
    }
}