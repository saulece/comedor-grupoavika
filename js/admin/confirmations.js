// Admin Confirmations Management for Comedor Grupo Avika

// Importar utilidades comunes si están disponibles
const commonUtils = window.commonUtils || {};
const firebaseService = window.firebaseService;
const DateUtils = commonUtils.DateUtils || {};

// Variables globales
let confirmationsData = [];
let departmentsData = [];
let currentDate = new Date();

// Inicializar el manejador de mensajes UI
const messageHandler = window.uiMessageHandler || {
    showError: showErrorMessage,
    showSuccess: showSuccessMessage,
    showInfo: showInfoMessage,
    toggleLoading: showLoadingState
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Inicializando módulo de confirmaciones de administrador...");
    
    // Proteger esta ruta para el rol de administrador usando la nueva función centralizada
    await protectRoute(USER_ROLES.ADMIN);
    
    // Continuar con la inicialización solo si la autenticación es válida
    initConfirmationsPage();
});

/**
 * Inicializar la página de confirmaciones
 */
async function initConfirmationsPage() {
    try {
        // Verificar que el servicio de Firebase esté disponible
        if (!firebaseService) {
            throw new Error('Servicio de Firebase no disponible');
        }
        
        // Configurar elementos de la interfaz
        setupUI();
        
        // Cargar datos iniciales
        await loadInitialData();
        
        // Configurar eventos
        setupEventListeners();
        
        console.log("Módulo de confirmaciones inicializado correctamente");
    } catch (error) {
        handleError(error, 'Error al inicializar el módulo de confirmaciones');
    }
}

/**
 * Configurar elementos de la interfaz
 */
function setupUI() {
    // Mostrar nombre del usuario
    const userNameElement = document.getElementById('user-name');
    const currentUser = getCurrentUserFromSession();
    
    if (userNameElement && currentUser) {
        userNameElement.textContent = currentUser.displayName || currentUser.name || 'Administrador';
    }
    
    // Inicializar selector de fecha
    const datePicker = document.getElementById('date-picker');
    if (datePicker) {
        // Establecer fecha actual
        const today = new Date();
        datePicker.value = formatDate(today);
        
        // Cargar confirmaciones para la fecha actual
        loadConfirmationsForDate(datePicker.value);
    }
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Event listener para el selector de fecha
    const datePicker = document.getElementById('date-picker');
    if (datePicker) {
        datePicker.addEventListener('change', (e) => {
            loadConfirmationsForDate(e.target.value);
        });
    }
    
    // Event listener para el botón de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Event listener para el botón de refresh
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const datePicker = document.getElementById('date-picker');
            if (datePicker) {
                loadConfirmationsForDate(datePicker.value);
            }
        });
    }
}

/**
 * Cargar datos iniciales necesarios
 */
async function loadInitialData() {
    messageHandler.toggleLoading(true);
    
    try {
        // Cargar departamentos
        await loadDepartments();
        
        // Cargar confirmaciones para la fecha actual
        const datePicker = document.getElementById('date-picker');
        if (datePicker && datePicker.value) {
            await loadConfirmationsForDate(datePicker.value);
        }
    } catch (error) {
        handleError(error, 'Error al cargar datos iniciales');
    } finally {
        messageHandler.toggleLoading(false);
    }
}

/**
 * Cargar departamentos desde Firestore
 */
async function loadDepartments() {
    try {
        console.log('Cargando departamentos...');
        
        if (!firebaseService) {
            throw new Error('Servicio de Firebase no disponible');
        }
        
        // Usar el servicio centralizado
        const departmentsCollection = firebaseService.getCollection('departments');
        const departmentsSnapshot = await departmentsCollection.get();
        
        // Procesar resultados
        departmentsData = [];
        departmentsSnapshot.forEach(doc => {
            departmentsData.push({
                id: doc.id,
                name: doc.data().name,
                active: doc.data().active !== false
            });
        });
        
        console.log(`${departmentsData.length} departamentos cargados`);
        
        // Ordenar departamentos por nombre
        departmentsData.sort((a, b) => a.name.localeCompare(b.name));
        
        return departmentsData;
    } catch (error) {
        handleError(error, 'Error al cargar departamentos');
        return [];
    }
}

/**
 * Cargar confirmaciones para una fecha específica
 * @param {string} dateString - Fecha en formato YYYY-MM-DD
 */
async function loadConfirmationsForDate(dateString) {
    if (!dateString || !isValidDateString(dateString)) {
        messageHandler.showError('Formato de fecha inválido. Use YYYY-MM-DD.');
        return;
    }
    
    console.log(`Cargando confirmaciones para: ${dateString}`);
    messageHandler.toggleLoading(true);
    
    try {
        if (!firebaseService) {
            throw new Error('Servicio de Firebase no disponible');
        }
        
        // Usar el servicio centralizado
        const confirmationsSnapshot = await firebaseService.getConfirmationsByDate(dateString);
        
        // Procesar resultados
        confirmationsData = [];
        confirmationsSnapshot.forEach(doc => {
            const data = doc.data();
            confirmationsData.push({
                id: doc.id,
                date: data.date,
                departmentId: data.departmentId,
                departmentName: data.departmentName,
                coordinatorId: data.coordinatorId,
                coordinatorName: data.coordinatorName,
                employeeCount: data.employeeCount || 0,
                employees: data.employees || [],
                comments: data.comments || '',
                createdAt: data.createdAt,
                updatedAt: data.updatedAt
            });
        });
        
        console.log(`${confirmationsData.length} confirmaciones cargadas`);
        
        // Mostrar confirmaciones en la interfaz
        displayConfirmations(confirmationsData);
        
        return confirmationsData;
    } catch (error) {
        handleError(error, 'Error al cargar confirmaciones');
        return [];
    } finally {
        messageHandler.toggleLoading(false);
    }
}

/**
 * Mostrar confirmaciones en la interfaz
 * @param {Array} confirmations - Array de confirmaciones
 */
function displayConfirmations(confirmations) {
    const tableBody = document.getElementById('confirmations-table-body');
    if (!tableBody) {
        console.error('No se encontró el contenedor de la tabla de confirmaciones');
        return;
    }
    
    // Limpiar tabla
    tableBody.innerHTML = '';
    
    // Actualizar contador
    updateConfirmationCount(confirmations.length);
    
    if (confirmations.length === 0) {
        // Mostrar mensaje si no hay confirmaciones
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="5" class="text-center">No hay confirmaciones para esta fecha</td>
        `;
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // Ordenar confirmaciones por nombre de departamento
    confirmations.sort((a, b) => {
        return a.departmentName.localeCompare(b.departmentName);
    });
    
    // Añadir cada confirmación a la tabla
    confirmations.forEach(confirmation => {
        const row = document.createElement('tr');
        
        // Formatear fecha
        const formattedDate = formatDateDisplay(new Date(confirmation.date));
        
        row.innerHTML = `
            <td>${confirmation.departmentName || 'N/A'}</td>
            <td>${confirmation.coordinatorName || 'N/A'}</td>
            <td>${confirmation.employeeCount || 0}</td>
            <td>${formattedDate}</td>
            <td>
                <button class="btn btn-sm btn-primary view-details" data-id="${confirmation.id}">
                    <i class="fas fa-eye"></i> Ver Detalles
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Añadir event listener para el botón de detalles
        const detailsButton = row.querySelector('.view-details');
        if (detailsButton) {
            detailsButton.addEventListener('click', () => {
                showConfirmationDetails(confirmation);
            });
        }
    });
}

/**
 * Actualizar contador de confirmaciones
 * @param {number} count - Número de confirmaciones
 */
function updateConfirmationCount(count) {
    const countElement = document.getElementById('confirmation-count');
    if (countElement) {
        countElement.textContent = count.toString();
    }
}

/**
 * Mostrar detalles de una confirmación
 * @param {Object} confirmation - Datos de la confirmación
 */
function showConfirmationDetails(confirmation) {
    console.log('Mostrando detalles de confirmación:', confirmation);
    
    // Crear modal para mostrar detalles
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'confirmationDetailsModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'confirmationDetailsModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    // Formatear fecha
    const formattedDate = formatDateDisplay(new Date(confirmation.date));
    
    // Crear contenido del modal
    modal.innerHTML = `
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="confirmationDetailsModalLabel">
                        Detalles de Confirmación - ${confirmation.departmentName}
                    </h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Departamento:</strong> ${confirmation.departmentName}</p>
                            <p><strong>Coordinador:</strong> ${confirmation.coordinatorName}</p>
                            <p><strong>Fecha:</strong> ${formattedDate}</p>
                            <p><strong>Total Empleados:</strong> ${confirmation.employeeCount}</p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Comentarios:</strong></p>
                            <p class="border p-2">${confirmation.comments || 'Sin comentarios'}</p>
                        </div>
                    </div>
                    
                    <h6 class="mt-4">Empleados Confirmados (${confirmation.employees.length})</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>Cargo</th>
                                    <th>Email</th>
                                </tr>
                            </thead>
                            <tbody id="employees-list">
                                ${confirmation.employees.map(emp => `
                                    <tr>
                                        <td>${emp.name || 'N/A'}</td>
                                        <td>${emp.position || 'N/A'}</td>
                                        <td>${emp.email || 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    
    // Añadir modal al body
    document.body.appendChild(modal);
    
    // Mostrar modal
    $(modal).modal('show');
    
    // Eliminar modal del DOM cuando se cierre
    $(modal).on('hidden.bs.modal', function() {
        document.body.removeChild(modal);
    });
}

/**
 * Obtener instancia de Firestore de manera segura
 * @returns {FirebaseFirestore.Firestore} Instancia de Firestore
 */
function getFirestore() {
    // Usar el servicio centralizado si está disponible
    if (firebaseService) {
        return firebaseService.getFirestore();
    }
    
    console.error('No se pudo obtener la instancia de Firestore: Servicio de Firebase no disponible');
    return null;
}

/**
 * Obtener usuario actual de la sesión
 * @returns {Object|null} Objeto de usuario o null si no hay sesión
 * @deprecated Use getCurrentUser() instead
 */
function getCurrentUserFromSession() {
    // Usar la función centralizada
    return getCurrentUser();
}

/**
 * Formatear fecha como YYYY-MM-DD
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatDate(date) {
    if (DateUtils.formatDate) {
        return DateUtils.formatDate(date);
    }
    
    if (!date || !(date instanceof Date)) {
        return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Formatear fecha como DD/MM/YYYY
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatDateDisplay(date) {
    if (DateUtils.formatDateDisplay) {
        return DateUtils.formatDateDisplay(date);
    }
    
    if (!date || !(date instanceof Date)) {
        return '';
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${day}/${month}/${year}`;
}

/**
 * Verificar si una cadena es una fecha válida en formato YYYY-MM-DD
 * @param {string} dateString - Cadena de fecha a validar
 * @returns {boolean} Si la cadena es una fecha válida
 */
function isValidDateString(dateString) {
    if (DateUtils.isValidDateString) {
        return DateUtils.isValidDateString(dateString);
    }
    
    if (!dateString || typeof dateString !== 'string') {
        return false;
    }
    
    // Verificar formato (YYYY-MM-DD)
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
        return false;
    }
    
    // Verificar si es una fecha válida
    const parts = dateString.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Mes es 0-indexado en JS Date
    const day = parseInt(parts[2], 10);
    
    const date = new Date(year, month, day);
    
    return date.getFullYear() === year &&
           date.getMonth() === month &&
           date.getDate() === day;
}

/**
 * Manejar errores de manera consistente
 * @param {Error} error - Objeto de error
 * @param {string} defaultMessage - Mensaje de error por defecto
 */
function handleError(error, defaultMessage = 'Se produjo un error') {
    console.error(defaultMessage, error);
    
    // Usar commonUtils.handleError si está disponible
    if (commonUtils.handleError) {
        commonUtils.handleError(error, defaultMessage);
        return;
    }
    
    // Mostrar mensaje de error
    const errorMessage = error.message ? `${defaultMessage}: ${error.message}` : defaultMessage;
    messageHandler.showError(errorMessage);
}

/**
 * Mostrar mensaje de error
 * @param {string} message - Mensaje de error
 */
function showErrorMessage(message) {
    console.error(message);
    
    const errorAlert = document.getElementById('error-alert');
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

/**
 * Mostrar mensaje de éxito
 * @param {string} message - Mensaje de éxito
 */
function showSuccessMessage(message) {
    console.log(message);
    
    const successAlert = document.getElementById('success-alert');
    if (successAlert) {
        successAlert.textContent = message;
        successAlert.style.display = 'block';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            successAlert.style.display = 'none';
        }, 3000);
    }
}

/**
 * Mostrar mensaje informativo
 * @param {string} message - Mensaje informativo
 */
function showInfoMessage(message) {
    console.log(message);
    
    const infoAlert = document.getElementById('info-alert');
    if (infoAlert) {
        infoAlert.textContent = message;
        infoAlert.style.display = 'block';
        
        // Ocultar después de 4 segundos
        setTimeout(() => {
            infoAlert.style.display = 'none';
        }, 4000);
    }
}

/**
 * Mostrar/ocultar indicador de carga
 * @param {boolean} isLoading - Si se está cargando
 */
function showLoadingState(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
}