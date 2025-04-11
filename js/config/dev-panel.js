/**
 * Panel de control para el modo de desarrollo
 * Este archivo crea una interfaz para controlar las opciones de desarrollo
 */

// Crear el panel de desarrollo
function createDevPanel() {
    // Verificar si ya existe
    if (document.getElementById('dev-panel')) {
        return;
    }
    
    // Crear el contenedor principal
    const panel = document.createElement('div');
    panel.id = 'dev-panel';
    panel.className = 'dev-panel';
    
    // Estilos para el panel
    const style = document.createElement('style');
    style.textContent = `
        .dev-panel {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 9999;
            max-width: 300px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
        }
        .dev-panel.collapsed {
            width: auto;
            height: auto;
        }
        .dev-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            cursor: pointer;
        }
        .dev-panel-title {
            font-weight: bold;
            color: #ff5722;
        }
        .dev-panel-toggle {
            cursor: pointer;
            user-select: none;
        }
        .dev-panel-body {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .dev-panel-option {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .dev-panel-switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
        }
        .dev-panel-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .dev-panel-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #ccc;
            transition: .4s;
            border-radius: 20px;
        }
        .dev-panel-slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        .dev-panel-switch input:checked + .dev-panel-slider {
            background-color: #2196F3;
        }
        .dev-panel-switch input:checked + .dev-panel-slider:before {
            transform: translateX(20px);
        }
        .dev-panel-user-select {
            margin-top: 10px;
            width: 100%;
            padding: 5px;
            background-color: #333;
            color: #fff;
            border: 1px solid #555;
            border-radius: 3px;
        }
        .dev-panel-log {
            margin-top: 10px;
            max-height: 100px;
            overflow-y: auto;
            background-color: #222;
            padding: 5px;
            border-radius: 3px;
            font-size: 10px;
            color: #8bc34a;
        }
        .dev-panel-log-entry {
            margin-bottom: 3px;
            word-break: break-all;
        }
        .dev-panel-actions {
            display: flex;
            gap: 5px;
            margin-top: 10px;
        }
        .dev-panel-button {
            background-color: #2196F3;
            color: white;
            border: none;
            padding: 5px 10px;
            text-align: center;
            text-decoration: none;
            display: inline-block;
            font-size: 10px;
            border-radius: 3px;
            cursor: pointer;
        }
        .dev-panel-button.danger {
            background-color: #f44336;
        }
    `;
    document.head.appendChild(style);
    
    // Crear el encabezado
    const header = document.createElement('div');
    header.className = 'dev-panel-header';
    header.innerHTML = '<div class="dev-panel-title">🛠️ Modo Desarrollo</div><div class="dev-panel-toggle">[-]</div>';
    panel.appendChild(header);
    
    // Crear el cuerpo
    const body = document.createElement('div');
    body.className = 'dev-panel-body';
    panel.appendChild(body);
    
    // Opciones de desarrollo
    const options = [
        { id: 'bypass-auth', label: 'Bypass Autenticación', configKey: 'bypassAuth' },
        { id: 'bypass-role', label: 'Bypass Roles', configKey: 'bypassRoleValidation' },
        { id: 'bypass-date', label: 'Bypass Fechas', configKey: 'bypassDateValidations' },
        { id: 'dev-logs', label: 'Logs Desarrollo', configKey: 'enableDevLogs' },
        { id: 'test-data', label: 'Datos de Prueba', configKey: 'useTestData' }
    ];
    
    // Agregar opciones
    options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'dev-panel-option';
        
        const label = document.createElement('label');
        label.textContent = option.label;
        
        const switchDiv = document.createElement('label');
        switchDiv.className = 'dev-panel-switch';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = option.id;
        input.checked = typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG[option.configKey];
        
        input.addEventListener('change', function() {
            if (typeof DEV_CONFIG !== 'undefined') {
                DEV_CONFIG[option.configKey] = this.checked;
                updateDevLog(`${option.label} ${this.checked ? 'activado' : 'desactivado'}`);
                
                // Guardar configuración en localStorage
                localStorage.setItem('dev_config', JSON.stringify(DEV_CONFIG));
            }
        });
        
        const slider = document.createElement('span');
        slider.className = 'dev-panel-slider';
        
        switchDiv.appendChild(input);
        switchDiv.appendChild(slider);
        
        optionDiv.appendChild(label);
        optionDiv.appendChild(switchDiv);
        
        body.appendChild(optionDiv);
    });
    
    // Selector de usuario de prueba
    const userSelectDiv = document.createElement('div');
    const userSelect = document.createElement('select');
    userSelect.className = 'dev-panel-user-select';
    userSelect.id = 'dev-user-select';
    
    // Opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Seleccionar usuario de prueba';
    userSelect.appendChild(defaultOption);
    
    // Agregar usuarios de prueba si están disponibles
    if (typeof TEST_USERS !== 'undefined') {
        Object.entries(TEST_USERS).forEach(([key, user]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${user.displayName} (${user.role})`;
            userSelect.appendChild(option);
        });
    }
    
    userSelect.addEventListener('change', function() {
        if (this.value && typeof TEST_USERS !== 'undefined') {
            const selectedUser = TEST_USERS[this.value];
            if (selectedUser) {
                updateDevLog(`Usuario seleccionado: ${selectedUser.displayName}`);
                
                // Simular login con el usuario seleccionado
                if (typeof simulateTestUserLogin === 'function') {
                    simulateTestUserLogin(selectedUser)
                        .then(() => {
                            updateDevLog('Login simulado exitoso');
                            setTimeout(() => {
                                window.location.reload();
                            }, 1000);
                        })
                        .catch(error => {
                            updateDevLog(`Error en login simulado: ${error.message}`);
                        });
                } else {
                    // Guardar en localStorage para usar en la próxima carga
                    localStorage.setItem('dev_current_user', JSON.stringify(selectedUser));
                    updateDevLog('Usuario guardado, recargando página...');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            }
        }
    });
    
    userSelectDiv.appendChild(userSelect);
    body.appendChild(userSelectDiv);
    
    // Área de logs
    const logDiv = document.createElement('div');
    logDiv.className = 'dev-panel-log';
    logDiv.id = 'dev-log';
    body.appendChild(logDiv);
    
    // Botones de acción
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'dev-panel-actions';
    
    // Botón de recargar
    const reloadButton = document.createElement('button');
    reloadButton.className = 'dev-panel-button';
    reloadButton.textContent = 'Recargar';
    reloadButton.addEventListener('click', function() {
        window.location.reload();
    });
    actionsDiv.appendChild(reloadButton);
    
    // Botón de logout
    const logoutButton = document.createElement('button');
    logoutButton.className = 'dev-panel-button';
    logoutButton.textContent = 'Logout';
    logoutButton.addEventListener('click', function() {
        localStorage.removeItem('dev_current_user');
        updateDevLog('Sesión cerrada, recargando página...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    });
    actionsDiv.appendChild(logoutButton);
    
    // Botón para inicializar datos de prueba
    const initDataButton = document.createElement('button');
    initDataButton.className = 'dev-panel-button';
    initDataButton.textContent = 'Inicializar Datos';
    initDataButton.addEventListener('click', function() {
        updateDevLog('Inicializando datos de prueba...');
        
        // Verificar si la función está disponible
        if (typeof initializeTestData === 'function') {
            initializeTestData()
                .then(() => {
                    updateDevLog('Datos de prueba inicializados correctamente');
                })
                .catch(error => {
                    updateDevLog(`Error al inicializar datos: ${error.message}`);
                });
        } else {
            // Cargar el script de inicialización si no está disponible
            const devInitScript = document.createElement('script');
            devInitScript.src = '../../js/config/dev-init.js';
            devInitScript.onload = function() {
                updateDevLog('Script de inicialización cargado');
                if (typeof initializeTestData === 'function') {
                    initializeTestData()
                        .then(() => {
                            updateDevLog('Datos de prueba inicializados correctamente');
                        })
                        .catch(error => {
                            updateDevLog(`Error al inicializar datos: ${error.message}`);
                        });
                } else {
                    updateDevLog('Error: Función de inicialización no disponible');
                }
            };
            devInitScript.onerror = function() {
                updateDevLog('Error al cargar script de inicialización');
            };
            document.head.appendChild(devInitScript);
        }
    });
    actionsDiv.appendChild(initDataButton);
    
    // Botón para limpiar datos de prueba
    const clearDataButton = document.createElement('button');
    clearDataButton.className = 'dev-panel-button';
    clearDataButton.textContent = 'Limpiar Datos Test';
    clearDataButton.addEventListener('click', function() {
        if (confirm('¿Estás seguro de que quieres eliminar todos los datos de prueba?')) {
            updateDevLog('Limpiando datos de prueba...');
            
            // Verificar si la función está disponible
            if (typeof clearTestData === 'function') {
                clearTestData()
                    .then(() => {
                        updateDevLog('Datos de prueba eliminados correctamente');
                    })
                    .catch(error => {
                        updateDevLog(`Error al limpiar datos: ${error.message}`);
                    });
            } else {
                // Cargar el script de inicialización si no está disponible
                const devInitScript = document.createElement('script');
                devInitScript.src = '../../js/config/dev-init.js';
                devInitScript.onload = function() {
                    updateDevLog('Script de inicialización cargado');
                    if (typeof clearTestData === 'function') {
                        clearTestData()
                            .then(() => {
                                updateDevLog('Datos de prueba eliminados correctamente');
                            })
                            .catch(error => {
                                updateDevLog(`Error al limpiar datos: ${error.message}`);
                            });
                    } else {
                        updateDevLog('Error: Función de limpieza no disponible');
                    }
                };
                devInitScript.onerror = function() {
                    updateDevLog('Error al cargar script de inicialización');
                };
                document.head.appendChild(devInitScript);
            }
        }
    });
    actionsDiv.appendChild(clearDataButton);
    
    // Botón de limpiar configuración
    const clearConfigButton = document.createElement('button');
    clearConfigButton.className = 'dev-panel-button danger';
    clearConfigButton.textContent = 'Limpiar Config';
    clearConfigButton.addEventListener('click', function() {
        if (confirm('¿Estás seguro de que quieres limpiar toda la configuración de desarrollo?')) {
            localStorage.removeItem('dev_current_user');
            localStorage.removeItem('dev_config');
            updateDevLog('Configuración de desarrollo eliminada, recargando página...');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    });
    actionsDiv.appendChild(clearConfigButton);
    
    body.appendChild(actionsDiv);
    
    // Funcionalidad para colapsar/expandir
    header.addEventListener('click', function() {
        const isCollapsed = panel.classList.toggle('collapsed');
        body.style.display = isCollapsed ? 'none' : 'flex';
        header.querySelector('.dev-panel-toggle').textContent = isCollapsed ? '[+]' : '[-]';
    });
    
    // Agregar al documento
    document.body.appendChild(panel);
    
    // Función para actualizar el log
    function updateDevLog(message) {
        const logEntry = document.createElement('div');
        logEntry.className = 'dev-panel-log-entry';
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        const logDiv = document.getElementById('dev-log');
        if (logDiv) {
            logDiv.appendChild(logEntry);
            logDiv.scrollTop = logDiv.scrollHeight;
            
            // Limitar el número de entradas
            while (logDiv.children.length > 20) {
                logDiv.removeChild(logDiv.firstChild);
            }
        }
    }
    
    // Exponer la función de log para uso global
    window.updateDevLog = updateDevLog;
    
    // Log inicial
    updateDevLog('Panel de desarrollo inicializado');
    
    // Sobrescribir la función devLog para mostrar en el panel
    if (typeof devLog === 'function') {
        const originalDevLog = devLog;
        window.devLog = function(message, data) {
            originalDevLog(message, data);
            updateDevLog(message);
        };
    }
}

// Inicializar el panel cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createDevPanel);
} else {
    createDevPanel();
}

// Exponer la función para uso global
window.createDevPanel = createDevPanel;
