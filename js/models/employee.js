// Employee Model - Business logic for employees

/**
 * EmployeeModel - Handles employee business logic
 */
class EmployeeModel {
    /**
     * Create employee model
     * @param {Object} data - Employee data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.name = data.name || '';
        this.branch = data.branch || '';
        this.position = data.position || '';
        this.active = data.active !== undefined ? data.active : true;
        this.dietaryRestrictions = data.dietaryRestrictions || '';
        this.createdBy = data.createdBy || null;
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
            branch: this.branch,
            position: this.position,
            active: this.active,
            dietaryRestrictions: this.dietaryRestrictions
        };
        
        // Add optional fields if they exist
        if (this.createdBy) data.createdBy = this.createdBy;
        
        // Add server timestamps
        if (!this.createdAt) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        return data;
    }
    
    /**
     * Create from Firestore document
     * @param {Object} doc - Firestore document
     * @returns {EmployeeModel} Employee model
     */
    static fromFirestore(doc) {
        const data = doc.data();
        return new EmployeeModel({
            id: doc.id,
            ...data
        });
    }
    
    /**
     * Validate employee data
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];
        
        // Name is required
        if (!this.name || this.name.trim() === '') {
            errors.push('El nombre del empleado es requerido.');
        }
        
        // Branch is required
        if (!this.branch || this.branch.trim() === '') {
            errors.push('La sucursal es requerida.');
        }
        
        // Active should be boolean
        if (typeof this.active !== 'boolean') {
            errors.push('El campo Activo debe ser un valor booleano.');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Get active status text
     * @returns {string} Status text
     */
    getActiveStatusText() {
        return this.active ? 'Activo' : 'Inactivo';
    }
    
    /**
     * Parse from Excel row data
     * @param {Object} rowData - Excel row data
     * @param {string} branchId - Branch ID
     * @param {string} coordinatorId - Coordinator ID
     * @returns {EmployeeModel} Employee model
     */
    static fromExcelRow(rowData, branchId, coordinatorId) {
        return new EmployeeModel({
            name: rowData.Nombre || rowData.nombre || '',
            position: rowData.Puesto || rowData.posicion || rowData.position || '',
            dietaryRestrictions: rowData['Restricciones Alimentarias'] || 
                rowData.restricciones || 
                rowData.dietaryRestrictions || '',
            active: parseActiveStatus(rowData.Activo || rowData.activo || rowData.active, true),
            branch: branchId,
            createdBy: coordinatorId
        });
    }
    
    /**
     * Normalize employee data
     */
    normalize() {
        // Trim string fields
        this.name = this.name ? this.name.trim() : '';
        this.position = this.position ? this.position.trim() : '';
        this.dietaryRestrictions = this.dietaryRestrictions ? this.dietaryRestrictions.trim() : '';
        
        // Ensure active is boolean
        this.active = !!this.active;
    }
    
    /**
     * Group employees by branch
     * @param {Array} employees - Array of employee objects
     * @returns {Object} Employees grouped by branch
     */
    static groupByBranch(employees) {
        return employees.reduce((groups, employee) => {
            const branch = employee.branch;
            
            if (!groups[branch]) {
                groups[branch] = [];
            }
            
            groups[branch].push(employee);
            return groups;
        }, {});
    }
    
    /**
     * Filter employees
     * @param {Array} employees - Array of employee objects
     * @param {Object} filters - Filter options
     * @param {boolean} filters.activeOnly - Filter active employees only
     * @param {string} filters.searchTerm - Search term
     * @param {string} filters.branch - Filter by branch
     * @returns {Array} Filtered employees
     */
    static filter(employees, filters = {}) {
        return employees.filter(employee => {
            // Filter by active status
            if (filters.activeOnly && !employee.active) {
                return false;
            }
            
            // Filter by branch
            if (filters.branch && filters.branch !== 'all' && employee.branch !== filters.branch) {
                return false;
            }
            
            // Filter by search term
            if (filters.searchTerm) {
                const term = filters.searchTerm.toLowerCase();
                const name = employee.name.toLowerCase();
                const position = (employee.position || '').toLowerCase();
                const restrictions = (employee.dietaryRestrictions || '').toLowerCase();
                
                return name.includes(term) || 
                       position.includes(term) || 
                       restrictions.includes(term);
            }
            
            return true;
        });
    }
}

/**
 * Parse active status from various formats
 * @param {*} value - Value to parse
 * @param {boolean} defaultValue - Default value if parsing fails
 * @returns {boolean} Parsed active status
 */
function parseActiveStatus(value, defaultValue = true) {
    if (value === undefined || value === null) return defaultValue;
    
    if (typeof value === 'boolean') return value;
    
    if (typeof value === 'number') return value !== 0;
    
    if (typeof value === 'string') {
        const lowerValue = value.toLowerCase().trim();
        return !['no', 'false', '0', 'n', 'inactivo', 'inactive'].includes(lowerValue);
    }
    
    return defaultValue;
}

// Export model if module system is available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmployeeModel;
}