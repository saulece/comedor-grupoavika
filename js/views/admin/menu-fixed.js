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
            
            // Check if the document exists first
            const docRef = db.collection('weeklyMenus').doc(currentWeekId)
                .collection('dailyMenus').doc(currentDay);
            
            const docSnapshot = await docRef.get();
            
            if (docSnapshot.exists) {
                // Update existing document
                await docRef.update(dayMenuData);
            } else {
                // Create new document with date field
                const dayDate = new Date(menuData.startDate.toDate());
                const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(currentDay);
                if (dayIndex !== -1) {
                    dayDate.setDate(dayDate.getDate() + dayIndex);
                }
                
                await docRef.set({
                    ...dayMenuData,
                    date: firebase.firestore.Timestamp.fromDate(dayDate)
                });
            }
            
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
    createMenuBtn.addEventListener('click', async () => {
        try {
            // Show create menu modal
            createMenuModal.style.display = 'flex';
            
            // Set default date to next Monday
            const nextMonday = getNextMonday();
            menuStartDateInput.value = formatDateYMD(nextMonday);
            menuStartDateInput.min = formatDateYMD(new Date()); // Prevent past dates
            
            // Clear previous error
            if (createMenuError) {
                createMenuError.textContent = '';
                createMenuError.style.display = 'none';
            }
        } catch (error) {
            console.error('Error showing create menu modal:', error);
        }
    });
    
    // Close modal when clicking on X
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            createMenuModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking on Cancel button
    if (cancelCreateMenuBtn) {
        cancelCreateMenuBtn.addEventListener('click', () => {
            createMenuModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === createMenuModal) {
            createMenuModal.style.display = 'none';
        }
    });
    
    // Create menu form submit
    if (createMenuForm) {
        createMenuForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const startDateStr = menuStartDateInput.value;
            
            if (!startDateStr) {
                if (createMenuError) {
                    createMenuError.textContent = 'Por favor seleccione una fecha de inicio.';
                    createMenuError.style.display = 'block';
                } else {
                    alert('Por favor seleccione una fecha de inicio.');
                }
                return;
            }
            
            try {
                // Show loading state
                createMenuBtn.disabled = true;
                confirmCreateMenuBtn.disabled = true;
                confirmCreateMenuBtn.innerHTML = '<span class="spinner"></span> Creando...';
                
                // Create weekly menu
                await createWeeklyMenu(startDateStr);
                
                // Close modal and reload menu
                createMenuModal.style.display = 'none';
                createMenuBtn.disabled = false;
                confirmCreateMenuBtn.disabled = false;
                confirmCreateMenuBtn.innerHTML = 'Crear Menú';
                
                // Show success message
                showMessage('Menú creado correctamente.', 'success');
                
                // Reload menu
                loadCurrentMenu();
            } catch (error) {
                console.error('Error creating menu:', error);
                
                if (createMenuError) {
                    createMenuError.textContent = error.message || 'Error al crear el menú. Intente nuevamente.';
                    createMenuError.style.display = 'block';
                } else {
                    alert('Error al crear el menú: ' + error.message);
                }
                
                createMenuBtn.disabled = false;
                confirmCreateMenuBtn.disabled = false;
                confirmCreateMenuBtn.innerHTML = 'Crear Menú';
            }
        });
    } else {
        console.error('Error: createMenuForm not found');
    }
    
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
                
                // Always enable create menu button
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
            
            // Always enable create menu button even on error
            createMenuBtn.disabled = false;
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
        try {
            const selectedDate = new Date(startDateStr);
            
            // Ajustar la fecha para que el lunes sea el primer día de la semana
            // Si la fecha seleccionada no es lunes, encontramos el lunes de esa semana
            const dayOfWeek = selectedDate.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
            const startDate = new Date(selectedDate);
            
            // Si es domingo (0), retrocedemos 6 días para llegar al lunes anterior
            // Si es otro día, retrocedemos (dayOfWeek - 1) días
            const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            startDate.setDate(startDate.getDate() - daysToSubtract);
            startDate.setHours(0, 0, 0, 0);
            
            console.log('Fecha seleccionada:', formatDateDMY(selectedDate), 'día de la semana:', dayOfWeek);
            console.log('Fecha de inicio ajustada (lunes):', formatDateDMY(startDate));
            
            const weekId = formatDateYMD(startDate);
            
            console.log('Creating menu for week:', weekId);
            
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
            
            console.log('Creating weekly menu document...');
            
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
            
            console.log('Creating daily menus...');
            
            // Create dailyMenus subcollection - use individual set operations instead of batch
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            
            // Create each day document individually to ensure they are all created
            for (let i = 0; i < days.length; i++) {
                const day = days[i];
                const dayDate = new Date(startDate);
                dayDate.setDate(dayDate.getDate() + i);
                
                console.log(`Creating day document for ${day} (${formatDateDMY(dayDate)})`);
                
                await db.collection('weeklyMenus')
                    .doc(weekId)
                    .collection('dailyMenus')
                    .doc(day)
                    .set({
                        date: firebase.firestore.Timestamp.fromDate(dayDate),
                        mainDish: '',
                        sideDish: '',
                        dessert: '',
                        vegetarianOption: ''
                    });
            }
            
            console.log('Weekly menu created successfully!');
        } catch (error) {
            console.error('Error in createWeeklyMenu:', error);
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
