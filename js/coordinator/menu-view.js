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
        console.error('Error parsing user data:', error);
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
let currentWeek = getMonday(new Date()); // Default to current week

// Days of the week in Spanish
const DAYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DAYS_DISPLAY = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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
    weekEnd.setDate(weekEnd.getDate() + 4); // Show Monday-Friday
    
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
    const weekStartStr = formatDate(currentWeek);
    
    // Get menu from Firestore
    window.db.collection('menus').doc(weekStartStr)
        .get()
        .then(doc => {
            if (doc.exists) {
                const menuData = doc.data();
                console.log('Menú encontrado para la semana:', menuData);
                
                // Verificar si hay elementos en el menú para al menos un día
                let hasMenuItems = false;
                DAYS.forEach(day => {
                    if (menuData[day] && menuData[day].items && menuData[day].items.length > 0) {
                        hasMenuItems = true;
                    }
                });
                
                if (hasMenuItems) {
                    // Display menu for each day
                    DAYS.forEach((day, index) => {
                        const dayData = menuData[day];
                        displayDayMenu(day, dayData, index === 0); // Set first day as active
                    });
                    
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
                    // Menú existe pero no tiene elementos
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
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(date.setDate(diff));
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display (DD/MM/YYYY)
function formatDateDisplay(date) {
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
    const errorAlert = document.getElementById('error-alert');
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    } else {
        console.error(message);
        alert("Error: " + message);
    }
}