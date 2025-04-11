// Menu View - Coordinator Menu View

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
            
            // Get current menu
            currentMenu = await getCurrentWeeklyMenu();
            
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
            console.error('Error loading menu data:', error);
            showError('Error al cargar los datos del menú. Intente nuevamente.');
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
        if (!currentMenu || !currentMenu.dailyMenus || !currentMenu.dailyMenus[currentDay]) {
            menuDetails.innerHTML = `
                <div class="empty-message">
                    No hay detalles disponibles para este día.
                </div>
            `;
            return;
        }
        
        const dayMenu = currentMenu.dailyMenus[currentDay];
        const dayDate = dayMenu.date.toDate();
        
        // Format day and date
        // Usar la función getSpanishDayName para obtener el nombre del día con acento correcto
        const dayName = getSpanishDayName(currentDay);
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
            
            // Get branch confirmations
            const confirmation = await getConfirmationsByBranch(currentMenu.id, branchId);
            
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
                friday: 0
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
                const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
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
            console.error('Error loading branch confirmations:', error);
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
            
            // Get all branches
            const branchesSnapshot = await db.collection('branches').get();
            branchesData = [];
            
            branchesSnapshot.forEach(doc => {
                branchesData.push({
                    id: doc.id,
                    ...doc.data(),
                    confirmations: 0,
                    confirmed: false
                });
            });
            
            // Get all confirmations for this menu
            const confirmationsSnapshot = await db.collection('confirmations')
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
            console.error('Error loading branches summary:', error);
            branchesSummaryBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Error al cargar el resumen</td>
                </tr>
            `;
        }
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
    
    // Normalizar nombre del día (convertir de español a clave en inglés)
    function normalizeDayName(spanishName) {
        const dayMap = {
            'lunes': 'monday',
            'martes': 'tuesday',
            'miércoles': 'wednesday',
            'miercoles': 'wednesday', // Sin acento por si acaso
            'jueves': 'thursday',
            'viernes': 'friday'
        };
        return dayMap[spanishName.toLowerCase()] || spanishName.toLowerCase();
    }
    
    // Obtener nombre en español desde clave en inglés
    function getSpanishDayName(dayKey) {
        const dayMap = {
            'monday': 'Lunes',
            'tuesday': 'Martes',
            'wednesday': 'Miércoles',
            'thursday': 'Jueves',
            'friday': 'Viernes'
        };
        return dayMap[dayKey] || dayKey;
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