/**
 * Componente de barra lateral (Sidebar)
 * @param {string} role - Rol del usuario (admin o coordinator)
 * @param {string} activePage - Página activa actual
 * @returns {string} HTML del componente sidebar
 */
function createSidebar(role, activePage) {
    const isAdmin = role === 'admin';
    
    // Definir los elementos del menú según el rol
    let menuItems = '';
    
    if (isAdmin) {
        menuItems = `
            <li>
                <a href="dashboard.html" ${activePage === 'dashboard' ? 'class="active"' : ''}>
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </a>
            </li>
            <li>
                <a href="menu.html" ${activePage === 'menu' ? 'class="active"' : ''}>
                    <i class="fas fa-utensils"></i> Menú
                </a>
            </li>
            <li>
                <a href="confirmations.html" ${activePage === 'confirmations' ? 'class="active"' : ''}>
                    <i class="fas fa-clipboard-check"></i> Confirmaciones
                </a>
            </li>
            <li>
                <a href="users.html" ${activePage === 'users' ? 'class="active"' : ''}>
                    <i class="fas fa-users-cog"></i> Usuarios
                </a>
            </li>
        `;
    } else {
        // Coordinador
        menuItems = `
            <li>
                <a href="dashboard.html" ${activePage === 'dashboard' ? 'class="active"' : ''}>
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </a>
            </li>
            <li>
                <a href="menu.html" ${activePage === 'menu' ? 'class="active"' : ''}>
                    <i class="fas fa-utensils"></i> Menú
                </a>
            </li>
            <li>
                <a href="confirmations.html" ${activePage === 'confirmations' ? 'class="active"' : ''}>
                    <i class="fas fa-clipboard-check"></i> Confirmaciones
                </a>
            </li>
            <li>
                <a href="employees.html" ${activePage === 'employees' ? 'class="active"' : ''}>
                    <i class="fas fa-users"></i> Empleados
                </a>
            </li>
        `;
    }
    
    return `
    <div class="sidebar">
        <div class="sidebar-header">
            <img src="../../assets/img/logo-small.png" alt="Grupo Avika Logo">
            <h3>Grupo Avika</h3>
        </div>
        <div class="sidebar-menu">
            <ul>
                ${menuItems}
                <li>
                    <a href="#" id="logout-btn">
                        <i class="fas fa-sign-out-alt"></i> Cerrar sesión
                    </a>
                </li>
            </ul>
        </div>
    </div>
    `;
}

// Exportar la función para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSidebar };
} else {
    // Para uso en navegador
    window.uiComponents = window.uiComponents || {};
    window.uiComponents.createSidebar = createSidebar;
}
