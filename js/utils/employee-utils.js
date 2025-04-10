/**
 * Utilidades para manejo de empleados en la aplicación
 * Este módulo centraliza todas las funciones relacionadas con empleados
 * para evitar duplicación y asegurar consistencia en toda la aplicación
 */

const EmployeeUtils = (function() {
    /**
     * Validar datos de un empleado
     * @param {Object} employeeData - Datos del empleado a validar
     * @returns {Object} - Resultado de la validación {isValid, errors}
     */
    function validateEmployee(employeeData) {
        const errors = [];
        
        // Validar nombre
        if (!employeeData.name || employeeData.name.trim() === '') {
            errors.push('El nombre del empleado es requerido.');
        }
        
        // Validar email si está presente
        if (employeeData.email && employeeData.email.trim() !== '') {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(employeeData.email)) {
                errors.push('Por favor ingrese un email válido.');
            }
        }
        
        // Validar departamento
        if (!employeeData.departmentId) {
            errors.push('El departamento es requerido.');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Formatear datos de empleado para guardar en Firestore
     * @param {Object} employeeData - Datos del empleado
     * @returns {Object} - Datos formateados
     */
    function formatEmployeeForSave(employeeData) {
        // Crear una copia para no modificar el original
        const formattedData = { ...employeeData };
        
        // Asegurar que el nombre esté limpio
        if (formattedData.name) {
            formattedData.name = formattedData.name.trim();
        }
        
        // Asegurar que el email esté limpio
        if (formattedData.email) {
            formattedData.email = formattedData.email.trim().toLowerCase();
        }
        
        // Añadir timestamp de actualización
        formattedData.updatedAt = new Date();
        
        // Si es un nuevo empleado, añadir timestamp de creación
        if (!formattedData.createdAt) {
            formattedData.createdAt = new Date();
        }
        
        return formattedData;
    }
    
    /**
     * Convertir datos de empleados a formato CSV
     * @param {Array} employees - Lista de empleados
     * @returns {string} - Contenido CSV
     */
    function employeesToCSV(employees) {
        if (!employees || !employees.length) {
            return '';
        }
        
        // Definir cabeceras
        const headers = ['Nombre', 'Email', 'Departamento', 'Activo'];
        
        // Crear línea de cabeceras
        let csvContent = headers.join(',') + '\n';
        
        // Añadir datos de cada empleado
        employees.forEach(employee => {
            const row = [
                `"${employee.name || ''}"`,
                `"${employee.email || ''}"`,
                `"${employee.departmentName || ''}"`,
                employee.active !== false ? 'Sí' : 'No'
            ];
            csvContent += row.join(',') + '\n';
        });
        
        return csvContent;
    }
    
    /**
     * Parsear datos CSV a formato de empleados
     * @param {string} csvContent - Contenido CSV
     * @param {string} departmentId - ID del departamento para los empleados
     * @returns {Object} - Resultado del parseo {success, employees, errors}
     */
    function parseCSVToEmployees(csvContent, departmentId) {
        const result = {
            success: false,
            employees: [],
            errors: []
        };
        
        if (!csvContent) {
            result.errors.push('El contenido CSV está vacío');
            return result;
        }
        
        if (!departmentId) {
            result.errors.push('Se requiere un ID de departamento válido');
            return result;
        }
        
        try {
            // Dividir por líneas
            const lines = csvContent.split(/\\r?\\n/);
            
            // Verificar que hay al menos una línea de cabecera y una de datos
            if (lines.length < 2) {
                result.errors.push('El archivo CSV debe contener al menos una cabecera y una línea de datos');
                return result;
            }
            
            // Obtener cabeceras (primera línea)
            const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
            
            // Verificar cabeceras mínimas requeridas
            const requiredHeaders = ['nombre'];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            
            if (missingHeaders.length > 0) {
                result.errors.push(`Faltan cabeceras requeridas: ${missingHeaders.join(', ')}`);
                return result;
            }
            
            // Procesar líneas de datos
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue; // Saltar líneas vacías
                
                // Dividir la línea en campos
                const fields = line.split(',').map(field => {
                    // Limpiar comillas si existen
                    field = field.trim();
                    if (field.startsWith('"') && field.endsWith('"')) {
                        field = field.substring(1, field.length - 1);
                    }
                    return field;
                });
                
                // Crear objeto de empleado
                const employee = {
                    departmentId: departmentId,
                    active: true,
                    createdAt: new Date()
                };
                
                // Asignar campos según cabeceras
                headers.forEach((header, index) => {
                    if (index < fields.length) {
                        switch (header) {
                            case 'nombre':
                                employee.name = fields[index];
                                break;
                            case 'email':
                                employee.email = fields[index];
                                break;
                            case 'activo':
                                employee.active = fields[index].toLowerCase() !== 'no';
                                break;
                        }
                    }
                });
                
                // Validar empleado
                const validation = validateEmployee(employee);
                if (validation.isValid) {
                    result.employees.push(employee);
                } else {
                    result.errors.push(`Error en línea ${i + 1}: ${validation.errors.join(', ')}`);
                }
            }
            
            // Establecer éxito si hay al menos un empleado y no hay errores
            result.success = result.employees.length > 0 && result.errors.length === 0;
            
            return result;
        } catch (error) {
            result.errors.push(`Error al procesar CSV: ${error.message}`);
            return result;
        }
    }
    
    /**
     * Generar plantilla CSV para importación de empleados
     * @returns {string} - Contenido de la plantilla CSV
     */
    function generateCSVTemplate() {
        const headers = ['Nombre', 'Email', 'Activo'];
        const exampleRow = ['"Juan Pérez"', '"juan@example.com"', 'Sí'];
        
        return headers.join(',') + '\n' + exampleRow.join(',');
    }
    
    // API pública
    return {
        validateEmployee,
        formatEmployeeForSave,
        employeesToCSV,
        parseCSVToEmployees,
        generateCSVTemplate
    };
})();

// Exportar para uso global
window.EmployeeUtils = EmployeeUtils;
