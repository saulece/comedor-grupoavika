// Data Formatter Utility for Comedor Grupo Avika

/**
 * Format date as YYYY-MM-DD for database storage
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
function formatDateForDB(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Format date as DD/MM/YYYY for display
 * @param {Date|string} date - The date to format (Date object or YYYY-MM-DD string)
 * @returns {string} - Formatted date string
 */
function formatDateForDisplay(date) {
    let dateObj;
    
    if (typeof date === 'string') {
        // Parse the YYYY-MM-DD string
        const [year, month, day] = date.split('-').map(num => parseInt(num, 10));
        dateObj = new Date(year, month - 1, day);
    } else if (date instanceof Date) {
        dateObj = date;
    } else {
        return '';
    }
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Get the name of the day of the week in Spanish
 * @param {Date|string} date - The date (Date object or YYYY-MM-DD string)
 * @returns {string} - Day name in Spanish
 */
function getDayOfWeekName(date) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    let dateObj;
    if (typeof date === 'string') {
        // Parse the YYYY-MM-DD string
        const [year, month, day] = date.split('-').map(num => parseInt(num, 10));
        dateObj = new Date(year, month - 1, day);
    } else if (date instanceof Date) {
        dateObj = date;
    } else {
        return '';
    }
    
    return days[dateObj.getDay()];
}

/**
 * Get the Monday of the week containing the given date
 * @param {Date} date - Any date in the desired week
 * @returns {Date} - Date object for Monday of that week
 */
function getMonday(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(date.setDate(diff));
}

/**
 * Format a currency value
 * @param {number} value - The value to format
 * @param {string} locale - The locale to use (default: 'es-PE')
 * @param {string} currency - The currency code (default: 'PEN')
 * @returns {string} - Formatted currency string
 */
function formatCurrency(value, locale = 'es-PE', currency = 'PEN') {
    return new Intl.NumberFormat(locale, { 
        style: 'currency', 
        currency: currency 
    }).format(value);
}

/**
 * Format a number with thousand separators
 * @param {number} value - The value to format
 * @param {string} locale - The locale to use (default: 'es-PE')
 * @returns {string} - Formatted number string
 */
function formatNumber(value, locale = 'es-PE') {
    return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format a timestamp from Firestore to a readable date and time
 * @param {Object} timestamp - Firestore timestamp object
 * @returns {string} - Formatted date and time string
 */
function formatTimestamp(timestamp) {
    if (!timestamp || !timestamp.toDate) {
        return '';
    }
    
    const date = timestamp.toDate();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Convert a Firebase timestamp to a Date object
 * @param {Object} timestamp - Firestore timestamp object
 * @returns {Date|null} - JavaScript Date object or null if invalid
 */
function timestampToDate(timestamp) {
    if (!timestamp || !timestamp.toDate) {
        return null;
    }
    
    return timestamp.toDate();
}

/**
 * Format a long text by truncating it if it exceeds the max length
 * @param {string} text - The text to format
 * @param {number} maxLength - Maximum length before truncating
 * @returns {string} - Truncated text with ellipsis if needed
 */
function truncateText(text, maxLength = 100) {
    if (!text) return '';
    
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.substring(0, maxLength) + '...';
}

/**
 * Convert an object to CSV format
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Array of header objects with key and label properties
 * @returns {string} - CSV string
 */
function objectsToCSV(data, headers) {
    if (!data || !data.length || !headers || !headers.length) {
        return '';
    }
    
    // Create headers row
    const headerRow = headers.map(header => header.label).join(',');
    
    // Create data rows
    const rows = data.map(item => {
        return headers.map(header => {
            let cellValue = item[header.key];
            
            // Format value if needed
            if (cellValue === null || cellValue === undefined) {
                cellValue = '';
            } else if (typeof cellValue === 'string') {
                // Escape quotes and wrap in quotes if contains comma, quote or newline
                cellValue = cellValue.replace(/"/g, '""');
                if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
                    cellValue = `"${cellValue}"`;
                }
            }
            
            return cellValue;
        }).join(',');
    });
    
    // Combine header and rows
    return [headerRow, ...rows].join('\n');
}

/**
 * Normalize menu data structure to ensure consistency
 * @param {Object} menuData - The menu data to normalize
 * @returns {Object} - Normalized menu data
 */
function normalizeMenuData(menuData) {
    const normalizedData = {};
    
    // Normalize day keys (remove accents, convert to lowercase)
    for (const key in menuData) {
        const normalizedKey = key.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
            
        normalizedData[normalizedKey] = menuData[key];
    }
    
    // Ensure all days have valid items array
    const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    
    days.forEach(day => {
        if (!normalizedData[day]) {
            normalizedData[day] = { items: [] };
        } else if (!normalizedData[day].items) {
            normalizedData[day].items = [];
        }
    });
    
    return normalizedData;
}

/**
 * Format employee data for display
 * @param {Object} employee - The employee data to format
 * @returns {Object} - Formatted employee data
 */
function formatEmployeeData(employee) {
    return {
        id: employee.id,
        name: employee.name || 'Sin nombre',
        email: employee.email || '-',
        position: employee.position || '-',
        active: employee.active !== false,
        department: employee.department || '-',
        createdAt: formatTimestamp(employee.createdAt) || '-',
        updatedAt: formatTimestamp(employee.updatedAt) || '-'
    };
}

/**
 * Get week date range (Monday-Friday)
 * @param {Date} date - Any date within the desired week
 * @returns {Object} - Object with start and end dates
 */
function getWeekDateRange(date) {
    const monday = getMonday(date);
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);
    
    return {
        start: monday,
        end: friday,
        startFormatted: formatDateForDisplay(monday),
        endFormatted: formatDateForDisplay(friday),
        startDB: formatDateForDB(monday),
        rangeDisplay: `${formatDateForDisplay(monday)} - ${formatDateForDisplay(friday)}`
    };
}

/**
 * For pagination: get paginated subset of array
 * @param {Array} array - The array to paginate
 * @param {number} page - Current page (1-based)
 * @param {number} pageSize - Items per page
 * @returns {Object} - Object with pagination info and paginated items
 */
function getPaginatedData(array, page = 1, pageSize = 10) {
    const totalItems = array.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // Ensure page is in valid range
    page = Math.max(1, Math.min(page, totalPages || 1));
    
    // Calculate start and end indices
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    
    return {
        items: array.slice(startIndex, endIndex),
        pagination: {
            page,
            pageSize,
            totalItems,
            totalPages,
            startIndex: startIndex + 1,
            endIndex,
            hasPrevPage: page > 1,
            hasNextPage: page < totalPages
        }
    };
}

/**
 * Format CSV data for download
 * @param {Array} data - Array of objects to convert to CSV
 * @param {Array} headers - Array of {key, label} objects defining CSV columns
 * @returns {string} - CSV string with 'data:' prefix ready for download
 */
function formatCSVForDownload(data, headers) {
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add header row
    csvContent += headers.map(header => header.label).join(',') + '\n';
    
    // Add data rows
    data.forEach(item => {
        const row = headers.map(header => {
            let value = item[header.key];
            
            // Format value if needed
            if (value === null || value === undefined) {
                value = '';
            } else if (typeof value === 'string') {
                // Escape quotes and wrap in quotes if contains comma, quote or newline
                value = value.replace(/"/g, '""');
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = `"${value}"`;
                }
            }
            
            return value;
        });
        
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
}

/**
 * Parse CSV data into an array of objects
 * @param {string} csvData - CSV data string
 * @param {Object} options - Parsing options
 * @returns {Array} - Array of objects with parsed data
 */
function parseCSVData(csvData, options = {}) {
    const lines = csvData.trim().split('\n');
    if (lines.length === 0) return [];
    
    // Parse headers (first line)
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(header => 
        options.normalizeHeaders ? 
            header.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 
            header.trim()
    );
    
    // Parse data rows
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Handle quoted values with commas inside
        let values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
                if (j + 1 < line.length && line[j + 1] === '"') {
                    // Double quote inside quoted value
                    currentValue += '"';
                    j++; // Skip next quote
                } else {
                    // Toggle quote mode
                    insideQuotes = !insideQuotes;
                }
            } else if (char === ',' && !insideQuotes) {
                // End of value
                values.push(currentValue);
                currentValue = '';
            } else {
                // Regular character
                currentValue += char;
            }
        }
        
        // Add last value
        values.push(currentValue);
        
        // Skip if not enough values
        if (values.length < headers.length) {
            console.warn(`Skipping row ${i+1}: insufficient values`);
            continue;
        }
        
        // Create object from values
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });
        
        // Convert types if requested
        if (options.dynamicTyping) {
            for (const key in obj) {
                const value = obj[key];
                
                // Try to convert numbers
                if (/^-?\d+(\.\d+)?$/.test(value)) {
                    obj[key] = parseFloat(value);
                }
                
                // Convert boolean values
                if (value.toLowerCase() === 'true') obj[key] = true;
                if (value.toLowerCase() === 'false') obj[key] = false;
                
                // Convert empty strings to null
                if (value === '' && options.emptyAsNull) obj[key] = null;
            }
        }
        
        result.push(obj);
    }
    
    return result;
}

// Export functions for use in other scripts
// These will be available globally