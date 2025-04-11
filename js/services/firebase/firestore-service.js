// Firestore Service - Handles all Firestore operations
// Prevent duplicate declarations
if (typeof getCurrentWeeklyMenu !== 'function') {

/**
 * Get current weekly menu
 * @returns {Promise<Object>} Menu data
 */
async function getCurrentWeeklyMenu() {
    try {
        // Get current date
        const today = new Date();
        
        // Query for the most recent active menu
        const menuSnapshot = await db.collection('weeklyMenus')
            .where('status', 'in', ['in-progress', 'pending'])
            .orderBy('startDate', 'desc')
            .limit(1)
            .get();
        
        if (!menuSnapshot.empty) {
            const menuDoc = menuSnapshot.docs[0];
            const menuData = menuDoc.data();
            
            // Get daily menus
            const dailyMenusSnapshot = await db.collection('weeklyMenus')
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
        
        return null;
    } catch (error) {
        console.error('Error getting current weekly menu:', error);
        throw error;
    }
}

/**
 * Get employees by branch
 * @param {string} branchId - Branch ID
 * @returns {Promise<Array>} Employees array
 */
async function getEmployeesByBranch(branchId) {
    try {
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
        
        return employees;
    } catch (error) {
        console.error('Error getting employees:', error);
        throw error;
    }
}

/**
 * Get branch details
 * @param {string} branchId - Branch ID
 * @returns {Promise<Object>} Branch data
 */
async function getBranchDetails(branchId) {
    try {
        const branchDoc = await db.collection('branches').doc(branchId).get();
        
        if (branchDoc.exists) {
            return {
                id: branchDoc.id,
                ...branchDoc.data()
            };
        }
        
        return null;
    } catch (error) {
        console.error('Error getting branch details:', error);
        throw error;
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
        const confirmationQuery = await db.collection('confirmations')
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
        console.error('Error getting confirmations:', error);
        throw error;
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
        
        return { success: true, confirmationId };
    } catch (error) {
        console.error('Error submitting confirmations:', error);
        throw error;
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
        
        return employeeRef.id;
    } catch (error) {
        console.error('Error adding employee:', error);
        throw error;
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
    } catch (error) {
        console.error('Error updating employee:', error);
        throw error;
    }
}

/**
 * Delete employee
 * @param {string} employeeId - Employee ID
 * @returns {Promise<void>}
 */
async function deleteEmployee(employeeId) {
    try {
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
    } catch (error) {
        console.error('Error deleting employee:', error);
        throw error;
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
        
        return {
            success: true,
            total: employees.length,
            active: activeCount
        };
    } catch (error) {
        console.error('Error importing employees:', error);
        throw error;
    }
}

/**
 * Get app settings
 * @returns {Promise<Object>} Settings object
 */
async function getAppSettings() {
    try {
        const settingsDoc = await db.collection('settings').doc('appSettings').get();
        
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
        console.error('Error getting app settings:', error);
        throw error;
    }
}

// Cierre del bloque condicional para evitar declaraciones duplicadas
}