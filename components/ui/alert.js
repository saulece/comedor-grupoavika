/**
 * Componente de alerta
 * @param {string} id - ID de la alerta
 * @param {string} type - Tipo de alerta ('success', 'error', 'warning', 'info')
 * @param {string} message - Mensaje de la alerta (opcional)
 * @returns {string} HTML del componente de alerta
 */
function createAlert(id, type = 'info', message = '') {
    const typeClass = `alert-message ${type}-message`;
    
    return `
    <div id="${id}" class="${typeClass}" style="display: none;">
        ${message}
    </div>
    `;
}

/**
 * Muestra un mensaje de alerta
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de alerta ('success', 'error', 'warning', 'info')
 * @param {string} id - ID del elemento de alerta
 * @param {number} duration - Duración en milisegundos (0 para no ocultar automáticamente)
 */
function showAlert(message, type = 'info', id = 'alert-message', duration = 5000) {
    const alertElement = document.getElementById(id);
    if (!alertElement) return;
    
    // Establecer clase según el tipo
    alertElement.className = `alert-message ${type}-message`;
    
    // Establecer mensaje
    alertElement.innerHTML = message;
    
    // Mostrar alerta
    alertElement.style.display = 'block';
    
    // Ocultar después de la duración especificada (si es mayor a 0)
    if (duration > 0) {
        setTimeout(() => {
            hideAlert(id);
        }, duration);
    }
}

/**
 * Oculta un mensaje de alerta
 * @param {string} id - ID del elemento de alerta
 */
function hideAlert(id = 'alert-message') {
    const alertElement = document.getElementById(id);
    if (alertElement) {
        alertElement.style.display = 'none';
    }
}

// Exportar las funciones para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createAlert, showAlert, hideAlert };
} else {
    // Para uso en navegador
    window.uiComponents = window.uiComponents || {};
    window.uiComponents.createAlert = createAlert;
    window.uiComponents.showAlert = showAlert;
    window.uiComponents.hideAlert = hideAlert;
}
