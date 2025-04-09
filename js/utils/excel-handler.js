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
                    
                    if (window.logger && window.logger.info) {
                        window.logger.info('Datos Excel leídos correctamente:', { rows: jsonData.length });
                    } else {
                        console.log('Datos Excel leídos correctamente:', jsonData.length, 'filas');
                    }
                    
                    resolve(jsonData);
                } catch (xlsxError) {
                    if (window.logger && window.logger.error) {
                        window.logger.error('Error al procesar el archivo Excel:', xlsxError);
                    } else {
                        console.error('Error al procesar el archivo Excel:', xlsxError);
                    }
                    reject(new Error('Error al procesar el archivo Excel: ' + xlsxError.message));
                }
            } catch (error) {
                if (window.logger && window.logger.error) {
                    window.logger.error('Error general al leer el archivo:', error);
                } else {
                    console.error('Error general al leer el archivo:', error);
                }
                reject(error);
            }
        };
        
        reader.onerror = function(error) {
            if (window.logger && window.logger.error) {
                window.logger.error('Error en FileReader:', error);
            } else {
                console.error('Error en FileReader:', error);
            }
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

/**
 * Genera una plantilla Excel para menú semanal
 * @returns {Blob} - Archivo Excel como Blob
 */
function generateMenuTemplate() {
    if (!isXLSXAvailable()) {
        throw new Error('La biblioteca XLSX no está disponible. Por favor, recarga la página.');
    }
    
    // Obtener los días de la semana
    const days = window.dateUtils && window.dateUtils.DATE_FORMATS ? 
        window.dateUtils.DATE_FORMATS.ADMIN : 
        ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    // Crear un workbook con una hoja para cada día
    const workbook = XLSX.utils.book_new();
    
    // Crear hojas para cada día
    days.forEach(day => {
        // Crear una hoja de cálculo para el día
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['Nombre', 'Descripción'],
            ['Ejemplo: Arroz con pollo', 'Descripción del plato'],
            ['Ejemplo: Sopa de verduras', 'Otra descripción']
        ]);
        
        // Añadir la hoja al libro
        XLSX.utils.book_append_sheet(workbook, worksheet, day);
    });
    
    // Generar el archivo
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Exporta datos a un archivo Excel
 * @param {Array} data - Datos para exportar (array de arrays o array de objetos)
 * @param {string} filename - Nombre del archivo (sin extensión)
 * @param {string} sheetName - Nombre de la hoja
 */
function exportToExcel(data, filename, sheetName = 'Datos') {
    if (!isXLSXAvailable()) {
        throw new Error('La biblioteca XLSX no está disponible. Por favor, recarga la página.');
    }
    
    // Crear una hoja de cálculo
    let worksheet;
    
    if (data.length > 0 && typeof data[0] === 'object' && !Array.isArray(data[0])) {
        // Si son objetos, convertir a hoja
        worksheet = XLSX.utils.json_to_sheet(data);
    } else {
        // Si son arrays, usar aoa_to_sheet
        worksheet = XLSX.utils.aoa_to_sheet(data);
    }
    
    // Crear un libro de trabajo y añadir la hoja
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Guardar el archivo
    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Procesa un archivo Excel y extrae datos de empleados
 * @param {Array} data - Datos del Excel (array de arrays)
 * @returns {Object} - Objetos con empleados válidos y errores
 */
function processEmployeeExcelData(data) {
    // Validar que haya datos
    if (!data || !Array.isArray(data) || data.length < 2) {
        throw new Error('El archivo Excel está vacío o no tiene el formato correcto.');
    }
    
    // Obtener índices de columnas
    const headers = data[0];
    const nameIndex = headers.findIndex(header => header && 
        header.toString().toLowerCase().includes('nombre'));
    const positionIndex = headers.findIndex(header => header && 
        header.toString().toLowerCase().includes('puesto'));
    const statusIndex = headers.findIndex(header => header && 
        header.toString().toLowerCase().includes('estado'));
    
    // Verificar columnas requeridas
    if (nameIndex === -1 || statusIndex === -1) {
        throw new Error('El archivo Excel debe tener las columnas "Nombre Completo" y "Estado".');
    }
    
    const employees = [];
    const errors = [];
    
    // Procesar filas de datos (omitir la fila de encabezados)
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Omitir filas vacías
        if (!row.length || !row[nameIndex]) {
            continue;
        }
        
        // Validar campos requeridos
        if (!row[nameIndex]) {
            errors.push(`Fila ${i+1}: Falta el nombre del empleado.`);
            continue;
        }
        
        const status = row[statusIndex] ? row[statusIndex].toString().toLowerCase() : null;
        if (!status || (status !== 'active' && status !== 'inactive')) {
            errors.push(`Fila ${i+1}: El estado debe ser 'active' o 'inactive'.`);
            continue;
        }
        
        // Crear objeto de empleado
        const employee = {
            name: row[nameIndex],
            position: positionIndex !== -1 ? (row[positionIndex] || '') : '',
            status: status,
            active: status === 'active'
        };
        
        employees.push(employee);
    }
    
    return { employees, errors };
}

// Exportar funciones
window.excelHandler = {
    isXLSXAvailable,
    readExcelFile,
    handleExcelError,
    generateEmployeeTemplate,
    generateMenuTemplate,
    exportToExcel,
    processEmployeeExcelData
};