// Menu Model - Business logic for weekly menus

/**
 * MenuModel - Handles menu business logic
 */
class MenuModel {
    /**
     * Create menu model
     * @param {Object} data - Menu data
     */
    constructor(data = {}) {
        this.id = data.id || null;
        this.startDate = data.startDate || null;
        this.endDate = data.endDate || null;
        this.status = data.status || 'pending';
        this.confirmStartDate = data.confirmStartDate || null;
        this.confirmEndDate = data.confirmEndDate || null;
        this.publishedBy = data.publishedBy || null;
        this.publishedAt = data.publishedAt || null;
        this.totalEmployees = data.totalEmployees || 0;
        this.confirmedEmployees = data.confirmedEmployees || 0;
        this.actualAttendees = data.actualAttendees || 0;
        this.wasteReduction = data.wasteReduction || 0;
        this.dailyMenus = data.dailyMenus || {};
        this.createdBy = data.createdBy || null;
        this.createdAt = data.createdAt || null;
    }
    
    /**
     * Convert to Firestore data
     * @returns {Object} Firestore data object
     */
    toFirestore() {
        const data = {
            startDate: this.startDate,
            status: this.status,
            confirmStartDate: this.confirmStartDate,
            confirmEndDate: this.confirmEndDate,
            totalEmployees: this.totalEmployees,
            confirmedEmployees: this.confirmedEmployees,
            actualAttendees: this.actualAttendees,
            wasteReduction: this.wasteReduction
        };
        
        // Add optional fields if they exist
        if (this.endDate) data.endDate = this.endDate;
        if (this.publishedBy) data.publishedBy = this.publishedBy;
        if (this.createdBy) data.createdBy = this.createdBy;
        
        // Add server timestamps for created/published dates if not set
        if (!this.createdAt) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        if (!this.publishedAt && this.status !== 'pending') {
            data.publishedAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        return data;
    }
    
    /**
     * Create from Firestore document
     * @param {Object} doc - Firestore document
     * @returns {MenuModel} Menu model
     */
    static fromFirestore(doc) {
        const data = doc.data();
        return new MenuModel({
            id: doc.id,
            ...data
        });
    }
    
    /**
     * Check if menu is complete (all days have main dish)
     * @returns {boolean} True if menu is complete
     */
    isComplete() {
        if (!this.dailyMenus) return false;
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        for (const day of days) {
            const dayMenu = this.dailyMenus[day];
            if (!dayMenu || !dayMenu.mainDish || dayMenu.mainDish.trim() === '') {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Check if menu can be published
     * @returns {Object} Result with can publish status and reason
     */
    canPublish() {
        if (this.status !== 'pending') {
            return { 
                canPublish: false, 
                reason: 'El menú ya ha sido publicado.' 
            };
        }
        
        if (!this.isComplete()) {
            return { 
                canPublish: false, 
                reason: 'El menú no está completo. Todos los días necesitan un platillo principal.' 
            };
        }
        
        return { canPublish: true };
    }
    
    /**
     * Get formatted date range
     * @returns {string} Formatted date range (e.g., "21/04/2023 al 25/04/2023")
     */
    getFormattedDateRange() {
        if (!this.startDate) return 'Fechas no disponibles';
        
        const start = this.startDate.toDate ? this.startDate.toDate() : new Date(this.startDate);
        let end;
        
        if (this.endDate) {
            end = this.endDate.toDate ? this.endDate.toDate() : new Date(this.endDate);
        } else {
            // If no end date, assume it's Friday (4 days after Monday)
            end = new Date(start);
            end.setDate(start.getDate() + 4);
        }
        
        // Format dates as DD/MM/YYYY
        const formatDate = (date) => {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };
        
        return `${formatDate(start)} al ${formatDate(end)}`;
    }
    
    /**
     * Get status text
     * @returns {string} Status text in Spanish
     */
    getStatusText() {
        switch (this.status) {
            case 'pending':
                return 'Pendiente';
            case 'in-progress':
                return 'En Progreso';
            case 'completed':
                return 'Completado';
            default:
                return 'Desconocido';
        }
    }
    
    /**
     * Check if confirmation period is currently active
     * @returns {boolean} True if confirmation period is active
     */
    isConfirmationPeriodActive() {
        if (!this.confirmStartDate || !this.confirmEndDate || this.status !== 'in-progress') {
            return false;
        }
        
        const now = new Date();
        const confirmStart = this.confirmStartDate.toDate ? 
            this.confirmStartDate.toDate() : new Date(this.confirmStartDate);
        const confirmEnd = this.confirmEndDate.toDate ? 
            this.confirmEndDate.toDate() : new Date(this.confirmEndDate);
        
        return now >= confirmStart && now <= confirmEnd;
    }
    
    /**
     * Get time remaining for confirmation period
     * @returns {Object} Time remaining in hours, minutes, seconds
     */
    getTimeRemainingForConfirmation() {
        if (!this.confirmEndDate || !this.isConfirmationPeriodActive()) {
            return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
        }
        
        const now = new Date();
        const confirmEnd = this.confirmEndDate.toDate ? 
            this.confirmEndDate.toDate() : new Date(this.confirmEndDate);
        
        const timeDiff = confirmEnd - now;
        
        // If time has expired
        if (timeDiff <= 0) {
            return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
        }
        
        // Calculate hours, minutes, seconds
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
        return {
            hours,
            minutes,
            seconds,
            totalSeconds: Math.floor(timeDiff / 1000)
        };
    }
    
    /**
     * Calculate estimated savings based on confirmations
     * @param {number} mealCost - Cost per meal
     * @returns {number} Estimated savings
     */
    calculateSavings(mealCost = 50) {
        if (this.totalEmployees === 0) return 0;
        
        // Total possible meal slots (employees * 5 days)
        const totalMealSlots = this.totalEmployees * 5;
        
        // For simplicity, we're assuming confirmedEmployees is the number of employees who confirmed
        // But each employee can confirm multiple days, so we need to know the total confirmations
        // This is a simplified calculation, for accurate calculation we need actual confirmation counts
        const totalConfirmedSlots = this.confirmedEmployees * 5;
        
        // Calculate unconfirmed meals (this is simplified)
        const unconfirmedMeals = totalMealSlots - totalConfirmedSlots;
        
        // Calculate savings (cost * unconfirmed meals)
        return unconfirmedMeals * mealCost;
    }
    
    /**
     * Update daily menu
     * @param {string} day - Day name (monday, tuesday, etc.)
     * @param {Object} menuData - Menu data
     */
    updateDailyMenu(day, menuData) {
        if (!this.dailyMenus) {
            this.dailyMenus = {};
        }
        
        this.dailyMenus[day] = {
            ...(this.dailyMenus[day] || {}),
            ...menuData
        };
    }
    
    /**
     * Create week ID from date (YYYY-MM-DD)
     * @param {Date} date - Date object
     * @returns {string} Week ID
     */
    static createWeekId(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Get confirmation window dates based on settings
     * @param {Date} startDate - Monday of the week
     * @param {Object} settings - App settings
     * @returns {Object} Confirmation start and end dates
     */
    static getConfirmationWindow(startDate, settings = {}) {
        const defaultSettings = {
            confirmationWindow: {
                startDay: "thursday",
                startHour: 16.17, // 16:10
                endDay: "saturday",
                endHour: 10
            }
        };
        
        const config = settings.confirmationWindow || defaultSettings.confirmationWindow;
        
        // Calculate start day (previous Thursday by default)
        const confirmStart = new Date(startDate);
        confirmStart.setDate(confirmStart.getDate() - 4); // Default: Thursday = Monday - 4 days
        
        // Set hour
        const startHour = Math.floor(config.startHour);
        const startMinutes = Math.round((config.startHour - startHour) * 60);
        confirmStart.setHours(startHour, startMinutes, 0, 0);
        
        // Calculate end day (previous Saturday by default)
        const confirmEnd = new Date(startDate);
        confirmEnd.setDate(confirmEnd.getDate() - 2); // Default: Saturday = Monday - 2 days
        
        // Set hour
        confirmEnd.setHours(config.endHour, 0, 0, 0);
        
        return {
            confirmStartDate: confirmStart,
            confirmEndDate: confirmEnd
        };
    }
}

// Export model if module system is available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MenuModel;
}