// Confirmaciones de comedor - Módulo para coordinadores
// Permite gestionar las confirmaciones diarias de comedor

// Constantes
const USER_ROLES = {
    ADMIN: 'admin',
    COORDINATOR: 'coordinator',
    EMPLOYEE: 'employee'
};

// Crear un estado local para este módulo usando StateManager
const confirmationsState = window.StateManager.createModuleState('confirmations', {
    currentUser: null,
    currentDepartment: null,
    currentDate: null,
    employeeList: [],
    selectedEmployeeIds: [],
    messageHandler: null,
    unsubscribeListeners: [] // Para almacenar funciones de cancelación de escuchas
});

// Elementos DOM principales
const domElements = {
    dateSelector: document.getElementById('date-selector'),
    employeeList: document.getElementById('employee-list'),
    confirmButton: document.getElementById('confirm-button'),
    loadingIndicator: document.getElementById('loading-indicator')
};

/**
 * Inicializar la página de confirmaciones
 */
async function initConfirmationsPage() {
    try {
        // Inicializar manejador de mensajes
        confirmationsState.setValue('messageHandler', window.commonUtils);
        
        window.errorService.toggleLoading(true);
        
        // Cargar servicios y utilidades
        await loadDependencies();
        
        // Obtener datos del usuario actual usando la función centralizada
        confirmationsState.setValue('currentUser', getCurrentUser());
        
        // Verificar si hay un usuario en sesión
        const currentUser = confirmationsState.getValue('currentUser');
        if (!currentUser || !currentUser.uid) {
            throw new Error('No hay usuario en sesión');
        }
        
        // Verificar si el usuario tiene rol de coordinador
        if (currentUser.role !== 'coordinator') {
            throw new Error('Acceso no autorizado: se requiere rol de coordinador');
        }
        
        // Obtener departamento del usuario
        await loadUserDepartment();
        
        // Configurar selector de fecha
        setupDateSelector();
        
        // Cargar datos iniciales
        await loadData();
        
        // Configurar eventos
        setupEventListeners();
        
        // Configurar escuchas en tiempo real para actualizaciones
        setupRealTimeListeners();
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al inicializar la página de confirmaciones',
            ERROR_TYPES.UNKNOWN,
            ERROR_SEVERITY.ERROR
        );
    } finally {
        window.errorService.toggleLoading(false);
    }
}

/**
 * Cargar dependencias necesarias
 */
async function loadDependencies() {
    // Verificar que el servicio de Firebase esté disponible
    if (!window.firestoreService) {
        throw new Error('Servicio de Firestore no disponible');
    }
}

/**
 * Obtener el departamento del usuario actual
 */
async function loadUserDepartment() {
    try {
        const currentUser = confirmationsState.getValue('currentUser');
        
        // Obtener departamento del usuario desde Firestore con caché
        const userDoc = await window.firestoreService.getDocument(
            'users', 
            currentUser.uid, 
            { 
                useCache: true, 
                cacheExpiration: 30, // 30 minutos
                select: ['departmentId', 'role'] // Solo obtener campos necesarios
            }
        );
        
        if (!userDoc || !userDoc.departmentId) {
            throw new Error('No se pudo determinar el departamento del usuario');
        }
        
        confirmationsState.setValue('currentDepartment', userDoc.departmentId);
        
        // Obtener nombre del departamento para mostrar con caché
        const deptDoc = await window.firestoreService.getDocument(
            'departments', 
            confirmationsState.getValue('currentDepartment'),
            {
                useCache: true,
                cacheExpiration: 60, // 1 hora
                select: ['name'] // Solo obtener el nombre
            }
        );
        
        if (deptDoc && deptDoc.name) {
            const deptNameElement = document.getElementById('department-name');
            if (deptNameElement) {
                deptNameElement.textContent = deptDoc.name;
            }
        }
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al cargar información del departamento',
            ERROR_TYPES.DATABASE,
            ERROR_SEVERITY.ERROR
        );
        throw error;
    }
}

/**
 * Configurar el selector de fecha
 */
function setupDateSelector() {
    if (!domElements.dateSelector) return;
    
    // Establecer fecha actual como valor predeterminado
    confirmationsState.setValue('currentDate', new Date());
    
    // Formatear fecha para mostrar (usando la función centralizada)
    const messageHandler = confirmationsState.getValue('messageHandler');
    const dateStr = messageHandler.DateUtils.formatDateDisplay(confirmationsState.getValue('currentDate'));
    
    domElements.dateSelector.value = dateStr;
    
    // Evento de cambio de fecha
    domElements.dateSelector.addEventListener('change', async (e) => {
        const dateStr = e.target.value;
        
        // Validar formato de fecha (DD/MM/YYYY)
        if (!messageHandler.DateUtils.isValidDateString(dateStr)) {
            window.errorService.handleValidationError(
                'Formato de fecha inválido. Use DD/MM/YYYY',
                { date: 'Formato inválido' }
            );
            return;
        }
        
        // Convertir a objeto Date
        const [day, month, year] = dateStr.split('/').map(Number);
        confirmationsState.setValue('currentDate', new Date(year, month - 1, day));
        
        // Cancelar escuchas anteriores
        cancelRealTimeListeners();
        
        // Recargar datos con la nueva fecha
        await loadData();
        
        // Configurar nuevas escuchas
        setupRealTimeListeners();
    });
}

/**
 * Cargar datos de empleados y confirmaciones
 */
async function loadData() {
    try {
        window.errorService.toggleLoading(true);
        
        // Formatear fecha para consulta (YYYY-MM-DD)
        const messageHandler = confirmationsState.getValue('messageHandler');
        const dateStr = messageHandler.DateUtils.formatDate(confirmationsState.getValue('currentDate'));
        
        // Cargar lista de empleados del departamento
        await loadEmployees();
        
        // Cargar confirmaciones existentes para la fecha seleccionada
        await loadConfirmations(dateStr);
        
        // Renderizar lista de empleados con estado de confirmación
        renderEmployeeList();
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al cargar datos. Por favor, intente de nuevo.',
            ERROR_TYPES.DATABASE,
            ERROR_SEVERITY.ERROR
        );
    } finally {
        window.errorService.toggleLoading(false);
    }
}

/**
 * Cargar lista de empleados del departamento
 */
async function loadEmployees() {
    try {
        // Consultar empleados del departamento actual con paginación y caché
        const query = {
            collection: 'employees',
            where: [['departmentId', '==', confirmationsState.getValue('currentDepartment')], ['active', '==', true]],
            orderBy: 'name',
            orderDirection: 'asc',
            limit: 100, // Limitar a 100 empleados por página
            select: ['name', 'position', 'active', 'departmentId'], // Solo campos necesarios
            useCache: true,
            cacheExpiration: 15 // 15 minutos
        };
        
        const employeesResult = await window.firestoreService.getDocuments(query);
        
        if (!employeesResult || !employeesResult.data || !Array.isArray(employeesResult.data)) {
            throw new Error('Error al obtener lista de empleados');
        }
        
        confirmationsState.setValue('employeeList', employeesResult.data);
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al cargar empleados',
            ERROR_TYPES.DATABASE,
            ERROR_SEVERITY.ERROR
        );
        throw error;
    }
}

/**
 * Cargar confirmaciones existentes para la fecha seleccionada
 */
async function loadConfirmations(dateStr) {
    try {
        const messageHandler = confirmationsState.getValue('messageHandler');
        
        // Validar formato de fecha
        if (!messageHandler.DateUtils.isValidDateString(dateStr)) {
            throw new Error('Formato de fecha inválido');
        }
        
        // Consultar confirmaciones para la fecha y departamento
        const query = {
            collection: 'confirmations',
            where: [
                ['date', '==', dateStr],
                ['departmentId', '==', confirmationsState.getValue('currentDepartment')]
            ],
            select: ['employeeId', 'status', 'date'], // Solo campos necesarios
            useCache: true,
            cacheExpiration: 5 // 5 minutos
        };
        
        const confirmationsResult = await window.firestoreService.getDocuments(query);
        
        if (!confirmationsResult || !confirmationsResult.data || !Array.isArray(confirmationsResult.data)) {
            // Si no hay confirmaciones, dejar la lista vacía
            confirmationsState.setValue('selectedEmployeeIds', []);
            return;
        }
        
        // Extraer IDs de empleados confirmados
        const confirmedIds = confirmationsResult.data
            .filter(conf => conf.status === 'confirmed')
            .map(conf => conf.employeeId);
            
        confirmationsState.setValue('selectedEmployeeIds', confirmedIds);
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al cargar confirmaciones',
            ERROR_TYPES.DATABASE,
            ERROR_SEVERITY.ERROR
        );
        throw error;
    }
}

/**
 * Configurar escuchas en tiempo real para actualizaciones
 */
function setupRealTimeListeners() {
    try {
        const messageHandler = confirmationsState.getValue('messageHandler');
        const dateStr = messageHandler.DateUtils.formatDate(confirmationsState.getValue('currentDate'));
        
        // Escucha para confirmaciones en tiempo real
        const confirmationsUnsubscribe = window.firestoreService.listenForDocuments(
            {
                collection: 'confirmations',
                where: [
                    ['date', '==', dateStr],
                    ['departmentId', '==', confirmationsState.getValue('currentDepartment')]
                ],
                select: ['employeeId', 'status', 'date']
            },
            (error, result) => {
                if (error) {
                    console.error('Error en escucha de confirmaciones:', error);
                    return;
                }
                
                if (result && result.data) {
                    // Actualizar IDs de empleados confirmados
                    const confirmedIds = result.data
                        .filter(conf => conf.status === 'confirmed')
                        .map(conf => conf.employeeId);
                        
                    confirmationsState.setValue('selectedEmployeeIds', confirmedIds);
                    
                    // Actualizar UI
                    renderEmployeeList();
                }
            }
        );
        
        // Guardar función para cancelar escucha
        const unsubscribeListeners = confirmationsState.getValue('unsubscribeListeners');
        unsubscribeListeners.push(confirmationsUnsubscribe);
        confirmationsState.setValue('unsubscribeListeners', unsubscribeListeners);
        
    } catch (error) {
        console.error('Error al configurar escuchas en tiempo real:', error);
    }
}

/**
 * Cancelar escuchas en tiempo real
 */
function cancelRealTimeListeners() {
    const unsubscribeListeners = confirmationsState.getValue('unsubscribeListeners');
    
    // Ejecutar todas las funciones de cancelación
    unsubscribeListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    
    // Limpiar lista
    confirmationsState.setValue('unsubscribeListeners', []);
}

/**
 * Renderizar lista de empleados con estado de confirmación
 */
function renderEmployeeList() {
    if (!domElements.employeeList) return;
    
    const employeeList = confirmationsState.getValue('employeeList');
    const selectedEmployeeIds = confirmationsState.getValue('selectedEmployeeIds');
    const messageHandler = confirmationsState.getValue('messageHandler');
    
    // Limpiar lista actual
    messageHandler.DOMUtils.clearElement(domElements.employeeList);
    
    // Si no hay empleados, mostrar mensaje
    if (!employeeList.length) {
        domElements.employeeList.innerHTML = '<p class="text-center">No hay empleados registrados en este departamento</p>';
        return;
    }
    
    // Crear elementos para cada empleado
    employeeList.forEach(employee => {
        const isSelected = selectedEmployeeIds.includes(employee.id);
        
        // Crear elemento de lista
        const item = document.createElement('div');
        item.className = `employee-item ${isSelected ? 'selected' : ''}`;
        item.dataset.id = employee.id;
        
        // Contenido del elemento
        item.innerHTML = `
            <div class="employee-info">
                <span class="employee-name">${employee.name || 'Sin nombre'}</span>
                <span class="employee-position">${employee.position || 'Sin cargo'}</span>
            </div>
            <div class="employee-status">
                <i class="status-icon ${isSelected ? 'fas fa-check-circle' : 'far fa-circle'}"></i>
            </div>
        `;
        
        // Evento de clic para seleccionar/deseleccionar
        item.addEventListener('click', () => {
            toggleEmployeeSelection(employee.id);
        });
        
        // Agregar a la lista
        domElements.employeeList.appendChild(item);
    });
    
    // Actualizar contador
    updateSelectedCount();
}

/**
 * Alternar selección de un empleado
 */
function toggleEmployeeSelection(employeeId) {
    const selectedEmployeeIds = confirmationsState.getValue('selectedEmployeeIds');
    const index = selectedEmployeeIds.indexOf(employeeId);
    
    if (index === -1) {
        // Agregar a seleccionados
        selectedEmployeeIds.push(employeeId);
    } else {
        // Quitar de seleccionados
        selectedEmployeeIds.splice(index, 1);
    }
    
    confirmationsState.setValue('selectedEmployeeIds', selectedEmployeeIds);
    
    // Actualizar UI
    renderEmployeeList();
}

/**
 * Actualizar contador de empleados seleccionados
 */
function updateSelectedCount() {
    const selectedCount = confirmationsState.getValue('selectedEmployeeIds').length;
    const totalCount = confirmationsState.getValue('employeeList').length;
    
    const countElement = document.getElementById('selected-count');
    if (countElement) {
        countElement.textContent = `${selectedCount} de ${totalCount}`;
    }
}

/**
 * Configurar eventos de la página
 */
function setupEventListeners() {
    // Botón de confirmar
    if (domElements.confirmButton) {
        domElements.confirmButton.addEventListener('click', saveConfirmations);
    }
    
    // Botón de seleccionar todos
    const selectAllBtn = document.getElementById('select-all-btn');
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', selectAllEmployees);
    }
    
    // Botón de deseleccionar todos
    const deselectAllBtn = document.getElementById('deselect-all-btn');
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', deselectAllEmployees);
    }
    
    // Evento de descarga de la página
    window.addEventListener('beforeunload', () => {
        // Cancelar escuchas al salir de la página
        cancelRealTimeListeners();
    });
}

/**
 * Seleccionar todos los empleados
 */
function selectAllEmployees() {
    const employeeList = confirmationsState.getValue('employeeList');
    const allIds = employeeList.map(emp => emp.id);
    
    confirmationsState.setValue('selectedEmployeeIds', allIds);
    
    // Actualizar UI
    renderEmployeeList();
}

/**
 * Deseleccionar todos los empleados
 */
function deselectAllEmployees() {
    confirmationsState.setValue('selectedEmployeeIds', []);
    
    // Actualizar UI
    renderEmployeeList();
}

/**
 * Guardar confirmaciones
 */
async function saveConfirmations() {
    try {
        window.errorService.toggleLoading(true);
        
        const currentUser = confirmationsState.getValue('currentUser');
        const departmentId = confirmationsState.getValue('currentDepartment');
        const selectedEmployeeIds = confirmationsState.getValue('selectedEmployeeIds');
        const messageHandler = confirmationsState.getValue('messageHandler');
        
        // Formatear fecha para guardar (YYYY-MM-DD)
        const dateStr = messageHandler.DateUtils.formatDate(confirmationsState.getValue('currentDate'));
        
        // Validaciones
        if (!currentUser || !currentUser.uid) {
            throw new Error('No se pudo determinar el usuario actual');
        }
        
        if (!departmentId) {
            throw new Error('No se pudo determinar el departamento');
        }
        
        // Usar transacción para garantizar integridad
        await window.firestoreService.runTransaction(async (transaction) => {
            // Generar ID único para la confirmación (departamento_fecha)
            const confirmationId = `${departmentId}_${dateStr}`;
            
            // Datos a guardar
            const confirmationData = {
                date: dateStr,
                departmentId: departmentId,
                coordinatorId: currentUser.uid,
                confirmedEmployees: selectedEmployeeIds,
                confirmedCount: selectedEmployeeIds.length,
                status: 'confirmed',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Guardar confirmación principal
            transaction.set('confirmations', confirmationId, confirmationData, true);
            
            // Guardar registros individuales para cada empleado
            selectedEmployeeIds.forEach(employeeId => {
                const employeeConfirmationId = `${employeeId}_${dateStr}`;
                transaction.set('employee_confirmations', employeeConfirmationId, {
                    employeeId: employeeId,
                    date: dateStr,
                    departmentId: departmentId,
                    status: 'confirmed',
                    confirmedBy: currentUser.uid,
                    confirmedAt: new Date().toISOString()
                }, true);
            });
            
            return true;
        });
        
        // Mostrar mensaje de éxito
        showSuccessMessage(selectedEmployeeIds.length);
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al guardar confirmaciones',
            ERROR_TYPES.DATABASE,
            ERROR_SEVERITY.ERROR
        );
    } finally {
        window.errorService.toggleLoading(false);
    }
}

/**
 * Mostrar mensaje de éxito
 */
function showSuccessMessage(confirmedCount) {
    // Actualizar contador en modal
    const modalCountElement = document.getElementById('modal-confirmed-count');
    if (modalCountElement) {
        modalCountElement.textContent = confirmedCount;
    }
    
    // Mostrar modal de éxito
    const successModal = document.getElementById('success-modal');
    if (successModal) {
        successModal.style.display = 'flex';
        
        // Configurar botones del modal
        const closeButtons = successModal.querySelectorAll('.close-modal');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                successModal.style.display = 'none';
            });
        });
        
        // Botón para ir al dashboard
        const dashboardBtn = document.getElementById('view-dashboard-btn');
        if (dashboardBtn) {
            dashboardBtn.addEventListener('click', () => {
                window.location.href = './dashboard.html';
            });
        }
    } else {
        // Si no hay modal, mostrar alerta
        window.errorService.showSuccessMessage('Confirmaciones guardadas exitosamente');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initConfirmationsPage);