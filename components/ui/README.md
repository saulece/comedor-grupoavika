# Componentes UI Reutilizables

Este directorio contiene componentes de interfaz de usuario reutilizables para el proyecto del comedor de Grupo Avika.

## Componentes disponibles

- **Sidebar**: Barra lateral de navegación
- **Content Header**: Encabezado de contenido con título y nombre de usuario
- **Modal**: Ventanas modales reutilizables
- **Card**: Tarjetas para mostrar contenido
- **Loading**: Indicador de carga
- **Alert**: Mensajes de alerta

## Cómo usar los componentes

### 1. Incluir los archivos JavaScript

Agrega los siguientes scripts en tus páginas HTML:

```html
<!-- Componentes UI -->
<script src="../../components/ui/sidebar.js"></script>
<script src="../../components/ui/content-header.js"></script>
<script src="../../components/ui/modal.js"></script>
<script src="../../components/ui/card.js"></script>
<script src="../../components/ui/loading.js"></script>
<script src="../../components/ui/alert.js"></script>
<script src="../../components/ui/initializer.js"></script>
```

### 2. Inicializar los componentes básicos

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar componentes UI básicos
    if (window.uiComponents && window.uiComponents.initializeBasicUI) {
        window.uiComponents.initializeBasicUI(
            'admin', // o 'coordinator'
            'dashboard', // página activa
            'Dashboard', // título de la página
            'Administrador' // nombre de usuario por defecto
        );
    }
    
    // Asegurar que existan los componentes de carga y alerta
    if (window.uiComponents) {
        if (window.uiComponents.ensureLoadingIndicator) {
            window.uiComponents.ensureLoadingIndicator();
        }
        if (window.uiComponents.ensureAlertMessage) {
            window.uiComponents.ensureAlertMessage();
        }
    }
});
```

### 3. Usar componentes individuales

#### Crear una tarjeta
```javascript
const cardContent = `
    <p>Contenido de la tarjeta</p>
    <button class="btn btn-primary">Acción</button>
`;

const card = window.uiComponents.createCard(
    cardContent,
    'Título de la tarjeta',
    true,
    '<button class="btn btn-sm">Acción en header</button>'
);

document.querySelector('.container').innerHTML += card;
```

#### Crear una tarjeta de estadísticas
```javascript
const statCard = window.uiComponents.createStatCard(
    'fas fa-users',
    'Total Empleados',
    '42'
);

document.querySelector('.stats-container').innerHTML += statCard;
```

#### Crear y mostrar un modal
```javascript
const modalContent = `
    <p>Este es el contenido del modal</p>
    <button class="btn btn-primary">Aceptar</button>
`;

const modal = window.uiComponents.createModal(
    'mi-modal',
    'Título del Modal',
    modalContent
);

document.body.innerHTML += modal;
window.uiComponents.initModals('mi-modal');

// Para mostrar el modal
window.uiComponents.showModal('mi-modal');
```

#### Mostrar una alerta
```javascript
window.uiComponents.showAlert(
    'Operación completada con éxito',
    'success',
    'alert-message',
    5000 // duración en ms
);
```

## Ejemplo de implementación en una página existente

Para implementar estos componentes en una página existente, reemplaza el código HTML estático por llamadas a los componentes UI. Por ejemplo:

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Administrador</title>
    <link rel="stylesheet" href="../../css/styles.css">
    <link rel="stylesheet" href="../../css/admin.css">
    <link rel="icon" type="image/x-icon" href="../../favicon.ico">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
</head>
<body>
    <div class="admin-container">
        <!-- El sidebar se insertará aquí dinámicamente -->
        <div class="sidebar"></div>

        <div class="main-content">
            <!-- El content-header se insertará aquí dinámicamente -->
            <div class="content-header"></div>

            <div class="stats-container" id="stats-container">
                <!-- Las tarjetas de estadísticas se insertarán aquí dinámicamente -->
            </div>

            <div id="card-container">
                <!-- Las tarjetas se insertarán aquí dinámicamente -->
            </div>
        </div>
    </div>

    <!-- Firebase Scripts -->
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>
    
    <!-- Componentes UI -->
    <script src="../../components/ui/sidebar.js"></script>
    <script src="../../components/ui/content-header.js"></script>
    <script src="../../components/ui/modal.js"></script>
    <script src="../../components/ui/card.js"></script>
    <script src="../../components/ui/loading.js"></script>
    <script src="../../components/ui/alert.js"></script>
    <script src="../../components/ui/initializer.js"></script>
    
    <!-- Custom Scripts -->
    <script src="../../js/firebase-config.js"></script>
    <script src="../../js/auth.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // Inicializar componentes UI básicos
            if (window.uiComponents && window.uiComponents.initializeBasicUI) {
                window.uiComponents.initializeBasicUI(
                    'admin',
                    'dashboard',
                    'Dashboard',
                    'Administrador'
                );
            }
            
            // Asegurar que existan los componentes de carga y alerta
            if (window.uiComponents) {
                if (window.uiComponents.ensureLoadingIndicator) {
                    window.uiComponents.ensureLoadingIndicator();
                }
                if (window.uiComponents.ensureAlertMessage) {
                    window.uiComponents.ensureAlertMessage();
                }
            }
            
            // Crear tarjetas de estadísticas
            const statsContainer = document.getElementById('stats-container');
            if (statsContainer && window.uiComponents && window.uiComponents.createStatCard) {
                statsContainer.innerHTML = 
                    window.uiComponents.createStatCard('fas fa-users', 'Total Empleados', '0', 'total-employees') +
                    window.uiComponents.createStatCard('fas fa-utensils', 'Confirmaciones Hoy', '0', 'today-confirmations') +
                    window.uiComponents.createStatCard('fas fa-clipboard-list', 'Menús Publicados', '0', 'published-menus') +
                    window.uiComponents.createStatCard('fas fa-building', 'Departamentos', '0', 'total-departments');
            }
            
            // Crear tarjetas de contenido
            const cardContainer = document.getElementById('card-container');
            if (cardContainer && window.uiComponents && window.uiComponents.createCard) {
                // Tarjeta de estado del menú
                const menuStatusContent = `
                    <div id="menu-status-container">
                        <div class="menu-status-loading">
                            <p>Cargando información del menú...</p>
                        </div>
                    </div>
                    <a href="menu.html" class="btn btn-primary">Gestionar Menú</a>
                `;
                
                // Tarjeta de confirmaciones recientes
                const confirmationsContent = `
                    <div class="table-responsive">
                        <table class="confirmations-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Coordinador</th>
                                    <th>Departamento</th>
                                    <th>Confirmados</th>
                                </tr>
                            </thead>
                            <tbody id="recent-confirmations-table-body">
                                <tr>
                                    <td colspan="4" class="text-center">Cargando confirmaciones recientes...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <a href="confirmations.html" class="btn btn-primary">Ver todas</a>
                `;
                
                cardContainer.innerHTML = 
                    window.uiComponents.createCard(menuStatusContent, 'Estado del Menú Semanal') +
                    window.uiComponents.createCard(confirmationsContent, 'Confirmaciones Recientes');
            }
            
            // Cargar datos del dashboard
            loadDashboardData();
        });
        
        function loadDashboardData() {
            // Código para cargar datos...
        }
    </script>
</body>
</html>
```
