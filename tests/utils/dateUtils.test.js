/**
 * Pruebas unitarias para las utilidades de fecha (DateUtils)
 * 
 * @jest-environment jsdom
 */

// Usar el mock de commonUtils ya configurado en setup.js
const { DateUtils } = global.commonUtils;

describe('DateUtils', () => {
  describe('formatDate', () => {
    test('debe formatear correctamente una fecha como YYYY-MM-DD', () => {
      const date = new Date(2025, 3, 9); // 9 de abril de 2025
      expect(DateUtils.formatDate(date)).toBe('2025-04-09');
    });
    
    test('debe manejar correctamente fechas con un solo dígito en día y mes', () => {
      const date = new Date(2025, 0, 1); // 1 de enero de 2025
      expect(DateUtils.formatDate(date)).toBe('2025-01-01');
    });
    
    test('debe devolver una cadena vacía para valores no válidos', () => {
      expect(DateUtils.formatDate(null)).toBe('');
      expect(DateUtils.formatDate(undefined)).toBe('');
    });
  });
  
  describe('formatDateDisplay', () => {
    test('debe formatear correctamente una fecha como DD/MM/YYYY', () => {
      const date = new Date(2025, 3, 9); // 9 de abril de 2025
      expect(DateUtils.formatDateDisplay(date)).toBe('09/04/2025');
    });
    
    test('debe manejar correctamente fechas con un solo dígito en día y mes', () => {
      const date = new Date(2025, 0, 1); // 1 de enero de 2025
      expect(DateUtils.formatDateDisplay(date)).toBe('01/01/2025');
    });
    
    test('debe devolver una cadena vacía para valores no válidos', () => {
      expect(DateUtils.formatDateDisplay(null)).toBe('');
      expect(DateUtils.formatDateDisplay(undefined)).toBe('');
    });
  });
  
  describe('normalizeDayName', () => {
    test('debe normalizar correctamente los nombres de días', () => {
      expect(DateUtils.normalizeDayName('Lunes')).toBe('lunes');
      expect(DateUtils.normalizeDayName('MARTES')).toBe('martes');
      expect(DateUtils.normalizeDayName('Miércoles')).toBe('miercoles');
      expect(DateUtils.normalizeDayName('jueves')).toBe('jueves');
      expect(DateUtils.normalizeDayName('Viernes')).toBe('viernes');
      expect(DateUtils.normalizeDayName('Sábado')).toBe('sabado');
      expect(DateUtils.normalizeDayName('DOMINGO')).toBe('domingo');
    });
    
    test('debe manejar espacios en blanco', () => {
      expect(DateUtils.normalizeDayName('  Lunes  ')).toBe('lunes');
      expect(DateUtils.normalizeDayName(' Miércoles ')).toBe('miercoles');
    });
    
    test('debe devolver una cadena vacía para valores no válidos', () => {
      expect(DateUtils.normalizeDayName('')).toBe('');
      expect(DateUtils.normalizeDayName(null)).toBe('');
      expect(DateUtils.normalizeDayName(undefined)).toBe('');
    });
  });
  
  describe('formatDayName', () => {
    test('debe formatear correctamente los nombres de días', () => {
      expect(DateUtils.formatDayName('lunes')).toBe('Lunes');
      expect(DateUtils.formatDayName('martes')).toBe('Martes');
      expect(DateUtils.formatDayName('miercoles')).toBe('Miércoles');
      expect(DateUtils.formatDayName('jueves')).toBe('Jueves');
      expect(DateUtils.formatDayName('viernes')).toBe('Viernes');
      expect(DateUtils.formatDayName('sabado')).toBe('Sábado');
      expect(DateUtils.formatDayName('domingo')).toBe('Domingo');
    });
    
    test('debe manejar diferentes formatos de entrada', () => {
      expect(DateUtils.formatDayName('LUNES')).toBe('Lunes');
      expect(DateUtils.formatDayName('Miércoles')).toBe('Miércoles');
      expect(DateUtils.formatDayName('sabado')).toBe('Sábado');
    });
    
    test('debe devolver una cadena vacía para valores no válidos', () => {
      expect(DateUtils.formatDayName('')).toBe('');
      expect(DateUtils.formatDayName(null)).toBe('');
      expect(DateUtils.formatDayName(undefined)).toBe('');
    });
  });
  
  describe('areDaysEqual', () => {
    test('debe comparar correctamente nombres de días iguales', () => {
      expect(DateUtils.areDaysEqual('Lunes', 'lunes')).toBe(true);
      expect(DateUtils.areDaysEqual('MARTES', 'martes')).toBe(true);
      expect(DateUtils.areDaysEqual('Miércoles', 'miercoles')).toBe(true);
      expect(DateUtils.areDaysEqual('Sábado', 'sabado')).toBe(true);
    });
    
    test('debe identificar correctamente nombres de días diferentes', () => {
      expect(DateUtils.areDaysEqual('Lunes', 'Martes')).toBe(false);
      expect(DateUtils.areDaysEqual('miercoles', 'jueves')).toBe(false);
    });
    
    test('debe manejar valores no válidos', () => {
      expect(DateUtils.areDaysEqual('', 'lunes')).toBe(false);
      expect(DateUtils.areDaysEqual('lunes', '')).toBe(false);
      expect(DateUtils.areDaysEqual(null, 'lunes')).toBe(false);
      expect(DateUtils.areDaysEqual('lunes', null)).toBe(false);
    });
  });
  
  describe('getMonday', () => {
    test('debe obtener correctamente el lunes de la semana', () => {
      // Miércoles 9 de abril de 2025
      const wednesday = new Date(2025, 3, 9);
      const monday = DateUtils.getMonday(wednesday);
      
      expect(monday.getFullYear()).toBe(2025);
      expect(monday.getMonth()).toBe(3); // Abril (0-indexed)
      expect(monday.getDate()).toBe(7); // Lunes 7 de abril
      expect(monday.getDay()).toBe(1); // Lunes es 1 en JavaScript
    });
    
    test('debe manejar el caso cuando la fecha ya es lunes', () => {
      // Lunes 7 de abril de 2025
      const monday = new Date(2025, 3, 7);
      const result = DateUtils.getMonday(monday);
      
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(3);
      expect(result.getDate()).toBe(7);
      expect(result.getDay()).toBe(1);
    });
    
    test('debe devolver null para valores no válidos', () => {
      expect(DateUtils.getMonday(null)).toBeNull();
      expect(DateUtils.getMonday(undefined)).toBeNull();
    });
  });
});
