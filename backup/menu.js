// Admin Menu Management for Comedor Grupo Avika

// Importar utilidades comunes si están disponibles
const commonUtils = window.commonUtils || {};
const firebaseService = window.firebaseService;

// Usar constantes de días desde utilidades comunes o definir localmente
const DAYS = commonUtils.CONSTANTS ? commonUtils.CONSTANTS.DAYS : 
    ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Días de la semana para la interfaz (excluyendo domingo)
const WEEKDAYS = DAYS.slice(1, 7);

// Usar DateUtils y TextUtils desde commonUtils
const { DateUtils, TextUtils } = commonUtils;

// Variables globales
let menuData = {};
let currentDay = 'Lunes';
let currentWeekStartDate = getMonday(new Date());

// Inicializar el manejador de mensajes UI
const messageHandler = window.uiMessageHandler || {
    showError: showErrorMessage,
    showSuccess: showSuccessMessage,
    toggleLoading: showLoadingState
};

// Usar constantes de roles desde utilidades comunes o definir localmente
const USER_ROLES = commonUtils.CONSTANTS ? commonUtils.CONSTANTS.USER_ROLES : {
    ADMIN: 'admin',
    COORDINATOR: 'coordinator'
};

// Inicialización de la página cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    // Proteger esta ruta para el rol de administrador
    await protectRoute(USER_ROLES.ADMIN);
    
    // Inicializar la página si la autenticación es válida
    initMenuPage();
});

/**
 * Inicializar la página de gestión de menús
 */
function initMenuPage() {
    // Set user name from session
    const user = getCurrentUser();
    const userNameElement = document.getElementById('user-name');
    if (userNameElement && user) {
        userNameElement.textContent = user.displayName || 'Administrador';
    }

    // Configurar eventos de clic para los botones de agregar platillo
    document.body.addEventListener('click', function(e) {
        // Botón agregar platillo
        if (e.target.matches('.agregar-plato, .agregar-plato *, #add-item-btn, #add-item-btn *')) {
            e.preventDefault();
            showAddItemModal();
        }
    });
    
    // Configurar eventos de clic para las pestañas de días
    const dayTabs = document.querySelectorAll('.day-tab');
    dayTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const day = this.getAttribute('data-day');
            
            // Usar función de formateo de días desde utilidades comunes si está disponible
            let formattedDay;
            if (commonUtils.DateUtils && commonUtils.DateUtils.formatDayName) {
                formattedDay = commonUtils.DateUtils.formatDayName(day);
            } else {
                // Mapeo de nombres de días normalizados a nombres con acentos
                const dayMapping = {
                    'lunes': 'Lunes',
                    'martes': 'Martes',
                    'miercoles': 'Miércoles',
                    'jueves': 'Jueves',
                    'viernes': 'Viernes',
                    'sabado': 'Sábado',
                    'domingo': 'Domingo'
                };
                
                // Usar el nombre correcto del día con acento si existe en el mapeo
                formattedDay = dayMapping[day] || (day.charAt(0).toUpperCase() + day.slice(1));
            }
            
            console.log(`Cambiando a día: ${day} -> ${formattedDay}`);
            changeActiveDay(formattedDay);
        });
    });
    
    // Configure modals
    setupModalHandlers();
    
    // Configurar otros botones
    setupButtonEvents();
    
    // Inicializar el menú con la fecha actual
    loadCurrentMenu();
}

// Función para cambiar de día activo
function changeActiveDay(day) {
    // Update current day
    currentDay = day;
    
    // Actualizar pestañas activas
    const tabs = document.querySelectorAll('.day-tab');
    tabs.forEach(tab => {
        // Normalizar nombres de días para comparación usando la función centralizada
        // Esto asegura que "Miércoles" se maneje correctamente con su acento
        const tabDay = normalizeDayName(tab.getAttribute('data-day'));
        const dayLower = normalizeDayName(day);
        
        if (tabDay === dayLower) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Mostrar menú del día seleccionado
    showMenuForDay(day);
}

// Load current menu from Firebase
async function loadCurrentMenu() {
    console.log("Cargando menú para la semana que comienza el:", currentWeekStartDate);
    
    // Formatear fecha para usar como ID del documento usando la función centralizada
    const weekStartStr = formatDate(currentWeekStartDate);
    
    // Mostrar estado de carga
    messageHandler.toggleLoading(true);
    
    try {
        let menuDoc;
        
        // Usar el servicio centralizado si está disponible
        if (firebaseService) {
            const menuData = await firebaseService.getMenuByWeek(weekStartStr);
            if (menuData) {
                menuDoc = { id: menuData.id, data: () => menuData };
            }
        } else {
            // Obtener referencia a la colección de menús
            const menuCollection = getMenuCollection();
            if (!menuCollection) {
                throw new Error("No se pudo obtener la colección de menús");
            }
            
            menuDoc = await menuCollection.doc(weekStartStr).get();
        }
        
        // Actualizar UI con los datos del menú
        if (menuDoc && menuDoc.exists) {
            const data = menuDoc.data();
            console.log("Menú encontrado:", data);
            
            // Guardar datos en variable global
            menuData = data;
            
            // Actualizar estado de publicación
            updatePublishStatus(data.published || false);
            
            // Mostrar el menú del día actual
            showMenuForDay(currentDay);
        } else {
            console.log("No se encontró menú para esta semana. Creando nuevo menú.");
            
            // Inicializar menú vacío
            menuData = {
                weekStart: weekStartStr,
                createdAt: new Date(),
                updatedAt: new Date(),
                published: false,
                days: {}
            };
            
            // Inicializar cada día con un array vacío
            WEEKDAYS.forEach(day => {
                const normalizedDay = normalizeDayName(day);
                menuData.days[normalizedDay] = [];
            });
            
            // Actualizar estado de publicación
            updatePublishStatus(false);
            
            // Mostrar el menú del día actual
            showMenuForDay(currentDay);
        }
    } catch (error) {
        console.error("Error al cargar el menú:", error);
        messageHandler.showError("Error al cargar el menú: " + error.message);
    } finally {
        // Ocultar estado de carga
        messageHandler.toggleLoading(false);
    }
}

// Save menu to Firebase
async function saveMenu() {
    console.log("Guardando menú...");
    
    // Validar el formulario
    if (!validateMenuForm()) {
        return;
    }
    
    // Mostrar estado de carga
    messageHandler.toggleLoading(true);
    
    try {
        // Preparar datos para Firestore
        const weekStartStr = formatDate(currentWeekStartDate);
        const firestoreData = {
            weekStart: weekStartStr,
            days: menuData.days,
            published: menuData.published || false
        };
        
        // Añadir timestamp de actualización
        if (firebaseService) {
            firestoreData.updatedAt = firebaseService.getServerTimestamp();
        } else {
            firestoreData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        // Si es un nuevo menú, añadir timestamp de creación
        if (!menuData.createdAt) {
            if (firebaseService) {
                firestoreData.createdAt = firebaseService.getServerTimestamp();
            } else {
                firestoreData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            }
        }
        
        // Guardar en Firestore
        let docRef;
        
        // Usar el servicio centralizado si está disponible
        if (firebaseService) {
            await firebaseService.saveMenu(weekStartStr, firestoreData);
        } else {
            // Obtener referencia a la colección de menús
            const menuCollection = getMenuCollection();
            if (!menuCollection) {
                throw new Error("No se pudo obtener la colección de menús");
            }
            
            docRef = menuCollection.doc(weekStartStr);
            await docRef.set(firestoreData, { merge: true });
        }
        
        // Actualizar datos locales
        menuData = { ...menuData, ...firestoreData };
        
        // Mostrar mensaje de éxito
        messageHandler.showSuccess("Menú guardado correctamente");
    } catch (error) {
        console.error("Error al guardar el menú:", error);
        messageHandler.showError("Error al guardar el menú: " + error.message);
    } finally {
        // Ocultar estado de carga
        messageHandler.toggleLoading(false);
    }
}

// Publish menu to Firebase
async function publishMenu() {
    console.log("Publicando menú...");
    
    // Validar que todos los días tengan platillos
    if (!validateAllDays()) {
        messageHandler.showError("Todos los días deben tener al menos un platillo para publicar el menú");
        return;
    }
    
    // Mostrar estado de carga
    messageHandler.toggleLoading(true);
    
    try {
        // Preparar datos para Firestore
        const weekStartStr = formatDate(currentWeekStartDate);
        
        // Usar el servicio centralizado si está disponible
        if (firebaseService) {
            await firebaseService.publishMenu(weekStartStr);
        } else {
            // Obtener referencia a la colección de menús
            const menuCollection = getMenuCollection();
            if (!menuCollection) {
                throw new Error("No se pudo obtener la colección de menús");
            }
            
            // Actualizar estado de publicación
            await menuCollection.doc(weekStartStr).update({
                published: true,
                publishedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // Actualizar datos locales
        menuData.published = true;
        
        // Actualizar UI
        updatePublishStatus(true);
        
        // Mostrar mensaje de éxito
        messageHandler.showSuccess("Menú publicado correctamente");
    } catch (error) {
        console.error("Error al publicar el menú:", error);
        messageHandler.showError("Error al publicar el menú: " + error.message);
    } finally {
        // Ocultar estado de carga
        messageHandler.toggleLoading(false);
    }
}

// Get Monday of the current week
function getMonday(date = new Date()) {
    // Usar la función centralizada si está disponible
    if (commonUtils.DateUtils && commonUtils.DateUtils.getMonday) {
        return commonUtils.DateUtils.getMonday(date);
    }
    
    // Implementación de respaldo
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para domingo
    return new Date(d.setDate(diff));
}

// Formatear fecha como YYYY-MM-DD
function formatDate(date) {
    // Usar la función centralizada si está disponible
    if (commonUtils.DateUtils && commonUtils.DateUtils.formatDate) {
        return commonUtils.DateUtils.formatDate(date);
    }
    
    // Implementación de respaldo
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Formatear fecha como DD/MM/YYYY para mostrar
function formatDateDisplay(date) {
    // Usar la función centralizada si está disponible
    if (commonUtils.DateUtils && commonUtils.DateUtils.formatDateDisplay) {
        return commonUtils.DateUtils.formatDateDisplay(date);
    }
    
    // Implementación de respaldo
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${day}/${month}/${year}`;
}

// Mostrar estado de carga
function showLoadingState(isLoading) {
    // Usar la función centralizada si está disponible
    if (messageHandler && messageHandler.toggleLoading) {
        messageHandler.toggleLoading(isLoading);
        return;
    }
    
    // Implementación de respaldo
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }
    
    // Deshabilitar elementos interactivos
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = isLoading;
    });
    
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.disabled = isLoading;
    });
}

// Mostrar mensaje de error
function showErrorMessage(message) {
    // Usar la función centralizada si está disponible
    if (messageHandler && messageHandler.showError) {
        messageHandler.showError(message);
        return;
    }
    
    // Implementación de respaldo
    const errorAlert = document.getElementById('error-alert');
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    } else {
        // Fallback a alert
        alert(`Error: ${message}`);
    }
    console.error(message);
}

// Mostrar mensaje de éxito
function showSuccessMessage(message) {
    // Usar la función centralizada si está disponible
    if (messageHandler && messageHandler.showSuccess) {
        messageHandler.showSuccess(message);
        return;
    }
    
    // Implementación de respaldo
    const successAlert = document.getElementById('success-alert');
    if (successAlert) {
        successAlert.textContent = message;
        successAlert.style.display = 'block';
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            successAlert.style.display = 'none';
        }, 3000);
    } else {
        // Fallback a alert
        alert(`Éxito: ${message}`);
    }
    console.log(message);
}

// Normalizar nombre de día (quitar acentos y convertir a minúsculas)
function normalizeDayName(day) {
    // Usar la función centralizada si está disponible
    if (commonUtils.DateUtils && commonUtils.DateUtils.normalizeDayName) {
        return commonUtils.DateUtils.normalizeDayName(day);
    }
    
    // Implementación de respaldo
    if (!day) return '';
    
    // Normalizar caracteres acentuados
    return day.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// Formatear nombre de día (con acento si corresponde)
function formatDayName(day) {
    // Usar la función centralizada si está disponible
    if (commonUtils.DateUtils && commonUtils.DateUtils.formatDayName) {
        return commonUtils.DateUtils.formatDayName(day);
    }
    
    // Implementación de respaldo
    if (!day) return '';
    
    // Mapeo de nombres normalizados a nombres con formato correcto
    const dayMapping = {
        'domingo': 'Domingo',
        'lunes': 'Lunes',
        'martes': 'Martes',
        'miercoles': 'Miércoles',
        'jueves': 'Jueves',
        'viernes': 'Viernes',
        'sabado': 'Sábado'
    };
    
    // Normalizar primero
    const normalizedDay = normalizeDayName(day);
    
    // Devolver nombre con formato correcto
    return dayMapping[normalizedDay] || day;
}

// Display menu for current day
function showMenuForDay(day) {
    // Normalizar el nombre del día
    const formattedDay = formatDayName(day);
    const normalizedDay = normalizeDayName(day);
    
    console.log(`Mostrando menú para: ${formattedDay} (normalizado: ${normalizedDay})`);
    
    // Actualizar día actual
    currentDay = formattedDay;
    
    // Actualizar título del día
    const dayTitleElement = document.getElementById('current-day');
    if (dayTitleElement) {
        dayTitleElement.textContent = formattedDay;
    }
    
    // Actualizar pestañas activas
    const dayTabs = document.querySelectorAll('.day-tab');
    dayTabs.forEach(tab => {
        const tabDay = tab.getAttribute('data-day');
        const tabDayNormalized = normalizeDayName(tabDay);
        
        if (tabDayNormalized === normalizedDay) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Obtener contenedor de platillos
    const itemsContainer = document.getElementById('menu-items-container');
    if (!itemsContainer) {
        console.error('No se encontró el contenedor de platillos');
        return;
    }
    
    // Limpiar contenedor
    itemsContainer.innerHTML = '';
    
    // Verificar si hay datos para este día
    if (!menuData.days || !menuData.days[normalizedDay]) {
        console.warn(`No hay datos para ${formattedDay}`);
        
        // Crear mensaje de día vacío
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-day-message';
        emptyMessage.textContent = `No hay platillos definidos para ${formattedDay}`;
        itemsContainer.appendChild(emptyMessage);
        
        return;
    }
    
    // Obtener platillos para este día
    const dayItems = menuData.days[normalizedDay] || [];
    
    if (dayItems.length === 0) {
        // Crear mensaje de día vacío
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-day-message';
        emptyMessage.textContent = `No hay platillos definidos para ${formattedDay}`;
        itemsContainer.appendChild(emptyMessage);
        
        return;
    }
    
    // Añadir cada platillo al contenedor
    dayItems.forEach((item, index) => {
        addItemToContainer(itemsContainer, item, index);
    });
    
    // Actualizar índices
    updateItemIndexes(itemsContainer);
}

// Función para cargar los platillos de un día específico
function loadDayItems(day) {
    const normalizedDay = normalizeDayName(day);
    return menuData.days && menuData.days[normalizedDay] ? [...menuData.days[normalizedDay]] : [];
}

// Función para obtener los platillos del día actual del estado global
function getCurrentDayItems() {
    const normalizedDay = normalizeDayName(currentDay);
    return menuData.days && menuData.days[normalizedDay] ? menuData.days[normalizedDay] : [];
}

// Función para agregar un platillo al contenedor
function addItemToContainer(container, item = {}, index) {
    const itemElement = document.createElement('div');
    itemElement.className = 'menu-item';
    itemElement.dataset.index = index;
    
    itemElement.innerHTML = `
        <div class="menu-item-header">
            <h4>Plato ${index + 1}</h4>
            <div class="menu-item-actions">
                <button class="btn btn-sm btn-danger eliminar-plato" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="menu-item-content">
            <input type="text" class="form-control menu-item-name" placeholder="Nombre del plato" value="${item.name || ''}">
            <textarea class="form-control menu-item-description" placeholder="Descripción (opcional)">${item.description || ''}</textarea>
        </div>
    `;
    
    container.appendChild(itemElement);
    
    // Añadir evento para eliminar el platillo
    const deleteBtn = itemElement.querySelector('.eliminar-plato');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function() {
            container.removeChild(itemElement);
            // Actualizar índices de los platillos restantes
            updateItemIndexes(container);
        });
    }
}

// Función para actualizar índices de los platillos
function updateItemIndexes(container) {
    const items = container.querySelectorAll('.menu-item');
    items.forEach((item, index) => {
        item.dataset.index = index;
        const header = item.querySelector('h4');
        if (header) {
            header.textContent = `Plato ${index + 1}`;
        }
        const deleteBtn = item.querySelector('.eliminar-plato');
        if (deleteBtn) {
            deleteBtn.dataset.index = index;
        }
    });
}

// Función para mostrar el modal de añadir platillo
function showAddItemModal() {
    console.log('Mostrando modal para agregar platillo');
    
    const modal = document.getElementById('menu-item-modal');
    if (!modal) {
        console.error('Modal para agregar platillo no encontrado');
        return;
    }
    
    // Reset form
    const form = document.getElementById('menu-item-form');
    if (form) {
        console.log('Formulario encontrado, reseteando');
        form.reset();
        
        // Clear edit item ID if it exists
        const editItemIdInput = document.getElementById('edit-item-id');
        if (editItemIdInput) {
            editItemIdInput.value = '';
        }
        
        // Set form submission handler
        form.onsubmit = function(e) {
            e.preventDefault();
            console.log('Formulario enviado');
            
            // Get form values
            const name = document.getElementById('item-name').value;
            const description = document.getElementById('item-description').value;
            const type = document.getElementById('item-type').value;
            
            console.log(`Valores del formulario: Nombre=${name}, Descripción=${description}, Tipo=${type}`);
            
            // Create new menu item
            const newItem = {
                name: name,
                description: description,
                type: type
            };
            
            console.log(`Intentando agregar platillo al día: ${currentDay}`);
            
            // Add to current day's menu
            if (!menuData[currentDay]) {
                console.log(`Inicializando datos para ${currentDay}`);
                menuData[currentDay] = { items: [] };
            }
            
            // Asegurarnos de que items sea un array
            if (!Array.isArray(menuData[currentDay].items)) {
                console.log(`Corrigiendo estructura de datos para ${currentDay}`);
                menuData[currentDay].items = [];
            }
            
            menuData[currentDay].items.push(newItem);
            console.log(`Platillo agregado a ${currentDay}:`, newItem);
            console.log('Menú actualizado:', menuData);
            
            // Guardar inmediatamente el menú
            saveMenu();
            
            // Refresh display
            showMenuForDay(currentDay);
            
            // Close modal
            modal.style.display = 'none';
        };
    } else {
        console.error('Formulario no encontrado');
    }
    
    console.log('Mostrando modal');
    modal.style.display = 'block';
}

// Validate menu form
function validateMenuForm() {
    // Find the current day's menu items container
    const dayLower = currentDay.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const containerSelector = `#${dayLower}-items, #${dayLower}-content .menu-items-list, .menu-items-list`;
    const menuItemsContainer = document.querySelector(containerSelector);
    
    if (!menuItemsContainer) {
        messageHandler.showError(`No se encontró el contenedor de menú para ${currentDay}`);
        return false;
    }
    
    const menuItems = menuItemsContainer.querySelectorAll('.menu-item');
    
    if (menuItems.length === 0) {
        messageHandler.showError("Debe agregar al menos un plato al menú.");
        return false;
    }
    
    let valid = true;
    
    menuItems.forEach(item => {
        const nameInput = item.querySelector('.menu-item-name');
        
        if (!nameInput || nameInput.value.trim() === '') {
            if (nameInput) {
                nameInput.classList.add('is-invalid');
            }
            valid = false;
        } else if (nameInput) {
            nameInput.classList.remove('is-invalid');
        }
    });
    
    if (!valid) {
        messageHandler.showError("Por favor complete los campos requeridos.");
    }
    
    return valid;
}

// Validate all days have menu items
function validateAllDays() {
    for (const day of WEEKDAYS) {
        if (!menuData[day] || !menuData[day].items || menuData[day].items.length === 0) {
            return false;
        }
    }
    
    return true;
}

// Update publish status UI
function updatePublishStatus(isPublished) {
    const publishBtn = document.getElementById('publish-menu-btn');
    const statusBadge = document.getElementById('menu-status-badge');
    const statusText = document.getElementById('menu-status-text');
    
    if (publishBtn) {
        publishBtn.disabled = isPublished;
        publishBtn.innerHTML = isPublished ? 
            '<i class="fas fa-check"></i> Menú Publicado' : 
            '<i class="fas fa-upload"></i> Publicar Menú';
    }
    
    if (statusBadge) {
        statusBadge.textContent = isPublished ? 'Publicado' : 'Borrador';
        statusBadge.className = 'badge';
        statusBadge.classList.add(isPublished ? 'badge-success' : 'badge-warning');
    }
    
    if (statusText) {
        statusText.textContent = isPublished ? 
            'Este menú está publicado y visible para los coordinadores' : 
            'Este menú está en borrador y no es visible para los coordinadores';
    }
}

// Handle Excel file import
function handleExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Show loading state
    messageHandler.toggleLoading(true);
    
    // Create a FormData object
    const formData = new FormData();
    formData.append('file', file);
    
    // Use the Excel parser utility (in a real app, you would use a library like SheetJS)
    // For simulation purposes, we'll create some sample data
    setTimeout(() => {
        const importedMenu = {
            lunes: {
                items: [
                    { name: 'Arroz con pollo', description: 'Arroz con pollo y verduras' },
                    { name: 'Sopa de verduras', description: 'Sopa casera con verduras de temporada' }
                ]
            },
            martes: {
                items: [
                    { name: 'Pasta Bolognesa', description: 'Pasta con salsa de carne' },
                    { name: 'Ensalada mixta', description: 'Ensalada fresca con lechuga, tomate y maíz' }
                ]
            },
            miercoles: {
                items: [
                    { name: 'Pescado a la plancha', description: 'Filete de pescado con limón' },
                    { name: 'Puré de papas', description: 'Puré de papas casero' }
                ]
            },
            jueves: {
                items: [
                    { name: 'Lomo saltado', description: 'Lomo de res salteado con verduras' },
                    { name: 'Arroz blanco', description: 'Arroz blanco cocido' }
                ]
            },
            viernes: {
                items: [
                    { name: 'Pollo al horno', description: 'Pollo al horno con papas' },
                    { name: 'Ensalada rusa', description: 'Ensalada de papa, zanahoria y arvejas' }
                ]
            },
            sabado: {
                items: [
                    { name: 'Pizza casera', description: 'Pizza con queso y jamón' },
                    { name: 'Ensalada César', description: 'Lechuga, croutones, parmesano y aderezo césar' }
                ]
            },
            domingo: {
                items: [
                    { name: 'Asado de res', description: 'Carne asada con chimichurri' },
                    { name: 'Papas fritas', description: 'Papas fritas caseras' }
                ]
            }
        };
        
        // Update menu data
        WEEKDAYS.forEach(day => {
            const dayKey = day.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (importedMenu[dayKey]) {
                menuData[day] = importedMenu[dayKey];
            }
        });
        
        // Show menu for current day
        showMenuForDay(currentDay);
        
        // Hide loading state
        messageHandler.toggleLoading(false);
        
        // Show success message
        messageHandler.showSuccess('Menú importado correctamente.');
        
        // Reset file input
        event.target.value = '';
    }, 1000);
}

// Show modal functions
function showNewMenuModal() {
    const modal = document.getElementById('new-menu-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function showImportExcelModal() {
    const modal = document.getElementById('import-excel-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Show Publish Menu Modal
function showPublishMenuModal() {
    // Get the modal element
    const modal = document.getElementById('publish-menu-modal');
    if (!modal) {
        console.warn('Publish menu modal not found');
        return;
    }
    
    // Check if there are menu items in all days
    const isValid = validateAllDays();
    
    // Get validation errors container
    const validationErrors = document.getElementById('publish-menu-validation-errors');
    
    if (!isValid) {
        if (validationErrors) {
            validationErrors.innerHTML = '<p>No se puede publicar el menú porque algunos días no tienen platos añadidos.</p>';
            validationErrors.style.display = 'block';
        }
        messageHandler.showError("Todos los días deben tener al menos un plato para publicar el menú.");
        return;
    } else {
        if (validationErrors) {
            validationErrors.style.display = 'none';
        }
        
        // Set up confirm button
        const confirmButton = document.querySelector('#publish-menu-modal button.btn-primary');
        if (confirmButton) {
            // Remove previous event listeners by cloning
            const newButton = confirmButton.cloneNode(true);
            confirmButton.parentNode.replaceChild(newButton, confirmButton);
            
            // Add new event listener
            newButton.addEventListener('click', async function(e) {
                e.preventDefault();
                modal.style.display = 'none'; // Hide modal first
                await publishMenu(); // Then publish menu
            });
        }
        
        // Show the modal
        modal.style.display = 'block';
    }
}

// Navigation functions
function navigateToPreviousWeek() {
    const newDate = new Date(currentWeekStartDate);
    newDate.setDate(newDate.getDate() - 7);
    currentWeekStartDate = newDate;
    loadCurrentMenu();
}

function navigateToNextWeek() {
    const newDate = new Date(currentWeekStartDate);
    newDate.setDate(newDate.getDate() + 7);
    currentWeekStartDate = newDate;
    loadCurrentMenu();
}