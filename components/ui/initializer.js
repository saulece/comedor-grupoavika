/**
 * Utilidad para inicializar componentes UI en páginas HTML
 * Este archivo ayuda a implementar los componentes UI reutilizables en las páginas existentes
 */

/**
 * Inicializa los componentes UI básicos en una página
 * @param {string} role - Rol del usuario ('admin' o 'coordinator')
 * @param {string} activePage - Página activa actual
 * @param {string} pageTitle - Título de la página
 * @param {string} defaultUserName - Nombre de usuario por defecto
 */
function initializeBasicUI(role, activePage, pageTitle, defaultUserName = '') {
    // Obtener el nombre de usuario desde sessionStorage
    let userName = defaultUserName;
    try {
        const userJson = sessionStorage.getItem('user');
        if (userJson) {
            const userObj = JSON.parse(userJson);
            userName = userObj.displayName || userName;
        }
    } catch (error) {
        console.error('Error parsing user data:', error);
    }
    
    // Inicializar sidebar
    const sidebarContainer = document.querySelector('.sidebar');
    if (sidebarContainer && window.uiComponents && window.uiComponents.createSidebar) {
        sidebarContainer.outerHTML = window.uiComponents.createSidebar(role, activePage);
    }
    
    // Inicializar content header
    const contentHeader = document.querySelector('.content-header');
    if (contentHeader && window.uiComponents && window.uiComponents.createContentHeader) {
        contentHeader.outerHTML = window.uiComponents.createContentHeader(pageTitle, userName);
    }
    
    // Configurar el botón de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof logout === 'function') {
                logout();
            } else if (firebase && firebase.auth) {
                firebase.auth().signOut().then(() => {
                    window.location.href = '../../index.html';
                });
            }
        });
    }
    
    // Inicializar modales
    if (window.uiComponents && window.uiComponents.initModals) {
        window.uiComponents.initModals();
    }
}

/**
 * Crea un componente de carga si no existe
 */
function ensureLoadingIndicator() {
    if (!document.getElementById('loading-indicator') && 
        window.uiComponents && 
        window.uiComponents.createLoadingIndicator) {
        
        const loadingHtml = window.uiComponents.createLoadingIndicator();
        document.body.insertAdjacentHTML('beforeend', loadingHtml);
    }
}

/**
 * Crea un componente de alerta si no existe
 */
function ensureAlertMessage() {
    if (!document.getElementById('error-alert') && 
        window.uiComponents && 
        window.uiComponents.createAlert) {
        
        const alertHtml = window.uiComponents.createAlert('error-alert', 'error');
        document.body.insertAdjacentHTML('beforeend', alertHtml);
    }
}

// Exportar las funciones para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        initializeBasicUI,
        ensureLoadingIndicator,
        ensureAlertMessage
    };
} else {
    // Para uso en navegador
    window.uiComponents = window.uiComponents || {};
    window.uiComponents.initializeBasicUI = initializeBasicUI;
    window.uiComponents.ensureLoadingIndicator = ensureLoadingIndicator;
    window.uiComponents.ensureAlertMessage = ensureAlertMessage;
}
