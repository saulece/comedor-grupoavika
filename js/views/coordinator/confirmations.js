// Confirmations.js - Coordinator Confirmations Management

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and role
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = '../../index.html';
            return;
        }
        
        // Check if user is coordinator
        const firestore = firebase.firestore();
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'coordinator') {
            // Redirect non-coordinator users
            window.location.href = '../../index.html';
            return;
        }
        
        // Store user data
        const userData = userDoc.data();
        
        // Use state manager if available
        if (typeof setCurrentUser === 'function') {
            setCurrentUser(userData);
            setUserRole(userData.role);
            setUserBranch(userData.branch);
        }
        
        // Display user info
        document.getElementById('userName').textContent = userData.displayName || 'Coordinador';
        
        // Get branch details
        const branchDoc = await firestore.collection('branches').doc(userData.branch).get();
        if (branchDoc.exists) {
            const branchData = branchDoc.data();
            document.getElementById('branchName').textContent = branchData.name;
        }
        
        // Initialize confirmations
        initConfirmations(userData.branch, user.uid);
    });
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await logout();
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('Error logging out:', error);
            showError('Error al cerrar sesión. Intente nuevamente.');
        }
    });
});

// Initialize confirmations management
function initConfirmations(branchId, coordinatorId) {
    // DOM elements
    const weekDatesElement = document.getElementById('weekDates');
    const confirmationStatusElement = document.getElementById('confirmationStatus');
    const timeRemainingContainer = document.getElementById('timeRemainingContainer');
    const timeRemainingValue = document.getElementById('timeRemainingValue');
    const employeeListContainer = document.getElementById('employeeListContainer');
    const summaryTableBody = document.getElementById('summaryTableBody');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const saveConfirmationBtn = document.getElementById('saveConfirmationBtn');
    const confirmationSection = document.getElementById('confirmationSection');
    
    // Modals
    const noMenuModal = document.getElementById('noMenuModal');
    const confirmationClosedModal = document.getElementById('confirmationClosedModal');
    const refreshMenuBtn = document.getElementById('refreshMenuBtn');
    const viewConfirmationsBtn = document.getElementById('viewConfirmationsBtn');
    const confirmStartDate = document.getElementById('confirmStartDate');
    const confirmEndDate = document.getElementById('confirmEndDate');
    
    // State
    let currentMenu = null;
    let employees = [];
    let confirmations = null;
    let countdownInterval = null;
    let confirmationState = 'loading'; // loading, available, unavailable, closed
    
    // Load data
    loadData();
    
    // Event listeners
    
    // Select all button
    selectAllBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.employee-day-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        updateSummary();
    });
    
    // Deselect all button
    deselectAllBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.employee-day-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        updateSummary();
    });
    
    // Save confirmation button
    saveConfirmationBtn.addEventListener('click', async () => {
        try {
            // Disable save button
            saveConfirmationBtn.disabled = true;
            
            // Collect confirmation data
            const employeeConfirmations = [];
            const employeeItems = document.querySelectorAll('.employee-item');
            
            employeeItems.forEach(item => {
                const employeeId = item.dataset.employeeId;
                const employeeName = item.dataset.employeeName;
                const days = [];
                
                // Check which days are selected
                const checkboxes = item.querySelectorAll('.employee-day-checkbox');
                checkboxes.forEach((checkbox, index) => {
                    if (checkbox.checked) {
                        const day = getDayFromIndex(index);
                        if (day) days.push(day);
                    }
                });
                
                employeeConfirmations.push({
                    id: employeeId,
                    name: employeeName,
                    days
                });
            });
            
            // Submit confirmations - use the global function or firestoreService object
            if (typeof submitConfirmations === 'function') {
                await submitConfirmations(
                    currentMenu.id, 
                    branchId, 
                    coordinatorId, 
                    employeeConfirmations
                );
            } else if (window.firestoreService && typeof window.firestoreService.submitConfirmations === 'function') {
                await window.firestoreService.submitConfirmations(
                    currentMenu.id,
                    branchId,
                    coordinatorId,
                    employeeConfirmations
                );
            } else {
                // Fallback to direct Firebase access
                await submitConfirmationsDirectly(
                    currentMenu.id,
                    branchId,
                    coordinatorId,
                    employeeConfirmations
                );
            }
            
            // Show success message
            showSuccess('Confirmaciones guardadas correctamente.');
            
            // Reload data to update summary
            loadData();
        } catch (error) {
            console.error('Error saving confirmations:', error);
            showError('Error al guardar confirmaciones. Intente nuevamente.');
        } finally {
            // Re-enable save button
            saveConfirmationBtn.disabled = false;
        }
    });
    
    // Refresh menu button
    refreshMenuBtn.addEventListener('click', () => {
        noMenuModal.style.display = 'none';
        loadData();
    });
    
    // View confirmations button
    viewConfirmationsBtn.addEventListener('click', () => {
        confirmationClosedModal.style.display = 'none';
        // If period is closed, still load data to show current confirmations in view-only mode
        loadData(true);
    });
    
    // Load all required data
    async function loadData(viewOnly = false) {
        try {
            // Reset state
            confirmationState = 'loading';
            updateUI();
            
            console.log('Cargando datos de confirmaciones');
            
            // Load current menu - try multiple approaches for better compatibility
            try {
                console.log('Intentando obtener el menú semanal actual');
                
                // First try using the global function
                if (typeof getCurrentWeeklyMenu === 'function') {
                    console.log('Usando función global getCurrentWeeklyMenu');
                    currentMenu = await getCurrentWeeklyMenu();
                } 
                // Then try using the firestoreService object
                else if (window.firestoreService && typeof window.firestoreService.getCurrentWeeklyMenu === 'function') {
                    console.log('Usando window.firestoreService.getCurrentWeeklyMenu');
                    currentMenu = await window.firestoreService.getCurrentWeeklyMenu();
                } 
                // Last resort: direct Firebase access
                else {
                    console.log('Usando acceso directo a Firebase');
                    currentMenu = await getMenuDirectly();
                }
                
                if (!currentMenu) {
                    console.warn('No se encontró un menú activo');
                    confirmationState = 'unavailable';
                    updateUI();
                    noMenuModal.style.display = 'block';
                    return;
                }
                
                console.log('Menú encontrado', { id: currentMenu.id, status: currentMenu.status });
            } catch (error) {
                console.error('Error al cargar el menú actual', error);
                showError('Error al cargar el menú. Intente refrescar la página.');
                confirmationState = 'unavailable';
                updateUI();
                noMenuModal.style.display = 'block';
                return;
            }
            
            // Check if confirmation period is open
            const now = new Date();
            const confirmStart = currentMenu.confirmStartDate ? currentMenu.confirmStartDate.toDate() : null;
            const confirmEnd = currentMenu.confirmEndDate ? currentMenu.confirmEndDate.toDate() : null;
            
            // Verificar si estamos en modo desarrollo con bypass de fechas
            let bypassDateValidation = false;
            if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE && 
                typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.bypassDateValidations) {
                
                if (typeof devLog === 'function') {
                    devLog('Bypass de validación de fechas de confirmación activado');
                } else {
                    console.log('[DEV] Bypass de validación de fechas de confirmación activado');
                }
                
                bypassDateValidation = true;
            }
            
            if (!bypassDateValidation && (!confirmStart || !confirmEnd)) {
                console.error('Fechas de confirmación no definidas en el menú', { menuId: currentMenu.id });
                showError('El menú no tiene fechas de confirmación definidas. Contacte al administrador.');
                confirmationState = 'unavailable';
                updateUI();
                noMenuModal.style.display = 'block';
                return;
            }
            
            // Si estamos en modo desarrollo, crear fechas válidas si no existen
            if (bypassDateValidation && (!confirmStart || !confirmEnd)) {
                if (typeof devLog === 'function') {
                    devLog('Creando fechas de confirmación válidas para modo desarrollo');
                }
                
                // Crear fechas válidas para el periodo de confirmación
                const today = new Date();
                if (!confirmStart) {
                    confirmStart = new Date(today);
                    confirmStart.setDate(today.getDate() - 3); // 3 días antes
                }
                
                if (!confirmEnd) {
                    confirmEnd = new Date(today);
                    confirmEnd.setDate(today.getDate() + 3); // 3 días después
                }
            }
            
            console.log('Periodo de confirmación', { 
                start: confirmStart ? confirmStart.toISOString() : 'No definido', 
                end: confirmEnd ? confirmEnd.toISOString() : 'No definido',
                now: now.toISOString(),
                isOpen: bypassDateValidation || (confirmStart && confirmEnd && now >= confirmStart && now <= confirmEnd),
                bypassActivated: bypassDateValidation
            });
            
            if (!bypassDateValidation && !viewOnly && (now < confirmStart || now > confirmEnd)) {
                console.log('Periodo de confirmación cerrado');
                confirmationState = 'closed';
                confirmStartDate.textContent = formatDateTime(confirmStart);
                confirmEndDate.textContent = formatDateTime(confirmEnd);
                updateUI();
                confirmationClosedModal.style.display = 'block';
                return;
            }
            
            // Si estamos en modo desarrollo con bypass, mostrar un mensaje
            if (bypassDateValidation && (now < confirmStart || now > confirmEnd)) {
                if (typeof devLog === 'function') {
                    devLog('Permitiendo confirmaciones fuera del periodo válido (modo desarrollo)');
                }
                
                // Mostrar una notificación en el panel de desarrollo si existe
                if (typeof updateDevLog === 'function') {
                    updateDevLog('Confirmaciones habilitadas fuera de periodo válido');
                }
            }
            
            // Load employees - try multiple approaches
            try {
                if (typeof getEmployeesByBranch === 'function') {
                    employees = await getEmployeesByBranch(branchId);
                } else if (window.firestoreService && typeof window.firestoreService.getEmployeesByBranch === 'function') {
                    employees = await window.firestoreService.getEmployeesByBranch(branchId);
                } else {
                    // Direct Firebase access
                    employees = await getEmployeesDirectly(branchId);
                }
                
                // Filter active employees
                employees = employees.filter(employee => employee.active);
            } catch (error) {
                console.error('Error al cargar empleados:', error);
                showError('Error al cargar empleados. Intente nuevamente.');
                employees = [];
            }
            
            // Load existing confirmations - try multiple approaches
            try {
                if (typeof getConfirmationsByBranch === 'function') {
                    confirmations = await getConfirmationsByBranch(currentMenu.id, branchId);
                } else if (window.firestoreService && typeof window.firestoreService.getConfirmationsByBranch === 'function') {
                    confirmations = await window.firestoreService.getConfirmationsByBranch(currentMenu.id, branchId);
                } else {
                    // Direct Firebase access
                    confirmations = await getConfirmationsDirectly(currentMenu.id, branchId);
                }
            } catch (error) {
                console.error('Error al cargar confirmaciones:', error);
                showError('Error al cargar confirmaciones. Intente nuevamente.');
                confirmations = null;
            }
            
            // Confirmation period is open
            confirmationState = 'available';
            updateUI();
            
            // Display data
            displayWeekDates();
            displayEmployees();
            updateSummary();
            
            // Start countdown timer
            startCountdownTimer();
            
            // Store in state manager if available
            if (typeof setCurrentMenu === 'function') {
                setCurrentMenu(currentMenu);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            showError('Error al cargar datos. Intente nuevamente.');
        }
    }
    
    // Direct Firebase access functions for fallback
    
    // Get menu directly from Firestore
    async function getMenuDirectly() {
        // Get current date
        const today = new Date();
        
        // First try to find a menu where today falls within its date range
        const firestore = firebase.firestore();
        let menuSnapshot = await firestore.collection('weeklyMenus')
            .where('status', 'in', ['published', 'in-progress'])
            .orderBy('startDate', 'desc')
            .get();
        
        console.log(`Found ${menuSnapshot.size} menus`);
        
        let menuDoc = null;
        
        // Find a menu where today is within the week range
        for (const doc of menuSnapshot.docs) {
            const menuData = doc.data();
            const startDate = menuData.startDate.toDate();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6); // End date is start date + 6 days
            
            if (today >= startDate && today <= endDate) {
                menuDoc = doc;
                console.log(`Found current week menu: ${doc.id}`);
                break;
            }
        }
        
        // If no current week menu found, get the most recent one
        if (!menuDoc && menuSnapshot.size > 0) {
            menuDoc = menuSnapshot.docs[0];
            console.log(`No current week menu found, using most recent: ${menuDoc.id}`);
        }
        
        if (menuDoc) {
            const menuData = menuDoc.data();
            
            // Get daily menus
            const dailyMenusSnapshot = await firestore.collection('weeklyMenus')
                .doc(menuDoc.id)
                .collection('dailyMenus')
                .get();
            
            const dailyMenus = {};
            dailyMenusSnapshot.forEach(doc => {
                dailyMenus[doc.id] = doc.data();
            });
            
            return {
                id: menuDoc.id,
                ...menuData,
                dailyMenus
            };
        }
        
        console.log('No active weekly menu found');
        return null;
    }
    
    // Get employees directly from Firestore
    async function getEmployeesDirectly(branchId) {
        const firestore = firebase.firestore();
        const employeesSnapshot = await firestore.collection('employees')
            .where('branch', '==', branchId)
            .orderBy('name')
            .get();
        
        const employees = [];
        
        employeesSnapshot.forEach(doc => {
            employees.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return employees;
    }
    
    // Get confirmations directly from Firestore
    async function getConfirmationsDirectly(weekId, branchId) {
        const firestore = firebase.firestore();
        const confirmationQuery = await firestore.collection('confirmations')
            .where('weekId', '==', weekId)
            .where('branchId', '==', branchId)
            .limit(1)
            .get();
        
        if (!confirmationQuery.empty) {
            const confirmationDoc = confirmationQuery.docs[0];
            return {
                id: confirmationDoc.id,
                ...confirmationDoc.data()
            };
        }
        
        return null;
    }
    
    // Submit confirmations directly to Firestore
    async function submitConfirmationsDirectly(weekId, branchId, coordinatorId, employees) {
        const firestore = firebase.firestore();
        
        // Check if confirmation already exists
        const confirmationQuery = await firestore.collection('confirmations')
            .where('weekId', '==', weekId)
            .where('branchId', '==', branchId)
            .limit(1)
            .get();
        
        let confirmationId;
        
        if (!confirmationQuery.empty) {
            // Update existing confirmation
            confirmationId = confirmationQuery.docs[0].id;
            await firestore.collection('confirmations').doc(confirmationId).update({
                employees,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Create new confirmation
            const confirmationRef = await firestore.collection('confirmations').add({
                weekId,
                branchId,
                coordinatorId,
                employees,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            confirmationId = confirmationRef.id;
            
            // Update confirmed count on menu
            const confirmedEmployees = employees.filter(emp => emp.days && emp.days.length > 0).length;
            await firestore.collection('weeklyMenus').doc(weekId).update({
                confirmedEmployees: firebase.firestore.FieldValue.increment(confirmedEmployees)
            });
        }
        
        return { success: true, confirmationId };
    }
};