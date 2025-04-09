# Error Service - Servicio de Errores

Este servicio proporciona una forma estandarizada de manejar errores en toda la aplicación del comedor de Grupo Avika, incluyendo registro, notificación al usuario y clasificación de errores.

## Características

- Manejo centralizado de errores
- Clasificación de errores por tipo y severidad
- Registro de errores en consola con formato estandarizado
- Notificaciones de error en la interfaz de usuario
- Captura automática de errores no manejados
- Historial de errores para debugging
- Compatible con el código existente

## Cómo usar el Error Service

### Inicialización

El servicio se inicializa automáticamente, pero puedes configurarlo según tus necesidades:

```javascript
// Configurar el servicio de errores
window.errorService.init({
    logToConsole: true,
    showUIAlerts: true,
    defaultDuration: 5000,
    useNativeAlert: false,
    captureGlobalErrors: true
});
```

### Manejo de errores

#### Errores generales

```javascript
try {
    // Código que puede generar un error
    const result = someRiskyOperation();
} catch (error) {
    // Manejar el error con el servicio
    errorService.handleError(
        error,
        "No se pudo completar la operación",
        ERROR_TYPES.BUSINESS,
        ERROR_SEVERITY.ERROR
    );
}
```

#### Errores de Firebase

```javascript
firebase.firestore().collection('employees').get()
    .then(snapshot => {
        // Procesar resultados
    })
    .catch(error => {
        // Usar el manejador específico para errores de Firebase
        errorService.handleFirebaseError(error, "No se pudieron cargar los empleados");
    });
```

#### Errores de validación

```javascript
function validateForm() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const errors = {};
    
    if (!name) {
        errors.name = "El nombre es obligatorio";
    }
    
    if (!email) {
        errors.email = "El email es obligatorio";
    } else if (!email.includes('@')) {
        errors.email = "El email no es válido";
    }
    
    if (Object.keys(errors).length > 0) {
        // Usar el manejador específico para errores de validación
        errorService.handleValidationError("Por favor corrija los errores en el formulario", errors);
        return false;
    }
    
    return true;
}
```

### Mensajes de éxito, información y advertencia

```javascript
// Mostrar mensaje de éxito
errorService.showSuccess("Operación completada con éxito");

// Mostrar mensaje informativo
errorService.showInfo("La sesión expirará en 5 minutos");

// Mostrar advertencia
errorService.showWarning("Esta acción no se puede deshacer");
```

### Indicador de carga

```javascript
// Mostrar indicador de carga
errorService.toggleLoading(true);

// Realizar operación asíncrona
fetchData().finally(() => {
    // Ocultar indicador de carga cuando termine
    errorService.toggleLoading(false);
});
```

## Migración desde el código existente

El servicio es compatible con el código existente a través del objeto `errorHandler`. Sin embargo, se recomienda migrar gradualmente al nuevo servicio para aprovechar todas sus características.

### Antes:

```javascript
try {
    // Código que puede generar un error
} catch (error) {
    console.error("Error:", error);
    alert("Ha ocurrido un error");
}
```

### Después:

```javascript
try {
    // Código que puede generar un error
} catch (error) {
    errorService.handleError(error, "Ha ocurrido un error");
}
```

### Antes (con errorHandler existente):

```javascript
try {
    // Código que puede generar un error en Firestore
} catch (error) {
    const message = errorHandler.handleFirestoreError(error);
    errorHandler.showUIError(message);
}
```

### Después:

```javascript
try {
    // Código que puede generar un error en Firestore
} catch (error) {
    errorService.handleFirebaseError(error);
}
```

## Tipos de errores y severidades

El servicio define constantes para clasificar los errores:

### Tipos de errores (ERROR_TYPES)

- `VALIDATION`: Errores de validación de datos
- `NETWORK`: Errores de red/conexión
- `AUTH`: Errores de autenticación
- `PERMISSION`: Errores de permisos
- `DATABASE`: Errores de base de datos
- `FIREBASE`: Errores específicos de Firebase
- `UI`: Errores de interfaz de usuario
- `BUSINESS`: Errores de lógica de negocio
- `UNKNOWN`: Errores desconocidos

### Niveles de severidad (ERROR_SEVERITY)

- `INFO`: Informativo, no es realmente un error
- `WARNING`: Advertencia, la operación puede continuar
- `ERROR`: Error, la operación no puede continuar
- `CRITICAL`: Error crítico, puede requerir reinicio o intervención manual

## Integración con el logger existente

El servicio se integra con el sistema de logging existente si está disponible:

```javascript
// Si window.logger está disponible, se usará para registrar errores
if (window.logger) {
    window.logger.error("Mensaje de error", { error });
} else {
    // Fallback a console nativo
    console.error("Mensaje de error", error);
}
```
