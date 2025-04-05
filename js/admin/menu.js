// Admin Menu Management for Comedor Grupo Avika

// Ensure admin only access
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth(USER_ROLES.ADMIN)) {
        return;
    }
    
    // Initialize the UI
    initializeDayTabs();
    initializeMenuForm();
    loadCurrentMenu();
    
    // Set up import functionality
    const importButton = document.getElementById('import-menu-button');
    if (importButton) {
        importButton.addEventListener('click', () => {
            document.getElementById('excel-file-input').click();
        });
    }
    
    const excelFileInput = document.getElementById('excel-file-input');
    if (excelFileInput) {
        excelFileInput.addEventListener('change', handleExcelFile);
    }
});

// Days of the week in Spanish - Now including Saturday and Sunday
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
let currentDay = DAYS[0]; // Default to Monday
let currentWeekStartDate = getMonday(new Date()); // Get Monday of current week
let menuData = {}; // Store menu data by day

// Initialize day tabs
function initializeDayTabs() {
    const tabsContainer = document.querySelector('.days-tabs');
    if (!tabsContainer) {
        console.warn('Day tabs container not found');
        return;
    }
    
    // Clear existing tabs
    tabsContainer.innerHTML = '';
    
    // Create tabs for each day
    DAYS.forEach(day => {
        const tabElement = document.createElement('button');
        tabElement.classList.add('day-tab');
        tabElement.textContent = day;
        tabElement.setAttribute('data-day', day.toLowerCase());
        
        if (day === currentDay) {
            tabElement.classList.add('active');
        }
        
        tabElement.addEventListener('click', () => {
            // Update active tab
            document.querySelectorAll('.day-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            tabElement.classList.add('active');
            
            // Update current day and load content
            currentDay = day;
            showMenuForDay(day);
        });
        
        tabsContainer.appendChild(tabElement);
    });
}

// Initialize menu form
function initializeMenuForm() {
    // Initialize add menu item buttons - using event delegation
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('add-menu-item')) {
            e.preventDefault();
            const day = e.target.getAttribute('data-day') || currentDay;
            addMenuItemField(day);
        }
    });
    
    // New menu button
    const newMenuButton = document.getElementById('new-menu-btn');
    if (newMenuButton) {
        newMenuButton.addEventListener('click', (e) => {
            e.preventDefault();
            showNewMenuModal();
        });
    }
    
    // Import Excel button
    const importExcelButton = document.getElementById('import-excel-btn');
    if (importExcelButton) {
        importExcelButton.addEventListener('click', (e) => {
            e.preventDefault();
            showImportExcelModal();
        });
    }
    
    // Publish menu button
    const publishMenuButton = document.getElementById('publish-menu-btn');
    if (publishMenuButton) {
        publishMenuButton.addEventListener('click', (e) => {
            e.preventDefault();
            showPublishMenuModal();
        });
    }
    
    // Week navigation buttons
    const prevWeekButton = document.getElementById('previous-week');
    if (prevWeekButton) {
        prevWeekButton.addEventListener('click', navigateToPreviousWeek);
    }
    
    const nextWeekButton = document.getElementById('next-week');
    if (nextWeekButton) {
        nextWeekButton.addEventListener('click', navigateToNextWeek);
    }
}

// Add a new menu item field
function addMenuItemField(day) {
    // Build a safe ID from the day
    const dayLower = day.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // We'll try different strategies to find the container
    let menuItemsContainer = null;
    
    // First try with ID
    menuItemsContainer = document.getElementById(`${dayLower}-items`);
    
    // If not found, look for content area
    if (!menuItemsContainer) {
        menuItemsContainer = document.getElementById(`${dayLower}-content`);
    }
    
    // If still not found, create a new container
    if (!menuItemsContainer) {
        // Try to find the content area
        const menuContent = document.querySelector('.menu-content');
        if (menuContent) {
            // Create a new container for this day
            menuItemsContainer = document.createElement('div');
            menuItemsContainer.id = `${dayLower}-items`;
            menuItemsContainer.className = 'menu-items-list';
            
            // Create a day content wrapper if needed
            let dayContent = document.getElementById(`${dayLower}-content`);
            if (!dayContent) {
                dayContent = document.createElement('div');
                dayContent.id = `${dayLower}-content`;
                dayContent.className = 'day-content';
                if (day === currentDay) {
                    dayContent.classList.add('active');
                }
                menuContent.appendChild(dayContent);
            }
            
            dayContent.appendChild(menuItemsContainer);
        } else {
            console.error('Cannot find or create menu items container');
            return;
        }
    }
    
    // Create menu item index
    const menuItemIndex = menuItemsContainer.querySelectorAll('.menu-item').length;
    
    // Create the menu item element
    const menuItem = document.createElement('div');
    menuItem.classList.add('menu-item');
    
    // Generate an ID for this item to make it easier to reference
    const itemId = `menu-item-${dayLower}-${menuItemIndex}`;
    menuItem.id = itemId;
    
    menuItem.innerHTML = `
        <div class="menu-item-header">
            <h4>Plato ${menuItemIndex + 1}</h4>
            <div class="menu-item-actions">
                <button type="button" class="btn btn-danger remove-menu-item" data-id="${itemId}">
                    Eliminar
                </button>
            </div>
        </div>
        <div class="form-group">
            <label for="${itemId}-name">Nombre del plato</label>
            <input type="text" id="${itemId}-name" class="form-control menu-item-name" required>
        </div>
        <div class="form-group">
            <label for="${itemId}-description">Descripción</label>
            <textarea id="${itemId}-description" class="form-control menu-item-description" rows="2"></textarea>
        </div>
    `;
    
    // Remove any empty state message
    const emptyState = menuItemsContainer.querySelector('.empty-state');
    if (emptyState) {
        menuItemsContainer.removeChild(emptyState);
    }
    
    // Append the menu item
    menuItemsContainer.appendChild(menuItem);
    
    // Add event listener to remove button using event delegation
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('remove-menu-item')) {
            const itemToRemove = document.getElementById(e.target.getAttribute('data-id'));
            if (itemToRemove && itemToRemove.parentNode) {
                itemToRemove.parentNode.removeChild(itemToRemove);
                updateMenuItemNumbers(itemToRemove.parentNode);
            }
        }
    }, { once: false });
}

// Update menu item numbers after removing an item
function updateMenuItemNumbers(container) {
    if (!container) return;
    
    const menuItems = container.querySelectorAll('.menu-item');
    menuItems.forEach((item, index) => {
        const header = item.querySelector('h4');
        if (header) {
            header.textContent = `Plato ${index + 1}`;
        }
    });
}

// Show menu for the selected day
function showMenuForDay(day) {
    // Store the current active tab
    const prevActiveDay = currentDay;
    
    // Update current day
    currentDay = day;
    
    // Update tab UI
    document.querySelectorAll('.day-tab').forEach(tab => {
        if (tab.textContent === day) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update content UI - first hide all
    document.querySelectorAll('.day-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show current day's content
    const dayLower = day.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const dayContent = document.getElementById(`${dayLower}-content`);
    
    if (dayContent) {
        dayContent.classList.add('active');
    }
    
    // Find the menu items container
    let menuItemsContainer = document.getElementById(`${dayLower}-items`);
    
    // If not found, try to find it inside the day content
    if (!menuItemsContainer && dayContent) {
        menuItemsContainer = dayContent.querySelector('.menu-items-list');
    }
    
    // If still not found, create one
    if (!menuItemsContainer) {
        // Create a content area if it doesn't exist
        let newDayContent;
        if (!dayContent) {
            newDayContent = document.createElement('div');
            newDayContent.id = `${dayLower}-content`;
            newDayContent.className = 'day-content active';
            
            const menuContent = document.querySelector('.menu-content');
            if (menuContent) {
                menuContent.appendChild(newDayContent);
            }
        }
        
        // Create the items container
        menuItemsContainer = document.createElement('div');
        menuItemsContainer.id = `${dayLower}-items`;
        menuItemsContainer.className = 'menu-items-list';
        
        (dayContent || newDayContent).appendChild(menuItemsContainer);
    }
    
    // Clear previous items
    menuItemsContainer.innerHTML = '';
    
    // Check if we have menu data for this day
    if (menuData[day] && menuData[day].items && menuData[day].items.length > 0) {
        // Add each menu item
        menuData[day].items.forEach((item, index) => {
            const itemId = `menu-item-${dayLower}-${index}`;
            
            const menuItem = document.createElement('div');
            menuItem.classList.add('menu-item');
            menuItem.id = itemId;
            
            menuItem.innerHTML = `
                <div class="menu-item-header">
                    <h4>Plato ${index + 1}</h4>
                    <div class="menu-item-actions">
                        <button type="button" class="btn btn-danger remove-menu-item" data-id="${itemId}">
                            Eliminar
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="${itemId}-name">Nombre del plato</label>
                    <input type="text" id="${itemId}-name" class="form-control menu-item-name" value="${item.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="${itemId}-description">Descripción</label>
                    <textarea id="${itemId}-description" class="form-control menu-item-description" rows="2">${item.description || ''}</textarea>
                </div>
            `;
            
            menuItemsContainer.appendChild(menuItem);
        });
    } else {
        // Show empty state
        menuItemsContainer.innerHTML = `
            <div class="empty-state">
                <p>No hay elementos en el menú para ${day}</p>
                <button class="btn btn-primary add-menu-item" data-day="${day}">Agregar Elemento</button>
            </div>
        `;
    }
}

// Load current menu for the week
function loadCurrentMenu() {
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

// Save menu
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
        const menuItemsContainer = document.getElementById(`${dayLower}-items`) || 
                                   document.querySelector(`#${dayLower}-content .menu-items-list`) ||
                                   document.querySelector('.menu-items-list');
        
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

// Publish menu
async function publishMenu() {
    // Validate all days have menu items
    if (!validateAllDays()) {
        showErrorMessage("Todos los días deben tener al menos un plato para publicar el menú.");
        return;
    }
    
    // Show loading state
    showLoadingState(true);
    
    try {
        const weekStartStr = formatDate(currentWeekStartDate);
        
        // Save the current menu first to ensure all changes are saved
        await saveMenu();
        
        // Update menu status to published
        await menuCollection.doc(weekStartStr).update({
            status: 'published',
            publishedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update publish status
        updatePublishStatus(true);
        
        // Show success message
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
    // Find the current day's menu items container
    const dayLower = currentDay.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const menuItemsContainer = document.getElementById(`${dayLower}-items`) || 
                              document.querySelector(`#${dayLower}-content .menu-items-list`) ||
                              document.querySelector('.menu-items-list');
    
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
        DAYS.forEach((day, index) => {
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

// Handle modal close
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

// Additional helper functions for showing modals
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

function showPublishMenuModal() {
    const modal = document.getElementById('publish-menu-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Navigation
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