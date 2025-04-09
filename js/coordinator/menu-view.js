// Coordinator Menu View for Comedor Grupo Avika

// Ensure coordinator only access
document.addEventListener('DOMContentLoaded', () => {
    // Asegurar que Firebase se inicialice
    if (window.initializeFirebase) {
        window.initializeFirebase();
    }
    
    // Verificar permisos de acceso
    if (!window.checkAuth) {
        console.error('La función de autenticación no está disponible');
        alert('Error: La función de autenticación no está disponible. Por favor recargue la página.');
        return;
    }
    
    // Normalizar rol para compatibilidad
    const requiredRole = window.USER_ROLES ? window.USER_ROLES.COORDINATOR : 'coordinator';
    
    if (!checkAuth(requiredRole)) {
        return;
    }
    
    // Set user name
    let userName = 'Coordinador';
    try {
        const userJson = sessionStorage.getItem('user');
        if (userJson) {
            const userObj = JSON.parse(userJson);
            userName = userObj.displayName || userName;
        }
    } catch (error) {
        // Usar el sistema de logging si está disponible
        if (window.logger && window.logger.error) {
            window.logger.error('Error al procesar datos del usuario:', error);
        } else {
            console.error('Error al procesar datos del usuario:', error);
        }
    }
    
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = userName;
    }
    
    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.logout) {
                logout();
            } else {
                // Fallback si logout no está disponible
                sessionStorage.clear();
                window.location.href = '../../index.html';
            }
        });
    }
    
    // Initialize the UI
    initializeWeekSelector();
    loadMenuForWeek();
    
    // Set event listeners for menu tabs
    document.querySelectorAll('.menu-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchMenuTab(this.getAttribute('data-day'));
        });
    });
});

// Current week settings
// Usar la utilidad de fecha del módulo dateUtils si está disponible
let currentWeek = (window.dateUtils && window.dateUtils.getMonday) ?
    window.dateUtils.getMonday(new Date()) : getMonday(new Date());

// Usar los formatos de días del módulo de utilidades si está disponible
const DAYS = (window.dateUtils && window.dateUtils.DATE_FORMATS) ?
    window.dateUtils.DATE_FORMATS.COORDINATOR : 
    ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const DAYS_DISPLAY = (window.dateUtils && window.dateUtils.DATE_FORMATS) ?
    window.dateUtils.DATE_FORMATS.ADMIN : 
    ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Format day name nicely with proper accents and capitalization
function formatDayDisplay(day) {
    const index = DAYS.indexOf(day.toLowerCase());
    return index >= 0 ? DAYS_DISPLAY[index] : day;
}

// Initialize week selector
function initializeWeekSelector() {
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', () => {
            // Go to previous week
            currentWeek.setDate(currentWeek.getDate() - 7);
            updateWeekDisplay();
            loadMenuForWeek();
        });
    }
    
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', () => {
            // Go to next week
            currentWeek.setDate(currentWeek.getDate() + 7);
            updateWeekDisplay();
            loadMenuForWeek();
        });
    }
    
    updateWeekDisplay();
}

// Update week display
function updateWeekDisplay() {
    const weekDisplay = document.getElementById('current-week-display');
    if (!weekDisplay) return;
    
    // Get the week start and end dates
    const weekStart = new Date(currentWeek);
    const weekEnd = new Date(currentWeek);
    weekEnd.setDate(weekEnd.getDate() + 6); // Show Monday-Sunday (toda la semana)
    
    // Format dates using dateUtils if available
    let formattedStart, formattedEnd;
    
    if (window.dateUtils && window.dateUtils.formatDateDisplay) {
        formattedStart = window.dateUtils.formatDateDisplay(weekStart);
        formattedEnd = window.dateUtils.formatDateDisplay(weekEnd);
    } else {
        formattedStart = formatDateDisplay(weekStart);
        formattedEnd = formatDateDisplay(weekEnd);
    }
    
    // Update display
    weekDisplay.textContent = `${formattedStart} - ${formattedEnd}`;
}

// Load menu for selected week
function loadMenuForWeek() {
    // Show loading state
    if (window.errorHandler && window.errorHandler.toggleLoadingIndicator) {
        window.errorHandler.toggleLoadingIndicator(true);
    } else {
        showLoadingState(true);
    }
    
    // Format date for Firestore query
    const weekStartStr = window.dateUtils && window.dateUtils.formatDate ? 
        window.dateUtils.formatDate(currentWeek) : 
        formatDate(currentWeek);
    
    // Log usando el sistema de logging si está disponible
    if (window.logger && window.logger.info) {
        window.logger.info('Cargando menú para la semana que comienza el:', weekStartStr);
    } else {
        console.log('Cargando menú para la semana que comienza el:', weekStartStr);
    }
    
    // Intentar usar los servicios de Firestore si están disponibles
    if (window.firestoreServices && window.firestoreServices.menu) {
        window.firestoreServices.menu.getMenuForWeek(weekStartStr)
            .then(processMenuDocument)
            .catch(handleMenuLoadError);
    } else {
        // Fallback al método directo si los servicios no están disponibles
        window.db.collection('menus').doc(weekStartStr)
            .get()
            .then(processMenuDocument)
            .catch(handleMenuLoadError);
    }
}

/**
 * Process menu document
 * @param {FirebaseFirestore.DocumentSnapshot} doc - Menu document
 */
function processMenuDocument(doc) {
    if (doc.exists) {
        const menuData = doc.data();
        
        // Log usando el sistema de logging si está disponible
        if (window.logger && window.logger.debug) {
            window.logger.debug('Menú encontrado para la semana:', menuData);
        } else {
            console.log('Menú encontrado para la semana:', menuData);
        }
        
        // Verificar si el menú está publicado
        if (menuData.status !== 'published') {
            // El menú existe pero no está publicado
            showNoMenuMessage();
            
            if (window.errorHandler && window.errorHandler.toggleLoadingIndicator) {
                window.errorHandler.toggleLoadingIndicator(false);
            } else {
                showLoadingState(false);
            }
            return;
        }
        
        // Verificar si hay elementos en el menú para al menos un día
        let hasMenuItems = false;
        
        // Normalizar los datos del menú para asegurar compatibilidad entre formatos
        let normalizedMenuData;
        if (window.firestoreServices && window.firestoreServices.menu.normalizeMenuData) {
            normalizedMenuData = window.firestoreServices.menu.normalizeMenuData(menuData);
        } else {
            // Implementación de respaldo
            normalizedMenuData = normalizeMenuData(menuData);
        }
        
        // Verificar si hay elementos en el menú después de la normalización
        hasMenuItems = DAYS.some(day => {
            return normalizedMenuData[day] && 
                normalizedMenuData[day].items && 
                normalizedMenuData[day].items.length > 0;
        });
        
        // Log usando el sistema de logging si está disponible
        if (window.logger && window.logger.debug) {
            window.logger.debug('¿Hay elementos en el menú?', hasMenuItems);
        } else {
            console.log('¿Hay elementos en el menú?', hasMenuItems);
        }
        
        if (hasMenuItems) {
            // Display menu for each day
            DAYS.forEach(day => {
                // Get menu container for this day
                const dayContainer = document.getElementById(`${day}-menu`);
                if (dayContainer) {
                    // Verificar si tenemos datos para este día
                    let dayData = normalizedMenuData[day];
                    
                    // Display menu items for this day
                    displayDayMenu(day, dayData, day === 'lunes');
                }
            });
            
            // Make sure the active tab is shown
            const activeTab = document.querySelector('.menu-tab.active');
            if (activeTab) {
                switchMenuTab(activeTab.getAttribute('data-day'));
            }
            
            // Show menu container
            const menuContainer = document.getElementById('weekly-menu');
            if (menuContainer) {
                menuContainer.style.display = 'block';
            }
            
            // Hide "no menu" message
            const noMenuMessage = document.getElementById('no-menu-message');
            if (noMenuMessage) {
                noMenuMessage.style.display = 'none';
            }
        } else {
            // No menu items found for this week
            showNoMenuMessage();
        }
    } else {
        // No hay menú para esta semana
        showNoMenuMessage();
    }
    
    // Hide loading state
    if (window.errorHandler && window.errorHandler.toggleLoadingIndicator) {
        window.errorHandler.toggleLoadingIndicator(false);
    } else {
        showLoadingState(false);
    }
}

/**
 * Handle error when loading menu
 * @param {Error} error - Error object
 */
function handleMenuLoadError(error) {
    console.error("Error loading menu:", error);
    
    // Usar error handler si está disponible
    if (window.errorHandler) {
        const errorMsg = window.errorHandler.handleFirestoreError(
            error, 
            "Error al cargar el menú. Por favor intente de nuevo."
        );
        window.errorHandler.showUIError(errorMsg);
        window.errorHandler.toggleLoadingIndicator(false);
    } else {
        showErrorMessage("Error al cargar el menú. Por favor intente de nuevo.");
        showLoadingState(false);
    }
}

// Display menu for a specific day
function displayDayMenu(day, dayData, isActive) {
    // Get tab and content elements
    const tab = document.querySelector(`.menu-tab[data-day="${day}"]`);
    const content = document.getElementById(`${day}-menu`);
    
    if (!tab || !content) return;
    
    // Update tab active state
    if (isActive) {
        tab.classList.add('active');
        content.classList.add('active');
    } else {
        tab.classList.remove('active');
        content.classList.remove('active');
    }
    
    // Clear previous content
    content.innerHTML = '';
    
    // Check if day data exists
    if (dayData && dayData.items && dayData.items.length > 0) {
        // Create day header
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.innerHTML = `<h3>${formatDayDisplay(day)}</h3>`;
        content.appendChild(dayHeader);
        
        // Create menu items
        dayData.items.forEach(item => {
            const mealCard = document.createElement('div');
            mealCard.classList.add('meal-card');
            
            mealCard.innerHTML = `
                <div class="meal-name">${item.name}</div>
                ${item.description ? `<div class="meal-description">${item.description}</div>` : ''}
            `;
            
            content.appendChild(mealCard);
        });
    } else {
        // No menu for this day
        const emptyMessage = document.createElement('div');
        emptyMessage.classList.add('empty-menu-message');
        emptyMessage.textContent = 'No hay menú disponible para este día.';
        
        content.appendChild(emptyMessage);
    }
}

// Switch between menu tabs
function switchMenuTab(day) {
    // Update tab active states
    document.querySelectorAll('.menu-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.menu-tab[data-day="${day}"]`).classList.add('active');
    
    // Update content active states
    document.querySelectorAll('.daily-menu').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${day}-menu`).classList.add('active');
}

// Show message when no menu is available
function showNoMenuMessage() {
    // Hide menu container
    const menuContainer = document.getElementById('weekly-menu');
    if (menuContainer) {
        menuContainer.style.display = 'none';
    }
    
    // Show "no menu" message
    const noMenuMessage = document.getElementById('no-menu-message');
    if (noMenuMessage) {
        noMenuMessage.style.display = 'block';
        
        // Format date for display
        let formattedDate;
        if (window.dateUtils && window.dateUtils.formatDateDisplay) {
            formattedDate = window.dateUtils.formatDateDisplay(currentWeek);
        } else {
            formattedDate = formatDateDisplay(currentWeek);
        }
        
        noMenuMessage.innerHTML = `
            <div class="card-body empty-state">
                <i class="fas fa-utensils empty-icon"></i>
                <p>No hay menú publicado para la semana del ${formattedDate}.</p>
                <p>Por favor, contacte al administrador para más información.</p>
            </div>
        `;
    }
}

// Normalize menu data to ensure compatibility between formats
function normalizeMenuData(menuData) {
    if (!menuData) return {};
    
    const normalizedData = {...menuData};
    
    // Para cada día, asegurarnos de que exista la estructura adecuada
    DAYS.forEach(day => {
        if (!normalizedData[day]) {
            normalizedData[day] = { items: [] };
        } else if (!normalizedData[day].items) {
            normalizedData[day].items = [];
        }
        
        // También verificar la versión con mayúsculas/acentos
        const adminDay = formatDayDisplay(day);
        if (normalizedData[adminDay] && normalizedData[adminDay].items && 
            normalizedData[adminDay].items.length > 0 && 
            (!normalizedData[day].items || normalizedData[day].items.length === 0)) {
            // Copiar los elementos
            normalizedData[day].items = normalizedData[adminDay].items;
        }
    });
    
    return normalizedData;
}

// Get Monday of the current week - Respaldo si no está disponible en dateUtils
function getMonday(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(date.setDate(diff));
}

// Format date as YYYY-MM-DD - Respaldo si no está disponible en dateUtils
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display (DD/MM/YYYY) - Respaldo si no está disponible en dateUtils
function formatDateDisplay(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Función de respaldo para mostrar estado de carga
function showLoadingState(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
    
    // Disable buttons while loading
    document.querySelectorAll('button').forEach(button => {
        button.disabled = isLoading;
    });
}

// Función de respaldo para mostrar errores
function showErrorMessage(message) {
    // Intentar usar el error handler global si está disponible
    if (window.errorHandler && window.errorHandler.showUIError) {
        window.errorHandler.showUIError(message);
        return;
    }
    
    // Implementación de respaldo
    const errorAlert = document.getElementById('error-alert');
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    } else {
        // Usar el sistema de logging
        if (window.logger && window.logger.error) {
            window.logger.error(message);
        } else {
            console.error(message);
        }
        alert("Error: " + message);
    }
}