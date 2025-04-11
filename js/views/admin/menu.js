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
    const statusBadgeElement = document.getElementById('statusBadge');
    const createMenuBtn = document.getElementById('createMenuBtn');
    const publishMenuBtn = document.getElementById('publishMenuBtn');
    const saveMenuBtn = document.getElementById('saveMenuBtn');
    const dayTabs = document.querySelectorAll('.day-tab');
    const menuFormMessage = document.getElementById('menuFormMessage');
    
    // Modal elements
    const createMenuModal = document.getElementById('createMenuModal');
    const menuStartDateInput = document.getElementById('menuStartDate');
    const confirmCreateMenuBtn = document.getElementById('confirmCreateMenu');
    const cancelCreateMenuBtn = document.getElementById('cancelCreateMenu');
    const closeModalBtn = document.querySelector('.close-modal');
    
    // Form inputs
    const mainDishInput = document.getElementById('mainDish');
    const sideDishInput = document.getElementById('sideDish');
    const dessertInput = document.getElementById('dessert');
    const vegetarianOptionInput = document.getElementById('vegetarianOption');
    
    // Current state
    let currentWeekId = null;
    let currentDay = 'monday';
    let menuData = null;
    let countdownInterval = null;
    
    // Get current menu or create a new one
    loadCurrentMenu();
    
    // Event listeners for day tabs
    dayTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all tabs
            dayTabs.forEach(t => t.classList.remove('active'));
            
            // Activate clicked tab
            tab.classList.add('active');
            
            // Update current day and load day menu
            currentDay = tab.dataset.day;
            loadDayMenu();
        });
    });
    
    // Save menu button
    saveMenuBtn.addEventListener('click', async () => {
        if (!currentWeekId || !currentDay) return;
        
        try {
            // Validate inputs
            if (!mainDishInput.value.trim()) {
                showMessage('Por favor ingrese el platillo principal.', 'error');
                return;
            }
            
            // Prepare menu data
            const dayMenuData = {
                mainDish: mainDishInput.value.trim(),
                sideDish: sideDishInput.value.trim(),
                dessert: dessertInput.value.trim(),
                vegetarianOption: vegetarianOptionInput.value.trim()
            };
            
            // Save to Firestore
            // Normalizar el día actual para manejar acentos
            const normalizedDay = normalizeDayName(currentDay);
            await db.collection('weeklyMenus').doc(currentWeekId)
                .collection('dailyMenus').doc(normalizedDay).update(dayMenuData);
            
            showMessage('Menú guardado correctamente.', 'success');
            
            // Update local data
            if (menuData && menuData.dailyMenus) {
                // Normalizar el día actual para manejar acentos
                const normalizedDay = normalizeDayName(currentDay);
                menuData.dailyMenus[normalizedDay] = dayMenuData;
            }
            
            // Check if all days have a main dish
            checkMenuCompleteness();
        } catch (error) {
            console.error('Error saving menu:', error);
            showMessage('Error al guardar el menú. Intente nuevamente.', 'error');
        }
    });
    
    // Create menu button
    createMenuBtn.addEventListener('click', () => {
        // Set default date to next Monday
        const nextMonday = getNextMonday();
        menuStartDateInput.value = formatDateYMD(nextMonday);
        
        // Show modal
        createMenuModal.style.display = 'block';
    });
    
    // Confirm create menu button
    confirmCreateMenuBtn.addEventListener('click', async () => {
        const startDate = menuStartDateInput.value;
        
        if (!startDate) {
            alert('Por favor seleccione una fecha válida.');
            return;
        }
        
        // Validate if selected date is a Monday
        const date = new Date(startDate);
        if (date.getDay() !== 1) { // 1 = Monday
            alert('Por favor seleccione un lunes como fecha inicial.');
            return;
        }
        
        try {
            // Create new weekly menu
            await createWeeklyMenu(startDate);
            
            // Close modal
            createMenuModal.style.display = 'none';
            
            // Reload menu data
            loadCurrentMenu();
        } catch (error) {
            console.error('Error creating menu:', error);
            alert('Error al crear el menú. Intente nuevamente.');
        }
    });
    
    // Cancel create menu button
    cancelCreateMenuBtn.addEventListener('click', () => {
        createMenuModal.style.display = 'none';
    });
    
    // Close modal button
    closeModalBtn.addEventListener('click', () => {
        createMenuModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === createMenuModal) {
            createMenuModal.style.display = 'none';
        }
    });
    
    // Publish menu button
    publishMenuBtn.addEventListener('click', async () => {
        if (!currentWeekId) return;
        
        try {
            // Update menu status to in-progress
            await db.collection('weeklyMenus').doc(currentWeekId).update({
                status: 'in-progress',
                publishedBy: auth.currentUser.uid,
                publishedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Reload menu data
            loadCurrentMenu();
            
            showMessage('Menú publicado correctamente. Los coordinadores ya pueden realizar confirmaciones.', 'success');
        } catch (error) {
            console.error('Error publishing menu:', error);
            showMessage('Error al publicar el menú. Intente nuevamente.', 'error');
        }
    });
    
    // Load current menu data
    async function loadCurrentMenu() {
        try {
            // Get current date
            const today = new Date();
            
            // Query for the most recent menu
            const menuSnapshot = await db.collection('weeklyMenus')
                .orderBy('startDate', 'desc')
                .limit(1)
                .get();
            
            if (!menuSnapshot.empty) {
                const menuDoc = menuSnapshot.docs[0];
                currentWeekId = menuDoc.id;
                menuData = menuDoc.data();
                
                // Load menu details
                displayMenuDetails();
                
                // Load daily menus
                const dailyMenusSnapshot = await db.collection('weeklyMenus')
                    .doc(currentWeekId)
                    .collection('dailyMenus')
                    .get();
                
                menuData.dailyMenus = {};
                
                dailyMenusSnapshot.forEach(doc => {
                    menuData.dailyMenus[doc.id] = doc.data();
                });
                
                // Load first day menu
                loadDayMenu();
                
                // Check menu completeness
                checkMenuCompleteness();
                
                // Start countdown timer if in-progress
                startCountdownTimer();
                
                // Enable or disable create menu button based on current menu status
                // Allow creating new menu regardless of current menu status
                createMenuBtn.disabled = false;
            } else {
                // No menu found, hide form
                document.getElementById('menuForm').innerHTML = `
                    <div class="empty-state">
                        <p>No hay ningún menú creado para esta semana.</p>
                        <p>Utilice el botón "Crear Menú" para crear uno nuevo.</p>
                    </div>
                `;
                
                weekDatesElement.textContent = 'Sin menú';
                statusBadgeElement.textContent = 'No Creado';
                statusBadgeElement.className = 'status-badge pending';
                
                // Reset stats
                updateStats(0, 0);
                
                // Enable create menu button
                createMenuBtn.disabled = false;
            }
        } catch (error) {
            console.error('Error loading menu:', error);
            showMessage('Error al cargar los datos del menú.', 'error');
        }
    }
    
    // Display menu details
    function displayMenuDetails() {
        if (!menuData) return;
        
        // Format dates
        const startDate = menuData.startDate.toDate();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // Add 6 days to get to Sunday
        
        // Display date range
        weekDatesElement.textContent = `${formatDateDMY(startDate)} al ${formatDateDMY(endDate)}`;
        
        // Display status
        statusBadgeElement.textContent = getStatusText(menuData.status);
        statusBadgeElement.className = `status-badge ${menuData.status}`;
        
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
        if (!menuData || !menuData.dailyMenus) {
            // Clear form
            clearMenuForm();
            return;
        }
        
        // Normalizar el día actual para manejar acentos
        const normalizedDay = normalizeDayName(currentDay);
        const dayMenu = menuData.dailyMenus[normalizedDay];
        
        if (!dayMenu) {
            // Clear form if no menu for this day
            clearMenuForm();
            return;
        }
        
        // Fill form
        mainDishInput.value = dayMenu.mainDish || '';
        sideDishInput.value = dayMenu.sideDish || '';
        dessertInput.value = dayMenu.dessert || '';
        vegetarianOptionInput.value = dayMenu.vegetarianOption || '';
        
        // Disable form if menu is not in pending status
        const isEditable = menuData.status === 'pending';
        toggleFormEditable(isEditable);
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
        if (!menuData || !menuData.dailyMenus || menuData.status !== 'pending') return;
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        let isComplete = true;
        
        for (const day of days) {
            // Normalizar el nombre del día para manejar acentos
            const normalizedDay = normalizeDayName(day);
            const dayMenu = menuData.dailyMenus[normalizedDay];
            if (!dayMenu || !dayMenu.mainDish || dayMenu.mainDish.trim() === '') {
                isComplete = false;
                console.log(`Día incompleto: ${day}`);
                break;
            }
        }
        
        publishMenuBtn.disabled = !isComplete;
        
        if (!isComplete && publishMenuBtn.disabled) {
            showMessage('Para publicar el menú, debe completar el platillo principal para todos los días.', 'info');
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
    
    // Create a new weekly menu
    async function createWeeklyMenu(startDateStr) {
        const startDate = new Date(startDateStr);
        const weekId = formatDateYMD(startDate);
        
        // Check if menu already exists
        const existingMenu = await db.collection('weeklyMenus').doc(weekId).get();
        
        if (existingMenu.exists) {
            throw new Error('Ya existe un menú para esta semana.');
        }
        
        // Get total employees count
        const employeesSnapshot = await db.collection('employees')
            .where('active', '==', true)
            .get();
        
        const totalEmployees = employeesSnapshot.size;
        
        // Get app settings for confirmation window
        const settingsSnapshot = await db.collection('settings').doc('appSettings').get();
        let confirmStartTime, confirmEndTime;
        
        if (settingsSnapshot.exists) {
            const settings = settingsSnapshot.data();
            
            // Calculate confirmation start and end times based on settings
            confirmStartTime = new Date(startDate);
            confirmStartTime.setDate(confirmStartTime.getDate() - 4); // Thursday before the week
            confirmStartTime.setHours(16, 10, 0, 0); // 16:10
            
            confirmEndTime = new Date(startDate);
            confirmEndTime.setDate(confirmEndTime.getDate() - 2); // Saturday before the week
            confirmEndTime.setHours(10, 0, 0, 0); // 10:00
        } else {
            // Default times if settings don't exist
            confirmStartTime = new Date(startDate);
            confirmStartTime.setDate(confirmStartTime.getDate() - 4); // Thursday
            confirmStartTime.setHours(16, 10, 0, 0); // 16:10
            
            confirmEndTime = new Date(startDate);
            confirmEndTime.setDate(confirmEndTime.getDate() - 2); // Saturday
            confirmEndTime.setHours(10, 0, 0, 0); // 10:00
        }
        
        // Create weeklyMenu document
        await db.collection('weeklyMenus').doc(weekId).set({
            startDate: firebase.firestore.Timestamp.fromDate(startDate),
            status: 'pending',
            confirmStartDate: firebase.firestore.Timestamp.fromDate(confirmStartTime),
            confirmEndDate: firebase.firestore.Timestamp.fromDate(confirmEndTime),
            totalEmployees,
            confirmedEmployees: 0,
            createdBy: auth.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create dailyMenus subcollection
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const batch = db.batch();
        
        days.forEach((day, index) => {
            const dayDate = new Date(startDate);
            dayDate.setDate(dayDate.getDate() + index);
            
            const dayRef = db.collection('weeklyMenus').doc(weekId).collection('dailyMenus').doc(day);
            batch.set(dayRef, {
                date: firebase.firestore.Timestamp.fromDate(dayDate),
                mainDish: '',
                sideDish: '',
                dessert: '',
                vegetarianOption: ''
            });
        });
        
        await batch.commit();
    }
}

// Helper Functions

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

// Normalize day name to handle accented characters
function normalizeDayName(dayName) {
    if (!dayName) return '';
    // Convert to lowercase and remove accents
    return dayName.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

// Map Spanish day name to English day code
function mapDayNameToCode(dayName) {
    // Normalize the input to handle accents and case
    const normalized = normalizeDayName(dayName);
    
    const dayMap = {
        'lunes': 'monday',
        'martes': 'tuesday',
        'miercoles': 'wednesday',
        'jueves': 'thursday',
        'viernes': 'friday',
        'sabado': 'saturday',
        'domingo': 'sunday'
    };
    
    return dayMap[normalized] || normalized;
}