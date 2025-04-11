// State Manager - Simple state management for the application
// Prevent duplicate declarations
if (typeof StateManager !== 'function' && typeof stateManager === 'undefined') {

/**
 * StateManager - Manages application state with observers pattern
 */
class StateManager {
    constructor() {
        this.state = {};
        this.observers = {};
    }
    
    /**
     * Set state value
     * @param {string} key - State key
     * @param {any} value - State value
     */
    setState(key, value) {
        // Update state
        this.state[key] = value;
        
        // Notify observers
        if (this.observers[key]) {
            this.observers[key].forEach(callback => {
                callback(value);
            });
        }
    }
    
    /**
     * Get state value
     * @param {string} key - State key
     * @returns {any} State value
     */
    getState(key) {
        return this.state[key];
    }
    
    /**
     * Subscribe to state changes
     * @param {string} key - State key to observe
     * @param {Function} callback - Function to call when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        // Initialize observers array for key if not exists
        if (!this.observers[key]) {
            this.observers[key] = [];
        }
        
        // Add callback to observers
        this.observers[key].push(callback);
        
        // Return unsubscribe function
        return () => {
            this.observers[key] = this.observers[key].filter(cb => cb !== callback);
        };
    }
    
    /**
     * Clear all state and observers
     */
    clearState() {
        this.state = {};
        this.observers = {};
    }
}

// Create state manager instance
const stateManager = new StateManager();

// Application state keys
const STATE_KEYS = {
    CURRENT_USER: 'currentUser',
    USER_ROLE: 'userRole',
    USER_BRANCH: 'userBranch',
    CURRENT_MENU: 'currentMenu',
    CURRENT_EMPLOYEES: 'currentEmployees',
    CURRENT_CONFIRMATIONS: 'currentConfirmations',
    SELECTED_DAY: 'selectedDay',
    APP_SETTINGS: 'appSettings'
};

// Initialize common state from sessionStorage if available
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Restore state from session storage
        Object.values(STATE_KEYS).forEach(key => {
            const savedValue = sessionStorage.getItem(`app_state_${key}`);
            if (savedValue) {
                try {
                    const parsedValue = JSON.parse(savedValue);
                    stateManager.setState(key, parsedValue);
                } catch (e) {
                    console.error(`Error parsing stored state for key: ${key}`, e);
                }
            }
        });
        
        // Subscribe to state changes to persist in sessionStorage
        Object.values(STATE_KEYS).forEach(key => {
            stateManager.subscribe(key, (value) => {
                try {
                    // Skip undefined values
                    if (value !== undefined) {
                        sessionStorage.setItem(`app_state_${key}`, JSON.stringify(value));
                    } else {
                        sessionStorage.removeItem(`app_state_${key}`);
                    }
                } catch (e) {
                    console.error(`Error saving state for key: ${key}`, e);
                }
            });
        });
    } catch (e) {
        console.error('Error initializing state from sessionStorage', e);
    }
});

// State getters and setters
function setCurrentUser(user) {
    stateManager.setState(STATE_KEYS.CURRENT_USER, user);
}

function getCurrentUser() {
    return stateManager.getState(STATE_KEYS.CURRENT_USER);
}

function setUserRole(role) {
    stateManager.setState(STATE_KEYS.USER_ROLE, role);
}

function getUserRole() {
    return stateManager.getState(STATE_KEYS.USER_ROLE);
}

function setUserBranch(branch) {
    stateManager.setState(STATE_KEYS.USER_BRANCH, branch);
}

function getUserBranch() {
    return stateManager.getState(STATE_KEYS.USER_BRANCH);
}

function setCurrentMenu(menu) {
    stateManager.setState(STATE_KEYS.CURRENT_MENU, menu);
}

function getCurrentMenu() {
    return stateManager.getState(STATE_KEYS.CURRENT_MENU);
}

function setCurrentEmployees(employees) {
    stateManager.setState(STATE_KEYS.CURRENT_EMPLOYEES, employees);
}

function getCurrentEmployees() {
    return stateManager.getState(STATE_KEYS.CURRENT_EMPLOYEES);
}

function setCurrentConfirmations(confirmations) {
    stateManager.setState(STATE_KEYS.CURRENT_CONFIRMATIONS, confirmations);
}

function getCurrentConfirmations() {
    return stateManager.getState(STATE_KEYS.CURRENT_CONFIRMATIONS);
}

function setSelectedDay(day) {
    stateManager.setState(STATE_KEYS.SELECTED_DAY, day);
}

function getSelectedDay() {
    return stateManager.getState(STATE_KEYS.SELECTED_DAY);
}

function setAppSettings(settings) {
    stateManager.setState(STATE_KEYS.APP_SETTINGS, settings);
}

function getAppSettings() {
    return stateManager.getState(STATE_KEYS.APP_SETTINGS);
}

// Clear all state
function clearAppState() {
    stateManager.clearState();
    
    // Clear session storage
    Object.values(STATE_KEYS).forEach(key => {
        sessionStorage.removeItem(`app_state_${key}`);
    });
}

// Cierre del bloque condicional para evitar declaraciones duplicadas
}