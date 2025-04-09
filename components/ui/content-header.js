/**
 * Componente de encabezado de contenido
 * @param {string} title - Título del encabezado
 * @param {string} userName - Nombre del usuario actual
 * @returns {string} HTML del componente de encabezado
 */
function createContentHeader(title, userName = '') {
    return `
    <div class="content-header">
        <h2>${title}</h2>
        <div class="user-info">
            <span id="user-name">${userName}</span>
        </div>
    </div>
    `;
}

// Exportar la función para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createContentHeader };
} else {
    // Para uso en navegador
    window.uiComponents = window.uiComponents || {};
    window.uiComponents.createContentHeader = createContentHeader;
}
