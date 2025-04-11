// Menu View - Coordinator Menu View
// Use global variables instead of imports
const logger = window.logger || console;

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and role
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = '../../index.html';
            return;
        }
        
        // Check if user is coordinator using firebase.firestore() directly
        const firestore = firebase.firestore();
        const userDoc = await firestore.collection('users').doc(user.uid).get();
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
        
        // Get branch details using firebase.firestore() directly
        const branchDoc = await firestore.collection('branches').doc(userData.branch).get();
        if (branchDoc.exists) {
            const branchData = branchDoc.data();
            document.getElementById('branchName').textContent = branchData.name;
        }
        
        // Initialize menu view
        initMenuView(userData.branch);
    });
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await logout();
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('Error logging out:', error);
            logger.error('Error logging out:', error);
            showError('Error al cerrar sesión. Intente nuevamente.');
        }
    });
});

// Initialize menu view
function initMenuView(branchId) {
    // DOM elements
    const weekDatesElement = document.getElementById('weekDates');
    const menuStatusBadge = document.getElementById('menuStatusBadge');
    const menuDetails = document.getElementById('menuDetails');
    const branchConfirmations = document.getElementById('branchConfirmations');
    const branchesSummaryBody = document.getElementById('branchesSummaryBody');
    const dayTabs = document.querySelectorAll('.day-tab');
    const goToConfirmBtn = document.getElementById('goToConfirmBtn');
    
    // Modals
    const noMenuModal = document.getElementById('noMenuModal');
    const refreshMenuBtn = document.getElementById('refreshMenuBtn');
    
    // State
    let currentMenu = null;
    let currentDay = 'monday';
    let branchesData = [];
    
    // Load menu data
    loadMenuData();
    
    // Event listeners
    
    // Day tabs
    dayTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all tabs
            dayTabs.forEach(t => t.classList.remove('active'));
            
            // Activate clicked tab
            tab.classList.add('active');
            
            // Update current day and display menu details
            currentDay = tab.dataset.day;
            displayMenuDetails();
        });
    });
    
    // Refresh menu button
    refreshMenuBtn.addEventListener('click', () => {
        noMenuModal.style.display = 'none';
        loadMenuData();
    });
    
    // Load menu data
    async function loadMenuData() {
        try {
            // Show loading state
            weekDatesElement.textContent = 'Cargando...';
            menuStatusBadge.textContent = 'Cargando...';
            menuStatusBadge.className = 'status-badge';
            
            // Get current menu using firebase.firestore() directly
            logger.info('Cargando menú semanal actual');
            try {
                // Get current date
                const today = new Date();
                const firestore = firebase.firestore();
                
                // First try to find a menu where today falls within its date range
                let menuSnapshot = await firestore.collection('weeklyMenus')
                    .where('status', 'in', ['published', 'in-progress'])
                    .orderBy('startDate', 'desc')
                    .get();
                
                logger.debug(`Found ${menuSnapshot.size} menus`);
                
                let menuDoc = null;
                
                // Find a menu where today is within the week range
                for (const doc of menuSnapshot.docs) {
                    const menuData = doc.data();
                    const startDate = menuData.startDate.toDate();
                    const endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 6); // End date is start date + 6 days
                    
                    if (today >= startDate && today <= endDate) {
                        menuDoc = doc;
                        logger.info(`Found current week menu: ${doc.id}`);
                        break;
                    }
                }
                
                // If no current week menu found, get the most recent one
                if (!menuDoc && !menuSnapshot.empty) {
                    menuDoc = menuSnapshot.docs[0];
                    logger.info(`No current week menu found, using most recent: ${menuDoc.id}`);
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
                    
                    currentMenu = {
                        id: menuDoc.id,
                        ...menuData,
                        dailyMenus
                    };
                } else {
                    currentMenu = null;
                }
            } catch (error) {
                logger.error('Error getting current weekly menu:', error);
                showError('Error al cargar el menú semanal. Intente nuevamente.');
                
                // Show fallback UI
                weekDatesElement.textContent = 'Error al cargar';
                menuStatusBadge.textContent = 'Error';
                menuStatusBadge.className = 'status-badge error';
                
                menuDetails.innerHTML = `
                    <div class="error-message">
                        <p>Error al cargar el menú. ${error.message}</p>
                        <p>Si el problema persiste, contacta al administrador.</p>
                    </div>
                `;
                
                // Show no menu modal with error message
                const noMenuModalContent = document.querySelector('#noMenuModal .modal-content');
                if (noMenuModalContent) {
                    noMenuModalContent.innerHTML = `
                        <h3>Error al cargar el menú</h3>
                        <p>${error.message}</p>
                        <p>Esto puede deberse a un problema de configuración en la base de datos.</p>
                        <button id="refreshMenuBtn" class="btn btn-primary">Intentar nuevamente</button>
                    `;
                }
                noMenuModal.style.display = 'block';
                
                // Re-attach event listener to the refresh button
                document.getElementById('refreshMenuBtn').addEventListener('click', () => {
                    noMenuModal.style.display = 'none';
                    loadMenuData();
                });
                
                return;
            }
            
            if (!currentMenu) {
                // No menu available
                weekDatesElement.textContent = 'No disponible';
                menuStatusBadge.textContent = 'No Publicado';
                menuStatusBadge.className = 'status-badge pending';
                
                menuDetails.innerHTML = `
                    <div class="empty-message">
                        No hay menú disponible actualmente.
                    </div>
                `;
                
                branchConfirmations.innerHTML = `
                    <div class="empty-message">
                        No hay confirmaciones disponibles.
                    </div>
                `;
                
                branchesSummaryBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No hay datos disponibles</td>
                    </tr>
                `;
                
                // Show no menu modal
                noMenuModal.style.display = 'block';
                
                // Hide confirm button
                goToConfirmBtn.style.display = 'none';
                
                return;
            }
            
            // Store in state manager
            setCurrentMenu(currentMenu);
            
            // Display menu info
            displayMenuInfo();
            
            // Display menu details for current day
            displayMenuDetails();
            
            // Load branch confirmations
            loadBranchConfirmations();
            
            // Load all branches summary
            loadBranchesSummary();
            
            // Show confirm button if in confirmation period
            const now = new Date();
            const confirmStart = currentMenu.confirmStartDate.toDate();
            const confirmEnd = currentMenu.confirmEndDate.toDate();
            
            if (now >= confirmStart && now <= confirmEnd) {
                goToConfirmBtn.style.display = 'inline-flex';
            } else {
                goToConfirmBtn.style.display = 'none';
            }
        } catch (error) {
            logger.error('Error loading menu data:', error);
            showErrorNotification(error);
            
            // Show fallback UI for critical error
            weekDatesElement.textContent = 'Error';
            menuStatusBadge.textContent = 'Error';
            menuStatusBadge.className = 'status-badge error';
            
            menuDetails.innerHTML = `
                <div class="error-message">
                    <p>Error al cargar los datos. Por favor, intenta nuevamente más tarde.</p>
                </div>
            `;
        }
    }
    
    // Display menu info
    function displayMenuInfo() {
        if (!currentMenu) return;
        
        // Display week dates
        const startDate = currentMenu.startDate.toDate();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 4); // Add 4 days to get to Friday
        
        weekDatesElement.textContent = `${formatDateDMY(startDate)} al ${formatDateDMY(endDate)}`;
        
        // Display menu status
        menuStatusBadge.textContent = getStatusText(currentMenu.status);
        menuStatusBadge.className = `status-badge ${currentMenu.status}`;
    }
    
    // Display menu details for current day
    function displayMenuDetails() {
        if (!currentMenu || !currentMenu.dailyMenus) {
            menuDetails.innerHTML = `
                <div class="empty-message">
                    No hay detalles disponibles para este día.
                </div>
            `;
            return;
        }
        
        // Normalize the current day to handle accented characters
        const normalizedCurrentDay = normalizeDayName(currentDay);
        let dayKey = currentDay;
        let dayMenu = null;
        
        // Try to find the day menu using normalized comparison
        for (const [day, menu] of Object.entries(currentMenu.dailyMenus)) {
            if (normalizeDayName(day) === normalizedCurrentDay) {
                dayKey = day;
                dayMenu = menu;
                break;
            }
        }
        
        // If day menu not found, show empty message
        if (!dayMenu) {
            menuDetails.innerHTML = `
                <div class="empty-message">
                    No hay detalles disponibles para este día.
                </div>
            `;
            return;
        }
        const dayDate = dayMenu.date.toDate();
        
        // Format day and date
        const dayName = getDayName(dayDate.getDay());
        const formattedDate = formatDateDMY(dayDate);
        
        // Build menu details HTML
        let html = `
            <div class="menu-day-header">
                <h3>${dayName} - ${formattedDate}</h3>
            </div>
            
            <div class="menu-items">
        `;
        
        // Check if day menu has data
        if (dayMenu.mainDish || dayMenu.sideDish || dayMenu.dessert || dayMenu.vegetarianOption) {
            html += `
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
            `;
        } else {
            html += `
                <div class="empty-message">
                    El menú para este día aún no ha sido completado.
                </div>
            `;
        }
        
        html += `</div>`;
        
        menuDetails.innerHTML = html;
    }
    
    // Load branch confirmations
    async function loadBranchConfirmations() {
        try {
            if (!currentMenu) return;
            
            branchConfirmations.innerHTML = `
                <div class="loading-message">Cargando confirmaciones...</div>
            `;
            
            // Get branch confirmations using firebase.firestore() directly
            const firestore = firebase.firestore();
            const confirmationSnapshot = await firestore.collection('confirmations')
                .where('weekId', '==', currentMenu.id)
                .where('branchId', '==', branchId)
                .limit(1)
                .get();
                
            let confirmation = null;
            if (!confirmationSnapshot.empty) {
                confirmation = {
                    id: confirmationSnapshot.docs[0].id,
                    ...confirmationSnapshot.docs[0].data()
                };
                logger.info(`Found confirmation for branch ${branchId}: ${confirmation.id}`);
            }
            
            if (!confirmation || !confirmation.employees || confirmation.employees.length === 0) {
                branchConfirmations.innerHTML = `
                    <div class="empty-message">
                        No hay confirmaciones registradas para su sucursal.
                        <a href="confirmations.html">Ir a confirmar asistencia</a>
                    </div>
                `;
                return;
            }
            
            // Count confirmations by day
            const daysCounts = {
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0,
                saturday: 0,
                sunday: 0
            };
            
            confirmation.employees.forEach(employee => {
                employee.days.forEach(day => {
                    daysCounts[day]++;
                });
            });
            
            // Build confirmations HTML
            let html = `
                <div class="confirmation-summary">
                    <table>
                        <thead>
                            <tr>
                                <th>Día</th>
                                <th>Empleados Confirmados</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Add rows for each day
            Object.keys(daysCounts).forEach((day, index) => {
                const dayName = getDayName(index + 1); // Monday is 1
                html += `
                    <tr>
                        <td>${dayName}</td>
                        <td>${daysCounts[day]}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
                
                <div class="confirmation-employees">
                    <h3>Empleados Confirmados (${confirmation.employees.length})</h3>
                    <ul class="employee-list">
            `;
            
            // Add employees
            confirmation.employees.sort((a, b) => a.name.localeCompare(b.name));
            
            confirmation.employees.forEach(employee => {
                html += `
                    <li class="employee-list-item">
                        <span class="employee-name">${employee.name}</span>
                        <span class="employee-days">
                `;
                
                // Show days as badges
                const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                days.forEach((day, index) => {
                    const shortDayName = getShortDayName(index + 1); // Monday is 1
                    const isConfirmed = employee.days.includes(day);
                    
                    html += `
                        <span class="day-badge ${isConfirmed ? 'confirmed' : ''}" title="${shortDayName}">
                            ${shortDayName[0]}
                        </span>
                    `;
                });
                
                html += `
                        </span>
                    </li>
                `;
            });
            
            html += `
                    </ul>
                </div>
            `;
            
            branchConfirmations.innerHTML = html;
        } catch (error) {
            logger.error('Error loading branch confirmations:', error);
            branchConfirmations.innerHTML = `
                <div class="error-message">
                    Error al cargar las confirmaciones.
                </div>
            `;
        }
    }
    
    // Load all branches summary
    async function loadBranchesSummary() {
        try {
            if (!currentMenu) return;
            
            branchesSummaryBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Cargando resumen...</td>
                </tr>
            `;
            
            // Get all branches using firebase.firestore() directly
            const firestore = firebase.firestore();
            const branchesSnapshot = await firestore.collection('branches').get();
            branchesData = [];
            
            branchesSnapshot.forEach(doc => {
                branchesData.push({
                    id: doc.id,
                    ...doc.data(),
                    confirmations: 0,
                    confirmed: false
                });
            });
            
            // Get all confirmations for this menu using the same firestore instance
            const confirmationsSnapshot = await firestore.collection('confirmations')
                .where('weekId', '==', currentMenu.id)
                .get();
            
            // Update branch confirmations data
            confirmationsSnapshot.forEach(doc => {
                const confirmationData = doc.data();
                const branchIndex = branchesData.findIndex(b => b.id === confirmationData.branchId);
                
                if (branchIndex !== -1) {
                    branchesData[branchIndex].confirmations = confirmationData.employees ? confirmationData.employees.length : 0;
                    branchesData[branchIndex].confirmed = true;
                }
            });
            
            // Build summary table
            let html = '';
            
            branchesData.forEach(branch => {
                const percentage = branch.employeeCount ? Math.round((branch.confirmations / branch.employeeCount) * 100) : 0;
                
                html += `
                    <tr>
                        <td>${branch.name}</td>
                        <td>${branch.employeeCount || 0}</td>
                        <td>${branch.confirmations}</td>
                        <td>${percentage}%</td>
                        <td>
                            <span class="status-badge ${branch.confirmed ? 'success' : 'warning'}">
                                ${branch.confirmed ? 'Confirmado' : 'Pendiente'}
                            </span>
                        </td>
                    </tr>
                `;
            });
            
            branchesSummaryBody.innerHTML = html || `
                <tr>
                    <td colspan="5" class="text-center">No hay datos disponibles</td>
                </tr>
            `;
        } catch (error) {
            logger.error('Error loading branches summary:', error);
            branchesSummaryBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Error al cargar el resumen</td>
                </tr>
            `;
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
    
    // Get status text
    function getStatusText(status) {
        switch (status) {
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
}

// Helper function to show success notification
function showSuccess(message) {
    logger.info('Success:', message);
    showNotification(message, { type: 'success' });
}

// Helper function to show error notification
function showError(message) {
    logger.error('Error:', message);
    showNotification(message, { type: 'error' });
}

// Helper function to get day name from day index (0-6)
function getDayName(dayIndex) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayIndex] || '';
}

// Helper function to get short day name from day index (0-6)
function getShortDayName(dayIndex) {
    const shortDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return shortDays[dayIndex] || '';
}

// Helper function to format date as DD/MM/YYYY
function formatDateDMY(date) {
    if (!date || !(date instanceof Date)) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}