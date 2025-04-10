// Excel Utilities - Functions for handling Excel files

/**
 * Check if SheetJS (XLSX) is available
 * @returns {boolean} True if XLSX is available
 */
function isSheetJSAvailable() {
    return typeof XLSX !== 'undefined';
}

/**
 * Parse Excel file and return data as array of objects
 * @param {File} file - Excel file
 * @returns {Promise<Array>} Array of objects with parsed data
 */
function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        // Validate input
        if (!file || !(file instanceof File)) {
            reject(new Error('Archivo inválido. Por favor, seleccione un archivo Excel válido.'));
            return;
        }
        
        // Check if SheetJS is available before proceeding
        if (!isSheetJSAvailable()) {
            reject(new Error('La librería SheetJS (XLSX) no está disponible. Por favor, recargue la página o contacte al administrador.'));
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Validate workbook has sheets
                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    reject(new Error('El archivo Excel no contiene hojas de cálculo.'));
                    return;
                }
                
                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Convert to array of objects
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                // Validate if file is empty
                if (rows.length < 2) {
                    reject(new Error('El archivo Excel está vacío o no tiene datos válidos.'));
                    return;
                }
                
                // Get headers from first row
                const headers = rows[0].map(header => 
                    header !== null && header !== undefined ? String(header).trim() : ''
                );
                
                // Validate required headers
                const requiredHeaders = ['Nombre', 'Puesto', 'Restricciones Alimentarias', 'Activo'];
                const missingHeaders = requiredHeaders.filter(
                    header => !headers.some(h => h.toLowerCase() === header.toLowerCase())
                );
                
                if (missingHeaders.length > 0) {
                    reject(new Error(`Faltan columnas requeridas: ${missingHeaders.join(', ')}`));
                    return;
                }
                
                // Map column indexes
                const nameIndex = headers.findIndex(h => h.toLowerCase() === 'nombre');
                const positionIndex = headers.findIndex(h => h.toLowerCase() === 'puesto');
                const restrictionsIndex = headers.findIndex(h => h.toLowerCase() === 'restricciones alimentarias');
                const activeIndex = headers.findIndex(h => h.toLowerCase() === 'activo');
                
                // Process data rows
                const parsedData = [];
                
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    
                    // Skip empty rows
                    if (!row || row.length === 0 || nameIndex < 0 || !row[nameIndex]) {
                        continue;
                    }
                    
                    // Get values safely
                    const name = nameIndex >= 0 && row[nameIndex] !== undefined ? String(row[nameIndex]).trim() : '';
                    const position = positionIndex >= 0 && row[positionIndex] !== undefined ? String(row[positionIndex]).trim() : '';
                    const restrictions = restrictionsIndex >= 0 && row[restrictionsIndex] !== undefined ? String(row[restrictionsIndex]).trim() : '';
                    const active = activeIndex >= 0 ? parseActiveStatus(row[activeIndex]) : true;
                    
                    // Skip rows without a name
                    if (!name) continue;
                    
                    parsedData.push({
                        name,
                        position,
                        dietaryRestrictions: restrictions,
                        active
                    });
                }
                
                resolve(parsedData);
            } catch (error) {
                console.error('Error al procesar el archivo Excel:', error);
                reject(new Error('Error al procesar el archivo Excel: ' + (error.message || 'Error desconocido')));
            }
        };
        
        reader.onerror = function(event) {
            console.error('Error al leer el archivo:', event);
            reject(new Error('Error al leer el archivo. Verifique que el archivo no esté dañado.'));
        };
        
        // Read the file as an array buffer
        try {
            reader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('Error al iniciar la lectura del archivo:', error);
            reject(new Error('Error al iniciar la lectura del archivo: ' + (error.message || 'Error desconocido')));
        }
    });
}

/**
 * Parse active status from Excel cell
 * @param {*} value - Cell value
 * @returns {boolean} Active status
 */
function parseActiveStatus(value) {
    // Handle undefined or null
    if (value === undefined || value === null) {
        return true;
    }
    
    // Handle boolean values directly
    if (typeof value === 'boolean') {
        return value;
    }
    
    // Handle numeric values (0 = false, any other number = true)
    if (typeof value === 'number') {
        return value !== 0;
    }
    
    // Handle string values
    if (typeof value === 'string') {
        const lowerValue = value.toLowerCase().trim();
        return !['no', 'false', '0', 'n', 'inactivo', 'falso'].includes(lowerValue);
    }
    
    // Default to true for any other type
    return true;
}

/**
 * Generate Excel template for employee import
 * @returns {Blob} Excel file as blob
 */
function generateEmployeeTemplate() {
    // Check if SheetJS is available before proceeding
    if (!isSheetJSAvailable()) {
        throw new Error('La librería SheetJS (XLSX) no está disponible. Por favor, recargue la página o contacte al administrador.');
    }
    
    try {
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        
        // Headers and sample data
        const data = [
            ['Nombre', 'Puesto', 'Restricciones Alimentarias', 'Activo'],
            ['Juan Pérez', 'Gerente', 'Ninguna', 'Sí'],
            ['María Gómez', 'Supervisor', 'Vegetariana', 'Sí'],
            ['Luis Rodríguez', 'Operador', 'Alergia a lácteos', 'No']
        ];
        
        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Set column widths
        const wscols = [
            { wch: 25 }, // Nombre
            { wch: 20 }, // Puesto
            { wch: 30 }, // Restricciones Alimentarias
            { wch: 10 }  // Activo
        ];
        ws['!cols'] = wscols;
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
        
        // Generate file
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        
        // Convert to Blob
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
        console.error('Error generando plantilla Excel:', error);
        throw new Error('Error al generar la plantilla Excel: ' + (error.message || 'Error desconocido'));
    }
}

/**
 * Download a file
 * @param {Blob} blob - File data
 * @param {string} fileName - File name
 */
function downloadFile(blob, fileName) {
    if (!blob || !(blob instanceof Blob)) {
        console.error('Error: Se requiere un objeto Blob válido');
        throw new Error('Error: Se requiere un objeto Blob válido');
    }
    
    if (!fileName || typeof fileName !== 'string') {
        fileName = 'archivo_descargado.xlsx';
    }
    
    try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        // Limpiar después de la descarga
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        console.error('Error descargando archivo:', error);
        throw new Error('Error al descargar el archivo: ' + (error.message || 'Error desconocido'));
    }
}

/**
 * Download employee template
 */
function downloadEmployeeTemplate() {
    try {
        // Check if SheetJS is available before proceeding
        if (!isSheetJSAvailable()) {
            throw new Error('La librería SheetJS (XLSX) no está disponible. Por favor, recargue la página o contacte al administrador.');
        }
        
        const templateBlob = generateEmployeeTemplate();
        downloadFile(templateBlob, 'plantilla_empleados.xlsx');
    } catch (error) {
        console.error('Error descargando plantilla:', error);
        // Usar un sistema de notificación si está disponible, de lo contrario usar alert
        if (typeof showNotification === 'function') {
            showNotification('error', 'Error al generar la plantilla: ' + error.message);
        } else {
            alert('Error al generar la plantilla: ' + error.message);
        }
    }
}