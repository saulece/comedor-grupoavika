// Módulo para manejo de archivos Excel en Comedor Grupo Avika

/**
 * Verifica si la biblioteca XLSX está disponible
 * @returns {boolean} - true si XLSX está disponible, false en caso contrario
 */
function isXLSXAvailable() {
    return typeof XLSX !== 'undefined';
}

/**
 * Lee un archivo Excel y lo convierte a un array de datos
 * @param {File} file - Archivo Excel a leer
 * @returns {Promise<Array>} - Promise con los datos del Excel
 */
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        if (!isXLSXAvailable()) {
            reject(new Error('La biblioteca XLSX no está disponible. Por favor, recarga la página.'));
            return;
        }

        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                
                // Usar try-catch específico para la lectura del Excel
                try {
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Verificar que el workbook tenga hojas
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        throw new Error('El archivo Excel no contiene hojas de cálculo.');
                    }
                    
                    // Obtener primera hoja
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Verificar que la hoja tenga datos
                    if (!worksheet) {
                        throw new Error('La hoja de cálculo está vacía.');
                    }
                    
                    // Convertir a array de arrays con opciones más robustas
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        defval: '',  // Valor por defecto para celdas vacías
                        blankrows: false // Ignorar filas vacías
                    });
                    
                    window.logger?.info('Datos Excel leídos correctamente:', { rows: jsonData.length });
                    resolve(jsonData);
                } catch (xlsxError) {
                    window.logger?.error('Error al procesar el archivo Excel:', xlsxError);
                    reject(new Error('Error al procesar el archivo Excel: ' + xlsxError.message));
                }
            } catch (error) {
                window.logger?.error('Error general al leer el archivo:', error);
                reject(error);
            }
        };
        
        reader.onerror = function(error) {
            window.logger?.error('Error en FileReader:', error);
            reject(error);
        };
        
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Maneja errores específicos de la importación de Excel
 * @param {Error} error - Error ocurrido durante la importación
 * @returns {string} - Mensaje de error amigable
 */
function handleExcelError(error) {
    if (!error) return 'Ocurrió un error desconocido al procesar el archivo Excel.';
    
    // Errores específicos de la biblioteca XLSX
    if (error.message.includes('XLSX') || error.message.includes('biblioteca')) {
        return 'Error con la biblioteca de Excel. Por favor, recarga la página e intenta nuevamente.';
    }
    
    // Errores de formato
    if (error.message.includes('formato') || error.message.includes('columnas') || 
        error.message.includes('hoja') || error.message.includes('Excel')) {
        return 'El formato del archivo no es correcto. Asegúrate de usar la plantilla proporcionada.';
    }
    
    // Errores de archivo vacío
    if (error.message.includes('vacío') || error.message.includes('vacía')) {
        return 'El archivo parece estar vacío o dañado.';
    }
    
    // Errores de tipo de archivo
    if (error.message.includes('tipo') || error.message.includes('.xls')) {
        return 'El archivo debe ser un documento Excel (.xlsx, .xls).';
    }
    
    // Si no podemos identificar el error específico, devolvemos el mensaje original
    return `Error al importar Excel: ${error.message}`;
}

/**
 * Genera una plantilla Excel para importación de empleados
 * @returns {Blob} - Archivo Excel como Blob
 */
function generateEmployeeTemplate() {
    if (!isXLSXAvailable()) {
        throw new Error('La biblioteca XLSX no está disponible. Por favor, recarga la página.');
    }
    
    // Crear una hoja de cálculo
    const worksheet = XLSX.utils.aoa_to_sheet([
        ['Nombre Completo', 'Puesto', 'Estado'],
        ['Juan Pérez López', 'Operador', 'active'],
        ['María González Ruiz', 'Supervisor', 'active']
    ]);
    
    // Crear un libro de trabajo y añadir la hoja
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Empleados');
    
    // Generar el archivo
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// Exportar funciones como un módulo global
window.excelHandler = {
    isXLSXAvailable,
    readExcelFile,
    handleExcelError,
    generateEmployeeTemplate
};
