/**
 * Configuración global para pruebas Jest
 */

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
    })
  }
};

// Limpiar todos los mocks después de cada prueba
afterEach(() => {
  jest.clearAllMocks();
});
