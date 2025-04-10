// Menu.js - Admin Menu Management

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and role
    firebase.auth().onAuthStateChanged(async (user) => {
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
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            document.getElementById('userName').textContent = userDoc.data().displayName || 'Administrador';
        }
        
        // Initialize menu management
        initMenuManagement();
    });
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await firebase.auth().signOut();
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
    
    // Stats elements
    const totalEmployeesElement = document.getElementById('totalEmployees');
    const confirmedEmployeesElement = document.getElementById('confirmedEmployees');
    const confirmationPercentageElement = document.getElementById('confirmationPercentage');
    const timeRemainingElement = document.getElementById('timeRemaining');
    
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
            await firebase.firestore().collection('weeklyMenus').doc(currentWeekId)
                .collection('dailyMenus').doc(currentDay).update(dayMenuData);
            
            showMessage('Menú guardado correctamente.', 'success');
            
            // Update local data
            if (menuData && menuData.dailyMenus) {
                menuData.dailyMenus[currentDay] = dayMenuData;
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
        menuStartDateInput.value = formatDateForInput(nextMonday);
        
        // Show modal
        createMenuModal.style.display = 'block';
    });
    
    // Confirm create menu button
    confirmCreateMenuBtn.addEventListener('click', async () => {
        console.log('Botón Crear Menú clickeado');
        const startDateStr = menuStartDateInput.value;
        console.log('Fecha seleccionada:', startDateStr);
        
        if (!startDateStr) {
            alert('Por favor seleccione una fecha válida.');
            return;
        }
        
        // Validate if selected date is a Monday
        const date = new Date(startDateStr);
        console.log('Fecha parseada:', date);
        console.log('Día de la semana:', date.getDay()); // 0=Domingo, 1=Lunes, etc.
        
        if (date.getDay() !== 1) { // 1 = Monday
            alert('Por favor seleccione un lunes como fecha inicial.');
            return;
        }
        
        try {
            console.log('Intentando crear menú semanal...');
            // Create new weekly menu
            await createWeeklyMenu(startDateStr);
            console.log('Menú creado exitosamente');
            
            // Close modal
            createMenuModal.style.display = 'none';
            
            // Reload menu data
            loadCurrentMenu();
        } catch (error) {
            console.error('Error detallado al crear el menú:', error);
            alert(`Error al crear el menú: ${error.message}`);
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
    window.addEventListener('click', (event) => {
        if (event.target === createMenuModal) {
            createMenuModal.style.display = 'none';
        }
    });
    
    // Publish menu button
    publishMenuBtn.addEventListener('click', async () => {
        if (!currentWeekId) return;
        
        try {
            // Update menu status
            await firebase.firestore().collection('weeklyMenus').doc(currentWeekId).update({
                status: 'in-progress',
                publishedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Reload menu data
            loadCurrentMenu();
            
            showMessage('Menú publicado correctamente. Los empleados ya pueden confirmar su asistencia.', 'success');
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
            const menuSnapshot = await firebase.firestore().collection('weeklyMenus')
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
                const dailyMenusSnapshot = await firebase.firestore().collection('weeklyMenus')
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
        endDate.setDate(endDate.getDate() + 4); // Add 4 days to get to Friday
        
        // Display date range
        weekDatesElement.textContent = `${formatDateShort(startDate)} al ${formatDateShort(endDate)}`;
        
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
        if (!menuData || !menuData.dailyMenus || !menuData.dailyMenus[currentDay]) {
            // Clear form
            clearMenuForm();
            return;
        }
        
        const dayMenu = menuData.dailyMenus[currentDay];
        
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
            const dayMenu = menuData.dailyMenus[day];
            if (!dayMenu || !dayMenu.mainDish || dayMenu.mainDish.trim() === '') {
                isComplete = false;
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
        totalEmployeesElement.textContent = totalEmployees;
        confirmedEmployeesElement.textContent = confirmedEmployees;
        
        // Calculate percentage
        const percentage = totalEmployees > 0 
            ? Math.round((confirmedEmployees / totalEmployees) * 100) 
            : 0;
        
        confirmationPercentageElement.textContent = `${percentage}%`;
    }
    
    // Start countdown timer for confirmation deadline
    function startCountdownTimer() {
        // Clear any existing interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
        }
        
        // If menu is not in-progress, don't start timer
        if (!menuData || menuData.status !== 'in-progress') {
            timeRemainingElement.textContent = '--:--:--';
            return;
        }
        
        // Get confirmation end time
        const endTime = menuData.confirmEndDate.toDate();
        
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
        console.log('Iniciando createWeeklyMenu con fecha:', startDateStr);
        
        // Parse date string to Date object
        const startDate = new Date(startDateStr);
        console.log('Fecha parseada en createWeeklyMenu:', startDate);
        
        // Format date for ID
        const weekId = formatDateForId(startDate);
        console.log('ID de semana generado:', weekId);
        
        // Check if menu already exists
        try {
            const existingMenu = await firebase.firestore().collection('weeklyMenus').doc(weekId).get();
            console.log('¿Existe menú?', existingMenu.exists);
            
            if (existingMenu.exists) {
                throw new Error('Ya existe un menú para esta semana.');
            }
            
            // Get total employees count
            console.log('Obteniendo conteo de empleados...');
            const employeesSnapshot = await firebase.firestore().collection('employees')
                .where('active', '==', true)
                .get();
            
            const totalEmployees = employeesSnapshot.size;
            console.log('Total de empleados activos:', totalEmployees);
            
            // Get app settings for confirmation window
            console.log('Obteniendo configuraciones de la aplicación...');
            const settingsSnapshot = await firebase.firestore().collection('settings').doc('appSettings').get();
            let confirmStartTime, confirmEndTime;
            
            if (settingsSnapshot.exists) {
                const settings = settingsSnapshot.data();
                console.log('Configuraciones obtenidas:', settings);
                
                // Default to 48 hours before if not set
                const confirmHoursBefore = settings.confirmHoursBefore || 48;
                console.log('Horas antes para confirmar:', confirmHoursBefore);
                
                // Calculate confirmation window start and end times
                confirmStartTime = new Date(startDate);
                confirmStartTime.setHours(confirmStartTime.getHours() - confirmHoursBefore);
                
                confirmEndTime = new Date(startDate);
                confirmEndTime.setHours(8, 0, 0, 0); // 8:00 AM on Monday
            } else {
                console.log('No se encontraron configuraciones, usando valores predeterminados');
                // Default confirmation window (48 hours before)
                confirmStartTime = new Date(startDate);
                confirmStartTime.setHours(confirmStartTime.getHours() - 48);
                
                confirmEndTime = new Date(startDate);
                confirmEndTime.setHours(8, 0, 0, 0); // 8:00 AM on Monday
            }
            
            console.log('Ventana de confirmación:', {
                inicio: confirmStartTime,
                fin: confirmEndTime
            });
            
            // Create weeklyMenu document
            console.log('Creando documento de menú semanal...');
            const currentUser = firebase.auth().currentUser;
            console.log('Usuario actual:', currentUser ? currentUser.uid : 'No autenticado');
            
            if (!currentUser) {
                throw new Error('No hay usuario autenticado. Por favor, inicie sesión nuevamente.');
            }
            
            await firebase.firestore().collection('weeklyMenus').doc(weekId).set({
                startDate: firebase.firestore.Timestamp.fromDate(startDate),
                status: 'pending',
                confirmStartDate: firebase.firestore.Timestamp.fromDate(confirmStartTime),
                confirmEndDate: firebase.firestore.Timestamp.fromDate(confirmEndTime),
                totalEmployees,
                confirmedEmployees: 0,
                createdBy: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Create daily menu documents
            console.log('Creando documentos de menú diario...');
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const batch = firebase.firestore().batch();
            
            days.forEach((day, index) => {
                const dayDate = new Date(startDate);
                dayDate.setDate(dayDate.getDate() + index);
                
                const dayRef = firebase.firestore().collection('weeklyMenus').doc(weekId).collection('dailyMenus').doc(day);
                batch.set(dayRef, {
                    date: firebase.firestore.Timestamp.fromDate(dayDate),
                    mainDish: '',
                    sideDish: '',
                    soup: '',
                    salad: '',
                    dessert: '',
                    vegetarianOption: ''
                });
            });
            
            console.log('Ejecutando batch para crear menús diarios...');
            await batch.commit();
            console.log('Menú semanal creado exitosamente');
            
            return weekId;
        } catch (error) {
            console.error('Error en createWeeklyMenu:', error);
            throw error;
        }
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
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = padZero(date.getMonth() + 1);
    const day = padZero(date.getDate());
    
    return `${year}-${month}-${day}`;
}

// Format date for Firestore document ID (YYYY-MM-DD)
function formatDateForId(date) {
    return formatDateForInput(date);
}

// Format date for display (DD/MM/YYYY)
function formatDateShort(date) {
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