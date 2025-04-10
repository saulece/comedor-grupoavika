# COMEDOR GRUPO AVIKA - SISTEMA DE GESTIÓN

## Descripción General
Sistema web para la gestión del comedor de Grupo Avika. Permite administrar menús semanales, 
empleados y confirmaciones de comida.

## Estructura del Proyecto
- `/css`: Hojas de estilo
- `/js`: Código JavaScript
  - `/services`: Servicios de Firebase y gestión de errores
  - `/utils`: Utilidades y funciones auxiliares
  - `/views`: Vistas específicas por rol (admin, coordinator, employee)
- `/assets`: Imágenes y recursos estáticos
- `/pages`: Páginas HTML para diferentes roles y funcionalidades

## Tecnologías Utilizadas
- HTML5, CSS3, JavaScript (ES6+)
- Firebase (Authentication, Firestore)
- No se utilizan frameworks externos de JavaScript

## Roles de Usuario
- **Administrador**: Gestión completa del sistema, creación de menús
- **Coordinador**: Gestión de empleados por departamento, reportes
- **Empleado**: Visualización de menús, confirmación de comidas

## Mejoras Recientes
- Refactorización de código para mejorar mantenibilidad
- Centralización de utilidades comunes en módulos específicos
- Corrección de problemas con caracteres acentuados en nombres de días
- Optimización de consultas a Firestore
- Mejora en la inicialización de Firebase

## Módulos Principales
- **Autenticación**: Control de acceso basado en roles
- **Gestión de Menús**: Creación y publicación de menús semanales
- **Gestión de Empleados**: Administración de usuarios por departamento
- **Confirmaciones**: Sistema de confirmación de asistencia al comedor

## Notas Importantes
- Los nombres de días con acentos (ej. "miércoles") ahora se manejan correctamente
- Se ha optimizado la estructura de archivos eliminando duplicados
- Las utilidades están centralizadas en módulos específicos para evitar código redundante
- La inicialización de Firebase se ha mejorado para un acceso más consistente a Firestore

## Contacto
Para soporte o consultas sobre este sistema, contactar al departamento de TI de Grupo Avika.