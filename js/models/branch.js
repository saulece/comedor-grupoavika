// Branch Model - Business logic for branches

/**
 * BranchModel - Handles branch business logic
 */
class BranchModel {
    /**
     * Create branch model
     * @param {Object} data - Branch data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.coordinatorId = data.coordinatorId || null;
        this.employeeCount = data.employeeCount || 0;
        this.createdAt = data.createdAt || null;
        this.updatedAt = data.updatedAt || null;
    }
    
    /**
     * Convert to Firestore data
     * @returns {Object} Firestore data object
     */
    toFirestore() {
        const data = {
            name: this.name,
            employeeCount: this.employeeCount
        };
        
        // Add optional fields if they exist
        if (this.coordinatorId) data.coordinatorId = this.coordinatorId;
        
        // Add server timestamps
        if (!this.createdAt) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        return data;
    }
    
    /**
     * Create from Firestore document
     * @param {Object} doc - Firestore document
     * @returns {BranchModel} Branch model
     */
    static fromFirestore(doc) {
        const data = doc.data();
        return new BranchModel({
            id: doc.id,
            ...data
        });
    }
    
    /**
     * Validate branch data
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];
        
        // Name is required
        if (!this.name || this.name.trim() === '') {
            errors.push('El nombre de la sucursal es requerido.');
        }
        
        // Employee count should be non-negative
        if (this.employeeCount < 0) {
            errors.push('El conteo de empleados no puede ser negativo.');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Increment employee count
     * @param {number} count - Number to increment by (default: 1)
     */
    incrementEmployeeCount(count = 1) {
        this.employeeCount += count;
        
        // Ensure count doesn't go below 0
        if (this.employeeCount < 0) {
            this.employeeCount = 0;
        }
    }
    
    /**
     * Decrement employee count
     * @param {number} count - Number to decrement by (default: 1)
     */
    decrementEmployeeCount(count = 1) {
        this.incrementEmployeeCount(-count);
    }
    
    /**
     * Calculate confirmation rate
     * @param {number} confirmedCount - Number of confirmed employees
     * @returns {number} Confirmation rate percentage (0-100)
     */
    getConfirmationRate(confirmedCount) {
        if (this.employeeCount <= 0) return 0;
        return Math.round((confirmedCount / this.employeeCount) * 100);
    }
    
    /**
     * Create initial branch data for new system
     * @returns {Array} Default branches
     */
    static getDefaultBranches() {
        const branchNames = [
            'Centro de Operaciones', 
            'Ishinoka', 
            'Centenario', 
            'Delicias', 
            'Fuentes', 
            'Matriz', 
            'Corporativo'
        ];
        
        return branchNames.map(name => new BranchModel({ name }));
    }
    
    /**
     * Calculate confirmation accuracy
     * @param {Array} confirmations - Confirmation data
     * @param {Array} attendance - Attendance data
     * @returns {number} Accuracy percentage (0-100)
     */
    static calculateAccuracy(confirmations, attendance) {
        if (!confirmations || !attendance || 
            confirmations.length === 0 || attendance.length === 0) {
            return 0;
        }
        
        let correctPredictions = 0;
        let totalPredictions = 0;
        
        // For each employee and each day, check if confirmation matches attendance
        confirmations.forEach(confirmation => {
            confirmation.employees.forEach(employee => {
                const attendanceRecord = attendance.find(record => record.employeeId === employee.id);
                
                if (attendanceRecord) {
                    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                    
                    days.forEach(day => {
                        const wasConfirmed = employee.days.includes(day);
                        const didAttend = attendanceRecord.attended[day];
                        
                        // Count as correct if confirmation matches attendance
                        if (wasConfirmed === didAttend) {
                            correctPredictions++;
                        }
                        
                        totalPredictions++;
                    });
                }
            });
        });
        
        // Calculate accuracy percentage
        return totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
    }
    
    /**
     * Sort branches by name
     * @param {Array} branches - Array of branch objects
     * @returns {Array} Sorted branches
     */
    static sortByName(branches) {
        return [...branches].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    /**
     * Sort branches by employee count
     * @param {Array} branches - Array of branch objects
     * @param {boolean} descending - Sort in descending order
     * @returns {Array} Sorted branches
     */
    static sortByEmployeeCount(branches, descending = true) {
        return [...branches].sort((a, b) => {
            return descending ? 
                b.employeeCount - a.employeeCount : 
                a.employeeCount - b.employeeCount;
        });
    }
}

// Export model if module system is available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BranchModel;
}