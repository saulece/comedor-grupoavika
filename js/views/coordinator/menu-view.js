// Menu View - Coordinator Menu View

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and role
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = '../../index.html';
            return;
        }
        
        // Check if user is coordinator
        const firestore = firebase.firestore();
        const userDoc = await firestore.collection('users').doc(user.uid).get();
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
            showError('Error al cerrar sesión. Intente nuevamente.');
        }
    });
});

// Initialize menu view
function initMenuView(branchId) {
    // DOM elements
    const weekDatesElement = document.getElementById('weekDates');
    const menuStatusBadge = document.getElementById('menuStatus');
    const menuDetails = document.getElementById('menuDetails');
    const branchConfirmations = document.getElementById('branchConfirmations');
    const branchesSummaryBody = document.getElementById('branchesSummaryBody');
    const dayTabsContainer = document.getElementById('dayTabs');
    const goToConfirmBtn = document.getElementById('goToConfirmBtn');
    const noMenuModal = document.getElementById('noMenuModal');
    
    // State
    let currentMenu = null;
    let currentDay = 'monday';
    let branchesData = [];
    
    // Define days and day names for consistency
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    // Create day tabs
    createDayTabs();
    
    // Load menu data
    loadMenuData();
    
    // Event listener for close modal button
    document.querySelector('.close-modal').addEventListener('click', () => {
        noMenuModal.style.display = 'none';
    });
    
    // Create day tabs
    function createDayTabs() {
        let tabsHtml = '';
        
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
                displayMenuDetails();
            });
        });
    }
    
    // Load menu data
    async function loadMenuData() {
        try {
            // Show loading state
            weekDatesElement.textContent = 'Cargando...';
            menuStatusBadge.textContent = 'Cargando...';
            menuStatusBadge.className = 'status-badge';
            
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
                
                if (!currentMenu) {
                    console.warn('No se encontró un menú activo');
                    // Show no menu modal
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
                    
                    noMenuModal.style.display = 'block';
                    
                    // Hide confirm button
                    goToConfirmBtn.style.display = 'none';
                    
                    return;
                }
                
                console.log('Menú encontrado', { id: currentMenu.id, status: currentMenu.status });
            } catch (error) {
                console.error('Error al cargar el menú actual', error);
                showError('Error al cargar el menú. Intente refrescar la página.');
                
                // Show fallback UI with error details
                weekDatesElement.textContent = 'Error al cargar';
                menuStatusBadge.textContent = 'Error';
                menuStatusBadge.className = 'status-badge error';
                
                menuDetails.innerHTML = `
                    <div class="error-message">
                        <p>Error al cargar el menú. ${error.message || ''}</p>
                        <p>Si el problema persiste, contacta al administrador.</p>
                    </div>
                `;
                
                // Show no menu modal with error message
                const noMenuModalContent = document.querySelector('#noMenuModal .modal-content');
                if (noMenuModalContent) {
                    noMenuModalContent.innerHTML = `
                        <h3>Error al cargar el menú</h3>
                        <p>${error.message || 'Ocurrió un error desconocido'}</p>
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
            
            // Store in state manager if available
            if (typeof setCurrentMenu === 'function') {
                setCurrentMenu(currentMenu);
            }
            
            // Display menu info
            displayMenuInfo();
            
            // Display menu details for current day
            displayMenuDetails();
            
            // Load branch confirmations
            loadBranchConfirmations();
            
            // Load all branches summary
            loadBranchesSummary();
            
            // Show confirm button if in confirmation period
            checkConfirmationPeriod();
            
        } catch (error) {
            console.error('Error general al cargar el menú', error);
            showError('Error al cargar datos del menú. Intente nuevamente.');
        }
    }
    
    // Display menu info
    function displayMenuInfo() {
        if (!currentMenu) return;
        
        try {
            // Display week dates
            const startDate = currentMenu.startDate.toDate ? 
                currentMenu.startDate.toDate() : new Date(currentMenu.startDate);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6); // Add 6 days to get to Sunday
            
            weekDatesElement.textContent = `${formatDateDMY(startDate)} al ${formatDateDMY(endDate)}`;
            
            // Display menu status
            menuStatusBadge.textContent = getStatusText(currentMenu.status);
            menuStatusBadge.className = `status-badge ${currentMenu.status}`;
        } catch (error) {
            console.error('Error mostrando información del menú:', error);
            weekDatesElement.textContent = 'Error';
            menuStatusBadge.textContent = 'Error';
            menuStatusBadge.className = 'status-badge error';
        }
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
                menuDetails.innerHTML = `
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
            
            menuDetails.innerHTML = html;
        } catch (error) {
            console.error('Error mostrando detalles del menú:', error);
            menuDetails.innerHTML = `
                <div class="error-message">
                    <p>Error al mostrar el menú del día. Por favor, intente nuevamente.</p>
                </div>
            `;
        }
    }
    
    // Load branch confirmations
    async function loadBranchConfirmations() {
        try {
            // Show loading state
            branchConfirmations.innerHTML = `
                <div class="loading-message">Cargando confirmaciones...</div>
            `;
            
            // Get branch confirmations - try multiple approaches
            let confirmation = null;
            try {
                if (typeof getConfirmationsByBranch === 'function') {
                    confirmation = await getConfirmationsByBranch(currentMenu.id, branchId);
                } else if (window.firestoreService && typeof window.firestoreService.getConfirmationsByBranch === 'function') {
                    confirmation = await window.firestoreService.getConfirmationsByBranch(currentMenu.id, branchId);
                } else {
                    // Direct Firestore access
                    const firestore = firebase.firestore();
                    const confirmationQuery = await firestore.collection('confirmations')
                        .where('weekId', '==', currentMenu.id)
                        .where('branchId', '==', branchId)
                        .limit(1)
                        .get();
                        
                    if (!confirmationQuery.empty) {
                        confirmation = {
                            id: confirmationQuery.docs[0].id,
                            ...confirmationQuery.docs[0].data()
                        };
                    }
                }
            } catch (error) {
                console.error('Error al obtener confirmaciones', error);
                // Continue with null confirmation
            }
                
            if (!confirmation || !confirmation.employees || !Array.isArray(confirmation.employees) || confirmation.employees.length === 0) {
                branchConfirmations.innerHTML = `
                    <div class="empty-message">
                        No hay confirmaciones registradas para su sucursal.
                        <br>
                        <a href="confirmations.html" class="btn btn-primary btn-sm">
                            Ir a Confirmaciones
                        </a>
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
                if (employee.days && Array.isArray(employee.days)) {
                    employee.days.forEach(day => {
                        if (daysCounts[day] !== undefined) {
                            daysCounts[day]++;
                        }
                    });
                }
            });
            
            // Build confirmations HTML
            let html = `
                <div class="confirmation-summary">
                    <h4>Resumen de Confirmaciones</h4>
                    <table class="summary-table">
                        <thead>
                            <tr>
                                <th>Día</th>
                                <th>Confirmaciones</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Add rows for each day
            days.forEach((day, index) => {
                html += `
                    <tr>
                        <td>${dayNames[index]}</td>
                        <td>${daysCounts[day]}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
                
                <div class="employee-confirmations">
                    <h4>Detalle por Empleado</h4>
            `;
            
            // Add employees
            confirmation.employees.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            
            confirmation.employees.forEach(employee => {
                html += `
                    <div class="employee-confirmation-item">
                        <span class="employee-name">${employee.name || 'Sin nombre'}</span>
                        <span class="employee-days">
                `;
                
                days.forEach((day, index) => {
                    const shortDayName = dayNames[index].substring(0, 1);
                    const isConfirmed = employee.days && Array.isArray(employee.days) && employee.days.includes(day);
                    
                    html += `
                        <span class="day-badge ${isConfirmed ? 'confirmed' : ''}" title="${dayNames[index]}">
                            ${shortDayName}
                        </span>
                    `;
                });
                
                html += `
                        </span>
                    </div>
                `;
            });
            
            html += `
                </div>
                
                <div class="confirmation-actions">
                    <a href="confirmations.html" class="btn btn-primary">
                        Editar Confirmaciones
                    </a>
                </div>
            `;
            
            branchConfirmations.innerHTML = html;
        } catch (error) {
            console.error('Error loading branch confirmations:', error);
            branchConfirmations.innerHTML = `
                <div class="error-message">
                    Error al cargar las confirmaciones. Por favor, intente nuevamente.
                </div>
            `;
        }
    }
    
    // Load all branches summary
    async function loadBranchesSummary() {
        try {
            // Show loading state
            branchesSummaryBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Cargando datos...</td>
                </tr>
            `;
            
            // Get all branches
            const firestore = firebase.firestore();
            const branchesSnapshot = await firestore.collection('branches').get();
            branchesData = [];
            
            branchesSnapshot.forEach(doc => {
                branchesData.push({
                    id: doc.id,
                    ...doc.data(),
                    confirmations: 0
                });
            });
            
            // Get confirmations for each branch
            const confirmationsSnapshot = await firestore.collection('confirmations')
                .where('weekId', '==', currentMenu.id)
                .get();
            
            // Update branches with confirmation counts
            confirmationsSnapshot.forEach(doc => {
                const data = doc.data();
                const branch = branchesData.find(b => b.id === data.branchId);
                
                if (branch) {
                    branch.confirmations = data.employees ? data.employees.length : 0;
                }
            });
            
            // Build table rows
            let html = '';
            
            branchesData.forEach(branch => {
                const percentage = branch.employeeCount > 0 ? 
                    Math.round((branch.confirmations / branch.employeeCount) * 100) : 0;
                
                html += `
                    <tr>
                        <td>${branch.name || 'Sin nombre'}</td>
                        <td>${branch.employeeCount || 0}</td>
                        <td>${branch.confirmations}</td>
                        <td>${percentage}%</td>
                        <td>
                            <div class="progress-bar">
                                <div class="progress" style="width: ${percentage}%"></div>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            // If no branches, show message
            if (branchesData.length === 0) {
                html = `
                    <tr>
                        <td colspan="5" class="text-center">No hay sucursales registradas</td>
                    </tr>
                `;
            }
            
            branchesSummaryBody.innerHTML = html;
        } catch (error) {
            console.error('Error loading branches summary:', error);
            branchesSummaryBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Error al cargar el resumen</td>
                </tr>
            `;
        }
    }
    
    // Check if confirmation period is active and show or hide confirm button
    function checkConfirmationPeriod() {
        if (!currentMenu) {
            goToConfirmBtn.style.display = 'none';
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
                goToConfirmBtn.style.display = 'none';
                return;
            }
            
            // Check if now is in the confirmation period
            if (now >= confirmStart && now <= confirmEnd) {
                goToConfirmBtn.style.display = 'inline-flex';
            } else {
                goToConfirmBtn.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking confirmation period:', error);
            goToConfirmBtn.style.display = 'none';
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
}

// Helper Functions

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

// Get day name from day index (0-6)
function getDayName(dayIndex) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayIndex] || 'Día desconocido';
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
