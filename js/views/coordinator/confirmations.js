// Confirmations.js - Coordinator Confirmations Management

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication and role
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Redirect to login if not authenticated
            window.location.href = '../../index.html';
            return;
        }
        
        // Check if user is coordinator
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists || userDoc.data().role !== 'coordinator') {
            // Redirect non-coordinator users
            window.location.href = '../../index.html';
            return;
        }
        
        // Store user data
        const userData = userDoc.data();
        setCurrentUser(userData);
        setUserRole(userData.role);
        setUserBranch(userData.branch);
        
        // Display user info
        document.getElementById('userName').textContent = userData.displayName || 'Coordinador';
        
        // Get branch details
        const branchDoc = await db.collection('branches').doc(userData.branch).get();
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
            
            // Submit confirmations
            await submitConfirmations(
                currentMenu.id, 
                branchId, 
                coordinatorId, 
                employeeConfirmations
            );
            
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
            
            // Load current menu
            currentMenu = await getCurrentWeeklyMenu();
            
            if (!currentMenu) {
                confirmationState = 'unavailable';
                updateUI();
                noMenuModal.style.display = 'block';
                return;
            }
            
            // Check if confirmation period is open
            const now = new Date();
            const confirmStart = currentMenu.confirmStartDate.toDate();
            const confirmEnd = currentMenu.confirmEndDate.toDate();
            
            if (!viewOnly && (now < confirmStart || now > confirmEnd)) {
                confirmationState = 'closed';
                confirmStartDate.textContent = formatDateTime(confirmStart);
                confirmEndDate.textContent = formatDateTime(confirmEnd);
                updateUI();
                confirmationClosedModal.style.display = 'block';
                return;
            }
            
            // Load employees
            const employeesResult = await getEmployeesByBranch(branchId);
            employees = employeesResult.filter(employee => employee.active);
            
            // Load existing confirmations
            confirmations = await getConfirmationsByBranch(currentMenu.id, branchId);
            
            // Confirmation period is open
            confirmationState = 'available';
            updateUI();
            
            // Display data
            displayWeekDates();
            displayEmployees();
            updateSummary();
            
            // Start countdown timer
            startCountdownTimer();
            
            // Store in state manager
            setCurrentMenu(currentMenu);
        } catch (error) {
            console.error('Error loading data:', error);
            showError('Error al cargar datos. Intente nuevamente.');
        }
    }
    
    // Display week dates
    function displayWeekDates() {
        if (!currentMenu) return;
        
        const startDate = currentMenu.startDate.toDate();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 4); // Add 4 days to get to Friday
        
        weekDatesElement.textContent = `${formatDateDMY(startDate)} al ${formatDateDMY(endDate)}`;
    }
    
    // Display employees list for confirmation
    function displayEmployees() {
        if (!employees || employees.length === 0) {
            employeeListContainer.innerHTML = `
                <div class="empty-message">
                    No hay empleados activos en esta sucursal.
                    <a href="employees.html">Gestionar empleados</a>
                </div>
            `;
            return;
        }
        
        // Create employee list
        let html = '';
        
        employees.forEach(employee => {
            // Check if employee has confirmations
            const employeeConfirmation = confirmations && 
                confirmations.employees && 
                confirmations.employees.find(emp => emp.id === employee.id);
            
            const confirmedDays = employeeConfirmation ? employeeConfirmation.days : [];
            
            html += `
                <div class="employee-item" data-employee-id="${employee.id}" data-employee-name="${employee.name}">
                    <div class="employee-name">
                        ${employee.name}
                        ${employee.dietaryRestrictions ? 
                            `<span class="dietary-badge" title="Restricciones alimentarias: ${employee.dietaryRestrictions}">
                                <i class="material-icons">restaurant</i>
                            </span>` : 
                            ''}
                    </div>
                    
                    <div class="day-checkbox">
                        <input type="checkbox" class="employee-day-checkbox" data-day="monday" title="Lunes"
                            ${confirmedDays.includes('monday') ? 'checked' : ''} 
                            ${confirmationState !== 'available' ? 'disabled' : ''}>
                        <span class="day-label">Lunes</span>
                    </div>
                    
                    <div class="day-checkbox">
                        <input type="checkbox" class="employee-day-checkbox" data-day="tuesday" title="Martes"
                            ${confirmedDays.includes('tuesday') ? 'checked' : ''} 
                            ${confirmationState !== 'available' ? 'disabled' : ''}>
                        <span class="day-label">Martes</span>
                    </div>
                    
                    <div class="day-checkbox">
                        <input type="checkbox" class="employee-day-checkbox" data-day="wednesday" title="Miércoles"
                            ${confirmedDays.includes('wednesday') ? 'checked' : ''} 
                            ${confirmationState !== 'available' ? 'disabled' : ''}>
                        <span class="day-label">Miércoles</span>
                    </div>
                    
                    <div class="day-checkbox">
                        <input type="checkbox" class="employee-day-checkbox" data-day="thursday" title="Jueves"
                            ${confirmedDays.includes('thursday') ? 'checked' : ''} 
                            ${confirmationState !== 'available' ? 'disabled' : ''}>
                        <span class="day-label">Jueves</span>
                    </div>
                    
                    <div class="day-checkbox">
                        <input type="checkbox" class="employee-day-checkbox" data-day="friday" title="Viernes"
                            ${confirmedDays.includes('friday') ? 'checked' : ''} 
                            ${confirmationState !== 'available' ? 'disabled' : ''}>
                        <span class="day-label">Viernes</span>
                    </div>
                </div>
            `;
        });
        
        employeeListContainer.innerHTML = html;
        
        // Add event listeners for checkboxes
        const checkboxes = document.querySelectorAll('.employee-day-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSummary);
        });
    }
    
    // Update confirmation summary
    function updateSummary() {
        if (!employees || employees.length === 0) {
            summaryTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">No hay empleados para confirmar.</td>
                </tr>
            `;
            return;
        }
        
        // Count confirmations for each day
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const counts = {};
        const totalEmployees = employees.length;
        
        // Initialize counts
        days.forEach(day => {
            counts[day] = 0;
        });
        
        // Count checked checkboxes
        const checkboxes = document.querySelectorAll('.employee-day-checkbox');
        checkboxes.forEach(checkbox => {
            const day = checkbox.dataset.day;
            if (checkbox.checked) {
                counts[day]++;
            }
        });
        
        // Build summary table
        let html = '';
        
        days.forEach((day, index) => {
            // Usar la nueva función para obtener el nombre del día en español
            const dayName = getSpanishDayName(index);
            const confirmedCount = counts[day];
            const percentage = totalEmployees > 0 ? Math.round((confirmedCount / totalEmployees) * 100) : 0;
            
            html += `
                <tr>
                    <td>${dayName}</td>
                    <td>${confirmedCount}</td>
                    <td>${totalEmployees}</td>
                    <td>${percentage}%</td>
                </tr>
            `;
        });
        
        summaryTableBody.innerHTML = html;
    }
    
    // Start countdown timer
    function startCountdownTimer() {
        // Clear existing interval
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        
        if (!currentMenu || confirmationState !== 'available') {
            timeRemainingValue.textContent = '--:--:--';
            return;
        }
        
        const endTime = currentMenu.confirmEndDate.toDate();
        
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
        
        function updateCountdown() {
            const now = new Date();
            const timeDiff = endTime - now;
            
            if (timeDiff <= 0) {
                // Time expired
                clearInterval(countdownInterval);
                timeRemainingValue.textContent = 'Finalizado';
                confirmationState = 'closed';
                updateUI();
                return;
            }
            
            // Calculate hours, minutes, seconds
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
            
            // Format time
            timeRemainingValue.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
        }
    }
    
    // Update UI based on confirmation state
    function updateUI() {
        switch (confirmationState) {
            case 'loading':
                confirmationStatusElement.innerHTML = `
                    <div class="loading-status">
                        <i class="material-icons loading-icon">sync</i>
                        <span>Cargando datos...</span>
                    </div>
                `;
                timeRemainingContainer.style.display = 'none';
                confirmationSection.style.display = 'none';
                break;
                
            case 'available':
                confirmationStatusElement.innerHTML = `
                    <div class="available-status">
                        <i class="material-icons">check_circle</i>
                        <span>Período de confirmación abierto</span>
                    </div>
                `;
                timeRemainingContainer.style.display = 'block';
                confirmationSection.style.display = 'block';
                saveConfirmationBtn.disabled = false;
                break;
                
            case 'unavailable':
                confirmationStatusElement.innerHTML = `
                    <div class="unavailable-status">
                        <i class="material-icons">error</i>
                        <span>No hay menú disponible para confirmar</span>
                    </div>
                `;
                timeRemainingContainer.style.display = 'none';
                confirmationSection.style.display = 'none';
                break;
                
            case 'closed':
                confirmationStatusElement.innerHTML = `
                    <div class="closed-status">
                        <i class="material-icons">schedule</i>
                        <span>Período de confirmación cerrado</span>
                    </div>
                `;
                timeRemainingContainer.style.display = 'none';
                
                // Still show confirmation section but in read-only mode
                confirmationSection.style.display = 'block';
                saveConfirmationBtn.disabled = true;
                break;
        }
    }
    
    // Get day name from index
    function getDayFromIndex(index) {
        // Nombres de los días en inglés para uso interno en la base de datos
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        return days[index];
    }
    
    // Get Spanish day name from index - para mostrar en la interfaz
    function getSpanishDayName(index) {
        // Nombres de los días en español con acentos correctos
        const spanishDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        return spanishDays[index];
    }
    
    // Normalizar nombre del día (convertir de español a clave en inglés)
    function normalizeDayName(spanishName) {
        const dayMap = {
            'lunes': 'monday',
            'martes': 'tuesday',
            'miércoles': 'wednesday',
            'miercoles': 'wednesday', // Sin acento por si acaso
            'jueves': 'thursday',
            'viernes': 'friday'
        };
        return dayMap[spanishName.toLowerCase()] || spanishName.toLowerCase();
    }
    
    // Pad number with leading zero
    function padZero(num) {
        return num.toString().padStart(2, '0');
    }
    
    // Get status text based on confirmation status
    function getStatusText(status) {
        switch(status) {
            case 'confirmed':
                return 'Confirmado';
            case 'pending':
                return 'Pendiente';
            case 'declined':
                return 'Rechazado';
            default:
                return 'Desconocido';
        }
    }
}

// Helper function to show success notification
function showSuccess(message) {
    showNotification(message, { type: 'success' });
}

// Helper function to show error notification
function showError(message) {
    showNotification(message, { type: 'error' });
}