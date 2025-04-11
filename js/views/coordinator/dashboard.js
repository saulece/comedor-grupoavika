// Dashboard.js - Coordinator Dashboard

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
        
        // Use state manager if available
        if (typeof setCurrentUser === 'function') {
            setCurrentUser(userData);
            setUserRole(userData.role);
            setUserBranch(userData.branch);
        }
        
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
            
            console.log('Cargando datos del dashboard');
            
            // Load current menu - try multiple approaches for better compatibility
            try {
                console.log('Intentando obtener el menú semanal actual');
                
                // First try using the global function
                if (typeof getCurrentWeeklyMenu === 'function') {
                    console.log('Usando función global getCurrentWeeklyMenu');
                    currentMenu = await getCurrentWeeklyMenu();
                } 
                // Then try using the firestoreService object
                else if (window.firestoreService && typeof window.firestoreService.getCurrentWeeklyMenu === 'function') {
                    console.log('Usando window.firestoreService.getCurrentWeeklyMenu');
                    currentMenu = await window.firestoreService.getCurrentWeeklyMenu();
                } 
                // Last resort: direct Firebase access
                else {
                    console.log('Usando acceso directo a Firebase');
                    currentMenu = await getMenuDirectly();
                }
                
                if (currentMenu) {
                    console.log('Menú encontrado', { id: currentMenu.id, status: currentMenu.status });
                } else {
                    console.warn('No se encontró un menú activo');
                }
            } catch (error) {
                console.error('Error al cargar el menú actual', error);
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
                console.log('Cargando empleados de la sucursal', { branchId });
                
                // Try multiple approaches for better compatibility
                if (typeof getEmployeesByBranch === 'function') {
                    employeesData = await getEmployeesByBranch(branchId);
                } else if (window.firestoreService && typeof window.firestoreService.getEmployeesByBranch === 'function') {
                    employeesData = await window.firestoreService.getEmployeesByBranch(branchId);
                } else {
                    // Direct Firestore access
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
                }
                
                console.log(`Se encontraron ${employeesData.length} empleados`);
            } catch (error) {
                console.error('Error al cargar los empleados', error);
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
            
            // Store in state manager if available
            if (typeof setCurrentMenu === 'function') {
                setCurrentMenu(currentMenu);
            }
            if (typeof setCurrentEmployees === 'function') {
                setCurrentEmployees(employeesData.filter(e => e.active));
            }
            
            console.log('Dashboard cargado correctamente');
        } catch (error) {
            console.error('Error general al cargar el dashboard', error);
            showError('Error al cargar datos del dashboard. Intente nuevamente.');
        }
    }
    
    // Get menu directly from Firestore when API is not available
    async function getMenuDirectly() {
        // Get current date
        const today = new Date();
        
        // First try to find a menu where today falls within its date range
        const firestore = firebase.firestore();
        let menuSnapshot = await firestore.collection('weeklyMenus')
            .where('status', 'in', ['published', 'in-progress'])
            .orderBy('startDate', 'desc')
            .get();
        
        console.log(`Found ${menuSnapshot.size} menus`);
        
        let menuDoc = null;
        
        // Find a menu where today is within the week range
        for (const doc of menuSnapshot.docs) {
            const menuData = doc.data();
            const startDate = menuData.startDate.toDate();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6); // End date is start date + 6 days
            
            if (today >= startDate && today <= endDate) {
                menuDoc = doc;
                console.log(`Found current week menu: ${doc.id}`);
                break;
            }
        }
        
        // If no current week menu found, get the most recent one
        if (!menuDoc && menuSnapshot.size > 0) {
            menuDoc = menuSnapshot.docs[0];
            console.log(`No current week menu found, using most recent: ${menuDoc.id}`);
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
        
        console.log('No active weekly menu found');
        return null;
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
        
        try {
            // Display week dates
            const startDate = currentMenu.startDate.toDate ? currentMenu.startDate.toDate() : new Date(currentMenu.startDate);
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
        } catch (error) {
            console.error('Error displaying menu preview:', error);
            weekDates.textContent = 'Error';
            menuPreview.innerHTML = `
                <div class="empty-message">
                    <p>Error al mostrar el menú. Por favor, intente nuevamente.</p>
                </div>
            `;
        }
    }
    
    // Display current day menu
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
            
            // First try direct access
            if (currentMenu.dailyMenus[currentDay]) {
                dayMenu = currentMenu.dailyMenus[currentDay];
            } else {
                // Try to find by normalized day name
                const normalizedCurrentDay = normalizeDayName(currentDay);
                for (const [day, menu] of Object.entries(currentMenu.dailyMenus)) {
                    if (normalizeDayName(day) === normalizedCurrentDay) {
                        dayMenu = menu;
                        break;
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
                const startDate = currentMenu.startDate.toDate ? currentMenu.startDate.toDate() : new Date(currentMenu.startDate);
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
                `;
            } else {
                html += `
                    <div class="empty-message">
                        El menú para este día aún no ha sido completado.
                    </div>
                `;
            }
            
            menuPreview.innerHTML = html;
        } catch (error) {
            console.error('Error displaying day menu:', error);
            menuPreview.innerHTML = `
                <div class="empty-message">
                    <p>Error al mostrar el menú del día. Por favor, intente nuevamente.</p>
                </div>
            `;
        }
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
        
        try {
            // Get confirmation status
            const now = new Date();
            const confirmStart = currentMenu.confirmStartDate && (currentMenu.confirmStartDate.toDate ? 
                currentMenu.confirmStartDate.toDate() : new Date(currentMenu.confirmStartDate));
            const confirmEnd = currentMenu.confirmEndDate && (currentMenu.confirmEndDate.toDate ? 
                currentMenu.confirmEndDate.toDate() : new Date(currentMenu.confirmEndDate));
                
            if (!confirmStart || !confirmEnd) {
                confirmationStatus.innerHTML = `
                    <p>Este menú no tiene definido un período de confirmaciones.</p>
                `;
                timeRemainingValue.textContent = '--:--:--';
                goToConfirmBtn.style.display = 'none';
                return;
            }
            
            // Get confirmation for current branch
            let confirmation = null;
            try {
                // Try multiple approaches
                if (typeof getConfirmationsByBranch === 'function') {
                    confirmation = await getConfirmationsByBranch(currentMenu.id, branchId);
                } else if (window.firestoreService && typeof window.firestoreService.getConfirmationsByBranch === 'function') {
                    confirmation = await window.firestoreService.getConfirmationsByBranch(currentMenu.id, branchId);
                } else {
                    // Direct Firebase access
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
                }
            } catch (error) {
                console.error('Error al obtener confirmaciones', error);
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
                startCountdownTimer(confirmEnd);
            }
            
            confirmationStatus.innerHTML = html;
        } catch (error) {
            console.error('Error al mostrar estado de confirmaciones', error);
            confirmationStatus.innerHTML = `
                <p>Error al cargar el estado de confirmaciones.</p>
            `;
        }
    }
    
    // Start countdown timer for confirmation deadline
    function startCountdownTimer(endTime) {
        // Clear existing interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        
        if (!endTime) {
            timeRemainingValue.textContent = '--:--:--';
            return;
        }
        
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
        try {
            // Count employees
            const totalCount = employeesData.length;
            const activeCount = employeesData.filter(employee => employee.active).length;
            
            // Display counts
            totalEmployees.textContent = totalCount;
            activeEmployees.textContent = activeCount;
            
            // Get confirmations for current menu
            if (currentMenu) {
                try {
                    // Try multiple approaches
                    let confirmation = null;
                    if (typeof getConfirmationsByBranch === 'function') {
                        confirmation = await getConfirmationsByBranch(currentMenu.id, branchId);
                    } else if (window.firestoreService && typeof window.firestoreService.getConfirmationsByBranch === 'function') {
                        confirmation = await window.firestoreService.getConfirmationsByBranch(currentMenu.id, branchId);
                    } else {
                        // Direct Firebase access
                        const firestore = firebase.firestore();
                        const confirmationQuery = await firestore.collection('confirmations')
                            .where('weekId', '==', currentMenu.id)
                            .where('branchId', '==', branchId)
                            .limit(1)
                            .get();
                        
                        if (!confirmationQuery.empty) {
                            confirmation = confirmationQuery.docs[0].data();
                        }
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
    
    // Load recent activity
    async function loadRecentActivity() {
        try {
            activityList.innerHTML = `
                <div class="loading-message">Cargando actividades...</div>
            `;
            
            // Get Firestore instance
            const firestore = firebase.firestore();
            
            // Get recent confirmations
            const confirmationsQuery = await firestore.collection('confirmations')
                .where('branchId', '==', branchId)
                .orderBy('updatedAt', 'desc')
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
                
                // Make sure timestamp exists
                let timestamp = data.updatedAt || data.createdAt || data.timestamp;
                if (timestamp && timestamp.toDate) {
                    timestamp = timestamp.toDate();
                } else {
                    timestamp = new Date(); // Fallback
                }
                
                activities.push({
                    type: 'confirmation',
                    date: timestamp,
                    data: {
                        weekId: data.weekId,
                        employeeCount: data.employees ? data.employees.length : 0
                    }
                });
            });
            
            // Add employee actions
            employeeActionsQuery.forEach(doc => {
                const data = doc.data();
                
                // Make sure createdAt exists
                let timestamp = data.createdAt;
                if (timestamp && timestamp.toDate) {
                    timestamp = timestamp.toDate();
                } else {
                    timestamp = new Date(); // Fallback
                }
                
                activities.push({
                    type: 'employee_added',
                    date: timestamp,
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
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            
            const diffDays = Math.floor((today - dateDay) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                return 'Hoy';
            } else if (diffDays === 1) {
                return 'Ayer';
            } else {
                return `Hace ${diffDays} días`;
            }
        } catch (error) {
            console.error('Error formatting relative date:', error);
            return 'Fecha no válida';
        }
    }
    
    // Normalize day name to handle accented characters
    function normalizeDayName(dayName) {
        if (!dayName) return '';
        // Convert to lowercase and remove accents
        return dayName.toLowerCase()
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
            return 'Día no válido';
        }
    }
    
    // Pad number with leading zero
    function padZero(num) {
        return num.toString().padStart(2, '0');
    }
}

// Helper function to show success notification
function showSuccess(message) {
    if (typeof showNotification === 'function') {
        showNotification(message, { type: 'success' });
    } else {
        alert('Éxito: ' + message);
    }
}

// Helper function to show error notification
function showError(message) {
    if (typeof showNotification === 'function') {
        showNotification(message, { type: 'error' });
    } else {
        alert('Error: ' + message);
    }
}