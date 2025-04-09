/**
 * Archivo de prueba para el servicio de errores
 * 
 * Este archivo permite probar las diferentes funcionalidades del servicio de errores
 * en un entorno controlado. Ejecuta las diferentes funciones para ver cómo se comporta
 * el servicio en distintos escenarios.
 */

// Verificar que el servicio de errores esté disponible
if (!window.errorService) {
    console.error('Error: El servicio de errores no está disponible. Asegúrese de incluir el script errorService.js antes de este archivo.');
}

// Objeto para almacenar las funciones de prueba
const errorServiceTest = {
    /**
     * Prueba los diferentes tipos de mensajes
     */
    testMessages: function() {
        console.log('Probando mensajes de error, advertencia, información y éxito...');
        
        // Mensaje de error
        window.errorService.handleError(
            new Error('Este es un error de prueba'),
            'Mensaje de error de prueba',
            ERROR_TYPES.UI,
            ERROR_SEVERITY.ERROR
        );
        
        // Esperar antes de mostrar el siguiente mensaje
        setTimeout(() => {
            // Mensaje de advertencia
            window.errorService.showWarning('Esta es una advertencia de prueba');
            
            setTimeout(() => {
                // Mensaje informativo
                window.errorService.showInfo('Este es un mensaje informativo de prueba');
                
                setTimeout(() => {
                    // Mensaje de éxito
                    window.errorService.showSuccess('Esta es una operación exitosa de prueba');
                    
                    console.log('Prueba de mensajes completada.');
                }, 1500);
            }, 1500);
        }, 1500);
    },
    
    /**
     * Prueba el manejo de errores de Firebase
     */
    testFirebaseErrors: function() {
        console.log('Probando manejo de errores de Firebase...');
        
        // Crear un error simulado de Firebase
        const firebaseError = {
            code: 'permission-denied',
            message: 'Missing or insufficient permissions.'
        };
        
        // Manejar el error con el servicio
        window.errorService.handleFirebaseError(
            firebaseError,
            'Error al acceder a la base de datos'
        );
        
        // Probar otros códigos de error comunes
        setTimeout(() => {
            const authError = {
                code: 'auth/user-not-found',
                message: 'There is no user record corresponding to this identifier.'
            };
            
            window.errorService.handleFirebaseError(
                authError,
                'Error de autenticación'
            );
            
            console.log('Prueba de errores de Firebase completada.');
        }, 2000);
    },
    
    /**
     * Prueba el manejo de errores de validación
     */
    testValidationErrors: function() {
        console.log('Probando manejo de errores de validación...');
        
        // Crear un objeto con errores de validación
        const validationErrors = {
            nombre: 'El nombre es obligatorio',
            email: 'El email no es válido',
            departamento: 'Debe seleccionar un departamento'
        };
        
        // Manejar los errores de validación
        window.errorService.handleValidationError(
            'Por favor corrija los errores en el formulario',
            validationErrors
        );
        
        console.log('Prueba de errores de validación completada.');
    },
    
    /**
     * Prueba el indicador de carga
     */
    testLoading: function() {
        console.log('Probando indicador de carga...');
        
        // Mostrar el indicador de carga
        window.errorService.toggleLoading(true);
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            window.errorService.toggleLoading(false);
            console.log('Prueba de indicador de carga completada.');
        }, 3000);
    },
    
    /**
     * Prueba la captura de errores no manejados
     */
    testUncaughtError: function() {
        console.log('Probando captura de errores no manejados...');
        console.log('Se generará un error en 2 segundos...');
        
        setTimeout(() => {
            try {
                // Generar un error deliberadamente
                const obj = null;
                obj.nonExistentMethod(); // Esto generará un error
            } catch (error) {
                // El error será capturado por el servicio
                window.errorService.handleError(
                    error,
                    'Se ha producido un error no manejado',
                    ERROR_TYPES.UNKNOWN,
                    ERROR_SEVERITY.CRITICAL
                );
            }
            
            console.log('Prueba de errores no manejados completada.');
        }, 2000);
    },
    
    /**
     * Prueba todos los aspectos del servicio de errores
     */
    runAllTests: function() {
        console.log('Iniciando pruebas del servicio de errores...');
        
        // Ejecutar las pruebas secuencialmente
        this.testMessages();
        
        setTimeout(() => {
            this.testFirebaseErrors();
            
            setTimeout(() => {
                this.testValidationErrors();
                
                setTimeout(() => {
                    this.testLoading();
                    
                    setTimeout(() => {
                        this.testUncaughtError();
                        
                        setTimeout(() => {
                            console.log('Todas las pruebas han sido completadas.');
                        }, 3000);
                    }, 4000);
                }, 3000);
            }, 4000);
        }, 7000);
    }
};

// Exponer el objeto de pruebas globalmente
window.errorServiceTest = errorServiceTest;

// Mensaje informativo en la consola
console.log('Archivo de prueba del servicio de errores cargado correctamente.');
console.log('Para ejecutar todas las pruebas, llame a window.errorServiceTest.runAllTests()');
console.log('Para ejecutar pruebas individuales, llame a los métodos específicos, por ejemplo:');
console.log('- window.errorServiceTest.testMessages()');
console.log('- window.errorServiceTest.testFirebaseErrors()');
console.log('- window.errorServiceTest.testValidationErrors()');
console.log('- window.errorServiceTest.testLoading()');
console.log('- window.errorServiceTest.testUncaughtError()');
