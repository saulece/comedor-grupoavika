/**
 * Configuración global para pruebas Jest
 */

// Importar el mock de Firebase
const firebaseMock = require('./mocks/firebase.mock');

// Configurar el mock de Firebase globalmente
global.firebase = firebaseMock.firebase;

// Simulación del objeto commonUtils para pruebas
// Esto es necesario porque el código real usa un IIFE que expone commonUtils en window
global.commonUtils = {
  CONSTANTS: {
    // Nombres de días con acentos correctos
    DAYS: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    
    // Mapeo de nombres de días normalizados (sin acentos) a nombres con acentos
    DAYS_MAPPING: {
      'domingo': 'Domingo',
      'lunes': 'Lunes',
      'martes': 'Martes',
      'miercoles': 'Miércoles',
      'jueves': 'Jueves',
      'viernes': 'Viernes',
      'sabado': 'Sábado'
    },
    
    // Mapeo inverso (con acentos a sin acentos)
    DAYS_NORMALIZED: {
      'Domingo': 'domingo',
      'Lunes': 'lunes',
      'Martes': 'martes',
      'Miércoles': 'miercoles',
      'Jueves': 'jueves',
      'Viernes': 'viernes',
      'Sábado': 'sabado'
    },
    
    // Roles de usuario
    USER_ROLES: {
      ADMIN: 'admin',
      COORDINATOR: 'coordinator',
      EMPLOYEE: 'employee'
    }
  },
  
  TextUtils: {
    normalizeText: jest.fn(text => {
      if (!text) return '';
      return String(text).toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    }),
    
    normalizeMenuData: jest.fn(menuData => {
      if (!menuData) return {};
      
      const normalizedData = {};
      
      // Normalizar claves de días
      for (const key in menuData) {
        const normalizedKey = global.commonUtils.TextUtils.normalizeText(key).replace(/\s+/g, "");
        normalizedData[normalizedKey] = menuData[key];
      }
      
      // Asegurar que todos los días tengan un array de items válido
      const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
      
      days.forEach(day => {
        if (!normalizedData[day]) {
          normalizedData[day] = { items: [] };
        } else if (!normalizedData[day].items) {
          normalizedData[day].items = [];
        }
      });
      
      return normalizedData;
    })
  },
  
  DateUtils: {
    normalizeDayName: jest.fn(day => {
      if (!day) return '';
      return global.commonUtils.TextUtils.normalizeText(day).replace(/\s+/g, "");
    }),
    
    formatDayName: jest.fn(day => {
      if (!day) return '';
      const normalizedDay = global.commonUtils.DateUtils.normalizeDayName(day);
      return global.commonUtils.CONSTANTS.DAYS_MAPPING[normalizedDay] || day;
    }),
    
    areDaysEqual: jest.fn((day1, day2) => {
      if (!day1 || !day2) return false;
      const normalizedDay1 = global.commonUtils.DateUtils.normalizeDayName(day1);
      const normalizedDay2 = global.commonUtils.DateUtils.normalizeDayName(day2);
      return normalizedDay1 === normalizedDay2;
    }),
    
    getDayOfWeek: jest.fn(date => {
      if (!date) throw new Error('Fecha no válida');
      const dayIndex = date.getDay();
      return global.commonUtils.CONSTANTS.DAYS[dayIndex];
    }),
    
    formatDate: jest.fn(date => {
      if (!date) return '';
      if (typeof date === 'string') return date;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }),
    
    formatDateDisplay: jest.fn(date => {
      if (!date) return '';
      if (typeof date === 'string') {
        // Convertir de YYYY-MM-DD a DD/MM/YYYY
        const parts = date.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return date;
      }
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }),
    
    getMonday: jest.fn(date => {
      if (!date || !(date instanceof Date)) {
        return null;
      }
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(date);
      monday.setDate(diff);
      return monday;
    })
  },
  
  // Funciones de utilidad para mostrar mensajes
  showSuccessMessage: jest.fn(message => console.log(`SUCCESS: ${message}`)),
  showErrorMessage: jest.fn(message => console.error(`ERROR: ${message}`)),
  toggleLoading: jest.fn(isLoading => console.log(`Loading: ${isLoading}`))
};

// Mock para el servicio de errores
global.ERROR_TYPES = {
  UNKNOWN: 'unknown',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  NETWORK: 'network'
};

global.ERROR_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

global.errorService = {
  handleError: jest.fn((error, message, type = 'unknown', severity = 'error') => {
    console.error(`[${severity.toUpperCase()}][${type}] ${message}:`, error);
  }),
  showSuccessMessage: jest.fn(message => {
    console.log(`SUCCESS: ${message}`);
  }),
  toggleLoading: jest.fn(isLoading => {
    console.log(`Loading: ${isLoading}`);
  })
};

// Mock para el servicio de Firestore
global.firestoreService = {
  getDocument: jest.fn(),
  getDocuments: jest.fn(),
  setDocument: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
  addDocument: jest.fn(),
  listenForDocument: jest.fn(),
  listenForDocuments: jest.fn(),
  runTransaction: jest.fn(),
  createBatch: jest.fn(),
  clearCache: jest.fn(),
  clearCacheForCollection: jest.fn(),
  getFirestore: jest.fn()
};

// Mock para StateManager
global.StateManager = {
  createModuleState: jest.fn((namespace, initialState = {}) => {
    const state = { ...initialState };
    const subscribers = {};
    
    return {
      getValue: jest.fn((key, defaultValue = null) => {
        return state[key] !== undefined ? state[key] : defaultValue;
      }),
      setValue: jest.fn((key, value) => {
        const oldValue = state[key];
        state[key] = value;
        
        // Notificar a los suscriptores
        if (subscribers[key] && oldValue !== value) {
          Object.values(subscribers[key]).forEach(callback => {
            callback(value, oldValue, key, namespace);
          });
        }
      }),
      subscribe: jest.fn((key, callback) => {
        if (!subscribers[key]) {
          subscribers[key] = {};
        }
        const id = `sub_${Math.random()}`;
        subscribers[key][id] = callback;
        return id;
      }),
      unsubscribe: jest.fn((key, id) => {
        if (subscribers[key] && subscribers[key][id]) {
          delete subscribers[key][id];
        }
      }),
      getState: jest.fn(() => {
        return { ...state };
      }),
      updateValues: jest.fn((values) => {
        Object.entries(values).forEach(([key, value]) => {
          const oldValue = state[key];
          state[key] = value;
          
          // Notificar a los suscriptores
          if (subscribers[key] && oldValue !== value) {
            Object.values(subscribers[key]).forEach(callback => {
              callback(value, oldValue, key, namespace);
            });
          }
        });
      })
    };
  }),
  initNamespace: jest.fn(),
  getState: jest.fn(),
  getValue: jest.fn(),
  setValue: jest.fn(),
  updateValues: jest.fn(),
  removeValue: jest.fn(),
  clearNamespace: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn()
};

// Configurar el objeto window para el entorno de pruebas
global.window = {
  firebase,
  firestoreService,
  errorService,
  commonUtils,
  StateManager,
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  },
  location: {
    href: 'http://localhost/',
    pathname: '/',
    search: '',
    hash: ''
  }
};

// Configurar document para el entorno de pruebas
document.body.innerHTML = `
  <div id="app">
    <div id="loading-indicator"></div>
    <div id="error-alert"></div>
    <div id="success-alert"></div>
  </div>
`;

// Limpiar todos los mocks después de cada prueba
afterEach(() => {
  jest.clearAllMocks();
});
