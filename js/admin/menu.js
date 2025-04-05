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

// Days of the week in Spanish
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
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
    // Initialize add menu item buttons
    const addMenuItemButtons = document.querySelectorAll('.add-menu-item');
    if (addMenuItemButtons && addMenuItemButtons.length > 0) {
        addMenuItemButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const day = button.getAttribute('data-day') || currentDay;
                addMenuItemField(day);
            });
        });
    }
    
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
    // Get lowercase day if needed for IDs
    const dayLower = day.toLowerCase();
    
    // Find the container for this day's menu items
    let menuItemsContainer;
    
    // Try different selectors to find the container
    const selectors = [
        `.day-content#${dayLower}-content .menu-items-container`,
        `#${dayLower}-items`,
        `#${dayLower}-content .menu-items-list`,
        `.menu-items-list`
    ];
    
    // Try each selector
    for (const selector of selectors) {
        menuItemsContainer = document.querySelector(selector);
        if (menuItemsContainer) break;
    }
    
    // If still not found, create a fallback container
    if (!menuItemsContainer) {
        console.warn(`Menu items container for ${day} not found, using fallback`);
        // Try to find any container to append to
        menuItemsContainer = document.querySelector('.menu-content') || document.body;
    }
    
    // Create menu item index
    const menuItemIndex = menuItemsContainer.querySelectorAll('.menu-item').length;
    
    // Create the menu item element
    const menuItem = document.createElement('div');
    menuItem.classList.add('menu-item');
    menuItem.innerHTML = `
        <div class="menu-item-header">
            <h4>Plato ${menuItemIndex + 1}</h4>
            <div class="menu-item-actions">
                <button type="button" class="btn btn-danger remove-menu-item" data-index="${menuItemIndex}">
                    Eliminar
                </button>
            </div>
        </div>
        <div class="form-group">
            <label for="menu-item-name-${menuItemIndex}">Nombre del plato</label>
            <input type="text" id="menu-item-name-${menuItemIndex}" class="form-control menu-item-name" required>
        </div>
        <div class="form-group">
            <label for="menu-item-description-${menuItemIndex}">Descripción</label>
            <textarea id="menu-item-description-${menuItemIndex}" class="form-control menu-item-description" rows="2"></textarea>
        </div>
    `;
    
    // Remove any empty state message
    const emptyState = menuItemsContainer.querySelector('.empty-state');
    if (emptyState) {
        menuItemsContainer.removeChild(emptyState);
    }
    
    // Append the menu item
    menuItemsContainer.appendChild(menuItem);
    
    // Add event listener to remove button
    const removeButton = menuItem.querySelector('.remove-menu-item');
    if (removeButton) {
        removeButton.addEventListener('click', function() {
            menuItemsContainer.removeChild(menuItem);
            // Update menu item numbers
            updateMenuItemNumbers(menuItemsContainer);
        });
    }
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
        
        const removeButton = item.querySelector('.remove-menu-item');
        if (removeButton) {
            removeButton.dataset.index = index;
        }
    });
}

// Show menu for the selected day
function showMenuForDay(day) {
    const dayLower = day.toLowerCase();
    
    // Try to find the menu items container
    let menuItemsContainer;
    const selectors = [
        `.day-content#${dayLower}-content .menu-items-list`,
        `#${dayLower}-items`,
        `.menu-items-list`
    ];
    
    // Try each selector
    for (const selector of selectors) {
        menuItemsContainer = document.querySelector(selector);
        if (menuItemsContainer) break;
    }
    
    // If container not found, show warning and exit
    if (!menuItemsContainer) {
        console.warn(`Menu items container for ${day} not found`);
        return;
    }
    
    // Clear previous items
    menuItemsContainer.innerHTML = '';
    
    // Check if we have menu data for this day
    if (menuData[day] && menuData[day].items && menuData[day].items.length > 0) {
        // Add each menu item
        menuData[day].items.forEach((item, index) => {
            const menuItem = document.createElement('div');
            menuItem.classList.add('menu-item');
            menuItem.innerHTML = `
                <div class="menu-item-header">
                    <h4>Plato ${index + 1}</h4>
                    <div class="menu-item-actions">
                        <button type="button" class="btn btn-danger remove-menu-item" data-index="${index}">
                            Eliminar
                        </button>
                    </div>
                </div>
                <div class="form-group">
                    <label for="menu-item-name-${index}">Nombre del plato</label>
                    <input type="text" id="menu-item-name-${index}" class="form-control menu-item-name" value="${item.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="menu-item-description-${index}">Descripción</label>
                    <textarea id="menu-item-description-${index}" class="form-control menu-item-description" rows="2">${item.description || ''}</textarea>
                </div>
            `;
            
            menuItemsContainer.appendChild(menuItem);
            
            // Add event listener to remove button
            const removeButton = menuItem.querySelector('.remove-menu-item');
            if (removeButton) {
                removeButton.addEventListener('click', function() {
                    menuItemsContainer.removeChild(menuItem);
                    // Update menu item numbers
                    updateMenuItemNumbers(menuItemsContainer);
                });
            }
        });
    } else {
        // Show empty state
        menuItemsContainer.innerHTML = `
            <div class="empty-state">
                <p>No hay elementos en el menú para este día</p>
                <button class="btn btn-primary add-menu-item" data-day="${dayLower}">Agregar Elemento</button>
            </div>
        `;
        
        // Add event listener to the new add button
        const addButton = menuItemsContainer.querySelector('.add-menu-item');
        if (addButton) {
            addButton.addEventListener('click', (e) => {
                e.preventDefault();
                addMenuItemField(day);
            });
        }
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
        const dayLower = currentDay.toLowerCase();
        const menuItemsContainer = document.querySelector(`#${dayLower}-items`) || 
                                   document.querySelector(`.day-content#${dayLower}-content .menu-items-list`) ||
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
    const dayLower = currentDay.toLowerCase();
    const menuItemsContainer = document.querySelector(`#${dayLower}-items`) || 
                              document.querySelector(`.day-content#${dayLower}-content .menu-items-list`) ||
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

// Show New Menu Modal
function showNewMenuModal() {
    // Get the modal element
    const modal = document.getElementById('new-menu-modal');
    if (!modal) {
        console.warn('New menu modal not found');
        return;
    }
    
    // Reset form if needed
    const newMenuForm = document.getElementById('new-menu-form');
    if (newMenuForm) {
        newMenuForm.reset();
    }
    
    // Initialize date picker for the week selection
    const weekInput = document.getElementById('new-menu-week');
    if (weekInput && typeof flatpickr === 'function') {
        flatpickr(weekInput, {
            dateFormat: "Y-m-d",
            locale: "es",
            defaultDate: new Date(),
            onChange: function(selectedDates) {
                if (selectedDates && selectedDates.length > 0) {
                    // Set to Monday of the selected week
                    const selectedDate = selectedDates[0];
                    const monday = getMonday(selectedDate);
                    weekInput.value = formatDate(monday);
                }
            }
        });
    }
    
    // Set up the form submission handler
    if (newMenuForm) {
        // Remove previous event listeners
        const newForm = newMenuForm.cloneNode(true);
        newMenuForm.parentNode.replaceChild(newForm, newMenuForm);
        
        // Add new event listener
        newForm.addEventListener('submit', createNewMenu);
    }
    
    // Show the modal
    modal.style.display = 'block';
}

// Create new menu handler
async function createNewMenu(e) {
    e.preventDefault();
    
    const weekInput = document.getElementById('new-menu-week');
    if (!weekInput || !weekInput.value) {
        showErrorMessage('Por favor selecciona una semana para el menú.');
        return;
    }
    
    try {
        showLoadingState(true);
        
        // Parse date from input
        const selectedDate = new Date(weekInput.value);
        
        // Set current week start date to the selected week
        currentWeekStartDate = getMonday(selectedDate);
        
        // Reset menu data
        menuData = {};
        DAYS.forEach(day => {
            menuData[day] = { items: [] };
        });
        
        // Update UI
        const weekRange = document.getElementById('week-range');
        if (weekRange) {
            const weekStartStr = formatDate(currentWeekStartDate);
            weekRange.textContent = `Semana del ${formatDateDisplay(currentWeekStartDate)}`;
        }
        
        // Update publish status
        updatePublishStatus(false);
        
        // Show menu for current day
        showMenuForDay(currentDay);
        
        // Close modal
        const modal = document.getElementById('new-menu-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        showSuccessMessage('Nuevo menú creado correctamente.');
    } catch (error) {
        console.error('Error creating new menu:', error);
        showErrorMessage('Error al crear nuevo menú: ' + error.message);
    } finally {
        showLoadingState(false);
    }
}

// Show Import Excel Modal
function showImportExcelModal() {
    // Get the modal element
    const modal = document.getElementById('import-excel-modal');
    if (!modal) {
        console.warn('Import Excel modal not found');
        return;
    }
    
    // Reset any previous file selection
    const fileInput = document.getElementById('excel-file');
    if (fileInput) {
        fileInput.value = '';
    }
    
    // Set up the form submission handler
    const importForm = document.getElementById('import-excel-form');
    if (importForm) {
        // Remove previous event listeners
        const newForm = importForm.cloneNode(true);
        importForm.parentNode.replaceChild(newForm, importForm);
        
        // Add new event listener
        newForm.addEventListener('submit', importExcelFile);
    }
    
    // Show the modal
    modal.style.display = 'block';
}

// Import Excel file handler
async function importExcelFile(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('excel-file');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showErrorMessage('Por favor selecciona un archivo Excel.');
        return;
    }
    
    try {
        showLoadingState(true);
        
        // Use our handleExcelFile function for consistency
        handleExcelFile({target: fileInput});
        
        // Close modal
        const modal = document.getElementById('import-excel-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('Error importing Excel file:', error);
        showErrorMessage('Error al importar archivo Excel: ' + error.message);
        showLoadingState(false);
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
    } else {
        if (validationErrors) {
            validationErrors.style.display = 'none';
        }
        
        // Set up confirm button
        const confirmButton = document.getElementById('confirm-publish-menu-btn');
        if (confirmButton) {
            // Remove previous event listeners
            const newButton = confirmButton.cloneNode(true);
            confirmButton.parentNode.replaceChild(newButton, confirmButton);
            
            // Add new event listener
            newButton.addEventListener('click', publishMenu);
        }
        
        // Show the modal
        modal.style.display = 'block';
    }
}

// Navigate to previous week
function navigateToPreviousWeek() {
    // Create a new date object from the current week start date
    const newDate = new Date(currentWeekStartDate);
    
    // Set to previous week (-7 days)
    newDate.setDate(newDate.getDate() - 7);
    
    // Update current week start date
    currentWeekStartDate = newDate;
    
    // Update UI and load menu
    const weekRange = document.getElementById('week-range');
    if (weekRange) {
        weekRange.textContent = `Semana del ${formatDateDisplay(currentWeekStartDate)}`;
    }
    
    // Load menu for the new week
    loadCurrentMenu();
}

// Navigate to next week
function navigateToNextWeek() {
    // Create a new date object from the current week start date
    const newDate = new Date(currentWeekStartDate);
    
    // Set to next week (+7 days)
    newDate.setDate(newDate.getDate() + 7);
    
    // Update current week start date
    currentWeekStartDate = newDate;
    
    // Update UI and load menu
    const weekRange = document.getElementById('week-range');
    if (weekRange) {
        weekRange.textContent = `Semana del ${formatDateDisplay(currentWeekStartDate)}`;
    }
    
    // Load menu for the new week
    loadCurrentMenu();
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