/**
 * Tests para las funciones de normalización de texto
 * Estas funciones son críticas para el manejo correcto de caracteres acentuados
 * especialmente en los nombres de los días como "Miércoles"
 */

// Importar mock de commonUtils desde setup.js
const commonUtils = global.commonUtils;

describe('TextUtils - Normalización de texto', () => {
  test('normalizeText debe eliminar acentos correctamente', () => {
    expect(commonUtils.TextUtils.normalizeText('Miércoles')).toBe('miercoles');
    expect(commonUtils.TextUtils.normalizeText('Sábado')).toBe('sabado');
    expect(commonUtils.TextUtils.normalizeText('Lunes')).toBe('lunes');
  });

  test('normalizeText debe manejar valores nulos o indefinidos', () => {
    expect(commonUtils.TextUtils.normalizeText(null)).toBe('');
    expect(commonUtils.TextUtils.normalizeText(undefined)).toBe('');
    expect(commonUtils.TextUtils.normalizeText('')).toBe('');
  });

  test('normalizeText debe eliminar espacios en blanco al inicio y final', () => {
    expect(commonUtils.TextUtils.normalizeText('  Miércoles  ')).toBe('miercoles');
    expect(commonUtils.TextUtils.normalizeText(' Lunes ')).toBe('lunes');
  });

  test('normalizeText debe convertir a minúsculas', () => {
    expect(commonUtils.TextUtils.normalizeText('MIÉRCOLES')).toBe('miercoles');
    expect(commonUtils.TextUtils.normalizeText('Sábado')).toBe('sabado');
  });
});

describe('TextUtils - Normalización de datos de menú', () => {
  test('normalizeMenuData debe normalizar las claves de días correctamente', () => {
    const menuData = {
      'Lunes': { items: ['Arroz', 'Pollo'] },
      'Miércoles': { items: ['Pasta', 'Carne'] }
    };

    const normalized = commonUtils.TextUtils.normalizeMenuData(menuData);
    
    expect(normalized).toHaveProperty('lunes');
    expect(normalized).toHaveProperty('miercoles');
    expect(normalized.lunes.items).toEqual(['Arroz', 'Pollo']);
    expect(normalized.miercoles.items).toEqual(['Pasta', 'Carne']);
  });

  test('normalizeMenuData debe asegurar que todos los días tengan un array de items', () => {
    const menuData = {
      'Lunes': { items: ['Arroz', 'Pollo'] },
      'Martes': {} // Sin items
    };

    const normalized = commonUtils.TextUtils.normalizeMenuData(menuData);
    
    expect(normalized.lunes.items).toEqual(['Arroz', 'Pollo']);
    expect(normalized.martes.items).toEqual([]);
    
    // Verificar que se agreguen los días faltantes
    expect(normalized).toHaveProperty('miercoles');
    expect(normalized.miercoles.items).toEqual([]);
  });

  test('normalizeMenuData debe manejar datos nulos o indefinidos', () => {
    expect(commonUtils.TextUtils.normalizeMenuData(null)).toEqual({});
    expect(commonUtils.TextUtils.normalizeMenuData(undefined)).toEqual({});
    
    const emptyResult = commonUtils.TextUtils.normalizeMenuData({});
    expect(emptyResult).toHaveProperty('lunes');
    expect(emptyResult).toHaveProperty('martes');
    expect(emptyResult).toHaveProperty('miercoles');
    expect(emptyResult).toHaveProperty('jueves');
    expect(emptyResult).toHaveProperty('viernes');
    expect(emptyResult).toHaveProperty('sabado');
    expect(emptyResult).toHaveProperty('domingo');
  });
});
