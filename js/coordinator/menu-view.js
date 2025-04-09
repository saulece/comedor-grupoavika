// Coordinator Menu View for Comedor Grupo Avika

// Ensure coordinator only access
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth(USER_ROLES.COORDINATOR)) {
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
        // Usar el nuevo sistema de logging
        window.logger?.error('Error al procesar datos del usuario:', error);
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
            logout();
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
// Usar la utilidad de fecha del nuevo módulo si está disponible
let currentWeek = (window.dateUtils?.getMonday || getMonday)(new Date()); // Default to current week

// Usar los formatos de días del nuevo módulo de utilidades si está disponible
const DAYS = window.dateUtils?.DATE_FORMATS?.COORDINATOR || 
    ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DAYS_DISPLAY = window.dateUtils?.DATE_FORMATS?.ADMIN || 
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
    
    // Format dates
    const formattedStart = formatDateDisplay(weekStart);
    const formattedEnd = formatDateDisplay(weekEnd);
    
    // Update display
    weekDisplay.textContent = `${formattedStart} - ${formattedEnd}`;
}

// Load menu for selected week
function loadMenuForWeek() {
    // Show loading state
    showLoadingState(true);
    
    // Format date for Firestore query
    const weekStartStr = (window.dateUtils?.formatDate || formatDate)(currentWeek);
    
    // Usar el nuevo sistema de logging
    window.logger?.info('Cargando menú para la semana que comienza el:', weekStartStr);
    
    // Get menu from Firestore
    window.db.collection('menus').doc(weekStartStr)
        .get()
        .then(doc => {
            if (doc.exists) {
                const menuData = doc.data();
                window.logger?.debug('Menú encontrado para la semana:', menuData);
                
                // Verificar si hay elementos en el menú para al menos un día
                let hasMenuItems = false;
                
                // Normalizar los datos del menú para asegurar compatibilidad entre formatos
                normalizeMenuData(menuData);
                
                // Verificar si hay elementos en el menú después de la normalización
                hasMenuItems = DAYS.some(day => {
                    return menuData[day] && menuData[day].items && menuData[day].items.length > 0;
                });
                
                window.logger?.debug('¿Hay elementos en el menú?', hasMenuItems);
                
                if (hasMenuItems) {
                    // Display menu for each day
                    DAYS.forEach(day => {
                        // Get menu container for this day
                        const dayContainer = document.getElementById(`${day}-menu`);
                        if (dayContainer) {
                            // Verificar si tenemos datos para este día
                            let dayData = menuData[day];
                            
                            // Si no hay datos en formato coordinador, intentar con formato administrador
                            if (!dayData || !dayData.items || dayData.items.length === 0) {
                                const adminDay = DAYS_DISPLAY[DAYS.indexOf(day)];
                                if (menuData[adminDay] && menuData[adminDay].items && menuData[adminDay].items.length > 0) {
                                    dayData = menuData[adminDay];
                                    console.log(`Usando datos del formato administrador para ${day}`);
                                }
                            }
                            
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
            showLoadingState(false);
        })
        .catch(error => {
            console.error("Error loading menu:", error);
            showErrorMessage("Error al cargar el menú. Por favor intente de nuevo.");
            showLoadingState(false);
        });
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
        noMenuMessage.innerHTML = `
            <div class="card-body empty-state">
                <i class="fas fa-utensils empty-icon"></i>
                <p>No hay menú publicado para la semana del ${formatDateDisplay(currentWeek)}.</p>
                <p>Por favor, contacte al administrador para más información.</p>
            </div>
        `;
    }
}

// Get Monday of the current week
function getMonday(date) {
    // Usar la función del módulo de utilidades si está disponible
    if (window.dateUtils?.getMonday) {
        return window.dateUtils.getMonday(date);
    }
    
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(date.setDate(diff));
}

/**
 * Normaliza los datos del menú para asegurar compatibilidad entre formatos
 * @param {Object} menuData - Datos del menú a normalizar
 */
function normalizeMenuData(menuData) {
    if (!menuData) return;
    
    // Para cada día en formato administrador, copiar los datos al formato coordinador
    DAYS_DISPLAY.forEach((adminDay, index) => {
        const coordDay = DAYS[index];
        
        // Si existe en formato administrador pero no en coordinador
        if (menuData[adminDay] && menuData[adminDay].items && 
            (!menuData[coordDay] || !menuData[coordDay].items || menuData[coordDay].items.length === 0)) {
            
            // Copiar los datos al formato coordinador
            if (!menuData[coordDay]) menuData[coordDay] = {};
            menuData[coordDay].items = menuData[adminDay].items;
            window.logger?.debug(`Normalizado: ${adminDay} → ${coordDay}`, menuData[coordDay]);
        }
    });
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    // Usar la función del módulo de utilidades si está disponible
    if (window.dateUtils?.formatDate) {
        return window.dateUtils.formatDate(date);
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display (DD/MM/YYYY)
function formatDateDisplay(date) {
    // Usar la función del módulo de utilidades si está disponible
    if (window.dateUtils?.formatDateDisplay) {
        return window.dateUtils.formatDateDisplay(date);
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Show loading state
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

// Show error message
function showErrorMessage(message) {
    // Usar el manejador de errores global si está disponible
    if (window.errorHandler?.showUIError) {
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
        // Usar el nuevo sistema de logging
        window.logger?.error(message);
        alert("Error: " + message);
    }
}