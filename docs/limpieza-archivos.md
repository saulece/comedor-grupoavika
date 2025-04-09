# Plan de Limpieza de Archivos Duplicados

Este documento detalla los archivos que pueden ser eliminados después de la reorganización del proyecto.

## Archivos a Eliminar

### Archivos de Configuración y Autenticación
- `js/firebase-config.js` → Reemplazado por `js/services/firebase/config.js`
- `js/auth.js` → Reemplazado por `js/views/auth/auth.js`

### Servicios
- `js/services/error-service-example.js` → Reemplazado por `js/services/error/error-service-example.js`
- `js/services/errorService.js` → Reemplazado por `js/services/error/errorService.js`
- `js/services/firebase-service.js` → Reemplazado por `js/services/firebase/firebase-service.js`
- `js/services/firestore.js` → Reemplazado por `js/services/firebase/firestore.js`
- `js/services/firestoreService.js` → Reemplazado por `js/services/firebase/firestoreService.js`
- `js/services/stateManager.js` → Reemplazado por `js/services/state/stateManager.js`

### Utilidades
- `js/utils/date-utils.js` → Reemplazado por `js/utils/date/date-utils.js`
- `js/utils/data-formatter.js` → Reemplazado por `js/utils/formatting/data-formatter.js`
- `js/utils/excel-handler.js` → Reemplazado por `js/utils/formatting/excel-handler.js`
- `js/utils/excel-parser.js` → Reemplazado por `js/utils/formatting/excel-parser.js`
- `js/utils/validators.js` → Reemplazado por `js/utils/validation/validators.js`

### Vistas de Administrador
- `js/admin/confirmations.js` → Reemplazado por `js/views/admin/confirmations.js`
- `js/admin/create-users.js` → Reemplazado por `js/views/admin/create-users.js`
- `js/admin/menu-fixed.js` → Reemplazado por `js/views/admin/menu-fixed.js`
- `js/admin/menu.js` → Reemplazado por `js/views/admin/menu.js`
- `js/admin/users.js` → Reemplazado por `js/views/admin/users.js`

### Vistas de Coordinador
- `js/coordinator/confirmations.js` → Reemplazado por `js/views/coordinator/confirmations.js`
- `js/coordinator/dashboard.js` → Reemplazado por `js/views/coordinator/dashboard.js`
- `js/coordinator/employees-fixed.js` → Reemplazado por `js/views/coordinator/employees-fixed.js`
- `js/coordinator/employees.js` → Reemplazado por `js/views/coordinator/employees.js`
- `js/coordinator/menu-view.js` → Reemplazado por `js/views/coordinator/menu-view.js`

### Documentación
- `js/services/GUIA-MIGRACION-ERRORSERVICE.md` → Reemplazado por `docs/GUIA-MIGRACION-ERRORSERVICE.md`
- `js/services/README-errorService.md` → Reemplazado por `docs/README-errorService.md`

## Consideraciones Importantes

1. **Antes de eliminar**: Asegúrate de que todas las referencias en los archivos HTML han sido actualizadas para apuntar a las nuevas ubicaciones.

2. **Firebase**: Ten especial cuidado con los archivos relacionados con Firebase, ya que hubo una corrección previa para la inicialización de Firebase. Verifica que la funcionalidad se mantiene después de la reorganización.

3. **Respaldo**: Considera hacer un respaldo del proyecto antes de eliminar archivos, por si es necesario revertir algún cambio.

## Procedimiento Recomendado

1. Actualiza todas las referencias en los archivos HTML (ya realizado)
2. Prueba la aplicación con la nueva estructura
3. Elimina los archivos duplicados
4. Vuelve a probar la aplicación para asegurar que todo funciona correctamente
