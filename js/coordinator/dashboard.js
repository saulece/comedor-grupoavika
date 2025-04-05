// Coordinator Dashboard for Comedor Grupo Avika

// Ensure coordinator only access
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth(USER_ROLES.COORDINATOR)) {
        return;
    }
    
    // Set user name
    const user = JSON.parse(sessionStorage.getItem('user'));
    const userNameElement = document.getElementById('user-name');
    if (userNameElement && user) {
        userNameElement.textContent = user.displayName || 'Coordinador';
    }
    
    // Setup logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Load dashboard data
    loadDashboardData();
});

// Load dashboard data
async function loadDashboardData() {
    try {
        // Show loading state
        showLoadingState(true);
        
        // Get current coordinator ID
        const currentUserId = sessionStorage.getItem('userId');
        if (!currentUserId) {
            throw new Error('Usuario no identificado');
        }
        
        // Load stats data in parallel
        await Promise.all([
            loadEmployeeStats(currentUserId),
            loadConfirmationStats(currentUserId),
            loadCurrentWeekInfo(),
            loadMenuStatus()
        ]);
        
        // Hide loading state
        showLoadingState(false);
    } catch (error) {
        console.error("Error loading dashboard data:", error);
        showErrorMessage("Error al cargar los datos del dashboard.");
        showLoadingState(false);
    }
}

// Load employee stats
async function loadEmployeeStats(coordinatorId) {
    try {
        // Get employees for this coordinator
        const employeesSnapshot = await firebase.firestore().collection('employees')
            .where('coordinatorId', '==', coordinatorId)
            .get();
        
        // Update employee count
        document.getElementById('total-employees').textContent = employeesSnapshot.size;
        
        // Update the employee summary in employee card
        document.getElementById('employee-count').textContent = employeesSnapshot.size;
    } catch (error) {
        console.error("Error loading employee stats:", error);
        throw error;
    }
}

// Load confirmation stats
async function loadConfirmationStats(coordinatorId) {
    try {
        // Get today's date
        const today = new Date();
        const todayStr = formatDate(today);
        
        // Check if there's a confirmation for today from this coordinator
        const confirmationSnapshot = await firebase.firestore().collection('confirmations')
            .where('date', '==', todayStr)
            .where('coordinatorId', '==', coordinatorId)
            .get();
        
        const confirmationStatus = document.getElementById('today-confirmation-status');
        const todayConfirmations = document.getElementById('today-confirmations');
        
        if (!confirmationSnapshot.empty) {
            // There is a confirmation for today
            const confirmation = confirmationSnapshot.docs[0].data();
            todayConfirmations.textContent = confirmation.confirmedCount || 0;
            confirmationStatus.textContent = 'Completada';
            confirmationStatus.classList.add('status-completed');
        } else {
            // No confirmation for today
            todayConfirmations.textContent = '0';
            confirmationStatus.textContent = 'Pendiente';
            confirmationStatus.classList.add('status-pending');
        }
    } catch (error) {
        console.error("Error loading confirmation stats:", error);
        throw error;
    }
}

// Load current week information
function loadCurrentWeekInfo() {
    try {
        // Get current week (Monday-Friday)
        const currentWeek = getMonday(new Date());
        const weekEnd = new Date(currentWeek);
        weekEnd.setDate(weekEnd.getDate() + 4); // Add 4 days to get to Friday
        
        // Format dates
        const weekStartStr = formatDateDisplay(currentWeek);
        const weekEndStr = formatDateDisplay(weekEnd);
        
        // Update week information
        document.getElementById('current-week').textContent = `Semana del ${weekStartStr} al ${weekEndStr}`;
    } catch (error) {
        console.error("Error loading week info:", error);
        throw error;
    }
}

// Load menu status
async function loadMenuStatus() {
    try {
        // Get current week's menu
        const currentWeek = getMonday(new Date());
        const weekStartStr = formatDate(currentWeek);
        
        const menuDoc = await firebase.firestore().collection('menus').doc(weekStartStr).get();
        const menuStatusContainer = document.getElementById('menu-status-container');
        
        if (menuStatusContainer) {
            if (menuDoc.exists && menuDoc.data().status === 'published') {
                // Menu exists and is published
                const menuData = menuDoc.data();
                const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
                let totalItems = 0;
                
                // Count total items in the menu
                days.forEach(day => {
                    if (menuData[day] && menuData[day].items) {
                        totalItems += menuData[day].items.length;
                    }
                });
                
                menuStatusContainer.innerHTML = `
                    <div class="menu-status menu-status-available">
                        <h4>Menú de la semana del ${formatDateDisplay(currentWeek)}</h4>
                        <p>Estado: Publicado</p>
                        <p>Total de platillos: ${totalItems}</p>
                    </div>
                `;
            } else {
                // Menu doesn't exist or is not published
                menuStatusContainer.innerHTML = `
                    <div class="menu-status menu-status-unavailable">
                        <h4>Menú de la semana del ${formatDateDisplay(currentWeek)}</h4>
                        <p>Estado: No disponible</p>
                        <p>El menú de esta semana aún no está publicado</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error("Error loading menu status:", error);
        throw error;
    }
}

// Helper functions

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
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
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
    }
}
