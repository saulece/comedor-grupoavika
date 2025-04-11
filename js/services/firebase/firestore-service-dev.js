// Firestore Service Development Extensions
// Este archivo contiene funciones que extienden el servicio de Firestore para el modo desarrollo

/**
 * Obtiene datos de prueba para una colección específica
 * @param {string} collectionName - Nombre de la colección
 * @returns {Array|Object} - Datos de prueba
 */
function getTestDataForCollection(collectionName) {
    // Verificar si la función getTestData está disponible (desde development.js)
    if (typeof getTestData === 'function') {
        return getTestData(collectionName);
    }
    
    // Datos de prueba por defecto si no se encuentra la función getTestData
    const defaultTestData = {
        'weeklyMenus': [{
            id: 'default-test-menu',
            name: 'Menú Semanal de Prueba',
            startDate: new Date(),
            status: 'published',
            dailyMenus: {
                monday: { mainDish: 'Plato principal lunes', sideDish: 'Guarnición lunes', dessert: 'Postre lunes' },
                tuesday: { mainDish: 'Plato principal martes', sideDish: 'Guarnición martes', dessert: 'Postre martes' },
                wednesday: { mainDish: 'Plato principal miércoles', sideDish: 'Guarnición miércoles', dessert: 'Postre miércoles' },
                thursday: { mainDish: 'Plato principal jueves', sideDish: 'Guarnición jueves', dessert: 'Postre jueves' },
                friday: { mainDish: 'Plato principal viernes', sideDish: 'Guarnición viernes', dessert: 'Postre viernes' }
            }
        }],
        'employees': [
            { id: 'emp1', name: 'Empleado 1', employeeId: 'E001', active: true, branch: 'test-branch-1' },
            { id: 'emp2', name: 'Empleado 2', employeeId: 'E002', active: true, branch: 'test-branch-1' }
        ],
        'branches': [
            { id: 'test-branch-1', name: 'Sucursal de Prueba', address: 'Dirección de prueba', active: true }
        ],
        'confirmations': {
            'default-test-menu': {
                'test-branch-1': {
                    status: 'pending',
                    employees: [
                        { employeeId: 'emp1', confirmed: true, days: { monday: true, tuesday: true, wednesday: false, thursday: true, friday: true } },
                        { employeeId: 'emp2', confirmed: false, days: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false } }
                    ]
                }
            }
        },
        'settings': {
            confirmationStartDayOffset: -7,
            confirmationEndDayOffset: -2,
            defaultConfirmationHour: 17,
            defaultConfirmationMinute: 0
        }
    };
    
    return defaultTestData[collectionName] || [];
}

/**
 * Simula una consulta a Firestore en modo desarrollo
 * @param {string} collectionName - Nombre de la colección
 * @param {Object} options - Opciones de consulta (filtros, ordenamiento, etc.)
 * @returns {Promise<Array>} - Resultados simulados
 */
async function simulateFirestoreQuery(collectionName, options = {}) {
    if (typeof devLog === 'function') {
        devLog(`Simulando consulta a colección: ${collectionName}`, options);
    }
    
    // Obtener datos de prueba
    let testData = getTestDataForCollection(collectionName);
    
    // Convertir a array si no lo es
    if (!Array.isArray(testData)) {
        if (typeof testData === 'object') {
            testData = Object.values(testData);
        } else {
            testData = [];
        }
    }
    
    // Aplicar filtros si existen
    if (options.filters && options.filters.length > 0) {
        testData = testData.filter(item => {
            return options.filters.every(filter => {
                const { field, operator, value } = filter;
                
                switch (operator) {
                    case '==':
                        return item[field] === value;
                    case '!=':
                        return item[field] !== value;
                    case '>':
                        return item[field] > value;
                    case '>=':
                        return item[field] >= value;
                    case '<':
                        return item[field] < value;
                    case '<=':
                        return item[field] <= value;
                    case 'in':
                        return Array.isArray(value) && value.includes(item[field]);
                    case 'array-contains':
                        return Array.isArray(item[field]) && item[field].includes(value);
                    default:
                        return true;
                }
            });
        });
    }
    
    // Aplicar ordenamiento si existe
    if (options.orderBy) {
        const { field, direction } = options.orderBy;
        testData.sort((a, b) => {
            if (direction === 'desc') {
                return a[field] > b[field] ? -1 : 1;
            } else {
                return a[field] < b[field] ? -1 : 1;
            }
        });
    }
    
    // Aplicar límite si existe
    if (options.limit && options.limit > 0) {
        testData = testData.slice(0, options.limit);
    }
    
    // Simular un pequeño retraso para que parezca una operación real
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return testData;
}

/**
 * Simula un documento de Firestore
 * @param {Object} data - Datos del documento
 * @param {string} id - ID del documento
 * @returns {Object} - Documento simulado
 */
function createMockDocument(data, id) {
    return {
        id: id,
        data: () => ({ ...data }),
        exists: true,
        ref: {
            id: id,
            path: `mock/document/${id}`
        }
    };
}

/**
 * Simula una colección de Firestore
 * @param {Array} documents - Documentos de la colección
 * @returns {Object} - Colección simulada
 */
function createMockCollection(documents) {
    return {
        docs: documents.map(doc => createMockDocument(doc, doc.id)),
        empty: documents.length === 0,
        size: documents.length,
        forEach: (callback) => documents.forEach(doc => callback(createMockDocument(doc, doc.id)))
    };
}

// Exportar funciones para uso global
window.getTestDataForCollection = getTestDataForCollection;
window.simulateFirestoreQuery = simulateFirestoreQuery;
window.createMockDocument = createMockDocument;
window.createMockCollection = createMockCollection;
