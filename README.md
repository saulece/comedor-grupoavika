# Sistema de Gestión de Comedor Empresarial

Sistema web para optimizar la planificación de comidas y reducir el desperdicio en el comedor empresarial de Grupo Avika.

## Descripción

Este sistema permite a los administradores crear menús semanales y a los coordinadores de cada sucursal confirmar la asistencia de sus empleados, permitiendo una mejor planificación de recursos y reducción de desperdicios.

## Características

- **Dos roles de usuario**:
  - **Administrador**: Crea y publica menús semanales, visualiza reportes
  - **Coordinador**: Gestiona empleados, confirma asistencia diaria

- **Flujo de trabajo**:
  - Creación del menú (Admin)
  - Período de confirmaciones (Jueves 16:10 a Sábado 10:00)
  - Consolidación de datos para cocina
  - Seguimiento de asistencia real

- **Funcionalidades principales**:
  - Gestión de menús semanales 
  - Confirmación masiva de empleados
  - Importación de empleados desde Excel
  - Visualización de métricas y ahorro estimado

## Estructura del Proyecto

```
comedor-app/
├── assets/           # Imágenes, iconos y plantillas
├── css/              # Estilos CSS
├── js/               # Scripts JavaScript
│   ├── services/     # Servicios (Firebase, notificaciones)
│   ├── models/       # Modelos de datos
│   ├── utils/        # Utilidades (fechas, validación)
│   └── views/        # Lógica específica de páginas
└── pages/            # Páginas HTML
    ├── admin/        # Interfaces de administrador
    └── coordinator/  # Interfaces de coordinador
```

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Firebase
  - Firestore Database (NoSQL)
  - Firebase Authentication
- **Hosting**: Netlify/Firebase Hosting
- **Librerías**: SheetJS para manejo de Excel

## Requisitos de Instalación

1. Node.js y npm instalados
2. Cuenta en Firebase
3. Configuración del proyecto Firebase

## Configuración

1. Clonar este repositorio
2. Actualizar archivo `js/services/firebase/config.js` con tus credenciales de Firebase:

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};
```

3. Instalar Firebase CLI (opcional, para despliegue local):
```bash
npm install -g firebase-tools
firebase login
firebase init
```

## Estructura de Datos en Firestore

### Colecciones Principales

- **users**: Información de usuarios (admins y coordinadores)
- **branches**: Sucursales de la empresa
- **employees**: Información de empleados por sucursal
- **weeklyMenus**: Menús semanales con subcollección dailyMenus
- **confirmations**: Confirmaciones de asistencia por sucursal y semana
- **settings**: Configuración del sistema

## Reglas de Seguridad

Para implementar correctamente las reglas de seguridad en Firestore, sigue esta estructura:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Validar si el usuario está autenticado
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Validar rol de administrador
    function isAdmin() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Validar rol de coordinador
    function isCoordinator() {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'coordinator';
    }
    
    // Verificar si el coordinador pertenece a la sucursal
    function isCoordinatorOfBranch(branchId) {
      return isCoordinator() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.branch == branchId;
    }
    
    // Reglas para usuarios
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin() || request.auth.uid == userId;
    }
    
    // Reglas para sucursales
    match /branches/{branchId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Reglas para empleados
    match /employees/{employeeId} {
      allow read: if isAuthenticated();
      allow create: if isCoordinatorOfBranch(resource.data.branch) || isAdmin();
      allow update, delete: if isCoordinatorOfBranch(resource.data.branch) || isAdmin();
    }
    
    // Reglas para menús semanales
    match /weeklyMenus/{weekId} {
      allow read: if isAuthenticated();
      allow create, update: if isAdmin();
      
      // Subcollección de menús diarios
      match /dailyMenus/{dayId} {
        allow read: if isAuthenticated();
        allow write: if isAdmin();
      }
    }
    
    // Reglas para confirmaciones
    match /confirmations/{confirmationId} {
      allow read: if isAuthenticated();
      allow create: if isCoordinator();
      allow update: if isCoordinatorOfBranch(resource.data.branchId) || isAdmin();
    }
    
    // Reglas para configuración
    match /settings/{settingId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

## Despliegue

### Despliegue en Firebase Hosting

```bash
firebase deploy
```

### Despliegue en Netlify

1. Conecta tu repositorio de GitHub a Netlify
2. Configura las variables de entorno necesarias
3. Configura el comando de build si es necesario

## Autor

Desarrollado para Grupo Avika - 2025

## Licencia

Este proyecto es propiedad de Grupo Avika y está protegido por derechos de autor.