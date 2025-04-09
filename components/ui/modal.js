/**
 * Componente de ventana modal
 * @param {string} id - ID único para el modal
 * @param {string} title - Título del modal
 * @param {string} content - Contenido HTML del cuerpo del modal
 * @param {string} size - Tamaño del modal ('sm', 'md', 'lg')
 * @returns {string} HTML del componente modal
 */
function createModal(id, title, content, size = 'md') {
    const sizeClass = size === 'lg' ? 'modal-lg' : (size === 'sm' ? 'modal-sm' : '');
    
    return `
    <div id="${id}" class="modal">
        <div class="modal-content ${sizeClass}">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    </div>
    `;
}

/**
 * Inicializa la funcionalidad de los modales
 * @param {string} modalId - ID del modal a inicializar (opcional, si no se proporciona, inicializa todos)
 */
function initModals(modalId = null) {
    // Seleccionar todos los modales o uno específico
    const modals = modalId 
        ? [document.getElementById(modalId)] 
        : document.querySelectorAll('.modal');
    
    // Para cada modal
    modals.forEach(modal => {
        if (!modal) return;
        
        // Obtener elementos de cierre
        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtns = modal.querySelectorAll('.cancel-modal');
        
        // Función para cerrar el modal
        const closeModal = () => {
            modal.style.display = 'none';
        };
        
        // Asignar evento al botón de cierre
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }
        
        // Asignar evento a los botones de cancelar
        cancelBtns.forEach(btn => {
            btn.addEventListener('click', closeModal);
        });
        
        // Cerrar al hacer clic fuera del contenido del modal
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    });
}

/**
 * Muestra un modal específico
 * @param {string} modalId - ID del modal a mostrar
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

/**
 * Oculta un modal específico
 * @param {string} modalId - ID del modal a ocultar
 */
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Exportar las funciones para su uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createModal, initModals, showModal, hideModal };
} else {
    // Para uso en navegador
    window.uiComponents = window.uiComponents || {};
    window.uiComponents.createModal = createModal;
    window.uiComponents.initModals = initModals;
    window.uiComponents.showModal = showModal;
    window.uiComponents.hideModal = hideModal;
}
