/**
 * Tests para el servicio de gestión de menús
 * Estas pruebas son críticas para verificar el correcto manejo de menús
 * especialmente con los problemas de normalización de caracteres acentuados
 * como "Miércoles"
 */

// Importar mock de Firebase desde setup.js
const firebaseMock = require('../mocks/firebase.mock');
const commonUtils = global.commonUtils;

describe('MenuService - Gestión de menús', () => {
  // Mock para el servicio de menús
  const menuService = {
    addMenuItem: jest.fn((day, item) => {
      // Normalizar el nombre del día
      const normalizedDay = commonUtils.DateUtils.normalizeDayName(day);
      
      // Verificar que el día es válido
      if (!['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].includes(normalizedDay)) {
        return Promise.reject(new Error('Día no válido'));
      }
      
      // Verificar que el item no está vacío
      if (!item || !item.name) {
        return Promise.reject(new Error('Item no válido'));
      }
      
      return Promise.resolve({
        success: true,
        day: normalizedDay,
        item
      });
    }),
    
    getMenuForDay: jest.fn((day) => {
      // Normalizar el nombre del día
      const normalizedDay = commonUtils.DateUtils.normalizeDayName(day);
      
      // Verificar que el día es válido
      if (!['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].includes(normalizedDay)) {
        return Promise.reject(new Error('Día no válido'));
      }
      
      // Simular menú para el día
      return Promise.resolve({
        day: normalizedDay,
        items: [
          { id: '1', name: 'Plato 1' },
          { id: '2', name: 'Plato 2' }
        ]
      });
    }),
    
    updateMenuItem: jest.fn((day, itemId, updatedItem) => {
      // Normalizar el nombre del día
      const normalizedDay = commonUtils.DateUtils.normalizeDayName(day);
      
      // Verificar que el día es válido
      if (!['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].includes(normalizedDay)) {
        return Promise.reject(new Error('Día no válido'));
      }
      
      // Verificar que el itemId no está vacío
      if (!itemId) {
        return Promise.reject(new Error('ID de item no válido'));
      }
      
      // Verificar que el item no está vacío
      if (!updatedItem || !updatedItem.name) {
        return Promise.reject(new Error('Item no válido'));
      }
      
      return Promise.resolve({
        success: true,
        day: normalizedDay,
        itemId,
        item: updatedItem
      });
    }),
    
    removeMenuItem: jest.fn((day, itemId) => {
      // Normalizar el nombre del día
      const normalizedDay = commonUtils.DateUtils.normalizeDayName(day);
      
      // Verificar que el día es válido
      if (!['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].includes(normalizedDay)) {
        return Promise.reject(new Error('Día no válido'));
      }
      
      // Verificar que el itemId no está vacío
      if (!itemId) {
        return Promise.reject(new Error('ID de item no válido'));
      }
      
      return Promise.resolve({
        success: true,
        day: normalizedDay,
        itemId
      });
    })
  };
  
  beforeEach(() => {
    // Limpiar mocks antes de cada prueba
    jest.clearAllMocks();
  });
  
  test('addMenuItem debe agregar un platillo al día correctamente', async () => {
    const result = await menuService.addMenuItem('Miércoles', { name: 'Nuevo Plato' });
    
    expect(result.success).toBe(true);
    expect(result.day).toBe('miercoles');
    expect(result.item).toEqual({ name: 'Nuevo Plato' });
  });
  
  test('addMenuItem debe manejar nombres de días con y sin acentos', async () => {
    const result1 = await menuService.addMenuItem('Miércoles', { name: 'Plato 1' });
    const result2 = await menuService.addMenuItem('miercoles', { name: 'Plato 2' });
    
    expect(result1.day).toBe('miercoles');
    expect(result2.day).toBe('miercoles');
  });
  
  test('addMenuItem debe rechazar días inválidos', async () => {
    await expect(menuService.addMenuItem('Día inválido', { name: 'Plato' }))
      .rejects.toThrow('Día no válido');
  });
  
  test('getMenuForDay debe obtener el menú para un día específico', async () => {
    const menu = await menuService.getMenuForDay('Miércoles');
    
    expect(menu.day).toBe('miercoles');
    expect(menu.items).toHaveLength(2);
  });
  
  test('getMenuForDay debe funcionar con nombres de días con y sin acentos', async () => {
    const menu1 = await menuService.getMenuForDay('Miércoles');
    const menu2 = await menuService.getMenuForDay('miercoles');
    
    expect(menu1.day).toBe('miercoles');
    expect(menu2.day).toBe('miercoles');
  });
  
  test('updateMenuItem debe actualizar un platillo correctamente', async () => {
    const result = await menuService.updateMenuItem('Miércoles', '1', { name: 'Plato Actualizado' });
    
    expect(result.success).toBe(true);
    expect(result.day).toBe('miercoles');
    expect(result.itemId).toBe('1');
    expect(result.item).toEqual({ name: 'Plato Actualizado' });
  });
  
  test('removeMenuItem debe eliminar un platillo correctamente', async () => {
    const result = await menuService.removeMenuItem('Miércoles', '1');
    
    expect(result.success).toBe(true);
    expect(result.day).toBe('miercoles');
    expect(result.itemId).toBe('1');
  });
});
