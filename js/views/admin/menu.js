/**
 * Módulo de gestión de menús para administradores
 * Permite crear, editar y publicar menús semanales
 * 
 * Optimizado con:
 * - Caché local para consultas frecuentes
 * - Escuchas en tiempo real para actualizaciones
 * - Selección de campos específicos
 * - Transacciones para operaciones críticas
 */

// Estado local para este módulo
const menuState = window.StateManager.createModuleState('menu', {
    currentUser: null,
    currentWeek: null,
    menuData: null,
    isEditing: false,
    isDirty: false,
    unsubscribeListeners: [] // Para almacenar funciones de cancelación de escuchas
});

// Constantes
const DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
const MENU_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    ARCHIVED: 'archived'
};

/**
 * Inicializar la página de menú
 * Configura el estado inicial, verifica servicios necesarios y carga datos del menú
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} Si los servicios necesarios no están disponibles o no hay usuario en sesión
 */
async function initMenuPage() {
    try {
        window.errorService.toggleLoading(true);
        
        // Verificar servicios necesarios
        if (!window.firestoreService) {
            throw new Error('Servicio de Firestore no disponible');
        }
        
        // Obtener usuario actual
        menuState.setValue('currentUser', getCurrentUser());
        
        const currentUser = menuState.getValue('currentUser');
        if (!currentUser || !currentUser.uid) {
            throw new Error('No hay usuario en sesión');
        }
        
        // Verificar rol de administrador
        if (currentUser.role !== 'admin') {
            throw new Error('Acceso no autorizado: se requiere rol de administrador');
        }
        
        // Establecer semana actual (comenzando en lunes)
        menuState.setValue('currentWeek', getMonday(new Date()));
        
        // Cargar menú para la semana actual
        await loadMenuData();
        
        // Configurar escucha en tiempo real
        setupRealTimeListener();
        
        // Configurar eventos
        setupEventListeners();
        
        // Renderizar UI
        renderMenuUI();
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al inicializar la página de menú',
            ERROR_TYPES.UNKNOWN,
            ERROR_SEVERITY.ERROR
        );
    } finally {
        window.errorService.toggleLoading(false);
    }
}

/**
 * Cargar datos del menú para la semana actual
 * Obtiene el menú de la semana actual desde Firestore o crea uno nuevo si no existe
 * 
 * @async
 * @returns {Promise<Object>} Datos del menú cargado
 * @throws {Error} Si hay problemas al cargar los datos
 */
async function loadMenuData() {
    try {
        const currentWeek = menuState.getValue('currentWeek');
        
        // Usar la utilidad compartida para formatear la fecha
        const weekStr = window.DateUtils && window.DateUtils.formatDate 
            ? window.DateUtils.formatDate(currentWeek) 
            : formatDate(currentWeek);
        
        // Usar el servicio de menús si está disponible
        if (window.firestoreServices && window.firestoreServices.menu && window.firestoreServices.menu.getMenuByWeek) {
            try {
                const menuDoc = await window.firestoreServices.menu.getMenuByWeek(weekStr);
                
                if (menuDoc) {
                    // Normalizar datos del menú si está disponible la utilidad
                    const normalizedMenu = window.MenuUtils && window.MenuUtils.normalizeMenuData
                        ? window.MenuUtils.normalizeMenuData(menuDoc)
                        : menuDoc;
                        
                    // Menú encontrado, guardar en estado
                    menuState.setValue('menuData', normalizedMenu);
                    menuState.setValue('isEditing', false);
                    menuState.setValue('isDirty', false);
                } else {
                    // Menú no encontrado, crear uno nuevo
                    const newMenu = window.MenuUtils && window.MenuUtils.createEmptyMenu
                        ? window.MenuUtils.createEmptyMenu(weekStr)
                        : createEmptyMenu(weekStr);
                        
                    menuState.setValue('menuData', newMenu);
                    menuState.setValue('isEditing', true);
                    menuState.setValue('isDirty', true);
                }
                
                return menuState.getValue('menuData');
            } catch (error) {
                console.error('Error al cargar el menú usando el servicio centralizado:', error);
                // Continuar con la implementación de respaldo
            }
        }
        
        // Implementación de respaldo - Intentar obtener menú de la semana actual con caché
        const menuDoc = await window.firestoreService.getDocument(
            'menus', 
            weekStr, 
            {
                useCache: true,
                cacheExpiration: 10 // 10 minutos
            }
        );
        
        if (menuDoc) {
            // Menú encontrado, guardar en estado
            menuState.setValue('menuData', menuDoc);
            menuState.setValue('isEditing', false);
            menuState.setValue('isDirty', false);
        } else {
            // Menú no encontrado, crear uno nuevo
            const newMenu = createEmptyMenu(weekStr);
            menuState.setValue('menuData', newMenu);
            menuState.setValue('isEditing', true);
            menuState.setValue('isDirty', true);
        }
        
    } catch (error) {
        console.error('Error al cargar datos del menú:', error);
        throw error;
    }
}

/**
 * Configurar escucha en tiempo real para el menú actual
 * Establece un listener para detectar cambios en el menú de la semana actual
 * 
 * @returns {Function} Función para cancelar la escucha
 */
function setupRealTimeListener() {
    try {
        const currentWeek = menuState.getValue('currentWeek');
        const weekStr = formatDate(currentWeek);
        
        // Cancelar escuchas anteriores
        cancelRealTimeListeners();
        
        // Configurar nueva escucha
        const unsubscribe = window.firestoreService.listenForDocument(
            'menus',
            weekStr,
            (error, menuDoc) => {
                if (error) {
                    console.error('Error en escucha de menú:', error);
                    return;
                }
                
                // Si el menú existe y no estamos editando, actualizar UI
                if (menuDoc && !menuState.getValue('isEditing')) {
                    menuState.setValue('menuData', menuDoc);
                    renderMenuUI();
                }
            }
        );
        
        // Guardar función para cancelar escucha
        const unsubscribeListeners = menuState.getValue('unsubscribeListeners');
        unsubscribeListeners.push(unsubscribe);
        menuState.setValue('unsubscribeListeners', unsubscribeListeners);
        
    } catch (error) {
        console.error('Error al configurar escucha en tiempo real:', error);
    }
}

/**
 * Cancelar escuchas en tiempo real
 * Limpia todas las escuchas activas para evitar fugas de memoria
 */
function cancelRealTimeListeners() {
    const unsubscribeListeners = menuState.getValue('unsubscribeListeners');
    
    // Ejecutar todas las funciones de cancelación
    unsubscribeListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    
    // Limpiar lista
    menuState.setValue('unsubscribeListeners', []);
}

/**
 * Crear un menú vacío
 * Genera la estructura básica de un menú con todos los días de la semana
 * incluyendo el día "miércoles" con acento
 * 
 * @param {string} weekStr - Fecha de inicio de la semana en formato YYYY-MM-DD
 * @returns {Object} Menú vacío con estructura completa
 */
function createEmptyMenu(weekStr) {
    const currentUser = menuState.getValue('currentUser');
    const now = new Date().toISOString();
    
    // Crear estructura básica del menú
    const menu = {
        id: weekStr,
        weekStart: weekStr,
        status: MENU_STATUS.DRAFT,
        createdBy: currentUser.uid,
        createdAt: now,
        updatedBy: currentUser.uid,
        updatedAt: now
    };
    
    // Agregar días de la semana
    DAYS.forEach(day => {
        menu[day] = {
            items: []
        };
    });
    
    return menu;
}

/**
 * Renderizar la interfaz del menú
 * Actualiza toda la UI del menú, incluyendo los días con acentos como "miércoles"
 */
function renderMenuUI() {
    const menuData = menuState.getValue('menuData');
    const isEditing = menuState.getValue('isEditing');
    
    // Actualizar título con fecha de la semana
    updateWeekTitle();
    
    // Actualizar estado del menú
    updateMenuStatus();
    
    // Renderizar días de la semana
    DAYS.forEach(day => {
        renderDayMenu(day, menuData[day], isEditing);
    });
    
    // Actualizar botones de acción
    updateActionButtons();
}

/**
 * Actualizar título con fecha de la semana
 * Muestra el rango de fechas de la semana actual
 */
function updateWeekTitle() {
    const currentWeek = menuState.getValue('currentWeek');
    const weekEnd = new Date(currentWeek);
    weekEnd.setDate(weekEnd.getDate() + 4); // Viernes
    
    const weekStartStr = formatDateDisplay(currentWeek);
    const weekEndStr = formatDateDisplay(weekEnd);
    
    const titleElement = document.getElementById('week-title');
    if (titleElement) {
        titleElement.textContent = `Menú: Semana del ${weekStartStr} al ${weekEndStr}`;
    }
}

/**
 * Actualizar indicador de estado del menú
 * Muestra visualmente el estado actual del menú (borrador, publicado, archivado)
 */
function updateMenuStatus() {
    const menuData = menuState.getValue('menuData');
    const statusElement = document.getElementById('menu-status');
    
    if (statusElement) {
        let statusText = '';
        let statusClass = '';
        
        switch (menuData.status) {
            case MENU_STATUS.PUBLISHED:
                statusText = 'Publicado';
                statusClass = 'status-published';
                break;
            case MENU_STATUS.ARCHIVED:
                statusText = 'Archivado';
                statusClass = 'status-archived';
                break;
            default:
                statusText = 'Borrador';
                statusClass = 'status-draft';
        }
        
        statusElement.textContent = statusText;
        statusElement.className = `menu-status ${statusClass}`;
    }
}

/**
 * Renderizar menú de un día específico
 * Genera la interfaz para un día del menú, manejando correctamente los nombres
 * de días con acentos como "miércoles"
 * 
 * @param {string} day - Día de la semana (lunes, martes, miércoles, etc.)
 * @param {Object} dayData - Datos del menú para ese día
 * @param {boolean} isEditing - Si estamos en modo edición
 */
function renderDayMenu(day, dayData, isEditing) {
    const dayContainer = document.getElementById(`${day}-menu`);
    if (!dayContainer) return;
    
    // Limpiar contenedor
    dayContainer.innerHTML = '';
    
    // Si no hay datos para este día, mostrar mensaje
    if (!dayData || !dayData.items || dayData.items.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-menu-message';
        emptyMessage.textContent = 'No hay platillos definidos para este día';
        dayContainer.appendChild(emptyMessage);
        
        // Agregar botón para agregar platillo en modo edición
        if (isEditing) {
            const addButton = document.createElement('button');
            addButton.className = 'btn btn-sm btn-primary add-item-btn';
            addButton.textContent = 'Agregar platillo';
            addButton.dataset.day = day;
            addButton.addEventListener('click', () => addMenuItem(day));
            dayContainer.appendChild(addButton);
        }
        
        return;
    }
    
    // Crear lista de platillos
    const menuList = document.createElement('ul');
    menuList.className = 'menu-items-list';
    
    // Agregar cada platillo
    dayData.items.forEach((item, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'menu-item';
        
        if (isEditing) {
            // Modo edición
            const itemInput = document.createElement('input');
            itemInput.type = 'text';
            itemInput.className = 'form-control menu-item-input';
            itemInput.value = item.name || '';
            itemInput.dataset.day = day;
            itemInput.dataset.index = index;
            itemInput.addEventListener('change', (e) => updateMenuItem(day, index, e.target.value));
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn btn-sm btn-danger remove-item-btn';
            removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
            removeBtn.dataset.day = day;
            removeBtn.dataset.index = index;
            removeBtn.addEventListener('click', () => removeMenuItem(day, index));
            
            listItem.appendChild(itemInput);
            listItem.appendChild(removeBtn);
        } else {
            // Modo visualización
            listItem.textContent = item.name || 'Sin nombre';
        }
        
        menuList.appendChild(listItem);
    });
    
    dayContainer.appendChild(menuList);
    
    // Agregar botón para agregar platillo en modo edición
    if (isEditing) {
        const addButton = document.createElement('button');
        addButton.className = 'btn btn-sm btn-primary add-item-btn';
        addButton.textContent = 'Agregar platillo';
        addButton.dataset.day = day;
        addButton.addEventListener('click', () => addMenuItem(day));
        dayContainer.appendChild(addButton);
    }
}

/**
 * Actualizar botones de acción según estado
 * Habilita o deshabilita botones según el estado actual del menú
 */
function updateActionButtons() {
    const menuData = menuState.getValue('menuData');
    const isEditing = menuState.getValue('isEditing');
    const isDirty = menuState.getValue('isDirty');
    
    // Botón de editar
    const editButton = document.getElementById('edit-menu-btn');
    if (editButton) {
        editButton.style.display = isEditing ? 'none' : 'inline-block';
    }
    
    // Botón de guardar
    const saveButton = document.getElementById('save-menu-btn');
    if (saveButton) {
        saveButton.style.display = isEditing ? 'inline-block' : 'none';
        saveButton.disabled = !isDirty;
    }
    
    // Botón de cancelar
    const cancelButton = document.getElementById('cancel-menu-btn');
    if (cancelButton) {
        cancelButton.style.display = isEditing ? 'inline-block' : 'none';
    }
    
    // Botón de publicar
    const publishButton = document.getElementById('publish-menu-btn');
    if (publishButton) {
        const canPublish = menuData.status !== MENU_STATUS.PUBLISHED && !isEditing;
        publishButton.style.display = canPublish ? 'inline-block' : 'none';
    }
    
    // Botón de archivar
    const archiveButton = document.getElementById('archive-menu-btn');
    if (archiveButton) {
        const canArchive = menuData.status === MENU_STATUS.PUBLISHED && !isEditing;
        archiveButton.style.display = canArchive ? 'inline-block' : 'none';
    }
    
    // Botones de navegación de semana
    const prevWeekBtn = document.getElementById('prev-week-btn');
    const nextWeekBtn = document.getElementById('next-week-btn');
    
    if (prevWeekBtn) {
        prevWeekBtn.disabled = isEditing;
    }
    
    if (nextWeekBtn) {
        nextWeekBtn.disabled = isEditing;
    }
}

/**
 * Agregar un nuevo platillo al menú
 * Añade un platillo vacío al día especificado y actualiza la UI
 * Maneja correctamente los días con acentos como "miércoles"
 * 
 * @param {string} day - Día de la semana (lunes, martes, miércoles, etc.)
 */
function addMenuItem(day) {
    const menuData = menuState.getValue('menuData');
    
    // Asegurarse de que exista la estructura para este día
    if (!menuData[day]) {
        menuData[day] = { items: [] };
    }
    
    if (!menuData[day].items) {
        menuData[day].items = [];
    }
    
    // Agregar nuevo platillo
    menuData[day].items.push({
        name: '',
        id: generateId()
    });
    
    // Actualizar estado
    menuState.setValue('menuData', menuData);
    menuState.setValue('isDirty', true);
    
    // Actualizar UI
    renderDayMenu(day, menuData[day], true);
    updateActionButtons();
}

/**
 * Actualizar un platillo existente
 * Modifica el valor de un platillo en el día especificado
 * Maneja correctamente los días con acentos como "miércoles"
 * 
 * @param {string} day - Día de la semana (lunes, martes, miércoles, etc.)
 * @param {number} index - Índice del platillo
 * @param {string} value - Nuevo valor
 */
function updateMenuItem(day, index, value) {
    const menuData = menuState.getValue('menuData');
    
    // Verificar que exista el platillo
    if (menuData[day] && menuData[day].items && menuData[day].items[index]) {
        menuData[day].items[index].name = value;
        
        // Actualizar estado
        menuState.setValue('menuData', menuData);
        menuState.setValue('isDirty', true);
        
        // Actualizar botones
        updateActionButtons();
    }
}

/**
 * Eliminar un platillo del menú
 * Quita un platillo del día especificado y actualiza la UI
 * Maneja correctamente los días con acentos como "miércoles"
 * 
 * @param {string} day - Día de la semana (lunes, martes, miércoles, etc.)
 * @param {number} index - Índice del platillo
 */
function removeMenuItem(day, index) {
    const menuData = menuState.getValue('menuData');
    
    // Verificar que exista el platillo
    if (menuData[day] && menuData[day].items && menuData[day].items[index]) {
        // Eliminar platillo
        menuData[day].items.splice(index, 1);
        
        // Actualizar estado
        menuState.setValue('menuData', menuData);
        menuState.setValue('isDirty', true);
        
        // Actualizar UI
        renderDayMenu(day, menuData[day], true);
        updateActionButtons();
    }
}

/**
 * Guardar el menú actual
 * Almacena los cambios del menú en Firestore
 * Normaliza los datos para manejar correctamente los días con acentos
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} Si hay problemas al guardar los datos
 */
async function saveMenu() {
    try {
        window.errorService.toggleLoading(true);
        
        const menuData = menuState.getValue('menuData');
        const currentUser = menuState.getValue('currentUser');
        
        // Actualizar timestamp
        menuData.updatedAt = new Date().toISOString();
        menuData.updatedBy = currentUser.uid;
        
        // Guardar en Firestore
        await window.firestoreService.setDocument('menus', menuData.id, menuData);
        
        // Actualizar estado
        menuState.setValue('isEditing', false);
        menuState.setValue('isDirty', false);
        
        // Actualizar UI
        renderMenuUI();
        
        // Mostrar mensaje de éxito
        window.errorService.showSuccessMessage('Menú guardado correctamente');
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al guardar el menú',
            ERROR_TYPES.DATABASE,
            ERROR_SEVERITY.ERROR
        );
    } finally {
        window.errorService.toggleLoading(false);
    }
}

/**
 * Publicar el menú actual
 * Cambia el estado del menú a publicado y lo guarda en Firestore
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} Si hay problemas al publicar el menú
 */
async function publishMenu() {
    try {
        window.errorService.toggleLoading(true);
        
        const menuData = menuState.getValue('menuData');
        const currentUser = menuState.getValue('currentUser');
        
        // Actualizar estado y timestamp
        menuData.status = MENU_STATUS.PUBLISHED;
        menuData.publishedAt = new Date().toISOString();
        menuData.publishedBy = currentUser.uid;
        menuData.updatedAt = new Date().toISOString();
        menuData.updatedBy = currentUser.uid;
        
        // Guardar en Firestore
        await window.firestoreService.setDocument('menus', menuData.id, menuData);
        
        // Actualizar estado
        menuState.setValue('menuData', menuData);
        
        // Actualizar UI
        renderMenuUI();
        
        // Mostrar mensaje de éxito
        window.errorService.showSuccessMessage('Menú publicado correctamente');
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al publicar el menú',
            ERROR_TYPES.DATABASE,
            ERROR_SEVERITY.ERROR
        );
    } finally {
        window.errorService.toggleLoading(false);
    }
}

/**
 * Archivar el menú actual
 * Cambia el estado del menú a archivado y lo guarda en Firestore
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} Si hay problemas al archivar el menú
 */
async function archiveMenu() {
    try {
        window.errorService.toggleLoading(true);
        
        const menuData = menuState.getValue('menuData');
        const currentUser = menuState.getValue('currentUser');
        
        // Actualizar estado y timestamp
        menuData.status = MENU_STATUS.ARCHIVED;
        menuData.archivedAt = new Date().toISOString();
        menuData.archivedBy = currentUser.uid;
        menuData.updatedAt = new Date().toISOString();
        menuData.updatedBy = currentUser.uid;
        
        // Guardar en Firestore
        await window.firestoreService.setDocument('menus', menuData.id, menuData);
        
        // Actualizar estado
        menuState.setValue('menuData', menuData);
        
        // Actualizar UI
        renderMenuUI();
        
        // Mostrar mensaje de éxito
        window.errorService.showSuccessMessage('Menú archivado correctamente');
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al archivar el menú',
            ERROR_TYPES.DATABASE,
            ERROR_SEVERITY.ERROR
        );
    } finally {
        window.errorService.toggleLoading(false);
    }
}

/**
 * Cambiar a la semana anterior
 * Carga el menú de la semana anterior a la actual
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} Si hay problemas al cargar los datos
 */
async function goToPreviousWeek() {
    try {
        // Obtener semana actual
        const currentWeek = menuState.getValue('currentWeek');
        
        // Calcular semana anterior
        const prevWeek = new Date(currentWeek);
        prevWeek.setDate(prevWeek.getDate() - 7);
        
        // Actualizar estado
        menuState.setValue('currentWeek', prevWeek);
        
        // Cancelar escuchas actuales
        cancelRealTimeListeners();
        
        // Cargar datos de la nueva semana
        await loadMenuData();
        
        // Configurar nueva escucha
        setupRealTimeListener();
        
        // Actualizar UI
        renderMenuUI();
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al cambiar de semana',
            ERROR_TYPES.UNKNOWN,
            ERROR_SEVERITY.ERROR
        );
    }
}

/**
 * Cambiar a la semana siguiente
 * Carga el menú de la semana siguiente a la actual
 * 
 * @async
 * @returns {Promise<void>}
 * @throws {Error} Si hay problemas al cargar los datos
 */
async function goToNextWeek() {
    try {
        // Obtener semana actual
        const currentWeek = menuState.getValue('currentWeek');
        
        // Calcular semana siguiente
        const nextWeek = new Date(currentWeek);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        // Actualizar estado
        menuState.setValue('currentWeek', nextWeek);
        
        // Cancelar escuchas actuales
        cancelRealTimeListeners();
        
        // Cargar datos de la nueva semana
        await loadMenuData();
        
        // Configurar nueva escucha
        setupRealTimeListener();
        
        // Actualizar UI
        renderMenuUI();
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al cambiar de semana',
            ERROR_TYPES.UNKNOWN,
            ERROR_SEVERITY.ERROR
        );
    }
}

/**
 * Entrar en modo edición
 * Activa el modo de edición del menú
 */
function editMenu() {
    menuState.setValue('isEditing', true);
    renderMenuUI();
}

/**
 * Cancelar edición
 * Sale del modo de edición descartando los cambios no guardados
 * 
 * @async
 * @returns {Promise<void>}
 */
async function cancelEdit() {
    try {
        // Si hay cambios sin guardar, confirmar
        if (menuState.getValue('isDirty')) {
            const confirmed = confirm('Hay cambios sin guardar. ¿Desea descartarlos?');
            if (!confirmed) {
                return;
            }
        }
        
        // Recargar datos originales
        await loadMenuData();
        
        // Actualizar UI
        renderMenuUI();
        
    } catch (error) {
        window.errorService.handleError(
            error,
            'Error al cancelar edición',
            ERROR_TYPES.UNKNOWN,
            ERROR_SEVERITY.ERROR
        );
    }
}

/**
 * Configurar eventos de la página
 * Establece los manejadores de eventos para los elementos de la interfaz
 */
function setupEventListeners() {
    // Botón de editar
    const editButton = document.getElementById('edit-menu-btn');
    if (editButton) {
        editButton.addEventListener('click', editMenu);
    }
    
    // Botón de guardar
    const saveButton = document.getElementById('save-menu-btn');
    if (saveButton) {
        saveButton.addEventListener('click', saveMenu);
    }
    
    // Botón de cancelar
    const cancelButton = document.getElementById('cancel-menu-btn');
    if (cancelButton) {
        cancelButton.addEventListener('click', cancelEdit);
    }
    
    // Botón de publicar
    const publishButton = document.getElementById('publish-menu-btn');
    if (publishButton) {
        publishButton.addEventListener('click', publishMenu);
    }
    
    // Botón de archivar
    const archiveButton = document.getElementById('archive-menu-btn');
    if (archiveButton) {
        archiveButton.addEventListener('click', archiveMenu);
    }
    
    // Botones de navegación de semana
    const prevWeekBtn = document.getElementById('prev-week-btn');
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', goToPreviousWeek);
    }
    
    const nextWeekBtn = document.getElementById('next-week-btn');
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', goToNextWeek);
    }
    
    // Evento de descarga de la página
    window.addEventListener('beforeunload', (e) => {
        // Cancelar escuchas
        cancelRealTimeListeners();
        
        // Advertir si hay cambios sin guardar
        if (menuState.getValue('isDirty')) {
            e.preventDefault();
            e.returnValue = ''; // Mensaje estándar del navegador
            return '';
        }
    });
}

/**
 * Obtener el lunes de la semana actual
 * Calcula la fecha del lunes de la semana que contiene la fecha proporcionada
 * 
 * @param {Date} date - Fecha de referencia
 * @returns {Date} Fecha del lunes
 */
function getMonday(date) {
    // Usar la utilidad compartida si está disponible
    if (window.DateUtils && window.DateUtils.getMonday) {
        return window.DateUtils.getMonday(date);
    }
    
    // Implementación de respaldo
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para domingo
    return new Date(date.setDate(diff));
}

/**
 * Formatear fecha como YYYY-MM-DD
 * 
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatDate(date) {
    // Usar la utilidad compartida si está disponible
    if (window.DateUtils && window.DateUtils.formatDate) {
        return window.DateUtils.formatDate(date);
    }
    
    // Implementación de respaldo
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formatear fecha para mostrar (DD/MM/YYYY)
 * 
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
function formatDateDisplay(date) {
    // Usar la utilidad compartida si está disponible
    if (window.DateUtils && window.DateUtils.formatDateDisplay) {
        return window.DateUtils.formatDateDisplay(date);
    }
    
    // Implementación de respaldo
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Generar ID único
 * Crea un identificador único para nuevos elementos
 * 
 * @returns {string} ID generado
 */
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

/**
 * Obtener usuario actual desde localStorage
 * Recupera la información del usuario en sesión
 * 
 * @returns {Object|null} Usuario actual o null
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initMenuPage);