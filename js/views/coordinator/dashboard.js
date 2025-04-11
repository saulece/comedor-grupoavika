// Dashboard.js - Coordinator Dashboard - Versión Corregida

// Initialize Firebase
const auth = firebase.auth();
const firestore = firebase.firestore();

// DOM Elements
const branchNameElement = document.getElementById('branchName');
const menuPreview = document.getElementById('menuPreview');
const confirmationStatus = document.getElementById('confirmationStatus');
const timeRemainingContainer = document.getElementById('timeRemainingContainer');
const timeRemainingValue = document.getElementById('timeRemainingValue');
const totalEmployees = document.getElementById('totalEmployees');
const activeEmployees = document.getElementById('activeEmployees');
const confirmedEmployees = document.getElementById('confirmedEmployees');
const recentActivitiesContainer = document.getElementById('recentActivities');
const weekDates = document.getElementById('weekDates');
const dayTabsContainer = document.getElementById('dayTabs');

// Global variables
let currentUser = null;
let branchId = null;
let branchData = null;
let currentMenu = null;
let employeesData = [];
let currentDay = getCurrentDayName().toLowerCase();
let countdownInterval = null;

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            console.log('Usuario autenticado:', user.email);
            
            // Check if user is coordinator
            try {
                const userDoc = await firestore.collection('users').doc(user.uid).get();
                if (!userDoc.exists || userDoc.data().role !== 'coordinator') {
                    // Redirect non-coordinator users
                    console.log('Usuario no es coordinador, redirigiendo...');
                    window.location.href = '../../index.html';
                    return;
                }
                
                // Store user data
                const userData = userDoc.data();
                branchId = userData.branch;
                
                // Display user info
                document.getElementById('userName').textContent = userData.displayName || 'Coordinador';
                
                // Initialize dashboard
                initDashboard();
            } catch (error) {
                console.error('Error verificando rol de usuario:', error);
                window.location.href = '../../index.html';
            }
        } else {
            // Redirect to login
            console.log('Usuario no autenticado, redirigiendo a login');
            window.location.href = '../../index.html';
        }
    });
    
    // Day selector event listeners
    const daySelectors = document.querySelectorAll('.day-selector');
    daySelectors.forEach(selector => {
        selector.addEventListener('click', (e) => {
            e.preventDefault();
            const day = selector.getAttribute('data-day');
            
            // Update active state
            daySelectors.forEach(s => s.classList.remove('active'));
            selector.classList.add('active');
            
            // Update current day and refresh menu
            currentDay = day;
            displayDayMenu();
        });
    });
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await firebase.auth().signOut();
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('Error logging out:', error);
            showError('Error al cerrar sesión. Intente nuevamente.');
        }
    });
});

// Initialize dashboard
async function initDashboard() {
    try {
        console.log('Inicializando dashboard...');
        
        // Show loading state
        document.querySelector('.dashboard-container').classList.add('loading');
        
        // Get user's branch
        await getUserBranch();
        
        // Get current weekly menu
        await loadCurrentMenu();
        
        // Get employees for the branch
        await loadEmployees();
        
        // Display data
        displayDayMenu();
        displayConfirmationStatus();
        await displayEmployeeStats();
        await loadActivities();
        
        // Remove loading state
        document.querySelector('.dashboard-container').classList.remove('loading');
        console.log('Dashboard inicializado correctamente');
    } catch (error) {
        console.error('Error inicializando dashboard:', error);
        displayError('Error al cargar el dashboard. Por favor, intente nuevamente.');
    }
}

// Get user's branch information
async function getUserBranch() {
    try {
        if (!branchId) {
            console.error('ID de sucursal no disponible');
            return;
        }
        
        console.log('Obteniendo información de la sucursal:', branchId);
        
        const branchDoc = await firestore.collection('branches').doc(branchId).get();
        if (!branchDoc.exists) {
            console.error('Sucursal no encontrada:', branchId);
            return;
        }
        
        branchData = branchDoc.data();
        branchData.id = branchDoc.id;
        
        // Display branch name
        if (branchNameElement) {
            branchNameElement.textContent = branchData.name || 'Sucursal';
        }
        
        console.log('Información de sucursal cargada:', branchData.name);
    } catch (error) {
        console.error('Error obteniendo información de la sucursal:', error);
    }
}

// Load current weekly menu
async function loadCurrentMenu() {
    try {
        console.log('Cargando menú semanal actual...');
        
        // Try multiple approaches for better compatibility
        if (typeof getCurrentWeeklyMenu === 'function') {
            console.log('Usando función global getCurrentWeeklyMenu');
            currentMenu = await getCurrentWeeklyMenu();
        } else if (window.firestoreService && typeof window.firestoreService.getCurrentWeeklyMenu === 'function') {
            console.log('Usando window.firestoreService.getCurrentWeeklyMenu');
            currentMenu = await window.firestoreService.getCurrentWeeklyMenu();
        } else {
            console.log('Usando acceso directo a Firebase');
            currentMenu = await getMenuDirectly();
        }
        
        if (currentMenu) {
            console.log('Menú encontrado:', { id: currentMenu.id, status: currentMenu.status });
            
            // Display week dates if element exists
            if (weekDates) {
                const startDate = currentMenu.startDate.toDate ? 
                    currentMenu.startDate.toDate() : new Date(currentMenu.startDate);
                const endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6); // Add 6 days to get to Sunday
                
                weekDates.textContent = `${formatDateDMY(startDate)} al ${formatDateDMY(endDate)}`;
            }
            
            // Create day tabs if container exists
            if (dayTabsContainer) {
                createDayTabs();
            }
        } else {
            console.warn('No se encontró un menú activo');
            if (weekDates) weekDates.textContent = 'No disponible';
        }
    } catch (error) {
        console.error('Error al cargar el menú actual:', error);
        if (weekDates) weekDates.textContent = 'Error al cargar';
    }
}

// Get menu directly from Firestore
async function getMenuDirectly() {
    try {
        // Get current date
        const today = new Date();
        
        // First try to find a menu where today falls within its date range
        const menuSnapshot = await firestore.collection('weeklyMenus')
            .where('status', 'in', ['published', 'in-progress'])
            .orderBy('startDate', 'desc')
            .get();
        
        console.log(`Encontrados ${menuSnapshot.size} menús`);
        
        let menuDoc = null;
        
        // Find a menu where today is within the week range
        for (const doc of menuSnapshot.docs) {
            const menuData = doc.data();
            const startDate = menuData.startDate.toDate ? menuData.startDate.toDate() : new Date(menuData.startDate);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6); // End date is start date + 6 days
            
            if (today >= startDate && today <= endDate) {
                menuDoc = doc;
                console.log(`Encontrado menú de la semana actual: ${doc.id}`);
                break;
            }
        }
        
        // If no current week menu found, get the most recent one
        if (!menuDoc && menuSnapshot.size > 0) {
            menuDoc = menuSnapshot.docs[0];
            console.log(`No se encontró menú para la semana actual, usando el más reciente: ${menuDoc.id}`);
        }
        
        if (menuDoc) {
            const menuData = menuDoc.data();
            
            // Get daily menus
            const dailyMenusSnapshot = await firestore.collection('weeklyMenus')
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
        
        console.log('No se encontró un menú semanal activo');
        return null;
    } catch (error) {
        console.error('Error obteniendo menú directamente:', error);
        return null;
    }
}

// Load employees for the branch
async function loadEmployees() {
    try {
        console.log('Cargando empleados de la sucursal:', branchId);
        
        if (!branchId) {
            console.error('ID de sucursal no disponible para cargar empleados');
            return;
        }
        
        // Try multiple approaches for better compatibility
        if (typeof getEmployeesByBranch === 'function') {
            console.log('Usando función global getEmployeesByBranch');
            employeesData = await getEmployeesByBranch(branchId);
        } else if (window.firestoreService && typeof window.firestoreService.getEmployeesByBranch === 'function') {
            console.log('Usando window.firestoreService.getEmployeesByBranch');
            employeesData = await window.firestoreService.getEmployeesByBranch(branchId);
        } else {
            console.log('Usando acceso directo a Firebase');
            // Direct Firestore access
            const employeesSnapshot = await firestore.collection('employees')
                .where('branch', '==', branchId)
                .get();
            
            employeesData = [];
            employeesSnapshot.forEach(doc => {
                employeesData.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        }
        
        console.log(`Cargados ${employeesData.length} empleados`);
    } catch (error) {
        console.error('Error al cargar empleados:', error);
        employeesData = [];
    }
}

// Create day tabs
function createDayTabs() {
    if (!dayTabsContainer || !currentMenu) return;
    
    try {
        const days = [
            { id: 'monday', label: 'Lunes' },
            { id: 'tuesday', label: 'Martes' },
            { id: 'wednesday', label: 'Miércoles' },
            { id: 'thursday', label: 'Jueves' },
            { id: 'friday', label: 'Viernes' },
            { id: 'saturday', label: 'Sábado' },
            { id: 'sunday', label: 'Domingo' }
        ];
        
        let html = '';
        days.forEach(day => {
            const isActive = day.id === currentDay;
            html += `
                <div class="day-tab ${isActive ? 'active' : ''}" data-day="${day.id}">
                    <span>${day.label}</span>
                </div>
            `;
        });
        
        dayTabsContainer.innerHTML = html;
        
        // Add event listeners
        const dayTabs = dayTabsContainer.querySelectorAll('.day-tab');
        dayTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active state
                dayTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update current day and refresh menu
                currentDay = tab.getAttribute('data-day');
                displayDayMenu();
            });
        });
    } catch (error) {
        console.error('Error creando pestañas de días:', error);
    }
}

// Display day menu
function displayDayMenu() {
    if (!currentMenu || !currentMenu.dailyMenus) {
        menuPreview.innerHTML = `
            <div class="empty-message">
                No hay detalles disponibles para este día.
            </div>
        `;
        return;
    }
    
    try {
        // Find the day menu, handling possible normalization issues
        let dayMenu = null;
        
        console.log('Buscando menú para el día:', currentDay);
        console.log('Menús diarios disponibles:', Object.keys(currentMenu.dailyMenus));
        
        // First try direct access
        if (currentMenu.dailyMenus[currentDay]) {
            console.log('Menú encontrado directamente para:', currentDay);
            dayMenu = currentMenu.dailyMenus[currentDay];
        } else {
            // Try to find by normalized day name
            const normalizedCurrentDay = normalizeDayName(currentDay);
            console.log('Buscando menú para el día normalizado:', normalizedCurrentDay);
            
            for (const [day, menu] of Object.entries(currentMenu.dailyMenus)) {
                const normalizedDay = normalizeDayName(day);
                console.log(`Comparando: ${day} (normalizado: ${normalizedDay}) con ${normalizedCurrentDay}`);
                
                if (normalizedDay === normalizedCurrentDay) {
                    console.log(`Menú encontrado para ${day} que coincide con ${currentDay}`);
                    dayMenu = menu;
                    break;
                }
            }
            
            // Si aún no se encuentra, intentar con una comparación más flexible
            if (!dayMenu) {
                console.log('Intentando búsqueda flexible...');
                const dayMap = {
                    'monday': ['lunes', 'monday'],
                    'tuesday': ['martes', 'tuesday'],
                    'wednesday': ['miercoles', 'miércoles', 'wednesday'],
                    'thursday': ['jueves', 'thursday'],
                    'friday': ['viernes', 'friday'],
                    'saturday': ['sabado', 'sábado', 'saturday'],
                    'sunday': ['domingo', 'sunday']
                };
                
                const possibleMatches = dayMap[currentDay] || [];
                for (const [day, menu] of Object.entries(currentMenu.dailyMenus)) {
                    const normalizedDay = normalizeDayName(day);
                    if (possibleMatches.includes(normalizedDay)) {
                        console.log(`Menú encontrado en búsqueda flexible: ${day}`);
                        dayMenu = menu;
                        break;
                    }
                }
            }
        }
        
        if (!dayMenu) {
            menuPreview.innerHTML = `
                <div class="empty-message">
                    No hay detalles disponibles para este día.
                </div>
            `;
            return;
        }
        
        // Get day date or use approximate date based on week start
        let dayDate;
        if (dayMenu.date) {
            dayDate = dayMenu.date.toDate ? dayMenu.date.toDate() : new Date(dayMenu.date);
        } else {
            const startDate = currentMenu.startDate.toDate ? 
                currentMenu.startDate.toDate() : new Date(currentMenu.startDate);
            dayDate = new Date(startDate);
            const dayOffset = {
                'monday': 0,
                'tuesday': 1,
                'wednesday': 2,
                'thursday': 3,
                'friday': 4,
                'saturday': 5,
                'sunday': 6
            };
            dayDate.setDate(dayDate.getDate() + (dayOffset[currentDay] || 0));
        }
        
        // Format day and date
        const dayName = getDayName(dayDate);
        const formattedDate = formatDateDMY(dayDate);
        
        // Build menu details HTML
        let html = `
            <div class="menu-day-header">
                <h3>${dayName} - ${formattedDate}</h3>
            </div>
        `;
        
        // Check if day menu has data
        if (dayMenu.mainDish || dayMenu.sideDish || dayMenu.dessert || dayMenu.vegetarianOption) {
            html += `
                <div class="menu-items">
                    <div class="menu-item">
                        <h4>Platillo Principal</h4>
                        <p>${dayMenu.mainDish || 'No especificado'}</p>
                    </div>
                    
                    <div class="menu-item">
                        <h4>Guarnición</h4>
                        <p>${dayMenu.sideDish || 'No especificado'}</p>
                    </div>
                    
                    <div class="menu-item">
                        <h4>Postre</h4>
                        <p>${dayMenu.dessert || 'No especificado'}</p>
                    </div>
                    
                    <div class="menu-item">
                        <h4>Opción Vegetariana</h4>
                        <p>${dayMenu.vegetarianOption || 'No disponible'}</p>
                    </div>
                </div>
                
                <div class="menu-actions">
                    <a href="menu.html" class="btn btn-primary btn-sm">Ver Menú Completo</a>
                </div>
            `;
        } else {
            html += `
                <div class="empty-message">
                    El menú para este día aún no ha sido completado.
                </div>
                
                <div class="menu-actions">
                    <a href="menu.html" class="btn btn-primary btn-sm">Ver Menú Completo</a>
                </div>
            `;
        }
        
        menuPreview.innerHTML = html;
    } catch (error) {
        console.error('Error mostrando detalles del menú:', error);
        menuPreview.innerHTML = `
            <div class="error-message">
                <p>Error al mostrar el menú del día. Por favor, intente nuevamente.</p>
            </div>
        `;
    }
}

// Display confirmation status
function displayConfirmationStatus() {
    if (!currentMenu) {
        confirmationStatus.innerHTML = `
            <div class="status-badge pending">No disponible</div>
            <p>No hay menú activo para confirmar.</p>
        `;
        timeRemainingContainer.style.display = 'none';
        return;
    }
    
    try {
        // Get confirmation period dates
        const now = new Date();
        const confirmStart = currentMenu.confirmStartDate && (currentMenu.confirmStartDate.toDate ? 
            currentMenu.confirmStartDate.toDate() : new Date(currentMenu.confirmStartDate));
        const confirmEnd = currentMenu.confirmEndDate && (currentMenu.confirmEndDate.toDate ? 
            currentMenu.confirmEndDate.toDate() : new Date(currentMenu.confirmEndDate));
            
        if (!confirmStart || !confirmEnd) {
            confirmationStatus.innerHTML = `
                <div class="status-badge error">Error</div>
                <p>No se han configurado las fechas de confirmación.</p>
            `;
            timeRemainingContainer.style.display = 'none';
            return;
        }
        
        // Check if now is in the confirmation period
        if (now < confirmStart) {
            // Confirmation period has not started yet
            confirmationStatus.innerHTML = `
                <div class="status-badge pending">Pendiente</div>
                <p>El período de confirmaciones inicia el ${formatDateTime(confirmStart)}.</p>
            `;
            timeRemainingContainer.style.display = 'none';
        } else if (now > confirmEnd) {
            // Confirmation period has ended
            confirmationStatus.innerHTML = `
                <div class="status-badge finalized">Finalizado</div>
                <p>El período de confirmaciones ha finalizado.</p>
                <p>No se registraron confirmaciones.</p>
            `;
            timeRemainingContainer.style.display = 'none';
        } else {
            // Confirmation period is active
            confirmationStatus.innerHTML = `
                <div class="status-badge active">Activo</div>
                <p>El período de confirmaciones está activo.</p>
                <a href="confirmations.html" class="btn btn-primary">Ir a Confirmaciones</a>
            `;
            
            // Show countdown timer
            timeRemainingContainer.style.display = 'block';
            startCountdownTimer(confirmEnd);
        }
    } catch (error) {
        console.error('Error mostrando estado de confirmaciones:', error);
        confirmationStatus.innerHTML = `
            <div class="status-badge error">Error</div>
            <p>Error al cargar estado de confirmaciones.</p>
        `;
        timeRemainingContainer.style.display = 'none';
    }
}

// Start countdown timer for confirmation deadline
function startCountdownTimer(endTime) {
    // Clear existing interval if any
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // Update timer immediately
    updateTimer();
    
    // Set interval to update timer every second
    countdownInterval = setInterval(updateTimer, 1000);
    
    function updateTimer() {
        const now = new Date();
        const timeDiff = endTime - now;
        
        // If time is up, stop the timer
        if (timeDiff <= 0) {
            clearInterval(countdownInterval);
            timeRemainingValue.textContent = '00:00:00';
            
            // Refresh the page to update status
            setTimeout(() => {
                location.reload();
            }, 2000);
            
            return;
        }
        
        // Calculate hours, minutes, seconds
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        
        // Format time
        timeRemainingValue.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
    }
}

// Display employee stats
async function displayEmployeeStats() {
    try {
        // Count employees
        const totalCount = employeesData.length;
        const activeCount = employeesData.filter(employee => employee.active).length;
        
        // Display counts
        totalEmployees.textContent = totalCount;
        activeEmployees.textContent = activeCount;
        
        // Get confirmations for current menu
        if (currentMenu && currentMenu.id) {
            try {
                // Try multiple approaches
                let confirmation = null;
                
                try {
                    if (typeof getConfirmationsByBranch === 'function') {
                        confirmation = await getConfirmationsByBranch(currentMenu.id, branchId);
                    } else if (window.firestoreService && typeof window.firestoreService.getConfirmationsByBranch === 'function') {
                        confirmation = await window.firestoreService.getConfirmationsByBranch(currentMenu.id, branchId);
                    } else {
                        // Direct Firebase access
                        const confirmationQuery = await firestore.collection('confirmations')
                            .where('weekId', '==', currentMenu.id)
                            .where('branchId', '==', branchId)
                            .limit(1)
                            .get();
                        
                        if (!confirmationQuery.empty) {
                            confirmation = confirmationQuery.docs[0].data();
                        }
                    }
                } catch (error) {
                    console.error('Error al obtener confirmaciones para estadísticas', error);
                }
                
                let confirmedCount = 0;
                if (confirmation && confirmation.employees) {
                    confirmedCount = confirmation.employees.length;
                }
                
                confirmedEmployees.textContent = confirmedCount;
            } catch (error) {
                console.error('Error al obtener confirmaciones para estadísticas', error);
                confirmedEmployees.textContent = '0';
            }
        } else {
            confirmedEmployees.textContent = '0';
        }
    } catch (error) {
        console.error('Error mostrando estadísticas de empleados', error);
        totalEmployees.textContent = 'Error';
        activeEmployees.textContent = 'Error';
        confirmedEmployees.textContent = 'Error';
    }
}

// Load recent activities
async function loadActivities() {
    try {
        // Show loading state
        recentActivitiesContainer.innerHTML = `
            <div class="loading-message">Cargando actividades recientes...</div>
        `;
        
        console.log('Cargando actividades recientes para la sucursal:', branchId);
        
        // Verificar que branchId sea válido
        if (!branchId) {
            console.warn('ID de sucursal no válido');
            recentActivitiesContainer.innerHTML = `
                <div class="empty-message">No se pudieron cargar las actividades recientes.</div>
            `;
            return;
        }
        
        // Get recent activities
        const activitiesQuery = await firestore.collection('activities')
            .where('branchId', '==', branchId)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .get();
        
        // If no activities found
        if (activitiesQuery.empty) {
            recentActivitiesContainer.innerHTML = `
                <div class="empty-message">No hay actividades recientes.</div>
            `;
            return;
        }
        
        // Build activities HTML
        let html = '';
        
        activitiesQuery.forEach(doc => {
            const activity = doc.data();
            const timestamp = activity.timestamp && activity.timestamp.toDate ? 
                activity.timestamp.toDate() : new Date(activity.timestamp || Date.now());
            
            html += `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type || 'default'}"></div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.title || 'Actividad sin título'}</div>
                        <div class="activity-description">${activity.description || ''}</div>
                        <div class="activity-time">${formatRelativeDate(timestamp)}</div>
                    </div>
                </div>
            `;
        });
        
        recentActivitiesContainer.innerHTML = html;
    } catch (error) {
        console.error('Error cargando actividades recientes:', error);
        recentActivitiesContainer.innerHTML = `
            <div class="error-message">Error al cargar actividades recientes.</div>
        `;
    }
}

// Helper Functions

// Format date as DD/MM/YYYY
function formatDateDMY(date) {
    if (!date) return '';
    
    try {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Fecha no válida';
    }
}

// Format date and time (DD/MM/YYYY HH:MM)
function formatDateTime(date) {
    if (!date) return '';
    
    try {
        const formattedDate = formatDateDMY(date);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${formattedDate} ${hours}:${minutes}`;
    } catch (error) {
        console.error('Error formatting date time:', error);
        return 'Fecha/hora no válida';
    }
}

// Format time (HH:MM)
function formatTime(date) {
    if (!date) return '';
    
    try {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${hours}:${minutes}`;
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'Hora no válida';
    }
}

// Format relative date (e.g., "Hoy", "Ayer", "Hace 2 días")
function formatRelativeDate(date) {
    if (!date) return '';
    
    try {
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return `Hoy, ${formatTime(date)}`;
        } else if (diffDays === 1) {
            return `Ayer, ${formatTime(date)}`;
        } else if (diffDays < 7) {
            return `Hace ${diffDays} días, ${formatTime(date)}`;
        } else {
            return formatDateTime(date);
        }
    } catch (error) {
        console.error('Error formatting relative date:', error);
        return 'Fecha no válida';
    }
}

// Normalize day name to handle accented characters
function normalizeDayName(dayName) {
    if (!dayName) return '';
    
    // Mapa de normalización específico para días con acentos
    const dayMap = {
        'miércoles': 'miercoles',
        'sábado': 'sabado',
        'miÉrcoles': 'miercoles',  // Variante con mayúscula
        'sÁbado': 'sabado'         // Variante con mayúscula
    };
    
    // Primero intentar con el mapa específico
    const lowerDay = dayName.toLowerCase();
    if (dayMap[lowerDay]) {
        return dayMap[lowerDay];
    }
    
    // Si no está en el mapa, aplicar normalización estándar
    return lowerDay
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Get day name from date
function getDayName(date) {
    if (!date) return '';
    
    try {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[date.getDay()];
    } catch (error) {
        console.error('Error getting day name:', error);
        return 'Día desconocido';
    }
}

// Get current day name
function getCurrentDayName() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = new Date();
    return days[today.getDay()];
}

// Pad number with leading zero
function padZero(num) {
    return String(num).padStart(2, '0');
}

// Display error message
function displayError(message) {
    const errorContainer = document.getElementById('errorContainer') || document.createElement('div');
    errorContainer.id = 'errorContainer';
    errorContainer.className = 'error-container';
    errorContainer.innerHTML = `
        <div class="error-message">
            <p>${message}</p>
            <button class="close-btn">&times;</button>
        </div>
    `;
    
    // Add to body if not already there
    if (!document.getElementById('errorContainer')) {
        document.body.appendChild(errorContainer);
    }
    
    // Add close button event listener
    errorContainer.querySelector('.close-btn').addEventListener('click', () => {
        errorContainer.remove();
    });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (document.getElementById('errorContainer')) {
            errorContainer.remove();
        }
    }, 5000);
}
