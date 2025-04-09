// Confirmaciones de comedor - Módulo para coordinadores
// Permite gestionar las confirmaciones diarias de comedor

// Constantes
const USER_ROLES = {
    ADMIN: 'admin',
    COORDINATOR: 'coordinator',
    EMPLOYEE: 'employee'
};

// Variables globales
let currentUser = null;
let currentDepartment = null;
let currentDate = null;
let employeeList = [];
let selectedEmployeeIds = [];
let messageHandler = null;

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
        messageHandler = window.commonUtils;
        
        messageHandler.toggleLoading(true);
        
        // Cargar servicios y utilidades
        await loadDependencies();
        
        // Obtener datos del usuario actual usando la función centralizada
        currentUser = getCurrentUser();
        
        // Verificar si hay un usuario en sesión
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
        
    } catch (error) {
        console.error('Error al inicializar la página de confirmaciones:', error);
        messageHandler.showError('Error al cargar la página. Por favor, intente recargar.');
    } finally {
        messageHandler.toggleLoading(false);
    }
}

/**
 * Cargar dependencias necesarias
 */
async function loadDependencies() {
    // Verificar que el servicio de Firebase esté disponible
    if (!window.firebaseService) {
        throw new Error('Servicio de Firebase no disponible');
    }
}

/**
 * Obtener el departamento del usuario actual
 */
async function loadUserDepartment() {
    try {
        // Obtener departamento del usuario desde Firestore
        const userDoc = await window.firebaseService.getDocument('users', currentUser.uid);
        
        if (!userDoc || !userDoc.departmentId) {
            throw new Error('No se pudo determinar el departamento del usuario');
        }
        
        currentDepartment = userDoc.departmentId;
        
        // Obtener nombre del departamento para mostrar
        const deptDoc = await window.firebaseService.getDocument('departments', currentDepartment);
        if (deptDoc && deptDoc.name) {
            const deptNameElement = document.getElementById('department-name');
            if (deptNameElement) {
                deptNameElement.textContent = deptDoc.name;
            }
        }
        
    } catch (error) {
        console.error('Error al cargar departamento:', error);
        messageHandler.showError('Error al cargar información del departamento');
        throw error;
    }
}

/**
 * Configurar el selector de fecha
 */
function setupDateSelector() {
    if (!domElements.dateSelector) return;
    
    // Establecer fecha actual como valor predeterminado
    currentDate = new Date();
    
    // Formatear fecha para mostrar (usando la función centralizada)
    const dateStr = messageHandler.DateUtils.formatDateDisplay(currentDate);
    
    domElements.dateSelector.value = dateStr;
    
    // Evento de cambio de fecha
    domElements.dateSelector.addEventListener('change', async (e) => {
        const dateStr = e.target.value;
        
        // Validar formato de fecha (DD/MM/YYYY)
        if (!messageHandler.DateUtils.isValidDateString(dateStr)) {
            messageHandler.showError('Formato de fecha inválido. Use DD/MM/YYYY');
            return;
        }
        
        // Convertir a objeto Date
        const [day, month, year] = dateStr.split('/').map(Number);
        currentDate = new Date(year, month - 1, day);
        
        // Recargar datos con la nueva fecha
        await loadData();
    });
}

/**
 * Cargar datos de empleados y confirmaciones
 */
async function loadData() {
    try {
        messageHandler.toggleLoading(true);
        
        // Formatear fecha para consulta (YYYY-MM-DD)
        const dateStr = messageHandler.DateUtils.formatDate(currentDate);
        
        // Cargar lista de empleados del departamento
        await loadEmployees();
        
        // Cargar confirmaciones existentes para la fecha seleccionada
        await loadConfirmations(dateStr);
        
        // Renderizar lista de empleados con estado de confirmación
        renderEmployeeList();
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
        messageHandler.showError('Error al cargar datos. Por favor, intente de nuevo.');
    } finally {
        messageHandler.toggleLoading(false);
    }
}

/**
 * Cargar lista de empleados del departamento
 */
async function loadEmployees() {
    try {
        // Consultar empleados del departamento actual
        const query = {
            collection: 'employees',
            where: [['departmentId', '==', currentDepartment], ['active', '==', true]]
        };
        
        const employees = await window.firebaseService.getDocuments(query);
        
        if (!employees || !Array.isArray(employees)) {
            throw new Error('Error al obtener lista de empleados');
        }
        
        // Ordenar por nombre
        employeeList = employees.sort((a, b) => {
            return (a.name || '').localeCompare(b.name || '');
        });
        
    } catch (error) {
        console.error('Error al cargar empleados:', error);
        throw error;
    }
}

/**
 * Cargar confirmaciones existentes para la fecha seleccionada
 */
async function loadConfirmations(dateStr) {
    try {
        // Validar formato de fecha
        if (!messageHandler.DateUtils.isValidDateString(dateStr)) {
            throw new Error('Formato de fecha inválido');
        }
        
        // Consultar confirmaciones para la fecha y departamento
        const query = {
            collection: 'confirmations',
            where: [
                ['date', '==', dateStr],
                ['departmentId', '==', currentDepartment]
            ]
        };
        
        const confirmations = await window.firebaseService.getDocuments(query);
        
        if (!confirmations || !Array.isArray(confirmations)) {
            // Si no hay confirmaciones, dejar la lista vacía
            selectedEmployeeIds = [];
            return;
        }
        
        // Extraer IDs de empleados confirmados
        selectedEmployeeIds = confirmations
            .filter(conf => conf.status === 'confirmed')
            .map(conf => conf.employeeId);
        
    } catch (error) {
        console.error('Error al cargar confirmaciones:', error);
        throw error;
    }
}

/**
 * Renderizar lista de empleados con estado de confirmación
 */
function renderEmployeeList() {
    if (!domElements.employeeList) return;
    
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
                <span class="status-indicator ${isSelected ? 'confirmed' : ''}">
                    ${isSelected ? 'Confirmado' : 'No confirmado'}
                </span>
            </div>
        `;
        
        // Evento de clic para seleccionar/deseleccionar
        item.addEventListener('click', () => {
            toggleEmployeeSelection(employee.id, item);
        });
        
        domElements.employeeList.appendChild(item);
    });
    
    // Actualizar contador
    updateCounter();
}

/**
 * Alternar selección de un empleado
 */
function toggleEmployeeSelection(employeeId, element) {
    const index = selectedEmployeeIds.indexOf(employeeId);
    
    if (index === -1) {
        // Agregar a seleccionados
        selectedEmployeeIds.push(employeeId);
        element.classList.add('selected');
        element.querySelector('.status-indicator').textContent = 'Confirmado';
        element.querySelector('.status-indicator').classList.add('confirmed');
    } else {
        // Quitar de seleccionados
        selectedEmployeeIds.splice(index, 1);
        element.classList.remove('selected');
        element.querySelector('.status-indicator').textContent = 'No confirmado';
        element.querySelector('.status-indicator').classList.remove('confirmed');
    }
    
    // Actualizar contador
    updateCounter();
}

/**
 * Actualizar contador de empleados seleccionados
 */
function updateCounter() {
    const counterElement = document.getElementById('selected-counter');
    if (!counterElement) return;
    
    const total = employeeList.length;
    const selected = selectedEmployeeIds.length;
    
    counterElement.textContent = `${selected} de ${total} empleados seleccionados`;
}

/**
 * Configurar eventos de la página
 */
function setupEventListeners() {
    // Botón de guardar confirmaciones
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
}

/**
 * Seleccionar todos los empleados
 */
function selectAllEmployees() {
    selectedEmployeeIds = employeeList.map(emp => emp.id);
    renderEmployeeList();
}

/**
 * Deseleccionar todos los empleados
 */
function deselectAllEmployees() {
    selectedEmployeeIds = [];
    renderEmployeeList();
}

/**
 * Guardar confirmaciones de empleados
 */
async function saveConfirmations() {
    try {
        messageHandler.toggleLoading(true);
        
        // Formatear fecha para almacenamiento (YYYY-MM-DD)
        const dateStr = messageHandler.DateUtils.formatDate(currentDate);
        
        // Crear batch para operaciones múltiples
        const batch = window.firebaseService.createBatch();
        
        // Procesar cada empleado
        for (const employee of employeeList) {
            const isConfirmed = selectedEmployeeIds.includes(employee.id);
            
            // ID del documento de confirmación
            const confirmationId = `${dateStr}_${employee.id}`;
            
            // Datos de la confirmación
            const confirmationData = {
                employeeId: employee.id,
                departmentId: currentDepartment,
                date: dateStr,
                status: isConfirmed ? 'confirmed' : 'rejected',
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.uid
            };
            
            // Agregar operación al batch
            batch.set('confirmations', confirmationId, confirmationData);
        }
        
        // Ejecutar batch
        await batch.commit();
        
        messageHandler.showSuccess('Confirmaciones guardadas correctamente');
        
    } catch (error) {
        console.error('Error al guardar confirmaciones:', error);
        messageHandler.showError('Error al guardar confirmaciones. Por favor, intente de nuevo.');
    } finally {
        messageHandler.toggleLoading(false);
    }
}

// Inicialización de la página
document.addEventListener('DOMContentLoaded', async () => {
    // Proteger esta ruta para el rol de coordinador
    await protectRoute(USER_ROLES.COORDINATOR);
    
    // Inicializar la página si la autenticación es válida
    initConfirmationsPage();
});