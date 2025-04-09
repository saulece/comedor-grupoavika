/**
 * Ejemplo de implementación del Error Service
 * 
 * Este archivo muestra ejemplos prácticos de cómo implementar el servicio de errores
 * en diferentes escenarios comunes en la aplicación del comedor de Grupo Avika.
 */

// Ejemplos de uso del Error Service

/**
 * Ejemplo 1: Manejo de errores en operaciones de Firebase
 */
async function ejemploOperacionFirebase() {
    try {
        // Mostrar indicador de carga
        errorService.toggleLoading(true);
        
        // Intentar obtener datos de Firestore
        const empleados = await firebase.firestore().collection('employees').get();
        
        // Procesar datos...
        const listaEmpleados = empleados.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Mostrar mensaje de éxito
        errorService.showSuccess('Empleados cargados correctamente');
        
        return listaEmpleados;
    } catch (error) {
        // Usar el manejador específico para errores de Firebase
        errorService.handleFirebaseError(error, 'No se pudieron cargar los empleados');
        return [];
    } finally {
        // Ocultar indicador de carga
        errorService.toggleLoading(false);
    }
}

/**
 * Ejemplo 2: Validación de formularios
 */
function ejemploValidacionFormulario() {
    // Obtener valores del formulario
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const departamento = document.getElementById('departamento').value;
    
    // Objeto para almacenar errores de validación
    const errores = {};
    
    // Validar campos
    if (!nombre) {
        errores.nombre = 'El nombre es obligatorio';
    } else if (nombre.length < 3) {
        errores.nombre = 'El nombre debe tener al menos 3 caracteres';
    }
    
    if (!email) {
        errores.email = 'El email es obligatorio';
    } else if (!email.includes('@') || !email.includes('.')) {
        errores.email = 'El email no es válido';
    }
    
    if (!departamento || departamento === '0') {
        errores.departamento = 'Debe seleccionar un departamento';
    }
    
    // Si hay errores, mostrarlos y detener el proceso
    if (Object.keys(errores).length > 0) {
        // Usar el manejador específico para errores de validación
        errorService.handleValidationError(
            'Por favor corrija los errores en el formulario',
            errores
        );
        
        // Opcional: Resaltar campos con error en el formulario
        Object.keys(errores).forEach(campo => {
            const elemento = document.getElementById(campo);
            if (elemento) {
                elemento.classList.add('error');
                // Agregar mensaje de error debajo del campo
                const mensajeError = document.createElement('div');
                mensajeError.className = 'error-message';
                mensajeError.textContent = errores[campo];
                elemento.parentNode.appendChild(mensajeError);
            }
        });
        
        return false;
    }
    
    // Si no hay errores, continuar con el proceso
    return true;
}

/**
 * Ejemplo 3: Manejo de errores en operaciones asíncronas
 */
async function ejemploOperacionAsincrona() {
    try {
        // Mostrar indicador de carga
        errorService.toggleLoading(true);
        
        // Simular operación asíncrona (por ejemplo, una petición AJAX)
        const respuesta = await fetch('/api/datos');
        
        // Verificar si la respuesta es correcta
        if (!respuesta.ok) {
            // Si la respuesta no es OK, lanzar un error con el código de estado
            throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`);
        }
        
        // Procesar datos
        const datos = await respuesta.json();
        
        // Mostrar mensaje de éxito
        errorService.showSuccess('Datos cargados correctamente');
        
        return datos;
    } catch (error) {
        // Determinar el tipo de error según el mensaje
        let tipoError = ERROR_TYPES.UNKNOWN;
        
        if (error.message.includes('404')) {
            tipoError = ERROR_TYPES.DATABASE;
            // Mostrar mensaje específico para recurso no encontrado
            errorService.handleError(
                error,
                'El recurso solicitado no existe',
                tipoError,
                ERROR_SEVERITY.ERROR
            );
        } else if (error.message.includes('401') || error.message.includes('403')) {
            tipoError = ERROR_TYPES.PERMISSION;
            // Mostrar mensaje específico para errores de autorización
            errorService.handleError(
                error,
                'No tiene permisos para acceder a este recurso',
                tipoError,
                ERROR_SEVERITY.ERROR
            );
        } else if (error.message.includes('timeout') || error.message.includes('network')) {
            tipoError = ERROR_TYPES.NETWORK;
            // Mostrar mensaje específico para errores de red
            errorService.handleError(
                error,
                'Error de conexión. Por favor verifique su conexión a internet',
                tipoError,
                ERROR_SEVERITY.ERROR
            );
        } else {
            // Para otros errores, usar mensaje genérico
            errorService.handleError(
                error,
                'No se pudieron cargar los datos. Por favor intente de nuevo',
                tipoError,
                ERROR_SEVERITY.ERROR
            );
        }
        
        return null;
    } finally {
        // Ocultar indicador de carga
        errorService.toggleLoading(false);
    }
}

/**
 * Ejemplo 4: Manejo de errores en eventos de usuario
 */
function configurarEventosConErrorService() {
    // Ejemplo de botón que realiza una acción
    const botonGuardar = document.getElementById('boton-guardar');
    if (botonGuardar) {
        botonGuardar.addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
                // Validar formulario
                if (!ejemploValidacionFormulario()) {
                    return; // Detener si hay errores de validación
                }
                
                // Mostrar indicador de carga
                errorService.toggleLoading(true);
                
                // Realizar operación (por ejemplo, guardar datos)
                const resultado = await guardarDatos();
                
                // Mostrar mensaje de éxito
                errorService.showSuccess('Datos guardados correctamente');
                
                // Opcional: Redirigir o realizar otra acción
                setTimeout(() => {
                    window.location.href = 'lista.html';
                }, 1500);
                
            } catch (error) {
                // Manejar error
                errorService.handleError(
                    error,
                    'No se pudieron guardar los datos',
                    ERROR_TYPES.DATABASE,
                    ERROR_SEVERITY.ERROR
                );
            } finally {
                // Ocultar indicador de carga
                errorService.toggleLoading(false);
            }
        });
    }
    
    // Ejemplo de campo de búsqueda
    const campoBusqueda = document.getElementById('campo-busqueda');
    if (campoBusqueda) {
        campoBusqueda.addEventListener('input', (e) => {
            try {
                const termino = e.target.value.trim();
                
                // Validar longitud mínima
                if (termino.length > 0 && termino.length < 3) {
                    errorService.showWarning('Ingrese al menos 3 caracteres para buscar');
                    return;
                }
                
                // Realizar búsqueda
                if (termino.length >= 3) {
                    buscarDatos(termino);
                }
                
            } catch (error) {
                errorService.handleError(
                    error,
                    'Error al realizar la búsqueda',
                    ERROR_TYPES.UI,
                    ERROR_SEVERITY.WARNING
                );
            }
        });
    }
}

/**
 * Ejemplo 5: Integración con código existente
 */
function integrarConCodigoExistente() {
    // Si ya existe un manejador de errores, podemos usarlo como fallback
    const mostrarError = function(mensaje) {
        if (window.errorService) {
            // Usar el nuevo servicio si está disponible
            window.errorService.handleError(
                new Error(mensaje),
                mensaje,
                ERROR_TYPES.UI,
                ERROR_SEVERITY.ERROR
            );
        } else if (window.errorHandler && window.errorHandler.showUIError) {
            // Usar el manejador existente como fallback
            window.errorHandler.showUIError(mensaje);
        } else {
            // Último recurso: console y alert
            console.error('Error:', mensaje);
            alert('Error: ' + mensaje);
        }
    };
    
    // Ejemplo de uso
    try {
        // Código que puede fallar
    } catch (error) {
        mostrarError('Ha ocurrido un error inesperado');
    }
}

/**
 * Función auxiliar para el ejemplo 4
 */
async function guardarDatos() {
    // Simulación de guardar datos
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // Simular éxito (70% de probabilidad)
            if (Math.random() > 0.3) {
                resolve({ success: true, id: 'doc-' + Date.now() });
            } else {
                // Simular error
                reject(new Error('Error al guardar en la base de datos'));
            }
        }, 1500);
    });
}

/**
 * Función auxiliar para el ejemplo 4
 */
function buscarDatos(termino) {
    console.log('Buscando:', termino);
    // Implementación real de búsqueda
}

// Exportar funciones de ejemplo
window.errorServiceExamples = {
    ejemploOperacionFirebase,
    ejemploValidacionFormulario,
    ejemploOperacionAsincrona,
    configurarEventosConErrorService,
    integrarConCodigoExistente
};
