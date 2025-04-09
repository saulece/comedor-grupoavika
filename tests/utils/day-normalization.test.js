/**
 * Pruebas específicas para la normalización de días de la semana
 * Enfocadas en resolver los problemas con caracteres acentuados
 * 
 * @jest-environment jsdom
 */

// Configurar el entorno de prueba
global.commonUtils = require('../../js/utils/common-utils');

describe('Normalización de días de la semana', () => {
  describe('Casos específicos para Miércoles', () => {
    test('debe normalizar correctamente "Miércoles" con diferentes formatos', () => {
      const { DateUtils } = commonUtils;
      
      // Diferentes variantes de escritura para Miércoles
      expect(DateUtils.normalizeDayName('Miércoles')).toBe('miercoles');
      expect(DateUtils.normalizeDayName('miércoles')).toBe('miercoles');
      expect(DateUtils.normalizeDayName('MIÉRCOLES')).toBe('miercoles');
      expect(DateUtils.normalizeDayName('Miercoles')).toBe('miercoles');
      expect(DateUtils.normalizeDayName('miercoles')).toBe('miercoles');
      expect(DateUtils.normalizeDayName('MiÉrCoLeS')).toBe('miercoles');
      expect(DateUtils.normalizeDayName('  Miércoles  ')).toBe('miercoles');
    });
    
    test('debe formatear correctamente "miercoles" a "Miércoles"', () => {
      const { DateUtils } = commonUtils;
      
      // Diferentes variantes deben convertirse al formato correcto con acento
      expect(DateUtils.formatDayName('miercoles')).toBe('Miércoles');
      expect(DateUtils.formatDayName('Miercoles')).toBe('Miércoles');
      expect(DateUtils.formatDayName('MIERCOLES')).toBe('Miércoles');
      expect(DateUtils.formatDayName('miércoles')).toBe('Miércoles');
      expect(DateUtils.formatDayName('Miércoles')).toBe('Miércoles');
    });
    
    test('debe identificar correctamente que todas las variantes de "Miércoles" son iguales', () => {
      const { DateUtils } = commonUtils;
      
      expect(DateUtils.areDaysEqual('Miércoles', 'miercoles')).toBe(true);
      expect(DateUtils.areDaysEqual('MIÉRCOLES', 'Miercoles')).toBe(true);
      expect(DateUtils.areDaysEqual('miércoles', 'MiErCoLeS')).toBe(true);
      expect(DateUtils.areDaysEqual('  Miércoles  ', 'miercoles')).toBe(true);
    });
  });
  
  describe('Casos específicos para Sábado', () => {
    test('debe normalizar correctamente "Sábado" con diferentes formatos', () => {
      const { DateUtils } = commonUtils;
      
      expect(DateUtils.normalizeDayName('Sábado')).toBe('sabado');
      expect(DateUtils.normalizeDayName('sábado')).toBe('sabado');
      expect(DateUtils.normalizeDayName('SÁBADO')).toBe('sabado');
      expect(DateUtils.normalizeDayName('Sabado')).toBe('sabado');
      expect(DateUtils.normalizeDayName('sabado')).toBe('sabado');
    });
    
    test('debe formatear correctamente "sabado" a "Sábado"', () => {
      const { DateUtils } = commonUtils;
      
      expect(DateUtils.formatDayName('sabado')).toBe('Sábado');
      expect(DateUtils.formatDayName('Sabado')).toBe('Sábado');
      expect(DateUtils.formatDayName('SABADO')).toBe('Sábado');
      expect(DateUtils.formatDayName('sábado')).toBe('Sábado');
      expect(DateUtils.formatDayName('Sábado')).toBe('Sábado');
    });
  });
  
  describe('Integración con normalizeMenuData', () => {
    test('debe normalizar correctamente las claves de días en datos de menú', () => {
      const { TextUtils } = commonUtils;
      
      const menuData = {
        'Lunes': { items: [{ name: 'Sopa' }] },
        'Miércoles': { items: [{ name: 'Pasta' }] },
        'Sábado': { items: [{ name: 'Postre' }] }
      };
      
      const normalized = TextUtils.normalizeMenuData(menuData);
      
      // Verificar que las claves se normalizaron correctamente
      expect(normalized).toHaveProperty('lunes');
      expect(normalized).toHaveProperty('miercoles');
      expect(normalized).toHaveProperty('sabado');
      
      // Verificar que los datos se mantuvieron
      expect(normalized.lunes.items).toEqual([{ name: 'Sopa' }]);
      expect(normalized.miercoles.items).toEqual([{ name: 'Pasta' }]);
      expect(normalized.sabado.items).toEqual([{ name: 'Postre' }]);
    });
    
    test('debe manejar correctamente diferentes variantes de "Miércoles" en datos de menú', () => {
      const { TextUtils } = commonUtils;
      
      // Caso problemático mencionado en la memoria: diferentes formas de escribir Miércoles
      const menuData = {
        'Miércoles': { items: [{ name: 'Plato 1' }] },
        'miercoles': { items: [{ name: 'Plato 2' }] },
        'MIERCOLES': { items: [{ name: 'Plato 3' }] }
      };
      
      const normalized = TextUtils.normalizeMenuData(menuData);
      
      // Todas las variantes deben normalizarse a la misma clave
      expect(normalized).toHaveProperty('miercoles');
      
      // La última variante debe prevalecer en la normalización
      // (Nota: esto depende de cómo JavaScript itera sobre las propiedades de un objeto)
      expect(normalized.miercoles.items.length).toBeGreaterThan(0);
    });
  });
});
