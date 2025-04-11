// Menu.js - Admin Menu Management

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and role
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = '../../index.html';
            return;
        }
        
        // Check if user is admin
        const isAdmin = await isUserAdmin();
        
        if (!isAdmin) {
            // Redirect non-admin users
            window.location.href = '../../index.html';
            return;
        }
        
        // Display user name
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            document.getElementById('userName').textContent = userDoc.data().displayName || 'Administrador';
        }
        
        // Initialize menu management
        initMenuManagement();
    });
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await logout();
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    });
});

// Initialize menu management
function initMenuManagement() {
    // DOM elements
    const weekDatesElement = document.getElementById('weekDates');
    const menuStatusElement = document.getElementById('menuStatus');
    const createMenuBtn = document.getElementById('createMenuBtn');
    const publishMenuBtn = document.getElementById('publishMenuBtn');
    const menuSelector = document.getElementById('menuSelector');
    const saveMenuBtn = document.getElementById('saveMenuBtn');
    const dayTabs = document.querySelectorAll('.day-tab');
    const menuFormMessage = document.getElementById('menuFormMessage');
    const createMenuModal = document.getElementById('createMenuModal');
    const createMenuForm = document.getElementById('createMenuForm');
    const closeModalBtn = document.querySelector('.close-modal');
    const menuStartDateInput = document.getElementById('menuStartDate');
    const cancelCreateMenuBtn = document.getElementById('cancelCreateMenu');
    const confirmCreateMenuBtn = document.getElementById('confirmCreateMenu');
    const createMenuError = document.getElementById('createMenuError');
    const mainDishInput = document.getElementById('mainDish');
    const sideDishInput = document.getElementById('sideDish');
    const dessertInput = document.getElementById('dessert');
    const vegetarianOptionInput = document.getElementById('vegetarianOption');
    
    // State variables
    let currentDay = 'monday';
    let currentWeekId = null;
    let nextWeekId = null;
    let menuData = null;
    let nextMenuData = null;
    let activeMenuType = 'current'; // 'current' or 'next'
    
    // Menu selector change event
    if (menuSelector) {
        menuSelector.addEventListener('change', () => {
            activeMenuType = menuSelector.value;
            console.log('Cambiando a menú:', activeMenuType);
            
            if (activeMenuType === 'current') {
                // Switch to current menu
                if (currentWeekId) {
                    displayMenuData(currentWeekId, menuData);
                } else {
                    // No current menu, show empty state
                    showEmptyState('No hay menú para la semana actual.');
                }
            } else {
                // Switch to next week menu
                if (nextWeekId) {
                    displayMenuData(nextWeekId, nextMenuData);
                } else {
                    // No next week menu, show empty state
                    showEmptyState('No hay menú creado para la próxima semana.');
                }
            }
        });
    }
    
    // Get current menu or create a new one
    loadCurrentMenu();
    
    // Event listeners for day tabs
    dayTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update current day
            currentDay = tab.dataset.day;
            
            // Update active tab
            dayTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Load day menu
            loadDayMenu();
            
            console.log('Día seleccionado:', currentDay);
        });
    });
    
    // Save menu button
    saveMenuBtn.addEventListener('click', saveDayMenu);
    
    // Create menu button
    createMenuBtn.addEventListener('click', async () => {
        // Show modal
        createMenuModal.style.display = 'block';
        
        // Set default date to today
        const today = new Date();
        menuStartDateInput.valueAsDate = today;
        
        // Clear error message
        createMenuError.textContent = '';
        createMenuError.style.display = 'none';
    });
    
    // Close modal button
    closeModalBtn.addEventListener('click', () => {
        createMenuModal.style.display = 'none';
    });
    
    // Cancel create menu button
    cancelCreateMenuBtn.addEventListener('click', () => {
        createMenuModal.style.display = 'none';
    });
    
    // Confirm create menu button
    createMenuForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            // Get selected date
            const selectedDate = menuStartDateInput.valueAsDate;
            
            if (!selectedDate) {
                createMenuError.textContent = 'Por favor seleccione una fecha de inicio.';
                createMenuError.style.display = 'block';
                return;
            }
            
            // Determine if we're creating for current or next week based on the active menu type
            const targetWeek = activeMenuType;
            console.log(`Creando menú para la ${targetWeek === 'current' ? 'semana actual' : 'próxima semana'}`);
            
            // Calculate the Monday of the selected week
            const monday = new Date(selectedDate);
            const dayOfWeek = monday.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            
            // Adjust to previous Monday
            monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
            
            // Set time to midnight
            monday.setHours(0, 0, 0, 0);
            
            console.log('Fecha de inicio seleccionada:', selectedDate);
            console.log('Lunes calculado:', monday);
            
            // Check if a menu already exists for this week
            const existingMenuQuery = await db.collection('weeklyMenus')
                .where('startDate', '==', firebase.firestore.Timestamp.fromDate(monday))
                .get();
            
            if (!existingMenuQuery.empty) {
                createMenuError.textContent = 'Ya existe un menú para esta semana. Por favor seleccione otra fecha.';
                createMenuError.style.display = 'block';
                return;
            }
            
            // Create new menu
            const newMenuRef = await db.collection('weeklyMenus').add({
                startDate: firebase.firestore.Timestamp.fromDate(monday),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser.uid,
                status: 'pending',
                totalEmployees: 0,
                confirmedEmployees: 0
            });
            
            console.log('Nuevo menú creado con ID:', newMenuRef.id);
            
            // Create empty daily menus
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const batch = db.batch();
            
            days.forEach((day, index) => {
                const dayDate = new Date(monday);
                dayDate.setDate(dayDate.getDate() + index);
                
                const dayMenuRef = db.collection('weeklyMenus')
                    .doc(newMenuRef.id)
                    .collection('dailyMenus')
                    .doc(day);
                
                batch.set(dayMenuRef, {
                    date: firebase.firestore.Timestamp.fromDate(dayDate),
                    mainDish: '',
                    sideDish: '',
                    dessert: '',
                    vegetarianOption: '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            await batch.commit();
            console.log('Menús diarios creados');
            
            // Close modal
            createMenuModal.style.display = 'none';
            
            // Show success message
            showMessage('Menú creado correctamente.', 'success');
            
            // Reload menu data
            await loadCurrentMenu();
            
            // Set the menu selector to the type we just created
            menuSelector.value = targetWeek;
            
            // Trigger the change event to display the correct menu
            const changeEvent = new Event('change');
            menuSelector.dispatchEvent(changeEvent);
        } catch (error) {
            console.error('Error creating menu:', error);
            createMenuError.textContent = 'Error al crear el menú. Intente nuevamente.';
            createMenuError.style.display = 'block';
        }
    });
    
    // Publish menu button
    publishMenuBtn.addEventListener('click', async () => {
        try {
            // Determine which menu ID to use based on active menu type
            const activeMenuId = activeMenuType === 'current' ? currentWeekId : nextWeekId;
            const activeMenuData = activeMenuType === 'current' ? menuData : nextMenuData;
            
            if (!activeMenuId || !activeMenuData) {
                console.log('No hay un menú activo para publicar');
                showMessage('No hay un menú para publicar.', 'error');
                return;
            }
            
            // Check if menu is complete
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            let isComplete = true;
            
            for (const day of days) {
                const dayMenu = activeMenuData.dailyMenus[day];
                if (!dayMenu || !dayMenu.mainDish || dayMenu.mainDish.trim() === '') {
                    isComplete = false;
                    break;
                }
            }
            
            if (!isComplete) {
                showMessage('Para publicar el menú, debe completar el platillo principal para todos los días.', 'warning');
                return;
            }
            
            // Confirm publish
            if (!confirm('¿Está seguro de publicar este menú? Una vez publicado, no podrá modificarlo.')) {
                return;
            }
            
            console.log(`Publicando menú ${activeMenuType}...`);
            
            // Update menu status
            await db.collection('weeklyMenus').doc(activeMenuId).update({
                status: 'published',
                publishedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('Menú publicado correctamente');
            
            // Update local data
            if (activeMenuType === 'current' && menuData) {
                menuData.status = 'published';
                menuData.publishedAt = new Date();
            } else if (activeMenuType === 'next' && nextMenuData) {
                nextMenuData.status = 'published';
                nextMenuData.publishedAt = new Date();
            }
            
            // Update UI
            displayMenuDetails(activeMenuType === 'current' ? menuData : nextMenuData);
            
            // Disable form
            toggleFormEditable(false);
            
            // Disable publish button
            publishMenuBtn.disabled = true;
            
            showMessage('Menú publicado correctamente. Los empleados ahora pueden verlo.', 'success');
        } catch (error) {
            console.error('Error publishing menu:', error);
            showMessage('Error al publicar el menú. Intente nuevamente.', 'error');
        }
    });
    
    // Load current menu data
    async function loadCurrentMenu() {
        try {
            console.log('Cargando menús...');
            
            // Reset current state
            currentWeekId = null;
            nextWeekId = null;
            menuData = null;
            nextMenuData = null;
            
            // Get current date
            const today = new Date();
            
            // Query for all menus, ordered by start date
            console.log('Buscando menús...');
            const menuSnapshot = await db.collection('weeklyMenus')
                .orderBy('startDate', 'desc')
                .limit(5) // Get more menus to find current and next week
                .get();
            
            console.log('Menús encontrados:', menuSnapshot.size);
            
            if (menuSnapshot.empty) {
                console.log('No se encontraron menús');
                showEmptyState('No hay ningún menú creado. Utilice el botón "Crear Menú" para crear uno nuevo.');
                return;
            }
            
            // Find current and next week menus
            const menus = menuSnapshot.docs.map(doc => {
                return {
                    id: doc.id,
                    data: doc.data(),
                    startDate: doc.data().startDate.toDate()
                };
            });
            
            // Sort menus by start date (ascending)
            menus.sort((a, b) => a.startDate - b.startDate);
            
            // Find current week menu (the menu with start date closest to today but not in the future)
            const currentWeekMenu = menus.find(menu => {
                const menuStartDate = menu.startDate;
                const menuEndDate = new Date(menuStartDate);
                menuEndDate.setDate(menuEndDate.getDate() + 6); // End date is 6 days after start date
                
                return today >= menuStartDate && today <= menuEndDate;
            });
            
            // Find next week menu (the menu with start date after current week end date)
            let nextWeekMenu = null;
            
            if (currentWeekMenu) {
                const currentWeekEndDate = new Date(currentWeekMenu.startDate);
                currentWeekEndDate.setDate(currentWeekEndDate.getDate() + 6);
                
                nextWeekMenu = menus.find(menu => menu.startDate > currentWeekEndDate);
            } else {
                // If no current week menu, next week menu is the first menu with start date in the future
                nextWeekMenu = menus.find(menu => menu.startDate > today);
            }
            
            console.log('Menú semana actual:', currentWeekMenu);
            console.log('Menú próxima semana:', nextWeekMenu);
            
            // Set current week menu
            if (currentWeekMenu) {
                currentWeekId = currentWeekMenu.id;
                menuData = currentWeekMenu.data;
                
                // Load daily menus for current week
                const dailyMenusSnapshot = await db.collection('weeklyMenus')
                    .doc(currentWeekId)
                    .collection('dailyMenus')
                    .get();
                
                menuData.dailyMenus = {};
                
                dailyMenusSnapshot.forEach(doc => {
                    menuData.dailyMenus[doc.id] = doc.data();
                });
            }
            
            // Set next week menu
            if (nextWeekMenu) {
                nextWeekId = nextWeekMenu.id;
                nextMenuData = nextWeekMenu.data;
                
                // Load daily menus for next week
                const nextDailyMenusSnapshot = await db.collection('weeklyMenus')
                    .doc(nextWeekId)
                    .collection('dailyMenus')
                    .get();
                
                nextMenuData.dailyMenus = {};
                
                nextDailyMenusSnapshot.forEach(doc => {
                    nextMenuData.dailyMenus[doc.id] = doc.data();
                });
            }
            
            // Display menu based on active menu type
            if (activeMenuType === 'current') {
                if (currentWeekId) {
                    // Display current week menu
                    displayMenuDetails(menuData);
                    
                    // Set current day to Monday by default if not set
                    if (!currentDay) {
                        currentDay = 'monday';
                        
                        // Highlight Monday tab
                        dayTabs.forEach(tab => {
                            if (tab.dataset.day === 'monday') {
                                tab.classList.add('active');
                            } else {
                                tab.classList.remove('active');
                            }
                        });
                    }
                    
                    // Load first day menu
                    loadDayMenu();
                    
                    // Check menu completeness
                    checkMenuCompleteness();
                } else {
                    // No current week menu
                    showEmptyState('No hay menú para la semana actual. Utilice el botón "Crear Menú" para crear uno nuevo.');
                }
            } else {
                if (nextWeekId) {
                    // Display next week menu
                    displayMenuDetails(nextMenuData);
                    
                    // Set current day to Monday by default if not set
                    if (!currentDay) {
                        currentDay = 'monday';
                        
                        // Highlight Monday tab
                        dayTabs.forEach(tab => {
                            if (tab.dataset.day === 'monday') {
                                tab.classList.add('active');
                            } else {
                                tab.classList.remove('active');
                            }
                        });
                    }
                    
                    // Load first day menu
                    loadDayMenu();
                    
                    // Check menu completeness
                    checkMenuCompleteness();
                } else {
                    // No next week menu
                    showEmptyState('No hay menú creado para la próxima semana. Utilice el botón "Crear Menú" para crear uno nuevo.');
                }
            }
            
            // Always enable create menu button
            createMenuBtn.disabled = false;
        } catch (error) {
            console.error('Error loading menu:', error);
            showMessage('Error al cargar los datos del menú.', 'error');
            
            // Always enable create menu button even on error
            createMenuBtn.disabled = false;
        }
    }
    
    // Display menu details
    function displayMenuDetails(menuData) {
        if (!menuData) {
            console.log('No hay datos de menú para mostrar');
            return;
        }
        
        console.log('Mostrando detalles del menú...');
        
        // Format dates
        const startDate = menuData.startDate.toDate();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // Add 6 days to get to Sunday
        
        // Display date range
        const dateRange = `${formatDateDMY(startDate)} al ${formatDateDMY(endDate)}`;
        weekDatesElement.textContent = dateRange;
        console.log('Rango de fechas:', dateRange);
        
        // Display status
        const statusText = getStatusText(menuData.status);
        menuStatusElement.textContent = statusText;
        menuStatusElement.className = `status-badge ${menuData.status}`;
        console.log('Estado del menú:', statusText);
        
        // Enable/disable publish button based on status
        publishMenuBtn.disabled = menuData.status !== 'pending';
        
        // Update stats
        updateStats(
            menuData.totalEmployees || 0,
            menuData.confirmedEmployees || 0
        );
    }
    
    // Load day menu
    function loadDayMenu() {
        console.log('Cargando menú del día:', currentDay);
        
        // Determine which menu data to use based on active menu type
        const activeMenuId = activeMenuType === 'current' ? currentWeekId : nextWeekId;
        const activeMenuData = activeMenuType === 'current' ? menuData : nextMenuData;
        
        console.log('Tipo de menú activo:', activeMenuType);
        console.log('ID del menú activo:', activeMenuId);
        
        if (!activeMenuData || !activeMenuData.dailyMenus) {
            console.log('No hay datos de menú disponibles');
            clearMenuForm();
            return;
        }
        
        // Normalize the current day to handle accented characters
        const normalizedCurrentDay = normalizeDayName(currentDay);
        let dayKey = currentDay;
        
        // Check if we need to find the day with a different key due to accents
        if (!activeMenuData.dailyMenus[currentDay]) {
            console.log(`Buscando menú para el día ${currentDay} usando normalización`);
            // Try to find the day using normalized comparison
            for (const day in activeMenuData.dailyMenus) {
                if (normalizeDayName(day) === normalizedCurrentDay) {
                    dayKey = day;
                    console.log(`Día encontrado con clave: ${dayKey}`);
                    break;
                }
            }
            
            if (dayKey !== currentDay && !activeMenuData.dailyMenus[dayKey]) {
                console.log(`No se encontró el menú para el día ${currentDay}`);
                clearMenuForm();
                return;
            }
        }
        
        const dayMenu = activeMenuData.dailyMenus[dayKey];
        console.log('Datos del menú del día:', dayMenu);
        
        // Fill form
        mainDishInput.value = dayMenu.mainDish || '';
        sideDishInput.value = dayMenu.sideDish || '';
        dessertInput.value = dayMenu.dessert || '';
        vegetarianOptionInput.value = dayMenu.vegetarianOption || '';
        
        console.log('Formulario completado con los datos del día');
        
        // Disable form if menu is not in pending status
        const isEditable = activeMenuData.status === 'pending';
        toggleFormEditable(isEditable);
        console.log('Estado de edición del formulario:', isEditable ? 'Editable' : 'No editable');
    }
    
    // Clear menu form
    function clearMenuForm() {
        mainDishInput.value = '';
        sideDishInput.value = '';
        dessertInput.value = '';
        vegetarianOptionInput.value = '';
    }
    
    // Toggle form editable state
    function toggleFormEditable(isEditable) {
        mainDishInput.disabled = !isEditable;
        sideDishInput.disabled = !isEditable;
        dessertInput.disabled = !isEditable;
        vegetarianOptionInput.disabled = !isEditable;
        saveMenuBtn.disabled = !isEditable;
    }
    
    // Check if menu is complete to enable publish button
    function checkMenuCompleteness() {
        // Determine which menu data to use based on active menu type
        const activeMenuData = activeMenuType === 'current' ? menuData : nextMenuData;
        
        if (!activeMenuData || !activeMenuData.dailyMenus) {
            console.log('No hay datos de menú para verificar completitud');
            return;
        }
        
        console.log('Verificando completitud del menú:', activeMenuType);
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        let completedDays = 0;
        
        days.forEach(day => {
            const dayMenu = activeMenuData.dailyMenus[day];
            if (dayMenu && dayMenu.mainDish && dayMenu.mainDish.trim() !== '') {
                completedDays++;
            }
        });
        
        console.log(`Días completados: ${completedDays}/${days.length}`);
        
        // Update stats
        updateStats(days.length, completedDays);
        
        // Enable/disable publish button based on completeness and status
        const isComplete = completedDays === days.length;
        const isPending = activeMenuData.status === 'pending';
        
        publishMenuBtn.disabled = !isComplete || !isPending;
        
        if (!isComplete && isPending) {
            publishMenuBtn.title = 'Debe completar todos los días del menú para publicarlo';
        } else if (!isPending) {
            publishMenuBtn.title = 'Este menú ya ha sido publicado';
        } else {
            publishMenuBtn.title = 'Publicar menú';
        }
    }
    
    // Update stats display
    function updateStats(totalEmployees, confirmedEmployees) {
        const totalEmployeesElement = document.getElementById('totalEmployees');
        const confirmedEmployeesElement = document.getElementById('confirmedEmployees');
        const confirmationPercentageElement = document.getElementById('confirmationPercentage');
        
        if (totalEmployeesElement) totalEmployeesElement.textContent = totalEmployees;
        if (confirmedEmployeesElement) confirmedEmployeesElement.textContent = confirmedEmployees;
        
        // Calculate percentage
        if (confirmationPercentageElement) {
            const percentage = totalEmployees > 0 
                ? Math.round((confirmedEmployees / totalEmployees) * 100) 
                : 0;
            
            confirmationPercentageElement.textContent = `${percentage}%`;
        }
    }
    
    // Start countdown timer for confirmation deadline
    function startCountdownTimer() {
        // Clear any existing interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        
        // If menu is not in-progress, don't start timer
        if (!menuData || menuData.status !== 'in-progress') {
            const timeRemainingElement = document.getElementById('timeRemaining');
            if (timeRemainingElement) timeRemainingElement.textContent = '--:--:--';
            return;
        }
        
        // Get confirmation end time
        const endTime = menuData.confirmEndDate.toDate();
        const timeRemainingElement = document.getElementById('timeRemaining');
        
        if (!timeRemainingElement) return;
        
        // Update immediately and then every second
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
        
        function updateCountdown() {
            const now = new Date();
            const timeDiff = endTime - now;
            
            if (timeDiff <= 0) {
                // Time has expired
                clearInterval(countdownInterval);
                timeRemainingElement.textContent = 'Finalizado';
                return;
            }
            
            // Calculate hours, minutes, seconds
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
            
            // Format time
            timeRemainingElement.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
        }
    }
    
    // Display message in form
    function showMessage(message, type = 'info') {
        if (!menuFormMessage) return;
        
        menuFormMessage.className = 'message-container';
        menuFormMessage.classList.add(`message-${type}`);
        menuFormMessage.textContent = message;
        
        // Clear message after 5 seconds
        setTimeout(() => {
            menuFormMessage.textContent = '';
            menuFormMessage.className = 'message-container';
        }, 5000);
    }
    
    // Save day menu
    async function saveDayMenu() {
        try {
            // Determine which menu ID to use based on active menu type
            const activeMenuId = activeMenuType === 'current' ? currentWeekId : nextWeekId;
            
            if (!activeMenuId) {
                console.log('No hay un menú activo para guardar');
                showMessage('No hay un menú para guardar.', 'error');
                return;
            }
            
            console.log(`Guardando menú del día ${currentDay} para el menú ${activeMenuType}`);
            
            // Get form values
            const mainDish = mainDishInput.value.trim();
            const sideDish = sideDishInput.value.trim();
            const dessert = dessertInput.value.trim();
            const vegetarianOption = vegetarianOptionInput.value.trim();
            
            // Validate form
            if (!mainDish || !sideDish || !dessert) {
                showMessage('Por favor complete todos los campos obligatorios.', 'error');
                return;
            }
            
            // Normalize the current day to handle accented characters
            const normalizedCurrentDay = normalizeDayName(currentDay);
            let dayKey = currentDay;
            
            // Check if we need to find the day with a different key due to accents
            const dailyMenusRef = db.collection('weeklyMenus').doc(activeMenuId).collection('dailyMenus');
            const dailyMenusSnapshot = await dailyMenusRef.get();
            
            // Try to find the day using normalized comparison if it doesn't exist directly
            const currentDayDoc = await dailyMenusRef.doc(currentDay).get();
            if (!currentDayDoc.exists) {
                console.log(`Buscando documento para el día ${currentDay} usando normalización`);
                
                for (const doc of dailyMenusSnapshot.docs) {
                    if (normalizeDayName(doc.id) === normalizedCurrentDay) {
                        dayKey = doc.id;
                        console.log(`Documento encontrado con clave: ${dayKey}`);
                        break;
                    }
                }
            }
            
            // Save to Firestore
            await db.collection('weeklyMenus')
                .doc(activeMenuId)
                .collection('dailyMenus')
                .doc(dayKey)
                .set({
                    mainDish,
                    sideDish,
                    dessert,
                    vegetarianOption,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            console.log(`Menú del día ${currentDay} guardado correctamente`);
            
            // Update local data
            if (activeMenuType === 'current' && menuData && menuData.dailyMenus) {
                menuData.dailyMenus[dayKey] = {
                    mainDish,
                    sideDish,
                    dessert,
                    vegetarianOption
                };
            } else if (activeMenuType === 'next' && nextMenuData && nextMenuData.dailyMenus) {
                nextMenuData.dailyMenus[dayKey] = {
                    mainDish,
                    sideDish,
                    dessert,
                    vegetarianOption
                };
            }
            
            // Check menu completeness
            checkMenuCompleteness();
            
            showMessage('Menú guardado correctamente.', 'success');
        } catch (error) {
            console.error('Error saving day menu:', error);
            showMessage('Error al guardar el menú.', 'error');
        }
    }
}

// Helper Functions

// Normalize day name to handle accented characters
function normalizeDayName(dayName) {
    if (!dayName) return '';
    // Convert to lowercase and remove accents
    return dayName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Get next Monday
function getNextMonday() {
    const date = new Date();
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days to add to get to next Monday
    const daysToAdd = (day === 0) ? 1 : 8 - day;
    
    date.setDate(date.getDate() + daysToAdd);
    date.setHours(0, 0, 0, 0);
    
    return date;
}

// Format date for input field (YYYY-MM-DD)
function formatDateYMD(date) {
    const year = date.getFullYear();
    const month = padZero(date.getMonth() + 1);
    const day = padZero(date.getDate());
    
    return `${year}-${month}-${day}`;
}

// Format date for display (DD/MM/YYYY)
function formatDateDMY(date) {
    const day = padZero(date.getDate());
    const month = padZero(date.getMonth() + 1);
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Pad number with zero
function padZero(num) {
    return num.toString().padStart(2, '0');
}

// Get status text
function getStatusText(status) {
    switch (status) {
        case 'pending':
            return 'Pendiente';
        case 'in-progress':
            return 'En Progreso';
        case 'completed':
            return 'Completado';
        default:
            return 'Desconocido';
    }
}

// Display empty state
function showEmptyState(message) {
    document.getElementById('menuForm').innerHTML = `
        <div class="empty-state">
            <p>${message}</p>
        </div>
    `;
}

// Display menu data
function displayMenuData(weekId, menuData) {
    // Update menu details
    displayMenuDetails(menuData);
    
    // Load daily menus
    console.log('Cargando menús diarios...');
    const dailyMenusSnapshot = db.collection('weeklyMenus')
        .doc(weekId)
        .collection('dailyMenus')
        .get();
    
    console.log('Menús diarios encontrados:', dailyMenusSnapshot.size);
    
    menuData.dailyMenus = {};
    
    dailyMenusSnapshot.forEach(doc => {
        console.log(`Menú diario ${doc.id}:`, doc.data());
        menuData.dailyMenus[doc.id] = doc.data();
    });
    
    // Set current day to Monday by default if not set
    if (!currentDay) {
        currentDay = 'monday';
        
        // Highlight Monday tab
        dayTabs.forEach(tab => {
            if (tab.dataset.day === 'monday') {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }
    
    // Load first day menu
    loadDayMenu();
    
    // Check menu completeness
    checkMenuCompleteness();
    
    // Start countdown timer if in-progress
    startCountdownTimer();
    
    // Show menu form
    document.getElementById('menuForm').style.display = 'block';
    
    // Always enable create menu button
    createMenuBtn.disabled = false;
}
