# Seguridad en Comedor Grupo Avika

Este documento describe las mejoras de seguridad implementadas en la aplicación Comedor Grupo Avika, especialmente las reglas de seguridad de Firestore para proteger los datos según los roles de usuario.

## Reglas de Seguridad Implementadas

Se han implementado reglas de seguridad para Firestore que protegen los datos según los siguientes roles:

- **Administrador**: Acceso completo a todas las colecciones
- **Coordinador**: Acceso limitado a menús y empleados/confirmaciones de sus departamentos
- **Empleado**: Acceso solo a menús publicados y sus propias confirmaciones

## Archivos Creados/Modificados

1. **firestore.rules**: Reglas de seguridad para Firestore
2. **storage.rules**: Reglas de seguridad para Firebase Storage
3. **firebase.json**: Configuración para desplegar las reglas
4. **firestore.indexes.json**: Índices para mejorar el rendimiento de consultas
5. **js/utils/firebase-security-utils.js**: Utilidades para manejar errores de seguridad
6. **js/services/firebase/firebase-service.js**: Modificado para integrar manejo de errores de seguridad

## Cómo Desplegar las Reglas de Seguridad

Para desplegar las reglas de seguridad, sigue estos pasos:

1. Instala Firebase CLI si aún no lo has hecho:
   ```
   npm install -g firebase-tools
   ```

2. Inicia sesión en Firebase:
   ```
   firebase login
   ```

3. Selecciona tu proyecto:
   ```
   firebase use comedor-grupoavika
   ```

4. Despliega las reglas:
   ```
   firebase deploy --only firestore:rules,storage:rules
   ```

## Estructura de Datos Requerida

Para que las reglas de seguridad funcionen correctamente, asegúrate de que:

1. **Usuarios**:
   - Cada usuario tenga un campo `role` con uno de estos valores: 'admin', 'coordinator', 'employee'
   - Los coordinadores tengan un campo `departments` que sea un array con los IDs de los departamentos que gestionan

2. **Menús**:
   - Tengan un campo `status` con uno de estos valores: 'draft', 'published', 'archived'

3. **Confirmaciones**:
   - Tengan campos `departmentId` y `employeeId` para identificar a quién pertenecen

## Cambios en el Código

### Manejo de Errores de Seguridad

Se ha mejorado el manejo de errores en el servicio de Firebase para detectar y mostrar mensajes amigables cuando ocurren errores de permisos:

```javascript
// Ejemplo de uso
try {
  const menu = await firebaseService.getMenuByWeek('2023-05-15');
  // Procesar menú
} catch (error) {
  // El error ya ha sido manejado por el servicio
}
```

### Verificación de Roles

Se ha añadido una función para verificar roles de usuario:

```javascript
// Verificar si el usuario tiene rol de administrador
if (firebaseSecurityUtils.verificarRol('admin')) {
  // Realizar operaciones de administrador
}
```

## Consideraciones para el Futuro

1. **Claims Personalizados**: Implementar claims en Firebase Auth para almacenar el rol del usuario en el token JWT.

2. **Validación de Datos**: Añadir reglas más estrictas para validar la estructura de los documentos.

3. **Auditoría**: Implementar un sistema de auditoría para registrar quién realiza cambios en los datos.

## Solución de Problemas

Si encuentras errores de permisos después de implementar estas reglas:

1. Verifica que los usuarios tengan asignados los roles correctos en Firestore.
2. Asegúrate de que los coordinadores tengan asignados los departamentos correctos.
3. Revisa los mensajes de error en la consola del navegador para obtener más detalles.
