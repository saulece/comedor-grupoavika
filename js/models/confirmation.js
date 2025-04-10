// Confirmation Model - Business logic for confirmations

/**
 * ConfirmationModel - Handles confirmation business logic
 */
class ConfirmationModel {
    /**
     * Create confirmation model
     * @param {Object} data - Confirmation data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.weekId = data.weekId || null;
        this.branchId = data.branchId || null;
        this.coordinatorId = data.coordinatorId || null;
        this.timestamp = data.timestamp || null;
        this.employees = data.employees || [];
    }
    
    /**
     * Convert to Firestore data
     * @returns {Object} Firestore data object
     */
    toFirestore() {
        return {
            weekId: this.weekId,
            branchId: this.branchId,
            coordinatorId: this.coordinatorId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            employees: this.employees
        };
    }
    
    /**
     * Create from Firestore document
     * @param {Object} doc - Firestore document
     * @returns {ConfirmationModel} Confirmation model
     */
    static fromFirestore(doc) {
        const data = doc.data();
        return new ConfirmationModel({
            id: doc.id,
            ...data
        });
    }
    
    /**
     * Get total employees count
     * @returns {number} Total employees
     */
    getTotalEmployees() {
        return this.employees.length;
    }
    
    /**
     * Get confirmed employees count
     * @returns {number} Confirmed employees (employees with at least one day)
     */
    getConfirmedEmployees() {
        return this.employees.filter(emp => emp.days && emp.days.length > 0).length;
    }
    
    /**
     * Get total confirmations (sum of all days)
     * @returns {number} Total confirmations
     */
    getTotalConfirmations() {
        return this.employees.reduce((total, emp) => total + (emp.days ? emp.days.length : 0), 0);
    }
    
    /**
     * Get confirmations for a specific day
     * @param {string} day - Day name ('monday', 'tuesday', etc.)
     * @returns {number} Confirmations for this day
     */
    getConfirmationsForDay(day) {
        return this.employees.filter(emp => emp.days && emp.days.includes(day)).length;
    }
    
    /**
     * Get confirmation counts by day
     * @returns {Object} Counts by day
     */
    getConfirmationsByDay() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const counts = {};
        
        days.forEach(day => {
            counts[day] = this.getConfirmationsForDay(day);
        });
        
        return counts;
    }
    
    /**
     * Calculate estimated savings
     * @param {number} mealCost - Cost per meal
     * @returns {number} Estimated savings
     */
    calculateSavings(mealCost = 50) {
        if (!this.employees || this.employees.length === 0) return 0;
        
        // Get total possible meal slots (employees * 5 days)
        const totalMealSlots = this.employees.length * 7;
        
        // Get actual confirmations
        const confirmedMeals = this.getTotalConfirmations();
        
        // Calculate unconfirmed meals
        const unconfirmedMeals = totalMealSlots - confirmedMeals;
        
        // Calculate savings (cost * unconfirmed meals)
        return unconfirmedMeals * mealCost;
    }
    
    /**
     * Add or update employee
     * @param {string} employeeId - Employee ID
     * @param {string} employeeName - Employee name
     * @param {Array} days - Confirmed days
     */
    updateEmployee(employeeId, employeeName, days = []) {
        // Check if employee already exists
        const index = this.employees.findIndex(emp => emp.id === employeeId);
        
        if (index !== -1) {
            // Update existing employee
            this.employees[index].days = days;
        } else {
            // Add new employee
            this.employees.push({
                id: employeeId,
                name: employeeName,
                days
            });
        }
    }
    
    /**
     * Remove employee
     * @param {string} employeeId - Employee ID
     */
    removeEmployee(employeeId) {
        this.employees = this.employees.filter(emp => emp.id !== employeeId);
    }
    
    /**
     * Check if confirmation period is active
     * @param {Object} menu - Weekly menu data
     * @returns {boolean} True if confirmation period is active
     */
    static isConfirmationPeriodActive(menu) {
        if (!menu || !menu.confirmStartDate || !menu.confirmEndDate) return false;
        
        const now = new Date();
        const confirmStart = menu.confirmStartDate.toDate();
        const confirmEnd = menu.confirmEndDate.toDate();
        
        return now >= confirmStart && now <= confirmEnd;
    }
    
    /**
     * Calculate confirmation accuracy (for historical data)
     * @param {Object} attendance - Actual attendance data
     * @returns {number} Accuracy percentage (0-100)
     */
    calculateAccuracy(attendance) {
        if (!attendance || !this.employees || this.employees.length === 0) return 0;
        
        let correctPredictions = 0;
        let totalPredictions = 0;
        
        // For each employee and each day, check if confirmation matches attendance
        this.employees.forEach(employee => {
            const attendanceRecord = attendance.find(record => record.employeeId === employee.id);
            
            if (attendanceRecord) {
                const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                
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
        
        // Calculate accuracy percentage
        return totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
    }
}

// Export model if module system is available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfirmationModel;
}