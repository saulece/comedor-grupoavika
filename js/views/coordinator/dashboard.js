// Dashboard.js - Coordinator Dashboard
// Importaciones usando variables globales en lugar de import
const logger = window.logger || console;
// Funciones de utilidad
const formatDateDMY = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const getDayName = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('es-ES', { weekday: 'long' });
};
const handleFirebaseError = (error, functionName, options = {}) => {
    console.error(`Error en ${functionName}:`, error);
    return {
        ...error,
        userMessage: options.userMessage || 'Ha ocurrido un error. Intente nuevamente más tarde.'
    };
};

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and role
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = '../../index.html';
            return;
        }
        
        // Check if user is coordinator
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'coordinator') {
            // Redirect non-coordinator users
            window.location.href = '../../index.html';
            return;
        }
        
        // Store user data
        const userData = userDoc.data();
        setCurrentUser(userData);
        setUserRole(userData.role);
        setUserBranch(userData.branch);
        
        // Display user info
        document.getElementById('userName').textContent = userData.displayName || 'Coordinador';
        
        // Get branch details
        const branchDoc = await db.collection('branches').doc(userData.branch).get();
        if (branchDoc.exists) {
            const branchData = branchDoc.data();
            document.getElementById('branchName').textContent = branchData.name;
        }
        
        // Initialize dashboard
        initDashboard(userData.branch, user.uid);
    });
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await logout();
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('Error logging out:', error);
            showError('Error al cerrar sesión. Intente nuevamente.');
        }
    });
});

// Initialize dashboard
function initDashboard(branchId, coordinatorId) {
    // DOM elements
    const confirmationStatus = document.getElementById('confirmationStatus');
    const timeRemainingValue = document.getElementById('timeRemainingValue');
    const weekDates = document.getElementById('weekDates');
    const dayTabsContainer = document.getElementById('dayTabsContainer');
    const menuPreview = document.getElementById('menuPreview');
    const totalEmployees = document.getElementById('totalEmployees');
    const activeEmployees = document.getElementById('activeEmployees');
    const confirmedEmployees = document.getElementById('confirmedEmployees');
    const activityList = document.getElementById('activityList');
    const goToConfirmBtn = document.getElementById('goToConfirmBtn');
    const viewFullMenuBtn = document.getElementById('viewFullMenuBtn');
    const manageEmployeesBtn = document.getElementById('manageEmployeesBtn');
    
    // State
    let currentMenu = null;
    let currentDay = 'monday';
    let employeesData = [];
    let countdownInterval = null;
    
    // Load dashboard data
    loadDashboardData();
    
    // Event listeners
    
    // Go to confirmations button
    goToConfirmBtn.addEventListener('click', () => {
        window.location.href = 'confirmations.html';
    });
    
    // View full menu button
    viewFullMenuBtn.addEventListener('click', () => {
        window.location.href = 'menu.html';
    });
    
    // Manage employees button
    manageEmployeesBtn.addEventListener('click', () => {
        window.location.href = 'employees.html';
    });
    
    // Load dashboard data
    async function loadDashboardData() {
        try {
            // Show loading state
            confirmationStatus.innerHTML = '<span class="loading-spinner"></span> Cargando...';
            weekDates.textContent = 'Cargando...';
            
            logger.info('Cargando datos del dashboard');
            
            // Load current menu
            try {
                logger.debug('Intentando obtener el menú semanal actual');
                currentMenu = await getCurrentWeeklyMenu();
                
                if (currentMenu) {
                    logger.debug('Menú encontrado', { id: currentMenu.id, status: currentMenu.status });
                } else {
                    logger.warn('No se encontró un menú activo');
                }
            } catch (error) {
                logger.error('Error al cargar el menú actual', error);
                showError('Error al cargar el menú. Intente refrescar la página.');
                
                // Display fallback UI
                weekDates.textContent = 'No disponible';
                menuPreview.innerHTML = `
                    <div class="empty-message">
                        <p>No se pudo cargar el menú. Por favor, intente nuevamente.</p>
                        <button class="btn btn-primary" onclick="location.reload()">Refrescar página</button>
                    </div>
                `;
                dayTabsContainer.innerHTML = '';
                return;
            }
            
            // Load employees data
            try {
                logger.debug('Cargando empleados de la sucursal', { branchId });
                // Use firebase.firestore() directly for better consistency
                const firestore = firebase.firestore();
                const employeesSnapshot = await firestore.collection('employees')
                    .where('branch', '==', branchId)
                    .orderBy('name')
                    .get();
                
                employeesData = [];
                employeesSnapshot.forEach(doc => {
                    employeesData.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                logger.debug(`Se encontraron ${employeesData.length} empleados`);
            } catch (error) {
                logger.error('Error al cargar los empleados', error);
                showError('Error al cargar los datos de empleados. Intente refrescar la página.');
                employeesData = [];
            }
            
            // Display menu preview
            displayMenuPreview();
            
            // Display confirmation status
            displayConfirmationStatus();
            
            // Display employee stats
            displayEmployeeStats();
            
            // Load recent activity
            loadRecentActivity();
            
            // Store in state manager
            if (currentMenu) setCurrentMenu(currentMenu);
            setCurrentEmployees(employeesData.filter(e => e.active));
            
            logger.info('Dashboard cargado correctamente');
        } catch (error) {
            const handledError = handleFirebaseError(error, 'loadDashboardData', {
                userMessage: 'Error al cargar datos del dashboard. Intente nuevamente.'
            });
            
            logger.error('Error general al cargar el dashboard', handledError);
            showError(handledError.userMessage || 'Error al cargar datos del dashboard. Intente nuevamente.');
        }
    }
    
    // Display menu preview
    function displayMenuPreview() {
        if (!currentMenu) {
            weekDates.textContent = 'No disponible';
            menuPreview.innerHTML = `
                <div class="empty-message">
                    No hay menú disponible actualmente.
                </div>
            `;
            dayTabsContainer.innerHTML = '';
            return;
        }
        
        // Display week dates
        const startDate = currentMenu.startDate.toDate();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 4); // Add 4 days to get to Friday
        
        weekDates.textContent = `${formatDateDMY(startDate)} al ${formatDateDMY(endDate)}`;
        
        // Create day tabs
        let tabsHtml = '';
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        
        days.forEach((day, index) => {
            tabsHtml += `
                <div class="day-tab ${day === currentDay ? 'active' : ''}" data-day="${day}">
                    ${dayNames[index]}
                </div>
            `;
        });
        
        dayTabsContainer.innerHTML = tabsHtml;
        
        // Add event listeners to tabs
        const dayTabs = document.querySelectorAll('.day-tab');
        dayTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Deactivate all tabs
                dayTabs.forEach(t => t.classList.remove('active'));
                
                // Activate clicked tab
                tab.classList.add('active');
                
                // Update current day and display menu
                currentDay = tab.dataset.day;
                displayDayMenu();
            });
        });
        
        // Display current day menu
        displayDayMenu();
    }
    
    // Display current day menu
    function displayDayMenu() {
        if (!currentMenu || !currentMenu.dailyMenus || !currentMenu.dailyMenus[currentDay]) {
            menuPreview.innerHTML = `
                <div class="empty-message">
                    No hay detalles disponibles para este día.
                </div>
            `;
            return;
        }
        
        const dayMenu = currentMenu.dailyMenus[currentDay];
        const dayDate = dayMenu.date.toDate();
        
        // Format day and date
        const dayName = getDayName(dayDate.getDay());
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
            `;
        } else {
            html += `
                <div class="empty-message">
                    El menú para este día aún no ha sido completado.
                </div>
            `;
        }
        
        menuPreview.innerHTML = html;
    }
    
    // Display confirmation status
    async function displayConfirmationStatus() {
        if (!currentMenu) {
            confirmationStatus.innerHTML = `
                <p>No hay menú disponible para confirmaciones.</p>
            `;
            timeRemainingValue.textContent = '--:--:--';
            return;
        }
        
        // Get confirmation status
        const now = new Date();
        const confirmStart = currentMenu.confirmStartDate.toDate();
        const confirmEnd = currentMenu.confirmEndDate.toDate();
        
        // Get confirmation for current branch using firebase.firestore() directly
        let confirmation = null;
        try {
            const firestore = firebase.firestore();
            const confirmationQuery = await firestore.collection('confirmations')
                .where('weekId', '==', currentMenu.id)
                .where('branchId', '==', branchId)
                .limit(1)
                .get();
            
            if (!confirmationQuery.empty) {
                const doc = confirmationQuery.docs[0];
                confirmation = {
                    id: doc.id,
                    ...doc.data()
                };
            }
        } catch (error) {
            logger.error('Error al obtener confirmaciones', error);
            // Continue with null confirmation
        }
        
        // Build status HTML
        let html = '';
        
        if (now < confirmStart) {
            // Confirmation period not started yet
            html = `
                <p>
                    El período de confirmaciones aún no ha comenzado.
                    <br>
                    Inicia el ${formatDateTime(confirmStart)}.
                </p>
            `;
            
            timeRemainingValue.textContent = 'No iniciado';
            goToConfirmBtn.style.display = 'none';
        } else if (now > confirmEnd) {
            // Confirmation period ended
            html = confirmation ? `
                <p>
                    Confirmaciones completadas.
                    <br>
                    Se confirmaron ${confirmation.employees ? confirmation.employees.length : 0} empleados.
                </p>
            ` : `
                <p>
                    El período de confirmaciones ha finalizado.
                    <br>
                    No se registraron confirmaciones.
                </p>
            `;
            
            timeRemainingValue.textContent = 'Finalizado';
            goToConfirmBtn.style.display = 'none';
        } else {
            // Confirmation period active
            html = confirmation ? `
                <p>
                    Confirmaciones en progreso.
                    <br>
                    ${confirmation.employees ? confirmation.employees.length : 0} empleados confirmados hasta ahora.
                </p>
            ` : `
                <p>
                    El período de confirmaciones está abierto.
                    <br>
                    Aún no ha registrado confirmaciones.
                </p>
            `;
            
            // Show confirmation button
            goToConfirmBtn.style.display = 'inline-flex';
            
            // Start countdown timer
            startCountdownTimer();
        }
        
        confirmationStatus.innerHTML = html;
    }
    
    // Start countdown timer for confirmation deadline
    function startCountdownTimer() {
        // Clear existing interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        
        // If menu is not available, don't start timer
        if (!currentMenu) {
            timeRemainingValue.textContent = '--:--:--';
            return;
        }
        
        // Get confirmation end time
        const endTime = currentMenu.confirmEndDate.toDate();
        
        // Update immediately and then every second
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
        
        function updateCountdown() {
            const now = new Date();
            const timeDiff = endTime - now;
            
            if (timeDiff <= 0) {
                // Time has expired
                clearInterval(countdownInterval);
                timeRemainingValue.textContent = 'Finalizado';
                goToConfirmBtn.style.display = 'none';
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
        // Count employees
        const totalCount = employeesData.length;
        const activeCount = employeesData.filter(employee => employee.active).length;
        
        // Display counts
        totalEmployees.textContent = totalCount;
        activeEmployees.textContent = activeCount;
        
        // Get confirmations for current menu using firebase.firestore() directly
        if (currentMenu) {
            try {
                const firestore = firebase.firestore();
                const confirmationQuery = await firestore.collection('confirmations')
                    .where('weekId', '==', currentMenu.id)
                    .where('branchId', '==', branchId)
                    .limit(1)
                    .get();
                
                let confirmedCount = 0;
                if (!confirmationQuery.empty) {
                    const confirmation = confirmationQuery.docs[0].data();
                    confirmedCount = confirmation.employees ? confirmation.employees.length : 0;
                }
                
                confirmedEmployees.textContent = confirmedCount;
            } catch (error) {
                logger.error('Error al obtener confirmaciones para estadísticas', error);
                confirmedEmployees.textContent = '0';
            }
        } else {
            confirmedEmployees.textContent = '0';
        }
    }
    
    // Load recent activity
    async function loadRecentActivity() {
        try {
            activityList.innerHTML = `
                <div class="loading-message">Cargando actividades...</div>
            `;
            
            // Get Firestore instance directly for better consistency
            const firestore = firebase.firestore();
            
            // Get recent confirmations
            const confirmationsQuery = await firestore.collection('confirmations')
                .where('branchId', '==', branchId)
                .orderBy('timestamp', 'desc')
                .limit(3)
                .get();
            
            // Get employee actions (added/updated)
            const employeeActionsQuery = await firestore.collection('employees')
                .where('branch', '==', branchId)
                .orderBy('createdAt', 'desc')
                .limit(3)
                .get();
            
            // Combine activities
            const activities = [];
            
            // Add confirmations
            confirmationsQuery.forEach(doc => {
                const data = doc.data();
                activities.push({
                    type: 'confirmation',
                    date: data.timestamp.toDate(),
                    data: {
                        weekId: data.weekId,
                        employeeCount: data.employees ? data.employees.length : 0
                    }
                });
            });
            
            // Add employee actions
            employeeActionsQuery.forEach(doc => {
                const data = doc.data();
                activities.push({
                    type: 'employee_added',
                    date: data.createdAt.toDate(),
                    data: {
                        name: data.name,
                        position: data.position
                    }
                });
            });
            
            // Sort by date
            activities.sort((a, b) => b.date - a.date);
            
            // Limit to 5 most recent
            const recentActivities = activities.slice(0, 5);
            
            if (recentActivities.length === 0) {
                activityList.innerHTML = `
                    <div class="empty-message">
                        No hay actividad reciente.
                    </div>
                `;
                return;
            }
            
            // Display activities
            let html = '';
            
            recentActivities.forEach(activity => {
                const relativeDate = formatRelativeDate(activity.date);
                const activityTime = formatTime(activity.date);
                
                switch (activity.type) {
                    case 'confirmation':
                        html += `
                            <div class="activity-item">
                                <div class="activity-icon">
                                    <i class="material-icons">fact_check</i>
                                </div>
                                <div class="activity-content">
                                    <div class="activity-title">
                                        Confirmación de ${activity.data.employeeCount} empleados
                                    </div>
                                    <div class="activity-time">${relativeDate} a las ${activityTime}</div>
                                </div>
                            </div>
                        `;
                        break;
                        
                    case 'employee_added':
                        html += `
                            <div class="activity-item">
                                <div class="activity-icon">
                                    <i class="material-icons">person_add</i>
                                </div>
                                <div class="activity-content">
                                    <div class="activity-title">
                                        Empleado agregado: ${activity.data.name}
                                    </div>
                                    <div class="activity-time">${relativeDate} a las ${activityTime}</div>
                                </div>
                            </div>
                        `;
                        break;
                }
            });
            
            activityList.innerHTML = html;
        } catch (error) {
            console.error('Error loading activities:', error);
            activityList.innerHTML = `
                <div class="error-message">
                    Error al cargar las actividades recientes.
                </div>
            `;
        }
    }
    
    // Pad number with leading zero
    function padZero(num) {
        return num.toString().padStart(2, '0');
    }
}

// Helper function to show success notification
function showSuccess(message) {
    showNotification(message, { type: 'success' });
}

// Helper function to show error notification
function showError(message) {
    showNotification(message, { type: 'error' });
}