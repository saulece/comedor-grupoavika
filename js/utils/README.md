# Utilidades

Esta carpeta contiene funciones y utilidades de propósito general organizadas por categoría.

## Estructura

- `/validation`: Funciones para validación de datos
- `/formatting`: Utilidades para formateo de datos y manejo de archivos Excel

## Módulos de Utilidades Centralizadas

### date-utils.js
Centraliza todas las funciones relacionadas con fechas para evitar duplicación y asegurar consistencia:
- `formatDate`: Formatea fechas en formato YYYY-MM-DD para almacenamiento
- `formatDateDisplay`: Formatea fechas en formato DD/MM/YYYY para mostrar al usuario
- `formatDateForFile`: Formatea fechas para nombres de archivo (YYYYMMDD)
- `getMonday`: Obtiene el lunes de la semana actual o de una fecha específica
- `getFriday`: Obtiene el viernes de la semana actual o de una fecha específica
- `formatWeekRange`: Formatea un rango de fechas para mostrar (semana)

### employee-utils.js
Centraliza funciones para el manejo de empleados:
- `validateEmployee`: Valida datos de un empleado
- `formatEmployeeForSave`: Formatea datos de empleado para guardar en Firestore
- `employeesToCSV`: Convierte datos de empleados a formato CSV
- `parseCSVToEmployees`: Parsea datos CSV a formato de empleados
- `generateCSVTemplate`: Genera una plantilla CSV para importación de empleados

### menu-utils.js
Centraliza funciones para el manejo de menús:
- `normalizeMenuData`: Normaliza la estructura de datos del menú para asegurar consistencia
- `createEmptyMenu`: Crea un menú vacío para una semana
- `validateMenu`: Valida estructura de un menú
- `formatMenuForDisplay`: Formatea menú para mostrar en la interfaz
- `hasMenuChanged`: Compara dos menús para detectar cambios
- `normalizeDayNames`: Normaliza nombres de días con acentos (ej. "miércoles")

### ui-message-utils.js
Centraliza funciones para el manejo de mensajes y errores en la interfaz:
- `showError`: Muestra mensaje de error
- `showSuccess`: Muestra mensaje de éxito
- `showInfo`: Muestra mensaje informativo
- `toggleLoading`: Muestra u oculta indicador de carga
- `handleFirebaseError`: Maneja errores de Firebase con mensajes amigables

### validators.js (en /validation)
Centraliza todas las funciones de validación de datos y formularios:
- `isValidEmail`: Valida formato de correo electrónico
- `isNotEmpty`: Verifica que un valor no esté vacío
- `isNumber`: Verifica que un valor sea un número
- `isPositive`: Verifica que un número sea positivo
- `isInRange`: Verifica que un número esté dentro de un rango
- `isValidDate`: Valida formato de fecha
- `isFutureDate`: Verifica que una fecha sea futura
- `isPastDate`: Verifica que una fecha sea pasada
- `isStrongPassword`: Valida requisitos de contraseña segura
- `validateForm`: Valida un formulario completo contra un conjunto de reglas

### common-utils.js
Contiene utilidades generales que no pertenecen a una categoría específica:
- Funciones de manipulación de strings
- Funciones de manipulación de arrays
- Funciones de manipulación de objetos
- Funciones de manejo de localStorage y sessionStorage
- Funciones de ayuda para debugging

## Propósito

Las utilidades son funciones de ayuda que proporcionan funcionalidad común y reutilizable en toda la aplicación. Estas funciones no tienen estado y generalmente realizan operaciones específicas y bien definidas.

## Cómo Usar

Para utilizar estas utilidades en cualquier archivo JavaScript:

```javascript
// Ejemplo de uso de date-utils
const fechaFormateada = window.formatDate(new Date());

// Ejemplo de uso de ui-message-utils
window.showSuccess('Operación completada con éxito');

// Ejemplo de uso de employee-utils
const validacion = window.validateEmployee(datosEmpleado);

// Ejemplo de uso de menu-utils
const menuNormalizado = window.normalizeMenuData(menuData);

// Ejemplo de uso de validators
const esEmailValido = window.validators.isValidEmail(email);
const validacionForm = window.validators.validateForm(formData, reglas);
```

Las utilidades están diseñadas para ser compatibles con versiones anteriores, proporcionando implementaciones de respaldo cuando las funciones centralizadas no están disponibles.
