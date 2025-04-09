/**
 * Tests para las funcionalidades críticas relacionadas con Firebase
 * Estas pruebas verifican la correcta inicialización de Firebase y 
 * el manejo de colecciones, especialmente para el problema de menús
 */

// Importar mock de Firebase desde setup.js
const firebaseMock = require('../mocks/firebase.mock');

describe('Firebase - Inicialización y configuración', () => {
  beforeEach(() => {
    // Limpiar mocks antes de cada prueba
    jest.clearAllMocks();
    
    // Configurar el mock de Firebase
    global.firebase = { ...firebaseMock.firebase };
  });
  
  test('firebase debe estar disponible como un objeto global', () => {
    expect(global.firebase).toBeDefined();
    expect(typeof global.firebase).toBe('object');
  });
  
  test('firebase debe tener los métodos necesarios', () => {
    expect(global.firebase.initializeApp).toBeDefined();
    expect(global.firebase.firestore).toBeDefined();
    expect(global.firebase.auth).toBeDefined();
  });
  
  test('firestore debe permitir acceder a colecciones', () => {
    const db = global.firebase.firestore();
    expect(db.collection).toBeDefined();
    
    const collection = db.collection('menus');
    expect(collection).toBeDefined();
    expect(collection.doc).toBeDefined();
    expect(collection.get).toBeDefined();
  });
});

describe('Firebase - Operaciones con menús', () => {
  let db;
  let menusCollection;
  
  beforeEach(() => {
    // Limpiar mocks antes de cada prueba
    jest.clearAllMocks();
    
    // Configurar el mock de Firebase
    global.firebase = { ...firebaseMock.firebase };
    
    // Obtener instancia de Firestore
    db = global.firebase.firestore();
    
    // Obtener colección de menús
    menusCollection = db.collection('menus');
  });
  
  test('debe poder obtener un documento de menú', async () => {
    // Configurar el mock para devolver un documento
    const mockDoc = {
      exists: true,
      id: 'menu1',
      data: () => ({
        date: '2025-04-09',
        days: {
          'lunes': { items: ['Arroz', 'Pollo'] },
          'martes': { items: ['Pasta', 'Carne'] },
          'miercoles': { items: ['Sopa', 'Pescado'] },
          'jueves': { items: ['Ensalada', 'Hamburguesa'] },
          'viernes': { items: ['Pizza', 'Postre'] }
        }
      })
    };
    
    // Configurar el mock para devolver el documento
    menusCollection.doc = jest.fn(() => ({
      get: jest.fn(() => Promise.resolve(mockDoc))
    }));
    
    // Obtener el documento
    const docRef = menusCollection.doc('menu1');
    const doc = await docRef.get();
    
    // Verificar que se obtuvo el documento
    expect(doc.exists).toBe(true);
    expect(doc.id).toBe('menu1');
    
    // Verificar que el documento tiene los datos esperados
    const data = doc.data();
    expect(data.days).toHaveProperty('miercoles');
    expect(data.days.miercoles.items).toEqual(['Sopa', 'Pescado']);
  });
  
  test('debe poder guardar un documento de menú con días acentuados', async () => {
    // Crear un mock para el método set
    const setMock = jest.fn(() => Promise.resolve());
    
    // Configurar el mock para el documento
    menusCollection.doc = jest.fn(() => ({
      set: setMock
    }));
    
    // Datos de menú con días acentuados
    const menuData = {
      date: '2025-04-09',
      days: {
        'Lunes': { items: ['Arroz', 'Pollo'] },
        'Martes': { items: ['Pasta', 'Carne'] },
        'Miércoles': { items: ['Sopa', 'Pescado'] },
        'Jueves': { items: ['Ensalada', 'Hamburguesa'] },
        'Viernes': { items: ['Pizza', 'Postre'] }
      }
    };
    
    // Guardar el documento
    const docRef = menusCollection.doc('menu1');
    await docRef.set(menuData);
    
    // Verificar que se llamó al método set con los datos correctos
    expect(setMock).toHaveBeenCalledWith(menuData);
  });
  
  test('debe poder normalizar los nombres de días con acentos', () => {
    // Usar la función de normalización de texto del commonUtils global
    expect(global.commonUtils.TextUtils.normalizeText('Miércoles')).toBe('miercoles');
    expect(global.commonUtils.TextUtils.normalizeText('Sábado')).toBe('sabado');
    
    // Usar la función de normalización de día del DateUtils global
    expect(global.commonUtils.DateUtils.normalizeDayName('Miércoles')).toBe('miercoles');
    expect(global.commonUtils.DateUtils.normalizeDayName('Sábado')).toBe('sabado');
  });
  
  test('debe poder formatear los nombres de días correctamente', () => {
    // Usar la función de formateo de día del DateUtils global
    expect(global.commonUtils.DateUtils.formatDayName('miercoles')).toBe('Miércoles');
    expect(global.commonUtils.DateUtils.formatDayName('sabado')).toBe('Sábado');
  });
  
  test('debe poder comparar nombres de días con y sin acentos', () => {
    // Usar la función de comparación de días del DateUtils global
    expect(global.commonUtils.DateUtils.areDaysEqual('Miércoles', 'miercoles')).toBe(true);
    expect(global.commonUtils.DateUtils.areDaysEqual('Sábado', 'sabado')).toBe(true);
    expect(global.commonUtils.DateUtils.areDaysEqual('Lunes', 'martes')).toBe(false);
  });
  
  test('debe poder normalizar datos de menú con días acentuados', () => {
    // Datos de menú con días acentuados
    const menuData = {
      'Lunes': { items: ['Arroz', 'Pollo'] },
      'Miércoles': { items: ['Sopa', 'Pescado'] }
    };
    
    // Normalizar los datos
    const normalizedData = global.commonUtils.TextUtils.normalizeMenuData(menuData);
    
    // Verificar que se normalizaron correctamente
    expect(normalizedData).toHaveProperty('lunes');
    expect(normalizedData).toHaveProperty('miercoles');
    expect(normalizedData.lunes.items).toEqual(['Arroz', 'Pollo']);
    expect(normalizedData.miercoles.items).toEqual(['Sopa', 'Pescado']);
  });
});
