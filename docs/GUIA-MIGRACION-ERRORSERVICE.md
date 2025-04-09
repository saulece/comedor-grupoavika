# Guía de Migración al Nuevo Error Service

Esta guía proporciona instrucciones paso a paso para migrar el código existente al nuevo servicio centralizado de manejo de errores (`errorService`) en la aplicación del comedor de Grupo Avika.

## Índice

1. [Actualización de Páginas HTML](#1-actualización-de-páginas-html)
2. [Migración de Código JavaScript](#2-migración-de-código-javascript)
3. [Casos Especiales](#3-casos-especiales)
4. [Verificación](#4-verificación)
5. [Compatibilidad con Firebase](#5-compatibilidad-con-firebase)

## 1. Actualización de Páginas HTML

Para cada página HTML, sigue estos pasos:

### 1.1. Agregar el elemento de alerta para advertencias

Añade el siguiente elemento HTML junto a los otros elementos de alerta:

```html
<div id="warning-alert" class="alert-message warning-message" style="display: none;"></div>
```

### 1.2. Incluir el script del servicio de errores

Añade el script del servicio de errores después de los scripts de utilidades y antes de los scripts específicos de la página:

```html
<script src="../../js/services/errorService.js"></script>
```

### Ejemplo completo

```html
<!-- Alert Messages -->
<div id="error-alert" class="alert-message error-message" style="display: none;"></div>
<div id="success-alert" class="alert-message success-message" style="display: none;"></div>
<div id="info-alert" class="alert-message info-message" style="display: none;"></div>
<div id="warning-alert" class="alert-message warning-message" style="display: none;"></div>

<!-- Firebase Scripts -->
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js"></script>

<!-- Utility Scripts -->
<script src="../../js/utils/logger.js"></script>
<script src="../../js/utils/date-utils.js"></script>
<script src="../../js/utils/error-handler.js"></script>

<!-- Servicios -->
<script src="../../js/services/firestore.js"></script>
<script src="../../js/services/errorService.js"></script>
<script src="../../js/auth.js"></script>

<!-- Script principal de la página -->
<script src="../../js/coordinator/nombre-script.js"></script>
```

## 2. Migración de Código JavaScript

### 2.1. Reemplazar `console.error`

Busca todas las instancias de `console.error` y reemplázalas con el método apropiado de `errorService`:

#### Antes:

```javascript
try {
    // Código que puede fallar
} catch (error) {
    console.error('Error al realizar operación:', error);
    // Posiblemente seguido de un alert o messageHandler.showError
}
```

#### Después:

```javascript
try {
    // Código que puede fallar
} catch (error) {
    window.errorService.handleError(
        error,
        'Error al realizar operación',
        ERROR_TYPES.UNKNOWN,  // Usar el tipo apropiado
        ERROR_SEVERITY.ERROR
    );
}
```

### 2.2. Reemplazar `alert` para errores

Busca todas las instancias de `alert` usadas para mostrar errores:

#### Antes:

```javascript
alert('Error: ' + mensaje);
```

#### Después:

```javascript
window.errorService.handleError(
    new Error(mensaje),
    mensaje,
    ERROR_TYPES.UI,
    ERROR_SEVERITY.ERROR
);
```

### 2.3. Reemplazar `messageHandler.showError` y similares

#### Antes:

```javascript
messageHandler.showError('Mensaje de error');
messageHandler.showSuccess('Operación exitosa');
messageHandler.toggleLoading(true);
```

#### Después:

```javascript
window.errorService.handleError(
    new Error('Mensaje de error'),
    'Mensaje de error',
    ERROR_TYPES.UI,
    ERROR_SEVERITY.ERROR
);
window.errorService.showSuccess('Operación exitosa');
window.errorService.toggleLoading(true);
```

### 2.4. Errores de Firebase

Para errores específicos de Firebase, usa el método especializado:

#### Antes:

```javascript
try {
    // Operación de Firebase
} catch (error) {
    console.error('Error de Firebase:', error);
    const mensaje = window.errorHandler.handleFirestoreError(error);
    window.errorHandler.showUIError(mensaje);
}
```

#### Después:

```javascript
try {
    // Operación de Firebase
} catch (error) {
    window.errorService.handleFirebaseError(error, 'Error al realizar operación');
}
```

### 2.5. Validación de formularios

Para errores de validación, usa el método especializado:

```javascript
const errores = {};
if (!nombre) errores.nombre = 'El nombre es obligatorio';
if (!email) errores.email = 'El email es obligatorio';

if (Object.keys(errores).length > 0) {
    window.errorService.handleValidationError('Por favor corrija los errores', errores);
    return false;
}
```

## 3. Casos Especiales

### 3.1. Código que usa el error-handler existente

El nuevo `errorService` proporciona compatibilidad con el `errorHandler` existente, por lo que no es necesario actualizar inmediatamente todo el código. Sin embargo, se recomienda migrar gradualmente a los nuevos métodos para aprovechar todas las características.

### 3.2. Mensajes informativos y advertencias

Para mensajes que no son errores, usa los métodos específicos:

```javascript
// Mensaje informativo
window.errorService.showInfo('La sesión expirará en 5 minutos');

// Advertencia
window.errorService.showWarning('Esta acción no se puede deshacer');
```

## 4. Verificación

Después de migrar cada archivo, verifica que:

1. Los errores se muestren correctamente en la interfaz de usuario
2. Los mensajes de éxito se muestren correctamente
3. El indicador de carga funcione correctamente
4. Los errores se registren en la consola con el formato adecuado

## 5. Compatibilidad con Firebase

Teniendo en cuenta la corrección previa en la inicialización de Firebase, asegúrate de que las operaciones de Firestore se realicen correctamente:

```javascript
// Forma correcta de acceder a las colecciones de Firestore
try {
    const snapshot = await firebase.firestore().collection('employees').get();
    // Procesar datos
} catch (error) {
    window.errorService.handleFirebaseError(error, 'Error al cargar empleados');
}
```

## Ejemplo Completo

```javascript
async function cargarDatos() {
    try {
        // Mostrar indicador de carga
        window.errorService.toggleLoading(true);
        
        // Validar parámetros
        const fecha = document.getElementById('fecha').value;
        if (!fecha) {
            window.errorService.handleValidationError(
                'Debe seleccionar una fecha',
                { fecha: 'Campo obligatorio' }
            );
            return;
        }
        
        // Realizar operación de Firebase
        const snapshot = await firebase.firestore()
            .collection('confirmations')
            .where('date', '==', fecha)
            .get();
            
        // Procesar datos
        const confirmaciones = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Mostrar mensaje de éxito
        window.errorService.showSuccess('Datos cargados correctamente');
        
        return confirmaciones;
    } catch (error) {
        // Manejar error de Firebase
        window.errorService.handleFirebaseError(error, 'Error al cargar confirmaciones');
        return [];
    } finally {
        // Ocultar indicador de carga
        window.errorService.toggleLoading(false);
    }
}
```
