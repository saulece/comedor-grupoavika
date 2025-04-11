// Dashboard.js - Admin Dashboard

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and role
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = '../../index.html';
            return;
        }
        
        // Check if user is admin
        const isAdmin = await isUserAdmin();
        
        if (!isAdmin) {
            // Redirect non-admin users
            window.location.href = '../../index.html';
            return;
        }
        
        // Display user name
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            document.getElementById('userName').textContent = userDoc.data().displayName || 'Administrador';
        }
        
        // Initialize dashboard
        initDashboard();
    });
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await logout();
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    });
});

// Initialize dashboard
function initDashboard() {
    // DOM elements
    const menuStatusElement = document.getElementById('menuStatus');
    const confirmationCountElement = document.getElementById('confirmationCount');
    const estimatedSavingsElement = document.getElementById('estimatedSavings');
    const menuSummaryBody = document.getElementById('menuSummaryBody');
    const branchConfirmationsBody = document.getElementById('branchConfirmationsBody');
    const pendingConfirmationsAlert = document.getElementById('pendingConfirmationsAlert');
    const pendingBranchesList = document.getElementById('pendingBranchesList');
    const createMenuBtn = document.getElementById('createMenuBtn');
    
    // Load dashboard data
    loadDashboardData();
    
    // Event listener for create menu button
    if (createMenuBtn) {
        createMenuBtn.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });
    }
    
    // Load dashboard data
    async function loadDashboardData() {
        try {
            // Set loading states
            menuStatusElement.textContent = 'Cargando...';
            confirmationCountElement.textContent = 'Cargando...';
            estimatedSavingsElement.textContent = 'Cargando...';
            
            // Get current menu
            const menuSnapshot = await db.collection('weeklyMenus')
                .orderBy('startDate', 'desc')
                .limit(1)
                .get();
            
            if (menuSnapshot.empty) {
                // No menu exists yet
                menuStatusElement.textContent = 'No creado';
                confirmationCountElement.textContent = '0';
                estimatedSavingsElement.textContent = '$0';
                
                menuSummaryBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">
                            No hay menú creado aún. 
                            <a href="menu.html">Haga clic aquí para crear uno.</a>
                        </td>
                    </tr>
                `;
                
                branchConfirmationsBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">No hay datos disponibles</td>
                    </tr>
                `;
                
                pendingConfirmationsAlert.style.display = 'none';
                return;
            }
            
            // Get menu data
            const menuDoc = menuSnapshot.docs[0];
            const menuData = menuDoc.data();
            
            // Display menu status
            menuStatusElement.textContent = getStatusText(menuData.status);
            
            // Get confirmations count
            const confirmedEmployees = menuData.confirmedEmployees || 0;
            confirmationCountElement.textContent = confirmedEmployees;
            
            // Calculate estimated savings
            const settingsDoc = await db.collection('settings').doc('appSettings').get();
            let mealCost = 50; // Default value
            
            if (settingsDoc.exists) {
                mealCost = settingsDoc.data().mealCost || 50;
            }
            
            const totalEmployees = menuData.totalEmployees || 0;
            const totalMealSlots = totalEmployees * 5; // 5 days
            const confirmedSlots = await getConfirmedMealSlots(menuDoc.id);
            const unconfirmedSlots = totalMealSlots - confirmedSlots;
            const estimatedSavings = unconfirmedSlots * mealCost;
            
            estimatedSavingsElement.textContent = `$${estimatedSavings.toLocaleString()}`;
            
            // Load menu summary
            await loadMenuSummary(menuDoc.id);
            
            // Load branch confirmations
            await loadBranchConfirmations(menuDoc.id);
            
            // Check for pending confirmations
            await checkPendingConfirmations(menuDoc.id);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            
            menuStatusElement.textContent = 'Error';
            confirmationCountElement.textContent = 'Error';
            estimatedSavingsElement.textContent = 'Error';
            
            menuSummaryBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Error al cargar datos</td>
                </tr>
            `;
            
            branchConfirmationsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">Error al cargar datos</td>
                </tr>
            `;
        }
    }
    
    // Load menu summary
    async function loadMenuSummary(menuId) {
        try {
            // Get daily menus
            const dailyMenusSnapshot = await db.collection('weeklyMenus')
                .doc(menuId)
                .collection('dailyMenus')
                .get();
            
            if (dailyMenusSnapshot.empty) {
                menuSummaryBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No hay detalles del menú disponibles</td>
                    </tr>
                `;
                return;
            }
            
            const dayNames = {
                'monday': 'Lunes',
                'tuesday': 'Martes',
                'wednesday': 'Miércoles',
                'thursday': 'Jueves',
                'friday': 'Viernes'
            };
            
            let html = '';
            
            // Get confirmations for each day
            const confirmationsData = await getConfirmationsByDay(menuId);
            
            // Sort days
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
            
            for (const day of days) {
                const dayMenu = dailyMenusSnapshot.docs.find(doc => doc.id === day);
                
                if (dayMenu) {
                    const menuData = dayMenu.data();
                    html += `
                        <tr>
                            <td>${dayNames[day]}</td>
                            <td>${menuData.mainDish || 'No especificado'}</td>
                            <td>${menuData.sideDish || 'No especificado'}</td>
                            <td>${menuData.dessert || 'No especificado'}</td>
                            <td>${confirmationsData[day] || 0}</td>
                        </tr>
                    `;
                }
            }
            
            if (html) {
                menuSummaryBody.innerHTML = html;
            } else {
                menuSummaryBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No hay detalles del menú disponibles</td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('Error loading menu summary:', error);
            menuSummaryBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">Error al cargar detalles del menú</td>
                </tr>
            `;
        }
    }
    
    // Load branch confirmations
    async function loadBranchConfirmations(menuId) {
        try {
            // Get all branches
            const branchesSnapshot = await db.collection('branches').get();
            
            if (branchesSnapshot.empty) {
                branchConfirmationsBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">No hay sucursales registradas</td>
                    </tr>
                `;
                return;
            }
            
            // Get all confirmations for the menu
            const confirmationsSnapshot = await db.collection('confirmations')
                .where('weekId', '==', menuId)
                .get();
            
            // Create a map of branch confirmations
            const branchConfirmations = {};
            
            branchesSnapshot.forEach(doc => {
                branchConfirmations[doc.id] = {
                    id: doc.id,
                    name: doc.data().name,
                    days: {
                        monday: 0,
                        tuesday: 0,
                        wednesday: 0,
                        thursday: 0,
                        friday: 0
                    },
                    total: 0,
                    confirmed: false
                };
            });
            
            // Fill confirmation data
            confirmationsSnapshot.forEach(doc => {
                const confirmationData = doc.data();
                const branchId = confirmationData.branchId;
                
                if (branchConfirmations[branchId]) {
                    branchConfirmations[branchId].confirmed = true;
                    
                    // Count confirmations by day
                    if (confirmationData.employees && Array.isArray(confirmationData.employees)) {
                        confirmationData.employees.forEach(employee => {
                            if (employee.days && Array.isArray(employee.days)) {
                                employee.days.forEach(day => {
                                    if (branchConfirmations[branchId].days[day] !== undefined) {
                                        branchConfirmations[branchId].days[day]++;
                                        branchConfirmations[branchId].total++;
                                    }
                                });
                            }
                        });
                    }
                }
            });
            
            // Build HTML
            let html = '';
            
            Object.values(branchConfirmations).forEach(branch => {
                html += `
                    <tr>
                        <td>${branch.name}</td>
                        <td>${branch.days.monday}</td>
                        <td>${branch.days.tuesday}</td>
                        <td>${branch.days.wednesday}</td>
                        <td>${branch.days.thursday}</td>
                        <td>${branch.days.friday}</td>
                        <td>${branch.total}</td>
                    </tr>
                `;
            });
            
            if (html) {
                branchConfirmationsBody.innerHTML = html;
            } else {
                branchConfirmationsBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">No hay datos disponibles</td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('Error loading branch confirmations:', error);
            branchConfirmationsBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">Error al cargar confirmaciones</td>
                </tr>
            `;
        }
    }
    
    // Check for pending confirmations
    async function checkPendingConfirmations(menuId) {
        try {
            // Get all branches
            const branchesSnapshot = await db.collection('branches').get();
            
            if (branchesSnapshot.empty) {
                pendingConfirmationsAlert.style.display = 'none';
                return;
            }
            
            // Get all confirmations for the menu
            const confirmationsSnapshot = await db.collection('confirmations')
                .where('weekId', '==', menuId)
                .get();
            
            // Find branches without confirmations
            const branchesWithConfirmations = new Set();
            confirmationsSnapshot.forEach(doc => {
                branchesWithConfirmations.add(doc.data().branchId);
            });
            
            const pendingBranches = [];
            branchesSnapshot.forEach(doc => {
                if (!branchesWithConfirmations.has(doc.id)) {
                    pendingBranches.push({
                        id: doc.id,
                        name: doc.data().name
                    });
                }
            });
            
            // Display pending confirmations alert if needed
            if (pendingBranches.length > 0) {
                let html = '';
                pendingBranches.forEach(branch => {
                    html += `<li>${branch.name}</li>`;
                });
                
                pendingBranchesList.innerHTML = html;
                pendingConfirmationsAlert.style.display = 'flex';
            } else {
                pendingConfirmationsAlert.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking pending confirmations:', error);
            pendingConfirmationsAlert.style.display = 'none';
        }
    }
    
    // Get confirmations by day
    async function getConfirmationsByDay(menuId) {
        try {
            // Get all confirmations for the menu
            const confirmationsSnapshot = await db.collection('confirmations')
                .where('weekId', '==', menuId)
                .get();
            
            const days = {
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0
            };
            
            // Count confirmations by day
            confirmationsSnapshot.forEach(doc => {
                const confirmationData = doc.data();
                
                if (confirmationData.employees && Array.isArray(confirmationData.employees)) {
                    confirmationData.employees.forEach(employee => {
                        if (employee.days && Array.isArray(employee.days)) {
                            employee.days.forEach(day => {
                                if (days[day] !== undefined) {
                                    days[day]++;
                                }
                            });
                        }
                    });
                }
            });
            
            return days;
        } catch (error) {
            console.error('Error getting confirmations by day:', error);
            return {
                monday: 0,
                tuesday: 0,
                wednesday: 0,
                thursday: 0,
                friday: 0
            };
        }
    }
    
    // Get confirmed meal slots
    async function getConfirmedMealSlots(menuId) {
        try {
            // Get all confirmations for the menu
            const confirmationsSnapshot = await db.collection('confirmations')
                .where('weekId', '==', menuId)
                .get();
            
            let totalSlots = 0;
            
            // Count confirmed meal slots
            confirmationsSnapshot.forEach(doc => {
                const confirmationData = doc.data();
                
                if (confirmationData.employees && Array.isArray(confirmationData.employees)) {
                    confirmationData.employees.forEach(employee => {
                        if (employee.days && Array.isArray(employee.days)) {
                            totalSlots += employee.days.length;
                        }
                    });
                }
            });
            
            return totalSlots;
        } catch (error) {
            console.error('Error getting confirmed meal slots:', error);
            return 0;
        }
    }
    
    // Helper functions
    
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