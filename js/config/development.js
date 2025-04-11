/**
 * Configuración del modo de desarrollo
 * Este archivo contiene configuraciones específicas para el entorno de desarrollo
 */

// Modo de desarrollo global
const DEVELOPMENT_MODE = true;

// Configuración de bypass para validaciones
const DEV_CONFIG = {
    // Bypass para autenticación (permite acceso sin login)
    bypassAuth: false,
    
    // Bypass para validaciones de rol (permite acceso a todas las secciones)
    bypassRoleValidation: false,
    
    // Bypass para validaciones de fechas (permite confirmar fuera de plazo)
    bypassDateValidations: true,
    
    // Mostrar logs de desarrollo
    enableDevLogs: true,
    
    // Tiempo de espera reducido para operaciones (en ms)
    reducedTimeouts: 500,
    
    // Datos de prueba predefinidos
    useTestData: true
};

// Usuarios de prueba
const TEST_USERS = {
    admin: {
        uid: 'test-admin-uid',
        email: 'admin@test.com',
        password: 'test1234',
        displayName: 'Administrador de Prueba',
        role: 'admin',
        branch: null,
        permissions: ['manage_users', 'manage_menus', 'manage_branches', 'view_reports']
    },
    coordinator: {
        uid: 'test-coordinator-uid',
        email: 'coordinator@test.com',
        password: 'test1234',
        displayName: 'Coordinador de Prueba',
        role: 'coordinator',
        branch: 'test-branch-1',
        permissions: ['manage_employees', 'manage_confirmations', 'view_menus']
    },
    employee: {
        uid: 'test-employee-uid',
        email: 'employee@test.com',
        password: 'test1234',
        displayName: 'Empleado de Prueba',
        role: 'employee',
        branch: 'test-branch-1',
        department: 'IT',
        employeeId: 'EMP001',
        permissions: ['view_menus', 'confirm_meals']
    }
};

// Datos de prueba para sucursales
const TEST_BRANCHES = [
    {
        id: 'test-branch-1',
        name: 'Sucursal Central',
        address: 'Av. Principal 123',
        city: 'Ciudad de México',
        phone: '555-123-4567',
        email: 'central@grupoavika.com',
        active: true
    },
    {
        id: 'test-branch-2',
        name: 'Sucursal Norte',
        address: 'Blvd. Norte 456',
        city: 'Monterrey',
        phone: '555-987-6543',
        email: 'norte@grupoavika.com',
        active: true
    }
];

// Datos de prueba para menús semanales
const TEST_WEEKLY_MENUS = [
    {
        id: 'test-menu-1',
        name: 'Menú Semana Actual',
        startDate: new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)), // Lunes de esta semana
        status: 'published',
        confirmStartDate: new Date(new Date().setDate(new Date().getDate() - 5)),
        confirmEndDate: new Date(new Date().setDate(new Date().getDate() + 2)),
        dailyMenus: {
            monday: {
                mainDish: 'Pollo a la parrilla',
                sideDish: 'Puré de papas',
                dessert: 'Flan',
                vegetarianOption: 'Hamburguesa de lentejas'
            },
            tuesday: {
                mainDish: 'Pescado empanizado',
                sideDish: 'Arroz con verduras',
                dessert: 'Gelatina',
                vegetarianOption: 'Tofu a la plancha'
            },
            wednesday: {
                mainDish: 'Bistec a la mexicana',
                sideDish: 'Frijoles refritos',
                dessert: 'Pastel de chocolate',
                vegetarianOption: 'Chiles rellenos'
            },
            thursday: {
                mainDish: 'Enchiladas verdes',
                sideDish: 'Ensalada de nopales',
                dessert: 'Arroz con leche',
                vegetarianOption: 'Enchiladas de champiñones'
            },
            friday: {
                mainDish: 'Mole con pollo',
                sideDish: 'Arroz rojo',
                dessert: 'Pay de limón',
                vegetarianOption: 'Mole con verduras'
            }
        }
    }
];

// Datos de prueba para empleados
const TEST_EMPLOYEES = [
    {
        id: 'test-emp-1',
        name: 'Juan Pérez',
        employeeId: 'EMP001',
        department: 'IT',
        branch: 'test-branch-1',
        email: 'juan@grupoavika.com',
        active: true
    },
    {
        id: 'test-emp-2',
        name: 'María López',
        employeeId: 'EMP002',
        department: 'Recursos Humanos',
        branch: 'test-branch-1',
        email: 'maria@grupoavika.com',
        active: true
    },
    {
        id: 'test-emp-3',
        name: 'Carlos Rodríguez',
        employeeId: 'EMP003',
        department: 'Contabilidad',
        branch: 'test-branch-1',
        email: 'carlos@grupoavika.com',
        active: false
    }
];

// Función para obtener datos de prueba
function getTestData(collection) {
    const testDataMap = {
        'users': TEST_USERS,
        'branches': TEST_BRANCHES,
        'weeklyMenus': TEST_WEEKLY_MENUS,
        'employees': TEST_EMPLOYEES
    };
    
    return testDataMap[collection] || null;
}

// Función para simular retraso en operaciones asíncronas
function simulateDelay(callback, delay = DEV_CONFIG.reducedTimeouts) {
    return new Promise(resolve => {
        setTimeout(() => {
            const result = callback();
            resolve(result);
        }, delay);
    });
}

// Función para registrar logs de desarrollo
function devLog(message, data = null) {
    if (DEV_CONFIG.enableDevLogs) {
        console.log(`[DEV] ${message}`, data ? data : '');
    }
}

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEVELOPMENT_MODE,
        DEV_CONFIG,
        TEST_USERS,
        TEST_BRANCHES,
        TEST_WEEKLY_MENUS,
        TEST_EMPLOYEES,
        getTestData,
        simulateDelay,
        devLog
    };
}
