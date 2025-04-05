# Comedor Grupo Avika

Sistema de gestión de comedor empresarial para Grupo Avika.

## Descripción

Aplicación web para la gestión del comedor de la empresa Grupo Avika. El sistema permite:

- **Administradores**:
  - Publicación del menú semanal
  - Visualización de confirmaciones de empleados
  - Exportar reportes de confirmaciones

- **Coordinadores**:
  - Visualización del menú semanal
  - Gestión de empleados de su departamento
  - Registro de confirmaciones diarias

## Tecnologías

- HTML5, CSS3, JavaScript (ES6+)
- Firebase (Autenticación, Firestore, Storage)
- Diseño responsive

## Estructura del Proyecto

```
comedor-app/
│
├── index.html                          # Página de inicio/login
├── favicon.ico                         # Ícono de la aplicación
│
├── css/
│   ├── styles.css                      # Estilos globales
│   ├── login.css                       # Estilos para login
│   ├── admin.css                       # Estilos para panel de administrador
│   └── coordinator.css                 # Estilos para panel de coordinador
│
├── js/
│   ├── firebase-config.js              # Configuración de Firebase
│   ├── auth.js                         # Funciones de autenticación
│   ├── admin/
│   │   ├── menu.js                     # Gestión de menú (admin)
│   │   └── confirmations.js            # Ver confirmaciones (admin)
│   │
│   ├── coordinator/
│   │   ├── menu-view.js                # Ver menú (coordinador)
│   │   ├── confirmations.js            # Registrar confirmaciones
│   │   └── employees.js                # Gestión de empleados
│   │
│   └── utils/
│       ├── excel-parser.js             # Manejo de importación de Excel
│       ├── data-formatter.js           # Formateo de datos
│       └── validators.js               # Validaciones
│
├── pages/
│   ├── admin/
│   │   ├── dashboard.html              # Panel principal del admin
│   │   ├── menu.html                   # Publicar menú
│   │   └── confirmations.html          # Ver confirmaciones
│   │
│   └── coordinator/
│       ├── dashboard.html              # Panel principal del coordinador
│       ├── menu.html                   # Ver menú
│       ├── confirmations.html          # Registrar confirmaciones
│       └── employees.html              # Gestión de empleados
│
├── assets/
│   ├── icons/                          # Íconos de la aplicación
│   └── img/                            # Imágenes
│
└── README.md                           # Documentación del proyecto
```

## Instalación y Configuración

### Requisitos Previos

- Cuenta de Firebase con un proyecto configurado
- Navegador web moderno (Chrome, Firefox, Edge, Safari)

### Configuración de Firebase

1. Crear un proyecto en Firebase Console
2. Habilitar Autenticación (correo/contraseña)
3. Configurar Firestore Database
4. Actualizar `js/firebase-config.js` con tus credenciales:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### Estructura de la Base de Datos

Colecciones de Firestore:

- **users**: Usuarios del sistema (administradores y coordinadores)
- **menus**: Menús semanales
- **confirmations**: Confirmaciones diarias de comedor
- **employees**: Empleados organizados por departamento

## Uso

### Acceso al Sistema

1. Accede al sistema con tus credenciales de usuario
2. Según tu rol (administrador o coordinador), serás redirigido al panel correspondiente

### Panel de Administrador

- **Publicar Menú**: Crea y publica el menú semanal
- **Confirmaciones**: Visualiza y exporta las confirmaciones registradas

### Panel de Coordinador

- **Ver Menú**: Visualiza el menú semanal publicado
- **Empleados**: Gestiona los empleados de tu departamento
- **Confirmaciones**: Registra las confirmaciones diarias de comedor

## Desarrollo y Contribución

### Guía de Estilo

- Se utiliza camelCase para nombres de variables y funciones
- Se utiliza PascalCase para nombres de clases
- Se utiliza kebab-case para nombres de archivos y carpetas
- Se utilizan 4 espacios para la indentación

### Extendiendo Funcionalidades

Para agregar nuevas funcionalidades:

1. Crear los archivos HTML/CSS/JS necesarios siguiendo la estructura existente
2. Actualizar la navegación en los paneles correspondientes
3. Agregar la lógica de negocio en los archivos JS

## Licencia

Proyecto desarrollado para uso interno de Grupo Avika.
Todos los derechos reservados © 2025 Grupo Avika