// Admin Menu Management for Comedor Grupo Avika

// Firebase references
const db = firebase.firestore();
const menuCollection = db.collection('menus');

// Global variables and constants
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
let menuData = {};
let currentDay = 'Lunes';
let currentWeekStartDate = getMonday(new Date());

// Ensure admin only access
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth(USER_ROLES.ADMIN)) {
        return;
    }
    
    // Set user name from session
    const userObject = sessionStorage.getItem('user') ? JSON.parse(sessionStorage.getItem('user')) : {};
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = userObject.displayName || 'Administrador';
    }

    // Configurar eventos de clic para los botones de agregar platillo
    document.body.addEventListener('click', function(e) {
        // Botón agregar platillo
        if (e.target.matches('.agregar-plato, .agregar-plato *')) {
            e.preventDefault();
            showAddItemModal();
        }
    });
    
    // Configurar eventos de clic para las pestañas de días
    const dayTabs = document.querySelectorAll('.day-tab');
    dayTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const day = this.getAttribute('data-day');
            changeActiveDay(day);
        });
    });
    
    // Configure modals
    setupModalHandlers();
    
    // Configurar otros botones
    setupButtonEvents();
    
    // Inicializar el menú con la fecha actual
    loadCurrentMenu();
});

// Setup event listeners
function setupButtonEvents() {
    // Botón de nuevo menú
    const newMenuBtn = document.getElementById('nuevo-menu');
    if (newMenuBtn) {
        newMenuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showNewMenuModal();
        });
    }
    
    // Botón de importar Excel
    const importExcelBtn = document.getElementById('importar-excel');
    if (importExcelBtn) {
        importExcelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showImportExcelModal();
        });
    }
    
    // Botón de publicar menú
    const publishMenuBtn = document.getElementById('publicar-menu');
    if (publishMenuBtn) {
        publishMenuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showPublishMenuModal();
        });
    }
    
    // Botón guardar cambios
    const saveChangesBtn = document.getElementById('guardar-cambios');
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveMenu();
        });
    }
    
    // Setup file input for Excel import
    const excelFileInput = document.getElementById('excel-file-input');
    if (excelFileInput) {
        excelFileInput.addEventListener('change', handleExcelFile);
    }
    
    // Setup navigation buttons
    const prevWeekBtn = document.getElementById('prev-week-btn');
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', navigateToPreviousWeek);
    }
    
    const nextWeekBtn = document.getElementById('next-week-btn');
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', navigateToNextWeek);
    }
}

// Setup modal handlers
function setupModalHandlers() {
    // Initialize modal close buttons
    document.querySelectorAll('.close-modal, .cancel-modal').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // Handle modal close for any click on close buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal') || 
            e.target.classList.contains('cancel-modal')) {
            // Find the parent modal
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }
    });
}

// Función para cambiar de día activo
function changeActiveDay(day) {
    // Update current day
    currentDay = day;
    
    // Actualizar pestañas activas
    const tabs = document.querySelectorAll('.day-tab');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-day') === day) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Actualizar título del día
    const dayTitle = document.getElementById('day-title');
    if (dayTitle) {
        dayTitle.textContent = `Menú del ${day.charAt(0).toUpperCase() + day.slice(1)}`;
    }
    
    // Show menu for current day
    showMenuForDay(day);
}

// Show menu for current day
function showMenuForDay(day) {
    // Get menu items for this day
    const dayItems = menuData[day] && menuData[day].items ? menuData[day].items : [];
    
    // Obtener o crear el contenedor de platillos
    const containerSelector = `#${day.toLowerCase()}-items, #${day.toLowerCase()}-content .menu-items-list, .menu-items-list`;
    const container = document.querySelector(containerSelector);
    
    if (!container) {
        console.error(`Container for ${day} menu items not found`);
        return;
    }
    
    // Limpiar el contenedor
    container.innerHTML = '';
    
    if (dayItems.length > 0) {
        // Show menu items
        dayItems.forEach((item, index) => {
            addItemToContainer(container, item, index);
        });
    } else {
        // Show empty state
        container.innerHTML = `
            <div class="empty-state">
                <p>No hay elementos en el menú para este día</p>
                <button class="btn btn-primary agregar-plato">Agregar Plato</button>
            </div>
        `;
    }
}

// Función para cargar los platillos de un día específico
function loadDayItems(day) {
    showMenuForDay(day);
}

// Función para obtener los platillos del día actual del estado global
function getCurrentDayItems(day) {
    return menuData[day] && menuData[day].items ? menuData[day].items : [];
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
    // Get container for current day
    const dayLower = currentDay.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const containerSelector = `#${dayLower}-items, #${dayLower}-content .menu-items-list, .menu-items-list`;
    const container = document.querySelector(containerSelector);
    
    if (!container) {
        console.error(`Container for ${currentDay} menu items not found`);
        return;
    }
    
    // Eliminar el estado vacío si existe
    const emptyState = container.querySelector('.empty-state');
    if (emptyState) {
        container.removeChild(emptyState);
    }
    
    // Añadir un nuevo platillo
    const index = container.querySelectorAll('.menu-item').length;
    addItemToContainer(container, {}, index);
}

// Load current menu from Firebase
function loadCurrentMenu() {
    // Calculate week start date (Monday) if not set
    if (!currentWeekStartDate) {
        currentWeekStartDate = getMonday(new Date());
    }
    
    // Format date for Firestore
    const weekStartStr = formatDate(currentWeekStartDate);
    
    // Update the week range display
    const weekRange = document.getElementById('week-range');
    if (weekRange) {
        weekRange.textContent = `Semana del ${formatDateDisplay(currentWeekStartDate)}`;
    }
    
    // Reset menu data
    menuData = {};
    DAYS.forEach(day => {
        menuData[day] = { items: [] };
    });
    
    // Show loading state
    showLoadingState(true);
    
    // Get menu from Firebase
    menuCollection.doc(weekStartStr)
        .get()
        .then(doc => {
            if (doc.exists) {
                const data = doc.data();
                
                // Update publication status
                if (data.status === 'published') {
                    updatePublishStatus(true);
                } else {
                    updatePublishStatus(false);
                }
                
                // Set menu data
                DAYS.forEach(day => {
                    const dayLower = day.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (data[dayLower]) {
                        menuData[day] = data[dayLower];
                    }
                });
                
                // Show menu for current day
                showMenuForDay(currentDay);
            } else {
                // No menu exists for this week
                updatePublishStatus(false);
                showMenuForDay(currentDay);
            }
            
            // Hide loading state
            showLoadingState(false);
        })
        .catch(error => {
            console.error("Error loading menu:", error);
            showErrorMessage("Error al cargar el menú. Por favor intente de nuevo.");
            showLoadingState(false);
        });
}

// Save menu to Firebase
async function saveMenu() {
    // Validate form
    if (!validateMenuForm()) {
        return;
    }
    
    // Show loading state
    showLoadingState(true);
    
    try {
        // Get current day's menu items
        const dayLower = currentDay.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const containerSelector = `#${dayLower}-items, #${dayLower}-content .menu-items-list, .menu-items-list`;
        const menuItemsContainer = document.querySelector(containerSelector);
        
        if (!menuItemsContainer) {
            throw new Error(`Menu items container for ${currentDay} not found`);
        }
        
        // Get menu items
        const menuItems = [];
        const menuItemElements = menuItemsContainer.querySelectorAll('.menu-item');
        
        menuItemElements.forEach(item => {
            const nameInput = item.querySelector('.menu-item-name');
            const descriptionInput = item.querySelector('.menu-item-description');
            
            if (nameInput && nameInput.value.trim() !== '') {
                menuItems.push({
                    name: nameInput.value.trim(),
                    description: descriptionInput ? descriptionInput.value.trim() : ''
                });
            }
        });
        
        // Update menu data for current day
        menuData[currentDay] = {
            items: menuItems
        };
        
        // Prepare data for Firestore
        const weekStartStr = formatDate(currentWeekStartDate);
        const menuDoc = {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Add menu data for each day
        DAYS.forEach(day => {
            const dayKey = day.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (menuData[day] && menuData[day].items) {
                menuDoc[dayKey] = menuData[day];
            }
        });
        
        // Update or create menu document
        await menuCollection.doc(weekStartStr).set(menuDoc, { merge: true });
        
        // Show success message
        showSuccessMessage('Menú guardado correctamente.');
    } catch (error) {
        console.error("Error saving menu:", error);
        showErrorMessage("Error al guardar el menú. Por favor intente de nuevo.");
    } finally {
        // Hide loading state
        showLoadingState(false);
    }
}

// Publish menu to Firebase
async function publishMenu() {
    // Show loading state
    showLoadingState(true);
    
    try {
        console.log("Intentando publicar menú...");
        const weekStartStr = formatDate(currentWeekStartDate);
        
        // First, get the current data to preserve any fields
        const menuDoc = await menuCollection.doc(weekStartStr).get();
        
        // Prepare the update data
        let updateData = {
            status: 'published',
            publishedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // If document exists, merge with existing data
        if (menuDoc.exists) {
            const currentData = menuDoc.data();
            // Update but don't overwrite existing fields
            updateData = { ...currentData, ...updateData };
        }
        
        // Update or create menu document
        await menuCollection.doc(weekStartStr).set(updateData, { merge: true });
        
        // Log success
        console.log("Menú publicado exitosamente");
        
        // Update publish status
        updatePublishStatus(true);
        
        // Show success message
        showSuccessMessage('Menú publicado correctamente.');
    } catch (error) {
        console.error("Error publishing menu:", error);
        showErrorMessage("Error al publicar el menú: " + error.message);
    } finally {
        // Hide loading state
        showLoadingState(false);
    }
}

// Validate menu form
function validateMenuForm() {
    // Find the current day's menu items container
    const dayLower = currentDay.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const containerSelector = `#${dayLower}-items, #${dayLower}-content .menu-items-list, .menu-items-list`;
    const menuItemsContainer = document.querySelector(containerSelector);
    
    if (!menuItemsContainer) {
        showErrorMessage(`No se encontró el contenedor de menú para ${currentDay}`);
        return false;
    }
    
    const menuItems = menuItemsContainer.querySelectorAll('.menu-item');
    
    if (menuItems.length === 0) {
        showErrorMessage("Debe agregar al menos un plato al menú.");
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
        showErrorMessage("Por favor complete los campos requeridos.");
    }
    
    return valid;
}

// Validate all days have menu items
function validateAllDays() {
    for (const day of DAYS) {
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
    showLoadingState(true);
    
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
        DAYS.forEach(day => {
            const dayKey = day.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (importedMenu[dayKey]) {
                menuData[day] = importedMenu[dayKey];
            }
        });
        
        // Show menu for current day
        showMenuForDay(currentDay);
        
        // Hide loading state
        showLoadingState(false);
        
        // Show success message
        showSuccessMessage('Menú importado correctamente.');
        
        // Reset file input
        event.target.value = '';
    }, 1000);
}

// Get Monday of the current week
function getMonday(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(date.setDate(diff));
}

// Format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date for display (DD/MM/YYYY)
function formatDateDisplay(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Show loading state
function showLoadingState(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
    
    // Optional: Disable buttons while loading
    if (isLoading) {
        document.querySelectorAll('button:not(.close-modal)').forEach(button => {
            button.disabled = true;
        });
    } else {
        document.querySelectorAll('button').forEach(button => {
            // Only enable non-publish buttons if menu is not published
            if (button.id !== 'publish-menu-btn' || !menuData.status || menuData.status !== 'published') {
                button.disabled = false;
            }
        });
    }
}

// Show error message
function showErrorMessage(message) {
    const errorAlert = document.getElementById('error-alert');
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    } else {
        // Fallback to alert if element not found
        alert("Error: " + message);
    }
}

// Show success message
function showSuccessMessage(message) {
    const successAlert = document.getElementById('success-alert');
    if (successAlert) {
        successAlert.textContent = message;
        successAlert.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            successAlert.style.display = 'none';
        }, 5000);
    } else {
        // Fallback to alert if element not found
        alert("Éxito: " + message);
    }
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
        showErrorMessage("Todos los días deben tener al menos un plato para publicar el menú.");
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