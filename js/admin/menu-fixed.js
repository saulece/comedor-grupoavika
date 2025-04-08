// Admin Menu Management for Comedor Grupo Avika

// Use global Firebase references from firebase-config.js
// db and menuCollection are already defined

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
        // Botón agregar plato
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
            // Convertir primera letra a mayúscula para que coincida con el formato esperado
            const formattedDay = day.charAt(0).toUpperCase() + day.slice(1);
            changeActiveDay(formattedDay);
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
    const newMenuBtn = document.getElementById('new-menu-btn');
    if (newMenuBtn) {
        newMenuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showNewMenuModal();
        });
    }
    
    // Botón de importar Excel
    const importExcelBtn = document.getElementById('import-excel-btn');
    if (importExcelBtn) {
        importExcelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showImportExcelModal();
        });
    }
    
    // Botón de publicar menú
    const publishMenuBtn = document.getElementById('publish-menu-btn');
    if (publishMenuBtn) {
        publishMenuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showPublishMenuModal();
        });
    }
    
    // Botón guardar cambios
    const saveChangesBtn = document.getElementById('save-menu-btn');
    if (saveChangesBtn) {
        saveChangesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            saveMenu();
        });
    }
    
    // Setup file input for Excel import
    const excelFileInput = document.getElementById('excel-file');
    if (excelFileInput) {
        excelFileInput.addEventListener('change', handleExcelFile);
    }
    
    // Setup navigation buttons
    const prevWeekBtn = document.getElementById('previous-week');
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', navigateToPreviousWeek);
    }
    
    const nextWeekBtn = document.getElementById('next-week');
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
        if (tab.getAttribute('data-day') === day.toLowerCase()) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Actualizar título del día
    const dayTitle = document.getElementById('day-title');
    if (dayTitle) {
        dayTitle.textContent = `Menú del ${day}`;
    }
    
    // Show menu for current day
    showMenuForDay(day);
}

// Display menu for current day
function showMenuForDay(day) {
    // Get menu items for this day
    const dayItems = menuData[day] && menuData[day].items ? menuData[day].items : [];
    
    // Obtener el contenedor principal de menú
    const menuItemsContainer = document.getElementById('menu-items-container');
    if (!menuItemsContainer) {
        console.error('Contenedor principal de menú no encontrado');
        return;
    }
    
    // Limpiar el contenedor
    menuItemsContainer.innerHTML = '';
    
    // Crear un contenedor para los elementos del día actual
    const container = document.createElement('div');
    container.className = 'menu-items-list';
    container.setAttribute('data-day', day.toLowerCase());
    menuItemsContainer.appendChild(container);
    
    // Show menu items or empty state
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
        
        // Add click handler for the add button
        const addButton = container.querySelector('.agregar-plato');
        if (addButton) {
            addButton.addEventListener('click', showAddItemModal);
        }
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
    const modal = document.getElementById('menu-item-modal');
    if (!modal) {
        console.error('Modal para agregar platillo no encontrado');
        return;
    }
    
    // Reset form
    const form = document.getElementById('menu-item-form');
    if (form) {
        form.reset();
        
        // Clear edit item ID if it exists
        const editItemIdInput = document.getElementById('edit-item-id');
        if (editItemIdInput) {
            editItemIdInput.value = '';
        }
        
        // Set form submission handler
        form.onsubmit = function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('item-name').value;
            const description = document.getElementById('item-description').value;
            const type = document.getElementById('item-type').value;
            
            // Create new menu item
            const newItem = {
                name: name,
                description: description,
                type: type
            };
            
            // Add to current day's menu
            if (!menuData[currentDay]) {
                menuData[currentDay] = { items: [] };
            }
            
            menuData[currentDay].items.push(newItem);
            
            // Refresh display
            showMenuForDay(currentDay);
            
            // Close modal
            modal.style.display = 'none';
        };
    }
    
    modal.style.display = 'block';
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
    console.log('Iniciando guardado de menú...');
    // Show loading state
    showLoadingState(true);
    
    try {
        // Get current day's menu items
        const menuItemsContainer = document.getElementById('menu-items-container');
        
        if (!menuItemsContainer) {
            throw new Error(`Contenedor principal de menú no encontrado`);
        }
        
        // Buscar el contenedor de elementos del día actual
        const dayItemsList = menuItemsContainer.querySelector('.menu-items-list');
        
        if (!dayItemsList) {
            throw new Error(`Lista de elementos para ${currentDay} no encontrada`);
        }
        
        // Get menu items
        const menuItems = [];
        const menuItemElements = dayItemsList.querySelectorAll('.menu-item');
        
        console.log(`Encontrados ${menuItemElements.length} elementos para el día ${currentDay}`);
        
        menuItemElements.forEach((item, index) => {
            const nameInput = item.querySelector('.menu-item-name');
            const descriptionInput = item.querySelector('.menu-item-description');
            
            if (nameInput && nameInput.value.trim() !== '') {
                menuItems.push({
                    name: nameInput.value.trim(),
                    description: descriptionInput ? descriptionInput.value.trim() : ''
                });
                console.log(`Elemento ${index + 1} agregado: ${nameInput.value.trim()}`);
            }
        });
        
        // Update menu data for current day
        menuData[currentDay] = {
            items: menuItems
        };
        
        console.log(`Menú actualizado para ${currentDay}:`, menuData[currentDay]);
        
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
        
        console.log('Guardando en Firebase:', menuDoc);
        
        // Update or create menu document
        await menuCollection.doc(weekStartStr).set(menuDoc, { merge: true });
        
        // Show success message
        showSuccessMessage('Menú guardado correctamente.');
        console.log('Menú guardado con éxito');
    } catch (error) {
        console.error("Error saving menu:", error);
        showErrorMessage("Error al guardar el menú: " + error.message);
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
        
        // Update the document
        await menuCollection.doc(weekStartStr).set(updateData);
        
        // Update UI
        updatePublishStatus(true);
        showSuccessMessage('Menú publicado correctamente.');
    } catch (error) {
        console.error("Error publishing menu:", error);
        showErrorMessage("Error al publicar el menú. Por favor intente de nuevo.");
    } finally {
        // Hide loading state
        showLoadingState(false);
    }
}

// Validate menu form
function validateMenuForm() {
    // Get current day's menu items
    const menuItemsContainer = document.querySelector('.menu-items-list');
    
    if (!menuItemsContainer) {
        showErrorMessage(`No se encontró el contenedor de menú para ${currentDay}`);
        return false;
    }
    
    // Check if there are any menu items
    const menuItems = menuItemsContainer.querySelectorAll('.menu-item');
    if (menuItems.length === 0) {
        // It's valid to have no items, but we should warn the user
        console.warn(`No hay platillos para ${currentDay}`);
    }
    
    // Check if all menu items have a name
    let isValid = true;
    menuItems.forEach((item, index) => {
        const nameInput = item.querySelector('.menu-item-name');
        if (!nameInput || nameInput.value.trim() === '') {
            showErrorMessage(`El platillo ${index + 1} no tiene nombre`);
            isValid = false;
        }
    });
    
    return isValid;
}

// Validate all days have menu items
function validateAllDays() {
    let isValid = true;
    let emptyDays = [];
    
    DAYS.forEach(day => {
        if (!menuData[day] || !menuData[day].items || menuData[day].items.length === 0) {
            emptyDays.push(day);
            isValid = false;
        }
    });
    
    if (!isValid) {
        showErrorMessage(`Los siguientes días no tienen platillos: ${emptyDays.join(', ')}`);
    }
    
    return isValid;
}

// Update publish status UI
function updatePublishStatus(isPublished) {
    const statusBadge = document.getElementById('menu-status');
    if (statusBadge) {
        if (isPublished) {
            statusBadge.textContent = 'Publicado';
            statusBadge.className = 'badge badge-success';
        } else {
            statusBadge.textContent = 'Borrador';
            statusBadge.className = 'badge badge-warning';
        }
    }
    
    // Update publish button state
    const publishBtn = document.getElementById('publish-menu-btn');
    if (publishBtn) {
        if (isPublished) {
            publishBtn.disabled = true;
            publishBtn.title = 'Este menú ya está publicado';
        } else {
            publishBtn.disabled = false;
            publishBtn.title = 'Publicar este menú';
        }
    }
}

// Handle Excel file import
function handleExcelFile(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    
    // Show loading state
    showLoadingState(true);
    
    // Use SheetJS to read Excel file
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            // Process each sheet (day)
            DAYS.forEach(day => {
                const dayLower = day.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const sheetName = day;
                
                // Skip if sheet doesn't exist
                if (!workbook.SheetNames.includes(sheetName)) {
                    console.warn(`Sheet for ${day} not found in Excel file`);
                    return;
                }
                
                // Get sheet data
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet);
                
                // Process items
                const items = json.map(row => {
                    return {
                        name: row.Nombre || row.nombre || row.Name || row.name || '',
                        description: row.Descripcion || row.descripcion || row.Description || row.description || ''
                    };
                }).filter(item => item.name.trim() !== '');
                
                // Update menu data
                menuData[day] = { items };
            });
            
            // Show current day menu
            showMenuForDay(currentDay);
            
            // Show success message
            showSuccessMessage('Menú importado correctamente');
        } catch (error) {
            console.error('Error importing Excel file:', error);
            showErrorMessage('Error al importar el archivo Excel. Asegúrate de que el formato sea correcto.');
        } finally {
            // Hide loading state
            showLoadingState(false);
            
            // Reset file input
            event.target.value = '';
        }
    };
    
    reader.onerror = function() {
        console.error('Error reading Excel file');
        showErrorMessage('Error al leer el archivo Excel');
        showLoadingState(false);
        event.target.value = '';
    };
    
    reader.readAsArrayBuffer(file);
}

// Get Monday of the current week
function getMonday(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
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
        if (isLoading) {
            loadingIndicator.style.display = 'flex';
        } else {
            loadingIndicator.style.display = 'none';
        }
    }
    
    // Disable buttons while loading
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = isLoading;
    });
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
    // Validate all days have menu items
    if (!validateAllDays()) {
        return;
    }
    
    const modal = document.getElementById('publish-menu-modal');
    if (!modal) {
        console.error('Publish menu modal not found');
        return;
    }
    
    // Reset validation errors
    const validationErrors = document.getElementById('publish-menu-validation-errors');
    if (validationErrors) {
        validationErrors.style.display = 'none';
        validationErrors.innerHTML = '';
    }
    
    // Set confirm button handler
    const confirmBtn = document.getElementById('confirm-publish-menu-btn');
    if (confirmBtn) {
        confirmBtn.onclick = function() {
            modal.style.display = 'none';
            publishMenu();
        };
    }
    
    modal.style.display = 'block';
}

// Navigation functions
function navigateToPreviousWeek() {
    const prevWeek = new Date(currentWeekStartDate);
    prevWeek.setDate(prevWeek.getDate() - 7);
    currentWeekStartDate = prevWeek;
    loadCurrentMenu();
}

function navigateToNextWeek() {
    const nextWeek = new Date(currentWeekStartDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    currentWeekStartDate = nextWeek;
    loadCurrentMenu();
}
