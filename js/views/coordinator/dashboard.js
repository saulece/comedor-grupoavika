// Coordinator Dashboard for Comedor Grupo Avika

// Inicialización de la página cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    // Proteger esta ruta para el rol de coordinador
    await protectRoute(USER_ROLES.COORDINATOR);
    
    // Inicializar la página si la autenticación es válida
    initDashboard();
});

/**
 * Inicializar el dashboard del coordinador
 */
async function initDashboard() {
    try {
        window.errorService.toggleLoading(true);
        
        // Verificar servicios necesarios
        if (!window.firestoreService) {
            throw new Error('Servicio de Firestore no disponible');
        }
        
        // Obtener usuario actual
        const currentUser = getCurrentUser();
        
        if (!currentUser || !currentUser.uid) {
            throw new Error('No hay usuario en sesión');
        }
        
        // Verificar rol de coordinador
        if (currentUser.role !== USER_ROLES.COORDINATOR) {
            throw new Error('Acceso no autorizado: se requiere rol de coordinador');
        }
        
        // Cargar datos iniciales
        await loadDashboardData();
        
        // Configurar escuchas en tiempo real
        setupRealTimeListeners();
        
        // Configurar eventos
        setupEventListeners();
        
    } catch (error) {
        window.errorService.handleError(
            error, 
            'Error al inicializar el dashboard',
            ERROR_TYPES.UNKNOWN,
            ERROR_SEVERITY.ERROR
        );
    } finally {
        window.errorService.toggleLoading(false);
    }
}

/**
 * Cargar datos del dashboard
 */
async function loadDashboardData() {
    try {
        const currentUser = getCurrentUser();
        
        // Cargar estadísticas de empleados
        await loadEmployeeStats(currentUser.uid);
        
        // Cargar estadísticas de confirmaciones para la fecha actual
        await loadConfirmationStats();
        
        // Actualizar UI con los datos cargados
        updateDashboardUI();
        
    } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
        throw error;
    }
}

/**
 * Cargar estadísticas de empleados para el coordinador
 * @param {string} coordinatorId - ID del coordinador
 */
async function loadEmployeeStats(coordinatorId) {
    try {
        // Consultar empleados asignados a este coordinador con caché y selección de campos
        const query = {
            collection: 'employees',
            where: [['coordinatorId', '==', coordinatorId]],
            select: ['active'], // Solo necesitamos el campo active para las estadísticas
            useCache: true,
            cacheExpiration: 15 // 15 minutos
        };
        
        const employeesResult = await window.firestoreService.getDocuments(query);
        
        if (!employeesResult || !employeesResult.data) {
            throw new Error('Error al obtener estadísticas de empleados');
        }
        
        // Calcular estadísticas
        const employees = employeesResult.data;
        const total = employees.length;
        const active = employees.filter(emp => emp.active === true).length;
        const inactive = total - active;
        
        // Actualizar estado
        dashboardState.setValue('stats', {
            ...dashboardState.getValue('stats'),
            employees: { total, active, inactive }
        });
        
    } catch (error) {
        console.error('Error al cargar estadísticas de empleados:', error);
        throw error;
    }
}

/**
 * Cargar estadísticas de confirmaciones para la fecha actual
 */
async function loadConfirmationStats() {
    try {
        const currentUser = getCurrentUser();
        const currentDate = dashboardState.getValue('currentDate');
        
        // Formatear fecha para consulta (YYYY-MM-DD)
        const dateStr = formatDate(currentDate);
        
        // Obtener departamentos asignados al coordinador con caché
        const deptQuery = {
            collection: 'departments',
            where: [['coordinatorId', '==', currentUser.uid]],
            select: ['name'], // Solo necesitamos el nombre
            useCache: true,
            cacheExpiration: 60 // 1 hora
        };
        
        const deptsResult = await window.firestoreService.getDocuments(deptQuery);
        
        if (!deptsResult || !deptsResult.data) {
            throw new Error('Error al obtener departamentos');
        }
        
        dashboardState.setValue('departments', deptsResult.data);
        
        // Obtener IDs de departamentos
        const departmentIds = deptsResult.data.map(dept => dept.id);
        
        // Si no hay departamentos, establecer estadísticas en cero
        if (departmentIds.length === 0) {
            dashboardState.setValue('stats', {
                ...dashboardState.getValue('stats'),
                confirmations: { total: 0, confirmed: 0, pending: 0 }
            });
            return;
        }
        
        // Consultar confirmaciones para los departamentos del coordinador en la fecha actual
        // Usamos una transacción para garantizar consistencia en los datos
        const confirmationStats = await window.firestoreService.runTransaction(async (transaction) => {
            let totalEmployees = 0;
            let confirmedEmployees = 0;
            
            // Obtener total de empleados activos por departamento
            for (const deptId of departmentIds) {
                const empQuery = {
                    collection: 'employees',
                    where: [
                        ['departmentId', '==', deptId],
                        ['active', '==', true]
                    ],
                    select: ['id'] // Solo necesitamos contar
                };
                
                const empResult = await transaction.get('employees', null, empQuery);
                
                if (empResult) {
                    totalEmployees += empResult.length;
                }
                
                // Obtener confirmaciones para este departamento y fecha
                const confQuery = {
                    collection: 'confirmations',
                    where: [
                        ['departmentId', '==', deptId],
                        ['date', '==', dateStr]
                    ]
                };
                
                const confResult = await transaction.get('confirmations', null, confQuery);
                
                if (confResult && confResult.length > 0) {
                    // Sumar empleados confirmados
                    confResult.forEach(conf => {
                        if (conf.confirmedEmployees && Array.isArray(conf.confirmedEmployees)) {
                            confirmedEmployees += conf.confirmedEmployees.length;
                        } else if (conf.confirmedCount) {
                            confirmedEmployees += conf.confirmedCount;
                        }
                    });
                }
            }
            
            return {
                total: totalEmployees,
                confirmed: confirmedEmployees,
                pending: totalEmployees - confirmedEmployees
            };
        });
        
        // Actualizar estado con las estadísticas de confirmaciones
        dashboardState.setValue('stats', {
            ...dashboardState.getValue('stats'),
            confirmations: confirmationStats
        });
        
    } catch (error) {
        console.error('Error al cargar estadísticas de confirmaciones:', error);
        throw error;
    }
}

/**
 * Configurar escuchas en tiempo real
 */
function setupRealTimeListeners() {
    try {
        const currentUser = getCurrentUser();
        const currentDate = dashboardState.getValue('currentDate');
        const dateStr = formatDate(currentDate);
        
        // Escucha para cambios en confirmaciones
        const confirmationsUnsubscribe = window.firestoreService.listenForDocuments(
            {
                collection: 'confirmations',
                where: [['date', '==', dateStr]],
                select: ['departmentId', 'confirmedEmployees', 'confirmedCount']
            },
            (error, result) => {
                if (error) {
                    console.error('Error en escucha de confirmaciones:', error);
                    return;
                }
                
                // Actualizar estadísticas de confirmaciones
                loadConfirmationStats()
                    .then(() => updateDashboardUI())
                    .catch(err => console.error('Error al actualizar estadísticas:', err));
            }
        );
        
        // Escucha para cambios en empleados
        const employeesUnsubscribe = window.firestoreService.listenForDocuments(
            {
                collection: 'employees',
                where: [['coordinatorId', '==', currentUser.uid]],
                select: ['active']
            },
            (error, result) => {
                if (error) {
                    console.error('Error en escucha de empleados:', error);
                    return;
                }
                
                // Actualizar estadísticas de empleados
                loadEmployeeStats(currentUser.uid)
                    .then(() => updateDashboardUI())
                    .catch(err => console.error('Error al actualizar estadísticas de empleados:', err));
            }
        );
        
        // Guardar funciones para cancelar escuchas
        const unsubscribeListeners = dashboardState.getValue('unsubscribeListeners');
        unsubscribeListeners.push(confirmationsUnsubscribe, employeesUnsubscribe);
        dashboardState.setValue('unsubscribeListeners', unsubscribeListeners);
        
    } catch (error) {
        console.error('Error al configurar escuchas en tiempo real:', error);
    }
}

/**
 * Cancelar escuchas en tiempo real
 */
function cancelRealTimeListeners() {
    const unsubscribeListeners = dashboardState.getValue('unsubscribeListeners');
    
    // Ejecutar todas las funciones de cancelación
    unsubscribeListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    
    // Limpiar lista
    dashboardState.setValue('unsubscribeListeners', []);
}

/**
 * Actualizar la interfaz del dashboard con los datos cargados
 */
function updateDashboardUI() {
    const stats = dashboardState.getValue('stats');
    
    // Actualizar estadísticas de empleados
    updateEmployeeStatsUI(stats.employees);
    
    // Actualizar estadísticas de confirmaciones
    updateConfirmationStatsUI(stats.confirmations);
    
    // Actualizar fecha actual
    updateCurrentDateUI();
}

/**
 * Actualizar UI de estadísticas de empleados
 */
function updateEmployeeStatsUI(employeeStats) {
    // Total de empleados
    const totalEmployeesElement = document.getElementById('total-employees');
    if (totalEmployeesElement) {
        totalEmployeesElement.textContent = employeeStats.total;
    }
    
    // Empleados activos
    const activeEmployeesElement = document.getElementById('active-employees');
    if (activeEmployeesElement) {
        activeEmployeesElement.textContent = employeeStats.active;
    }
    
    // Empleados inactivos
    const inactiveEmployeesElement = document.getElementById('inactive-employees');
    if (inactiveEmployeesElement) {
        inactiveEmployeesElement.textContent = employeeStats.inactive;
    }
    
    // Actualizar gráficos si existen
    updateEmployeeCharts(employeeStats);
}

/**
 * Actualizar UI de estadísticas de confirmaciones
 */
function updateConfirmationStatsUI(confirmationStats) {
    // Total de empleados para confirmar
    const totalConfirmationsElement = document.getElementById('total-confirmations');
    if (totalConfirmationsElement) {
        totalConfirmationsElement.textContent = confirmationStats.total;
    }
    
    // Empleados confirmados
    const confirmedElement = document.getElementById('confirmed-count');
    if (confirmedElement) {
        confirmedElement.textContent = confirmationStats.confirmed;
    }
    
    // Empleados pendientes
    const pendingElement = document.getElementById('pending-count');
    if (pendingElement) {
        pendingElement.textContent = confirmationStats.pending;
    }
    
    // Porcentaje de confirmación
    const percentElement = document.getElementById('confirmation-percent');
    if (percentElement) {
        const percent = confirmationStats.total > 0 
            ? Math.round((confirmationStats.confirmed / confirmationStats.total) * 100) 
            : 0;
        percentElement.textContent = `${percent}%`;
        
        // Actualizar barra de progreso si existe
        const progressBar = document.getElementById('confirmation-progress');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
            
            // Cambiar color según porcentaje
            if (percent < 30) {
                progressBar.className = 'progress-bar bg-danger';
            } else if (percent < 70) {
                progressBar.className = 'progress-bar bg-warning';
            } else {
                progressBar.className = 'progress-bar bg-success';
            }
        }
    }
    
    // Actualizar gráficos si existen
    updateConfirmationCharts(confirmationStats);
}

/**
 * Actualizar gráficos de empleados si existen
 */
function updateEmployeeCharts(employeeStats) {
    // Verificar si existe Chart.js y el elemento canvas
    if (window.Chart && document.getElementById('employee-chart')) {
        // Destruir gráfico anterior si existe
        if (window.employeeChart) {
            window.employeeChart.destroy();
        }
        
        // Crear nuevo gráfico
        const ctx = document.getElementById('employee-chart').getContext('2d');
        window.employeeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Activos', 'Inactivos'],
                datasets: [{
                    data: [employeeStats.active, employeeStats.inactive],
                    backgroundColor: ['#28a745', '#dc3545'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutoutPercentage: 70,
                legend: {
                    position: 'bottom'
                }
            }
        });
    }
}

/**
 * Actualizar gráficos de confirmaciones si existen
 */
function updateConfirmationCharts(confirmationStats) {
    // Verificar si existe Chart.js y el elemento canvas
    if (window.Chart && document.getElementById('confirmation-chart')) {
        // Destruir gráfico anterior si existe
        if (window.confirmationChart) {
            window.confirmationChart.destroy();
        }
        
        // Crear nuevo gráfico
        const ctx = document.getElementById('confirmation-chart').getContext('2d');
        window.confirmationChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Confirmados', 'Pendientes'],
                datasets: [{
                    data: [confirmationStats.confirmed, confirmationStats.pending],
                    backgroundColor: ['#28a745', '#ffc107'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutoutPercentage: 70,
                legend: {
                    position: 'bottom'
                }
            }
        });
    }
}

/**
 * Actualizar fecha actual en la UI
 */
function updateCurrentDateUI() {
    const currentDate = dashboardState.getValue('currentDate');
    const dateElement = document.getElementById('current-date');
    
    if (dateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = currentDate.toLocaleDateString('es-ES', options);
    }
}

/**
 * Configurar eventos de la página
 */
function setupEventListeners() {
    // Botón para cambiar fecha
    const dateSelector = document.getElementById('date-selector');
    if (dateSelector) {
        dateSelector.addEventListener('change', async (e) => {
            const dateStr = e.target.value;
            
            // Validar formato de fecha (DD/MM/YYYY)
            if (!isValidDateString(dateStr)) {
                window.errorService.handleValidationError(
                    'Formato de fecha inválido. Use DD/MM/YYYY',
                    { date: 'Formato inválido' }
                );
                return;
            }
            
            // Convertir a objeto Date
            const [day, month, year] = dateStr.split('/').map(Number);
            dashboardState.setValue('currentDate', new Date(year, month - 1, day));
            
            // Cancelar escuchas anteriores
            cancelRealTimeListeners();
            
            // Recargar datos con la nueva fecha
            await loadConfirmationStats();
            
            // Actualizar UI
            updateDashboardUI();
            
            // Configurar nuevas escuchas
            setupRealTimeListeners();
        });
    }
    
    // Botón para ir a confirmaciones
    const confirmationsBtn = document.getElementById('go-to-confirmations');
    if (confirmationsBtn) {
        confirmationsBtn.addEventListener('click', () => {
            window.location.href = './confirmations.html';
        });
    }
    
    // Evento de descarga de la página
    window.addEventListener('beforeunload', () => {
        // Cancelar escuchas al salir de la página
        cancelRealTimeListeners();
    });
}

/**
 * Formatear fecha para consultas (YYYY-MM-DD)
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Validar formato de fecha (DD/MM/YYYY)
 */
function isValidDateString(dateStr) {
    // Verificar formato básico
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        return false;
    }
    
    // Verificar valores válidos
    const [day, month, year] = dateStr.split('/').map(Number);
    
    if (month < 1 || month > 12) {
        return false;
    }
    
    const maxDays = new Date(year, month, 0).getDate();
    if (day < 1 || day > maxDays) {
        return false;
    }
    
    return true;
}

/**
 * Obtener usuario actual desde localStorage
 */
function getCurrentUser() {
    try {
        const userJson = localStorage.getItem('currentUser');
        if (!userJson) {
            return null;
        }
        
        return JSON.parse(userJson);
    } catch (error) {
        console.error('Error al obtener usuario actual:', error);
        return null;
    }
}

// Estado local para este módulo
const dashboardState = window.StateManager.createModuleState('dashboard', {
    currentUser: null,
    currentDate: new Date(),
    stats: {
        employees: {
            total: 0,
            active: 0,
            inactive: 0
        },
        confirmations: {
            total: 0,
            confirmed: 0,
            pending: 0
        }
    },
    departments: [],
    unsubscribeListeners: [] // Para almacenar funciones de cancelación de escuchas
});

// Constantes
const USER_ROLES = {
    ADMIN: 'admin',
    COORDINATOR: 'coordinator',
    EMPLOYEE: 'employee'
};
