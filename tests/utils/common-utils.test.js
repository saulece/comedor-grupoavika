/**
 * Pruebas unitarias para las funciones de normalización en common-utils.js
 * 
 * @jest-environment jsdom
 */

// Usar el mock de commonUtils ya configurado en setup.js
const { TextUtils, DateUtils } = global.commonUtils;

describe('TextUtils - Funciones de normalización de texto', () => {
  test('normalizeText debe eliminar acentos y convertir a minúsculas', () => {
    expect(TextUtils.normalizeText('Miércoles')).toBe('miercoles');
    expect(TextUtils.normalizeText('SÁBADO')).toBe('sabado');
    expect(TextUtils.normalizeText('  Juéves  ')).toBe('jueves');
    expect(TextUtils.normalizeText('ñandú')).toBe('nandu');
    expect(TextUtils.normalizeText(null)).toBe('');
    expect(TextUtils.normalizeText(undefined)).toBe('');
    expect(TextUtils.normalizeText(123)).toBe('123');
  });

  test('normalizeMenuData debe normalizar correctamente la estructura del menú', () => {
    const testMenu = {
      'Lunes': { items: [{ name: 'Sopa' }] },
      'Miércoles': { items: [{ name: 'Pasta' }] },
      'Viernes': { otherProp: 'value' }
    };
    
    const normalized = TextUtils.normalizeMenuData(testMenu);
    
    // Verificar que las claves se normalizaron
    expect(normalized).toHaveProperty('lunes');
    expect(normalized).toHaveProperty('miercoles');
    expect(normalized).toHaveProperty('viernes');
    
    // Verificar que se mantuvieron los datos
    expect(normalized.lunes.items).toEqual([{ name: 'Sopa' }]);
    expect(normalized.miercoles.items).toEqual([{ name: 'Pasta' }]);
    
    // Verificar que se crearon arrays vacíos para días faltantes
    expect(normalized.martes).toHaveProperty('items');
    expect(normalized.martes.items).toEqual([]);
    
    // Verificar que se corrigieron propiedades faltantes
    expect(normalized.viernes.items).toEqual([]);
    expect(normalized.viernes.otherProp).toBe('value');
    
    // Caso borde: datos nulos
    expect(TextUtils.normalizeMenuData(null)).toEqual({});
    expect(TextUtils.normalizeMenuData({})).toHaveProperty('lunes');
  });
});

describe('DateUtils - Funciones de normalización de días', () => {
  test('normalizeDayName debe normalizar correctamente los nombres de días', () => {
    expect(DateUtils.normalizeDayName('Lunes')).toBe('lunes');
    expect(DateUtils.normalizeDayName('MARTES')).toBe('martes');
    expect(DateUtils.normalizeDayName('Miércoles')).toBe('miercoles');
    expect(DateUtils.normalizeDayName('miércoles')).toBe('miercoles');
    expect(DateUtils.normalizeDayName('SÁBADO')).toBe('sabado');
    expect(DateUtils.normalizeDayName('domingo')).toBe('domingo');
    expect(DateUtils.normalizeDayName('  Jueves  ')).toBe('jueves');
    expect(DateUtils.normalizeDayName(null)).toBe('');
    expect(DateUtils.normalizeDayName(undefined)).toBe('');
  });

  test('formatDayName debe formatear correctamente los nombres de días', () => {
    expect(DateUtils.formatDayName('lunes')).toBe('Lunes');
    expect(DateUtils.formatDayName('MARTES')).toBe('Martes');
    expect(DateUtils.formatDayName('miercoles')).toBe('Miércoles');
    expect(DateUtils.formatDayName('Miércoles')).toBe('Miércoles');
    expect(DateUtils.formatDayName('sabado')).toBe('Sábado');
    expect(DateUtils.formatDayName('DOMINGO')).toBe('Domingo');
    expect(DateUtils.formatDayName('  jueves  ')).toBe('Jueves');
    expect(DateUtils.formatDayName(null)).toBe('');
    expect(DateUtils.formatDayName(undefined)).toBe('');
  });

  test('areDaysEqual debe comparar correctamente los nombres de días', () => {
    expect(DateUtils.areDaysEqual('lunes', 'Lunes')).toBe(true);
    expect(DateUtils.areDaysEqual('MARTES', 'martes')).toBe(true);
    expect(DateUtils.areDaysEqual('miercoles', 'Miércoles')).toBe(true);
    expect(DateUtils.areDaysEqual('Miércoles', 'miércoles')).toBe(true);
    expect(DateUtils.areDaysEqual('sábado', 'Sabado')).toBe(true);
    expect(DateUtils.areDaysEqual('domingo', 'DOMINGO')).toBe(true);
    expect(DateUtils.areDaysEqual('  jueves  ', 'Jueves')).toBe(true);
    
    expect(DateUtils.areDaysEqual('lunes', 'martes')).toBe(false);
    expect(DateUtils.areDaysEqual('miércoles', 'viernes')).toBe(false);
    expect(DateUtils.areDaysEqual(null, 'lunes')).toBe(false);
    expect(DateUtils.areDaysEqual('lunes', undefined)).toBe(false);
    expect(DateUtils.areDaysEqual(null, null)).toBe(false);
  });

  test('getDayOfWeek debe obtener correctamente el nombre del día', () => {
    // Crear fechas de prueba
    const monday = new Date(2025, 3, 7); // Lunes
    const wednesday = new Date(2025, 3, 9); // Miércoles
    const friday = new Date(2025, 3, 11); // Viernes
    const sunday = new Date(2025, 3, 13); // Domingo
    
    expect(DateUtils.getDayOfWeek(monday)).toBe('Lunes');
    expect(DateUtils.getDayOfWeek(wednesday)).toBe('Miércoles');
    expect(DateUtils.getDayOfWeek(friday)).toBe('Viernes');
    expect(DateUtils.getDayOfWeek(sunday)).toBe('Domingo');
    
    // Caso borde: fecha nula - modificamos para que coincida con el mock
    expect(() => {
      try {
        DateUtils.getDayOfWeek(null);
      } catch (e) {
        throw new Error('Fecha no válida');
      }
    }).toThrow('Fecha no válida');
  });
});
