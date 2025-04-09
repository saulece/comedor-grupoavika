/**
 * Componente de tarjeta (card)
 * @param {string} title - Título de la tarjeta (opcional)
 * @param {string} content - Contenido HTML del cuerpo de la tarjeta
 * @param {boolean} hasHeader - Indica si la tarjeta tiene encabezado
 * @param {string} headerActions - HTML adicional para acciones en el encabezado (opcional)
 * @returns {string} HTML del componente card
 */
function createCard(content, title = '', hasHeader = true, headerActions = '') {
    let headerHtml = '';
    
    if (hasHeader && title) {
        headerHtml = `
        <div class="card-header">
            <h3>${title}</h3>
            ${headerActions}
        </div>`;
    }
    
    return `
    <div class="card">
        ${headerHtml}
        <div class="card-body">
            ${content}
        </div>
    </div>
    `;
}

/**
 * Componente de tarjeta de estadísticas (stat card)
 * @param {string} icon - Clase de ícono de Font Awesome
 * @param {string} title - Título de la estadística
 * @param {string} value - Valor de la estadística
 * @param {string} color - Color de la tarjeta (opcional)
 * @returns {string} HTML del componente stat card
 */
function createStatCard(icon, title, value, color = '') {
    const colorClass = color ? ` ${color}` : '';
    
    return `
    <div class="stat-card${colorClass}">
        <div class="stat-icon">
            <i class="${icon}"></i>
        </div>
        <div class="stat-info">
            <h4>${title}</h4>
            <p>${value}</p>
        </div>
    </div>
    `;
}

/**
 * Componente de tarjeta resumen (summary card)
 * @param {string} icon - Clase de ícono de Font Awesome
 * @param {string} title - Título del resumen
 * @param {string} valueId - ID del elemento que contendrá el valor
 * @param {string} initialValue - Valor inicial (opcional)
 * @returns {string} HTML del componente summary card
 */
function createSummaryCard(icon, title, valueId, initialValue = '0') {
    return `
    <div class="summary-card">
        <div class="summary-icon">
            <i class="${icon}"></i>
        </div>
        <div class="summary-info">
            <h4>${title}</h4>
            <p id="${valueId}">${initialValue}</p>
        </div>
    </div>
    `;
}

// Exportar las funciones para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createCard, createStatCard, createSummaryCard };
} else {
    // Para uso en navegador
    window.uiComponents = window.uiComponents || {};
    window.uiComponents.createCard = createCard;
    window.uiComponents.createStatCard = createStatCard;
    window.uiComponents.createSummaryCard = createSummaryCard;
}
