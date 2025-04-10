// Excel Utilities - Functions for handling Excel files

/**
 * Parse Excel file and return data as array of objects
 * @param {File} file - Excel file
 * @returns {Promise<Array>} Array of objects with parsed data
 */
function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = e.target.result;
                const workbook = XLSX.read(data, { type: 'array' });
                
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
                const headers = rows[0].map(header => String(header || '').trim());
                
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
                const data = [];
                
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    
                    // Skip empty rows
                    if (!row || !row[nameIndex]) continue;
                    
                    data.push({
                        name: String(row[nameIndex] || '').trim(),
                        position: row[positionIndex] ? String(row[positionIndex] || '').trim() : '',
                        dietaryRestrictions: row[restrictionsIndex] ? String(row[restrictionsIndex] || '').trim() : '',
                        active: parseActiveStatus(row[activeIndex])
                    });
                }
                
                resolve(data);
            } catch (error) {
                reject(new Error('Error al procesar el archivo Excel: ' + error.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Error al leer el archivo'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Parse active status from Excel cell
 * @param {*} value - Cell value
 * @returns {boolean} Active status
 */
function parseActiveStatus(value) {
    if (value === undefined || value === null) return true;
    
    if (typeof value === 'boolean') return value;
    
    if (typeof value === 'number') return value !== 0;
    
    if (typeof value === 'string') {
        const lowerValue = value.toLowerCase().trim();
        return !['no', 'false', '0', 'n', 'inactivo'].includes(lowerValue);
    }
    
    return true;
}

/**
 * Generate Excel template for employee import
 * @returns {Blob} Excel file as blob
 */
function generateEmployeeTemplate() {
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
        throw error;
    }
}

/**
 * Download a file
 * @param {Blob} blob - File data
 * @param {string} fileName - File name
 */
function downloadFile(blob, fileName) {
    try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        console.error('Error descargando archivo:', error);
        throw error;
    }
}

/**
 * Download employee template
 */
function downloadEmployeeTemplate() {
    try {
        const templateBlob = generateEmployeeTemplate();
        downloadFile(templateBlob, 'plantilla_empleados.xlsx');
    } catch (error) {
        console.error('Error descargando plantilla:', error);
        alert('Error al generar la plantilla. Por favor intente nuevamente.');
    }
}