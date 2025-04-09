/**
 * Tests para las funciones de utilidad de fechas
 * Estas funciones son críticas para el manejo correcto de nombres de días
 * especialmente con caracteres acentuados como "Miércoles"
 */

// Importar mock de commonUtils desde setup.js
const commonUtils = global.commonUtils;

describe('DateUtils - Normalización de nombres de días', () => {
  test('normalizeDayName debe normalizar correctamente los nombres de días con acentos', () => {
    expect(commonUtils.DateUtils.normalizeDayName('Miércoles')).toBe('miercoles');
    expect(commonUtils.DateUtils.normalizeDayName('Sábado')).toBe('sabado');
    expect(commonUtils.DateUtils.normalizeDayName('Lunes')).toBe('lunes');
  });

  test('normalizeDayName debe manejar valores nulos o indefinidos', () => {
    expect(commonUtils.DateUtils.normalizeDayName(null)).toBe('');
    expect(commonUtils.DateUtils.normalizeDayName(undefined)).toBe('');
    expect(commonUtils.DateUtils.normalizeDayName('')).toBe('');
  });

  test('normalizeDayName debe eliminar espacios en blanco', () => {
    expect(commonUtils.DateUtils.normalizeDayName('  Miércoles  ')).toBe('miercoles');
    expect(commonUtils.DateUtils.normalizeDayName(' Lunes ')).toBe('lunes');
  });
});

describe('DateUtils - Formateo de nombres de días', () => {
  test('formatDayName debe devolver el nombre del día con acentos correctos', () => {
    expect(commonUtils.DateUtils.formatDayName('miercoles')).toBe('Miércoles');
    expect(commonUtils.DateUtils.formatDayName('sabado')).toBe('Sábado');
    expect(commonUtils.DateUtils.formatDayName('Miércoles')).toBe('Miércoles');
  });

  test('formatDayName debe manejar valores nulos o indefinidos', () => {
    expect(commonUtils.DateUtils.formatDayName(null)).toBe('');
    expect(commonUtils.DateUtils.formatDayName(undefined)).toBe('');
    expect(commonUtils.DateUtils.formatDayName('')).toBe('');
  });
});

describe('DateUtils - Comparación de nombres de días', () => {
  test('areDaysEqual debe comparar correctamente días con y sin acentos', () => {
    expect(commonUtils.DateUtils.areDaysEqual('Miércoles', 'miercoles')).toBe(true);
    expect(commonUtils.DateUtils.areDaysEqual('Sábado', 'sabado')).toBe(true);
    expect(commonUtils.DateUtils.areDaysEqual('Lunes', 'Lunes')).toBe(true);
  });

  test('areDaysEqual debe manejar valores nulos o indefinidos', () => {
    expect(commonUtils.DateUtils.areDaysEqual(null, 'miercoles')).toBe(false);
    expect(commonUtils.DateUtils.areDaysEqual('miercoles', null)).toBe(false);
    expect(commonUtils.DateUtils.areDaysEqual(null, null)).toBe(false);
    expect(commonUtils.DateUtils.areDaysEqual(undefined, undefined)).toBe(false);
  });

  test('areDaysEqual debe manejar espacios en blanco', () => {
    expect(commonUtils.DateUtils.areDaysEqual('  Miércoles  ', 'miercoles')).toBe(true);
    expect(commonUtils.DateUtils.areDaysEqual('Lunes', '  lunes ')).toBe(true);
  });
});

describe('DateUtils - Obtención de día de la semana', () => {
  test('getDayOfWeek debe devolver el nombre correcto del día', () => {
    // Crear fechas para días específicos
    const monday = new Date(2025, 3, 7); // Lunes 7 de abril de 2025
    const wednesday = new Date(2025, 3, 9); // Miércoles 9 de abril de 2025
    const saturday = new Date(2025, 3, 12); // Sábado 12 de abril de 2025
    
    expect(commonUtils.DateUtils.getDayOfWeek(monday)).toBe('Lunes');
    expect(commonUtils.DateUtils.getDayOfWeek(wednesday)).toBe('Miércoles');
    expect(commonUtils.DateUtils.getDayOfWeek(saturday)).toBe('Sábado');
  });

  test('getDayOfWeek debe lanzar error con fecha inválida', () => {
    expect(() => commonUtils.DateUtils.getDayOfWeek(null)).toThrow();
    expect(() => commonUtils.DateUtils.getDayOfWeek(undefined)).toThrow();
  });
});

describe('DateUtils - Funciones de formato de fecha', () => {
  test('formatDate debe formatear correctamente una fecha', () => {
    const date = new Date(2025, 3, 9); // 9 de abril de 2025
    expect(commonUtils.DateUtils.formatDate(date)).toBe('2025-04-09');
  });

  test('formatDate debe manejar valores nulos o indefinidos', () => {
    expect(commonUtils.DateUtils.formatDate(null)).toBe('');
    expect(commonUtils.DateUtils.formatDate(undefined)).toBe('');
  });

  test('formatDateDisplay debe formatear correctamente una fecha para mostrar', () => {
    const date = new Date(2025, 3, 9); // 9 de abril de 2025
    expect(commonUtils.DateUtils.formatDateDisplay(date)).toBe('09/04/2025');
  });

  test('formatDateDisplay debe convertir de YYYY-MM-DD a DD/MM/YYYY', () => {
    expect(commonUtils.DateUtils.formatDateDisplay('2025-04-09')).toBe('09/04/2025');
  });
});

describe('DateUtils - Funciones de cálculo de fechas', () => {
  test('getMonday debe devolver el lunes de la semana correctamente', () => {
    // Miércoles 9 de abril de 2025
    const wednesday = new Date(2025, 3, 9);
    const expectedMonday = new Date(2025, 3, 7); // Lunes 7 de abril de 2025
    
    const monday = commonUtils.DateUtils.getMonday(wednesday);
    
    expect(monday.getFullYear()).toBe(expectedMonday.getFullYear());
    expect(monday.getMonth()).toBe(expectedMonday.getMonth());
    expect(monday.getDate()).toBe(expectedMonday.getDate());
  });

  test('getMonday debe devolver null para valores inválidos', () => {
    expect(commonUtils.DateUtils.getMonday(null)).toBeNull();
    expect(commonUtils.DateUtils.getMonday(undefined)).toBeNull();
    expect(commonUtils.DateUtils.getMonday('not a date')).toBeNull();
  });
});
