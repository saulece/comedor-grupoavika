// Admin Confirmations Management for Comedor Grupo Avika

// Ensure admin only access
document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth(USER_ROLES.ADMIN)) {
        return;
    }
    
    // Initialize the UI
    initializeDateSelector();
    loadConfirmations();
    
    // Set up export functionality
    const exportBtn = document.getElementById('export-confirmations');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportConfirmations);
    }
});

// Current date and range settings
let currentDate = new Date();
let viewMode = 'week'; // 'week' or 'day'

// Initialize date selector
function initializeDateSelector() {
    const prevDateBtn = document.getElementById('prev-date-btn');
    const nextDateBtn = document.getElementById('next-date-btn');
    const dateSelectorMode = document.getElementById('date-selector-mode');
    const dateDisplay = document.getElementById('date-display');
    
    if (prevDateBtn) {
        prevDateBtn.addEventListener('click', () => {
            if (viewMode === 'week') {
                currentDate.setDate(currentDate.getDate() - 7);
            } else {
                currentDate.setDate(currentDate.getDate() - 1);
            }
            updateDateDisplay();
            loadConfirmations();
        });
    }
    
    if (nextDateBtn) {
        nextDateBtn.addEventListener('click', () => {
            if (viewMode === 'week') {
                currentDate.setDate(currentDate.getDate() + 7);
            } else {
                currentDate.setDate(currentDate.getDate() + 1);
            }
            updateDateDisplay();
            loadConfirmations();
        });
    }
    
    if (dateSelectorMode) {
        dateSelectorMode.addEventListener('change', function() {
            viewMode = this.value;
            updateDateDisplay();
            loadConfirmations();
        });
    }
    
    updateDateDisplay();
}

// Update date display based on current mode
function updateDateDisplay() {
    const dateDisplay = document.getElementById('date-display');
    if (!dateDisplay) return;
    
    if (viewMode === 'week') {
        const weekStart = getMonday(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 4); // Show Monday-Friday
        
        dateDisplay.textContent = `${formatDateDisplay(weekStart)} - ${formatDateDisplay(weekEnd)}`;
    } else {
        dateDisplay.textContent = formatDateDisplay(currentDate);
    }
}

// Load confirmations based on current date and view mode
function loadConfirmations() {
    // Show loading state
    showLoadingState(true);
    
    // Clear previous data
    const confirmationsTable = document.getElementById('confirmations-table-body');
    if (confirmationsTable) {
        confirmationsTable.innerHTML = '';
    }
    
    // Get date range
    let startDate, endDate;
    
    if (viewMode === 'week') {
        startDate = getMonday(currentDate);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // Include the weekend for full week data
    } else {
        startDate = new Date(currentDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(currentDate);
        endDate.setHours(23, 59, 59, 999);
    }
    
    // Format dates for Firestore query
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);
    
    // Query Firestore for confirmations
    confirmationsCollection
        .where('date', '>=', startDateStr)
        .where('date', '<=', endDateStr)
        .orderBy('date')
        .get()
        .then(querySnapshot => {
            // Group confirmations by date and coordinator
            const confirmationsByDate = {};
            
            querySnapshot.forEach(doc => {
                const confirmation = doc.data();
                confirmation.id = doc.id;
                
                if (!confirmationsByDate[confirmation.date]) {
                    confirmationsByDate[confirmation.date] = [];
                }
                
                confirmationsByDate[confirmation.date].push(confirmation);
            });
            
            // Display confirmations
            displayConfirmations(confirmationsByDate);
            
            // Update summary
            updateSummary(confirmationsByDate);
            
            // Hide loading state
            showLoadingState(false);
        })
        .catch(error => {
            console.error("Error loading confirmations:", error);
            showErrorMessage("Error al cargar las confirmaciones. Por favor intente de nuevo.");
            showLoadingState(false);
        });
}

// Display confirmations in the table
function displayConfirmations(confirmationsByDate) {
    const confirmationsTable = document.getElementById('confirmations-table-body');
    if (!confirmationsTable) return;
    
    // Clear previous data
    confirmationsTable.innerHTML = '';
    
    // Check if there are any confirmations
    if (Object.keys(confirmationsByDate).length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="7" class="text-center">No hay confirmaciones para el período seleccionado.</td>
        `;
        confirmationsTable.appendChild(emptyRow);
        return;
    }
    
    // Sort dates
    const sortedDates = Object.keys(confirmationsByDate).sort();
    
    // Create rows for each confirmation
    for (const date of sortedDates) {
        const confirmations = confirmationsByDate[date];
        const formattedDate = formatDateDisplay(new Date(date));
        
        // Get day of week
        const dayOfWeek = getDayOfWeek(new Date(date));
        
        // Sort confirmations by coordinator name
        confirmations.sort((a, b) => a.coordinatorName.localeCompare(b.coordinatorName));
        
        for (const confirmation of confirmations) {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${dayOfWeek}</td>
                <td>${confirmation.coordinatorName}</td>
                <td>${confirmation.department}</td>
                <td>${confirmation.confirmedCount}</td>
                <td>${confirmation.comments || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-info view-details-btn" data-id="${confirmation.id}">
                        Ver detalles
                    </button>
                </td>
            `;
            
            confirmationsTable.appendChild(row);
            
            // Add event listener to view details button
            const detailsBtn = row.querySelector('.view-details-btn');
            if (detailsBtn) {
                detailsBtn.addEventListener('click', () => {
                    showConfirmationDetails(confirmation);
                });
            }
        }
    }
}

// Show confirmation details in a modal
function showConfirmationDetails(confirmation) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('confirmation-details-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmation-details-modal';
        modal.classList.add('modal');
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Detalles de Confirmación</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div id="confirmation-details"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary modal-close-btn">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners to close buttons
        const closeButtons = modal.querySelectorAll('.modal-close, .modal-close-btn');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        });
    }
    
    // Fill modal with confirmation details
    const detailsContainer = document.getElementById('confirmation-details');
    if (detailsContainer) {
        // Format date
        const formattedDate = formatDateDisplay(new Date(confirmation.date));
        const dayOfWeek = getDayOfWeek(new Date(confirmation.date));
        
        // Build details HTML
        let detailsHTML = `
            <div class="confirmation-detail-item">
                <strong>Fecha:</strong> ${formattedDate} (${dayOfWeek})
            </div>
            <div class="confirmation-detail-item">
                <strong>Coordinador:</strong> ${confirmation.coordinatorName}
            </div>
            <div class="confirmation-detail-item">
                <strong>Departamento:</strong> ${confirmation.department}
            </div>
            <div class="confirmation-detail-item">
                <strong>Total Confirmados:</strong> ${confirmation.confirmedCount}
            </div>
            <div class="confirmation-detail-item">
                <strong>Comentarios:</strong> ${confirmation.comments || 'Ninguno'}
            </div>
        `;
        
        // Add employees list if available
        if (confirmation.employees && confirmation.employees.length > 0) {
            detailsHTML += `
                <div class="confirmation-detail-item mt-3">
                    <strong>Empleados Confirmados:</strong>
                    <ul class="employee-list">
            `;
            
            confirmation.employees.forEach(employee => {
                detailsHTML += `<li>${employee.name}</li>`;
            });
            
            detailsHTML += `
                    </ul>
                </div>
            `;
        }
        
        detailsContainer.innerHTML = detailsHTML;
    }
    
    // Show modal
    modal.style.display = 'flex';
}

// Update summary statistics
function updateSummary(confirmationsByDate) {
    const totalConfirmationsElement = document.getElementById('total-confirmations');
    const averagePerDayElement = document.getElementById('average-per-day');
    
    if (!totalConfirmationsElement || !averagePerDayElement) return;
    
    let totalConfirmations = 0;
    let uniqueDays = 0;
    const processedDates = new Set();
    
    for (const date in confirmationsByDate) {
        const confirmations = confirmationsByDate[date];
        processedDates.add(date);
        
        confirmations.forEach(confirmation => {
            totalConfirmations += confirmation.confirmedCount || 0;
        });
    }
    
    uniqueDays = processedDates.size;
    const averagePerDay = uniqueDays > 0 ? Math.round(totalConfirmations / uniqueDays) : 0;
    
    totalConfirmationsElement.textContent = totalConfirmations;
    averagePerDayElement.textContent = averagePerDay;
}

// Export confirmations to CSV
function exportConfirmations() {
    // Show loading state
    showLoadingState(true);
    
    // Get date range for file name
    let fileNameDate;
    if (viewMode === 'week') {
        const weekStart = getMonday(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 4);
        fileNameDate = `${formatDate(weekStart)}_to_${formatDate(weekEnd)}`;
    } else {
        fileNameDate = formatDate(currentDate);
    }
    
    // Build CSV content
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Fecha,Día,Coordinador,Departamento,Confirmados,Comentarios\n";
    
    // Get all rows from the table
    const rows = document.querySelectorAll('#confirmations-table-body tr');
    
    if (rows.length === 0 || (rows.length === 1 && rows[0].querySelector('td').getAttribute('colspan'))) {
        showErrorMessage("No hay datos para exportar.");
        showLoadingState(false);
        return;
    }
    
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        
        // Skip rows with "No hay confirmaciones"
        if (cells.length === 1) return;
        
        const rowData = [];
        // Get only the first 6 cells (exclude the action button)
        for (let i = 0; i < 6; i++) {
            // Clean the cell content and escape commas
            let cellContent = cells[i].textContent.trim();
            cellContent = cellContent.replace(/"/g, '""'); // Escape quotes
            
            if (cellContent.includes(',') || cellContent.includes('"') || cellContent.includes('\n')) {
                cellContent = `"${cellContent}"`; // Wrap in quotes if contains commas or quotes
            }
            
            rowData.push(cellContent);
        }
        
        csvContent += rowData.join(',') + '\n';
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `confirmaciones_${fileNameDate}.csv`);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    showLoadingState(false);
    showSuccessMessage('Archivo CSV generado correctamente.');
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

// Get day of week in Spanish
function getDayOfWeek(date) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
}

// Show loading state
function showLoadingState(isLoading) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
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