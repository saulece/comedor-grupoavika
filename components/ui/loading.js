/**
 * Componente de indicador de carga
 * @param {string} id - ID del indicador de carga (opcional)
 * @returns {string} HTML del componente de carga
 */
function createLoadingIndicator(id = 'loading-indicator') {
    return `
    <div id="${id}" class="loading-indicator" style="display: none;">
        <div class="spinner"></div>
    </div>
    `;
}

/**
 * Muestra u oculta el indicador de carga
 * @param {boolean} isLoading - Indica si se debe mostrar el indicador de carga
 * @param {string} id - ID del indicador de carga (opcional)
 */
function showLoadingState(isLoading, id = 'loading-indicator') {
    const loadingIndicator = document.getElementById(id);
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }
}

// Exportar las funciones para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createLoadingIndicator, showLoadingState };
} else {
    // Para uso en navegador
    window.uiComponents = window.uiComponents || {};
    window.uiComponents.createLoadingIndicator = createLoadingIndicator;
    window.uiComponents.showLoadingState = showLoadingState;
}
