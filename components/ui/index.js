/**
 * Archivo principal de componentes UI
 * Importa y exporta todos los componentes UI para facilitar su uso
 */

// Importar componentes si estamos en un entorno Node.js
if (typeof module !== 'undefined' && module.exports) {
    const { createSidebar } = require('./sidebar');
    const { createContentHeader } = require('./content-header');
    const { createModal, initModals, showModal, hideModal } = require('./modal');
    const { createCard, createStatCard, createSummaryCard } = require('./card');
    const { createLoadingIndicator, showLoadingState } = require('./loading');
    const { createAlert, showAlert, hideAlert } = require('./alert');
    
    // Exportar todos los componentes
    module.exports = {
        createSidebar,
        createContentHeader,
        createModal,
        initModals,
        showModal,
        hideModal,
        createCard,
        createStatCard,
        createSummaryCard,
        createLoadingIndicator,
        showLoadingState,
        createAlert,
        showAlert,
        hideAlert
    };
} else {
    // Para uso en navegador, todos los componentes se agregan al objeto window.uiComponents
    window.uiComponents = window.uiComponents || {};
}
