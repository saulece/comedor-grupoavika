// Dashboard.js - Controlador para la vista de dashboard del administrador

/**
 * Inicializa la página de dashboard
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar autenticación
        await checkAuth();
        
        // Cargar datos del dashboard
        await loadDashboardData();
        
        // Configurar eventos
        setupEventListeners();
        
    } catch (error) {
        console.error('Error al inicializar dashboard:', error);
        showNotification('error', 'Error al cargar el dashboard');
    }
});

/**
 * Verifica que el usuario esté autenticado y tenga rol de administrador
 */
async function checkAuth() {
    return new Promise((resolve, reject) => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // Obtener datos del usuario
                    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        
                        // Verificar rol de administrador
                        if (userData.role === 'admin') {
                            // Mostrar nombre del usuario
                            document.getElementById('userName').textContent = userData.name || 'Administrador';
                            resolve(userData);
                        } else {
                            // Redirigir si no es administrador
                            window.location.href = '../../index.html';
                            reject(new Error('Acceso no autorizado'));
                        }
                    } else {
                        window.location.href = '../../index.html';
                        reject(new Error('Usuario no encontrado'));
                    }
                } catch (error) {
                    console.error('Error al verificar usuario:', error);
                    reject(error);
                }
            } else {
                // Redirigir a login si no hay usuario
                window.location.href = '../../index.html';
                reject(new Error('Usuario no autenticado'));
            }
        });
    });
}

/**
 * Carga todos los datos necesarios para el dashboard
 */
async function loadDashboardData() {
    try {
        // Obtener menú semanal actual
        const weeklyMenu = await getCurrentWeeklyMenu();
        
        // Obtener configuración de la aplicación
        const appSettings = await getAppSettings();
        
        // Actualizar estado del menú
        updateMenuStatus(weeklyMenu);
        
        // Cargar resumen del menú semanal
        await loadMenuSummary(weeklyMenu);
        
        // Cargar confirmaciones por sucursal
        await loadBranchConfirmations(weeklyMenu, appSettings);
        
        // Calcular y mostrar ahorro estimado
        updateEstimatedSavings(weeklyMenu, appSettings);
        
    } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
        showNotification('error', 'Error al cargar datos');
    }
}

/**
 * Actualiza el estado del menú en la tarjeta correspondiente
 * @param {Object} weeklyMenu - Datos del menú semanal
 */
function updateMenuStatus(weeklyMenu) {
    const menuStatusElement = document.getElementById('menuStatus');
    
    if (!weeklyMenu) {
        menuStatusElement.textContent = 'No hay menú activo';
        menuStatusElement.classList.add('status-warning');
        return;
    }
    
    // Crear modelo de menú para acceder a métodos de utilidad
    const menuModel = new MenuModel(weeklyMenu);
    
    // Mostrar estado y fechas
    let statusText = menuModel.getStatusText();
    let dateRange = menuModel.getFormattedDateRange();
    
    menuStatusElement.textContent = `${statusText} (${dateRange})`;
    
    // Aplicar clase de estilo según estado
    menuStatusElement.className = '';
    
    switch (weeklyMenu.status) {
        case 'pending':
            menuStatusElement.classList.add('status-warning');
            break;
        case 'in-progress':
            menuStatusElement.classList.add('status-success');
            break;
        case 'completed':
            menuStatusElement.classList.add('status-info');
            break;
        default:
            menuStatusElement.classList.add('status-warning');
    }
}

/**
 * Carga y muestra el resumen del menú semanal
 * @param {Object} weeklyMenu - Datos del menú semanal
 */
async function loadMenuSummary(weeklyMenu) {
    const menuSummaryBody = document.getElementById('menuSummaryBody');
    
    // Limpiar contenido actual
    menuSummaryBody.innerHTML = '';
    
    if (!weeklyMenu || !weeklyMenu.dailyMenus) {
        menuSummaryBody.innerHTML = '<tr><td colspan="5">No hay menú semanal disponible</td></tr>';
        return;
    }
    
    // Definir los días de la semana
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = {
        monday: 'Lunes',
        tuesday: 'Martes',
        wednesday: 'Miércoles',
        thursday: 'Jueves',
        friday: 'Viernes',
        saturday: 'Sabado',
        sunday: 'Domingo'
    };
    
    // Obtener confirmaciones por día si están disponibles
    let confirmationCounts = {};
    if (weeklyMenu.id) {
        try {
            const confirmationsSnapshot = await firebase.firestore().collection('confirmations')
                .where('weekId', '==', weeklyMenu.id)
                .get();
            
            // Inicializar contadores para cada día
            days.forEach(day => confirmationCounts[day] = 0);
            
            // Sumar confirmaciones por día
            confirmationsSnapshot.forEach(doc => {
                const confirmation = doc.data();
                if (confirmation.employees && Array.isArray(confirmation.employees)) {
                    confirmation.employees.forEach(emp => {
                        if (emp.days && Array.isArray(emp.days)) {
                            emp.days.forEach(day => {
                                if (confirmationCounts[day] !== undefined) {
                                    confirmationCounts[day]++;
                                }
                            });
                        }
                    });
                }
            });
        } catch (error) {
            console.error('Error al obtener confirmaciones:', error);
        }
    }
    
    // Crear filas para cada día
    days.forEach(day => {
        const dailyMenu = weeklyMenu.dailyMenus[day];
        if (!dailyMenu) return;
        
        const row = document.createElement('tr');
        
        // Día
        const dayCell = document.createElement('td');
        dayCell.textContent = dayNames[day] || day;
        row.appendChild(dayCell);
        
        // Platillo principal
        const mainDishCell = document.createElement('td');
        mainDishCell.textContent = dailyMenu.mainDish || 'No definido';
        row.appendChild(mainDishCell);
        
        // Guarnición
        const sideCell = document.createElement('td');
        sideCell.textContent = dailyMenu.sideDish || 'No definido';
        row.appendChild(sideCell);
        
        // Postre
        const dessertCell = document.createElement('td');
        dessertCell.textContent = dailyMenu.dessert || 'No definido';
        row.appendChild(dessertCell);
        
        // Confirmaciones
        const confirmationsCell = document.createElement('td');
        confirmationsCell.textContent = confirmationCounts[day] || 0;
        row.appendChild(confirmationsCell);
        
        menuSummaryBody.appendChild(row);
    });
}

/**
 * Carga y muestra las confirmaciones por sucursal
 * @param {Object} weeklyMenu - Datos del menú semanal
 * @param {Object} appSettings - Configuración de la aplicación
 */
async function loadBranchConfirmations(weeklyMenu, appSettings) {
    const branchConfirmationsBody = document.getElementById('branchConfirmationsBody');
    const pendingConfirmationsAlert = document.getElementById('pendingConfirmationsAlert');
    const pendingBranchesList = document.getElementById('pendingBranchesList');
    
    // Limpiar contenido actual
    branchConfirmationsBody.innerHTML = '';
    pendingBranchesList.innerHTML = '';
    pendingConfirmationsAlert.style.display = 'none';
    
    if (!weeklyMenu || !weeklyMenu.id) {
        branchConfirmationsBody.innerHTML = '<tr><td colspan="7">No hay menú semanal disponible</td></tr>';
        return;
    }
    
    try {
        // Obtener todas las sucursales
        const branchesSnapshot = await firebase.firestore().collection('branches').get();
        const branches = [];
        
        branchesSnapshot.forEach(doc => {
            branches.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Obtener confirmaciones para el menú actual
        const confirmationsSnapshot = await firebase.firestore().collection('confirmations')
            .where('weekId', '==', weeklyMenu.id)
            .get();
        
        const confirmations = [];
        confirmationsSnapshot.forEach(doc => {
            confirmations.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Definir los días de la semana
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayNames = {
            monday: 'Lunes',
            tuesday: 'Martes',
            wednesday: 'Miércoles',
            thursday: 'Jueves',
            friday: 'Viernes',
            saturday: 'Sabado',
            sunday: 'Domingo'
        };
        
        // Crear filas para cada sucursal
        const pendingBranches = [];
        
        branches.forEach(branch => {
            const row = document.createElement('tr');
            
            // Nombre de la sucursal
            const branchCell = document.createElement('td');
            branchCell.textContent = branch.name;
            row.appendChild(branchCell);
            
            // Encontrar confirmación para esta sucursal
            const branchConfirmation = confirmations.find(c => c.branchId === branch.id);
            
            // Contadores por día y total
            let totalConfirmations = 0;
            
            // Crear celdas para cada día
            days.forEach(day => {
                const dayCell = document.createElement('td');
                
                if (branchConfirmation && branchConfirmation.employees) {
                    // Contar confirmaciones para este día
                    const count = branchConfirmation.employees.filter(emp => 
                        emp.days && emp.days.includes(day)
                    ).length;
                    
                    dayCell.textContent = count;
                    totalConfirmations += count;
                } else {
                    dayCell.textContent = '0';
                }
                
                row.appendChild(dayCell);
            });
            
            // Total de confirmaciones
            const totalCell = document.createElement('td');
            totalCell.textContent = totalConfirmations;
            totalCell.classList.add('total-column');
            row.appendChild(totalCell);
            
            branchConfirmationsBody.appendChild(row);
            
            // Verificar si la sucursal no ha confirmado
            if (!branchConfirmation && branch.employeeCount > 0) {
                pendingBranches.push(branch.name);
            }
        });
        
        // Mostrar alerta de sucursales pendientes si es necesario
        if (pendingBranches.length > 0 && weeklyMenu.status === 'in-progress') {
            pendingBranches.forEach(branchName => {
                const li = document.createElement('li');
                li.textContent = branchName;
                pendingBranchesList.appendChild(li);
            });
            
            pendingConfirmationsAlert.style.display = 'flex';
        }
        
        // Actualizar contador de confirmaciones
        updateConfirmationCount(confirmations);
        
    } catch (error) {
        console.error('Error al cargar confirmaciones por sucursal:', error);
        branchConfirmationsBody.innerHTML = '<tr><td colspan="7">Error al cargar datos</td></tr>';
    }
}

/**
 * Actualiza el contador de confirmaciones en la tarjeta correspondiente
 * @param {Array} confirmations - Lista de confirmaciones
 */
function updateConfirmationCount(confirmations) {
    const confirmationCountElement = document.getElementById('confirmationCount');
    
    if (!confirmations || confirmations.length === 0) {
        confirmationCountElement.textContent = '0 confirmaciones';
        return;
    }
    
    // Contar empleados confirmados (al menos un día)
    let confirmedEmployees = 0;
    let totalConfirmations = 0;
    
    confirmations.forEach(confirmation => {
        if (confirmation.employees && Array.isArray(confirmation.employees)) {
            // Contar empleados con al menos un día confirmado
            const confirmed = confirmation.employees.filter(emp => 
                emp.days && Array.isArray(emp.days) && emp.days.length > 0
            ).length;
            
            confirmedEmployees += confirmed;
            
            // Contar total de confirmaciones (suma de todos los días)
            confirmation.employees.forEach(emp => {
                if (emp.days && Array.isArray(emp.days)) {
                    totalConfirmations += emp.days.length;
                }
            });
        }
    });
    
    confirmationCountElement.textContent = `${confirmedEmployees} empleados / ${totalConfirmations} comidas`;
}

/**
 * Calcula y muestra el ahorro estimado
 * @param {Object} weeklyMenu - Datos del menú semanal
 * @param {Object} appSettings - Configuración de la aplicación
 */
function updateEstimatedSavings(weeklyMenu, appSettings) {
    const savingsElement = document.getElementById('estimatedSavings');
    
    if (!weeklyMenu) {
        savingsElement.textContent = '$0.00';
        return;
    }
    
    // Obtener costo por comida de la configuración
    const mealCost = appSettings && appSettings.mealCost ? appSettings.mealCost : 50;
    
    // Crear modelo de menú para usar método de cálculo
    const menuModel = new MenuModel(weeklyMenu);
    const savings = menuModel.calculateSavings(mealCost);
    
    // Formatear como moneda
    const formattedSavings = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(savings);
    
    savingsElement.textContent = formattedSavings;
}

/**
 * Configura los event listeners para los elementos interactivos
 */
function setupEventListeners() {
    // Botón de cerrar sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await firebase.auth().signOut();
                window.location.href = '../../index.html';
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                showNotification('error', 'Error al cerrar sesión');
            }
        });
    }
    
    // Botón para crear menú
    const createMenuBtn = document.getElementById('createMenuBtn');
    if (createMenuBtn) {
        createMenuBtn.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });
    }
}

/**
 * Obtiene el menú semanal actual
 * @returns {Promise<Object>} Datos del menú semanal
 */
async function getCurrentWeeklyMenu() {
    try {
        // Obtener fecha actual
        const now = new Date();
        
        // Consultar menú activo (simplificado para evitar necesidad de índice compuesto)
        const menuSnapshot = await firebase.firestore().collection('weeklyMenus')
            .where('startDate', '<=', now)
            .get();
        
        if (menuSnapshot.empty) {
            console.log('No hay menú activo para la semana actual');
            return null;
        }
        
        // Filtrar menús cuya fecha de fin sea mayor o igual a hoy
        // y ordenar por fecha de inicio (más reciente primero)
        const validMenus = menuSnapshot.docs
            .filter(doc => {
                const data = doc.data();
                const endDate = data.endDate.toDate ? data.endDate.toDate() : data.endDate;
                return endDate >= now;
            })
            .sort((a, b) => {
                const dateA = a.data().startDate.toDate ? a.data().startDate.toDate() : a.data().startDate;
                const dateB = b.data().startDate.toDate ? b.data().startDate.toDate() : b.data().startDate;
                return dateB - dateA; // Orden descendente
            });
        
        if (validMenus.length === 0) {
            console.log('No hay menú activo para la semana actual');
            return null;
        }
        
        // Obtener datos del menú más reciente
        const menuDoc = validMenus[0];
        const menuData = menuDoc.data();
        menuData.id = menuDoc.id;
        
        // Obtener subcolección de menús diarios
        const dailyMenusSnapshot = await firebase.firestore().collection('weeklyMenus')
            .doc(menuDoc.id)
            .collection('dailyMenus')
            .get();
        
        // Organizar menús diarios por día
        menuData.dailyMenus = {};
        dailyMenusSnapshot.forEach(doc => {
            const dailyMenu = doc.data();
            menuData.dailyMenus[dailyMenu.day] = dailyMenu;
        });
        
        return menuData;
    } catch (error) {
        console.error('Error al obtener menú semanal:', error);
        throw error;
    }
}

/**
 * Obtiene la configuración de la aplicación
 * @returns {Promise<Object>} Configuración de la aplicación
 */
async function getAppSettings() {
    try {
        const settingsDoc = await firebase.firestore().collection('settings').doc('appSettings').get();
        
        if (!settingsDoc.exists) {
            console.log('No se encontró la configuración de la aplicación');
            return { mealCost: 50 }; // Valor predeterminado
        }
        
        return settingsDoc.data();
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        throw error;
    }
}
