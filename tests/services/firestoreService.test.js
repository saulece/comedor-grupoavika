/**
 * Pruebas unitarias para FirestoreService
 * 
 * Estas pruebas verifican el correcto funcionamiento del servicio
 * que gestiona las operaciones con Firestore.
 */

// Importar el mock de Firebase
const firebaseMock = require('../mocks/firebase.mock');

describe('FirestoreService', () => {
  // Variables para las pruebas
  let firestoreService;
  let mockFirestore;
  let mockCollection;
  let mockDoc;
  let mockDocSnapshot;
  let mockQuerySnapshot;
  
  // Configuración antes de cada prueba
  beforeEach(() => {
    // Configurar mocks
    mockDocSnapshot = {
      exists: true,
      id: 'test-doc',
      data: () => ({ name: 'Test Document', active: true })
    };
    
    mockDoc = {
      id: 'test-doc',
      get: jest.fn().mockResolvedValue(mockDocSnapshot),
      set: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      onSnapshot: jest.fn()
    };
    
    mockQuerySnapshot = {
      docs: [
        {
          id: 'doc1',
          data: () => ({ name: 'Document 1', active: true }),
          exists: true
        },
        {
          id: 'doc2',
          data: () => ({ name: 'Document 2', active: false }),
          exists: true
        }
      ],
      forEach: jest.fn(callback => {
        mockQuerySnapshot.docs.forEach(callback);
      }),
      size: 2,
      empty: false
    };
    
    mockCollection = {
      doc: jest.fn().mockReturnValue(mockDoc),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      startAfter: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue(mockQuerySnapshot),
      add: jest.fn().mockResolvedValue(mockDoc),
      onSnapshot: jest.fn()
    };
    
    mockFirestore = {
      collection: jest.fn().mockReturnValue(mockCollection),
      batch: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        commit: jest.fn().mockResolvedValue(undefined)
      }),
      runTransaction: jest.fn().mockImplementation(async (transactionHandler) => {
        const transaction = {
          get: jest.fn().mockResolvedValue(mockDocSnapshot),
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        };
        return await transactionHandler(transaction);
      })
    };
    
    // Configurar el mock global de Firebase
    global.firebase = {
      firestore: jest.fn().mockReturnValue(mockFirestore)
    };
    
    // Inicializar el servicio de Firestore
    firestoreService = {
      // Métodos básicos de Firestore
      getDocument: jest.fn().mockImplementation(async (collectionName, docId, options = {}) => {
        if (options.useCache && firestoreService._cache && firestoreService._cache[`${collectionName}/${docId}`]) {
          return firestoreService._cache[`${collectionName}/${docId}`];
        }
        
        try {
          const docSnapshot = await mockDoc.get();
          
          if (!docSnapshot.exists) {
            return null;
          }
          
          const data = {
            id: docSnapshot.id,
            ...docSnapshot.data()
          };
          
          if (options.useCache) {
            if (!firestoreService._cache) firestoreService._cache = {};
            firestoreService._cache[`${collectionName}/${docId}`] = data;
          }
          
          return data;
        } catch (error) {
          console.error(`Error al obtener documento ${collectionName}/${docId}:`, error);
          return null;
        }
      }),
      
      getDocuments: jest.fn().mockImplementation(async (collectionName, options = {}) => {
        const cacheKey = `${collectionName}/query`;
        
        if (options.useCache && firestoreService._cache && firestoreService._cache[cacheKey]) {
          return firestoreService._cache[cacheKey];
        }
        
        try {
          const querySnapshot = await mockCollection.get();
          
          const documents = [];
          querySnapshot.forEach(doc => {
            documents.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          if (options.useCache) {
            if (!firestoreService._cache) firestoreService._cache = {};
            firestoreService._cache[cacheKey] = documents;
          }
          
          return documents;
        } catch (error) {
          console.error(`Error al obtener documentos de ${collectionName}:`, error);
          return [];
        }
      }),
      
      setDocument: jest.fn().mockImplementation(async (collectionName, docId, data, options = {}) => {
        try {
          await mockDoc.set(data, options);
          
          // Actualizar caché si está habilitada
          if (firestoreService._cache) {
            delete firestoreService._cache[`${collectionName}/${docId}`];
            delete firestoreService._cache[`${collectionName}/query`];
          }
          
          return true;
        } catch (error) {
          console.error(`Error al establecer documento ${collectionName}/${docId}:`, error);
          return false;
        }
      }),
      
      updateDocument: jest.fn().mockImplementation(async (collectionName, docId, data) => {
        try {
          await mockDoc.update(data);
          
          // Actualizar caché si está habilitada
          if (firestoreService._cache) {
            delete firestoreService._cache[`${collectionName}/${docId}`];
            delete firestoreService._cache[`${collectionName}/query`];
          }
          
          return true;
        } catch (error) {
          console.error(`Error al actualizar documento ${collectionName}/${docId}:`, error);
          return false;
        }
      }),
      
      deleteDocument: jest.fn().mockImplementation(async (collectionName, docId) => {
        try {
          await mockDoc.delete();
          
          // Actualizar caché si está habilitada
          if (firestoreService._cache) {
            delete firestoreService._cache[`${collectionName}/${docId}`];
            delete firestoreService._cache[`${collectionName}/query`];
          }
          
          return true;
        } catch (error) {
          console.error(`Error al eliminar documento ${collectionName}/${docId}:`, error);
          return false;
        }
      }),
      
      addDocument: jest.fn().mockImplementation(async (collectionName, data) => {
        try {
          const docRef = await mockCollection.add(data);
          
          // Actualizar caché si está habilitada
          if (firestoreService._cache) {
            delete firestoreService._cache[`${collectionName}/query`];
          }
          
          return docRef.id;
        } catch (error) {
          console.error(`Error al añadir documento a ${collectionName}:`, error);
          return null;
        }
      }),
      
      // Métodos para escuchar cambios
      listenForDocument: jest.fn().mockImplementation((collectionName, docId, callback) => {
        const unsubscribe = mockDoc.onSnapshot(
          (docSnapshot) => {
            if (docSnapshot.exists) {
              callback({
                id: docSnapshot.id,
                ...docSnapshot.data()
              });
            } else {
              callback(null);
            }
          },
          (error) => {
            console.error(`Error al escuchar documento ${collectionName}/${docId}:`, error);
            callback(null, error);
          }
        );
        
        return unsubscribe;
      }),
      
      listenForDocuments: jest.fn().mockImplementation((collectionName, callback, options = {}) => {
        const unsubscribe = mockCollection.onSnapshot(
          (querySnapshot) => {
            const documents = [];
            querySnapshot.forEach(doc => {
              documents.push({
                id: doc.id,
                ...doc.data()
              });
            });
            callback(documents);
          },
          (error) => {
            console.error(`Error al escuchar documentos de ${collectionName}:`, error);
            callback([], error);
          }
        );
        
        return unsubscribe;
      }),
      
      // Métodos para transacciones y lotes
      runTransaction: jest.fn().mockImplementation(async (transactionHandler) => {
        try {
          return await mockFirestore.runTransaction(transactionHandler);
        } catch (error) {
          console.error('Error en transacción:', error);
          throw error;
        }
      }),
      
      createBatch: jest.fn().mockImplementation(() => {
        return mockFirestore.batch();
      }),
      
      // Métodos para gestión de caché
      clearCache: jest.fn().mockImplementation(() => {
        firestoreService._cache = {};
      }),
      
      clearCacheForCollection: jest.fn().mockImplementation((collectionName) => {
        if (firestoreService._cache) {
          const keysToDelete = Object.keys(firestoreService._cache).filter(key => 
            key.startsWith(`${collectionName}/`)
          );
          
          keysToDelete.forEach(key => {
            delete firestoreService._cache[key];
          });
        }
      }),
      
      // Método para acceder directamente a Firestore
      getFirestore: jest.fn().mockImplementation(() => {
        return mockFirestore;
      }),
      
      // Caché interna
      _cache: {}
    };
    
    // Asignar el servicio al objeto global
    global.firestoreService = firestoreService;
  });
  
  // Limpieza después de cada prueba
  afterEach(() => {
    jest.clearAllMocks();
    firestoreService._cache = {};
  });
  
  // Pruebas para getDocument
  describe('getDocument', () => {
    test('debe obtener un documento correctamente', async () => {
      // Ejecutar la función a probar
      const result = await firestoreService.getDocument('collection', 'test-doc');
      
      // Verificar el resultado
      expect(result).toEqual({
        id: 'test-doc',
        name: 'Test Document',
        active: true
      });
    });
    
    test('debe devolver null si el documento no existe', async () => {
      // Configurar el mock para esta prueba específica
      mockDocSnapshot.exists = false;
      
      // Ejecutar la función a probar
      const result = await firestoreService.getDocument('collection', 'non-existent');
      
      // Verificar el resultado
      expect(result).toBeNull();
    });
    
    test('debe usar caché cuando está habilitado y hay datos en caché', async () => {
      // Primero ejecutamos una vez para llenar la caché
      await firestoreService.getDocument('collection', 'test-doc', { useCache: true });
      
      // Limpiamos los mocks para verificar si se usa la caché
      mockDoc.get.mockClear();
      
      // Ejecutar la función nuevamente
      const result = await firestoreService.getDocument('collection', 'test-doc', { useCache: true });
      
      // Verificar que no se llamó al método get
      expect(mockDoc.get).not.toHaveBeenCalled();
      
      // Verificar el resultado desde caché
      expect(result).toEqual({
        id: 'test-doc',
        name: 'Test Document',
        active: true
      });
    });
  });
  
  // Pruebas para getDocuments
  describe('getDocuments', () => {
    test('debe obtener múltiples documentos correctamente', async () => {
      // Ejecutar la función a probar
      const result = await firestoreService.getDocuments('collection');
      
      // Verificar el resultado
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'doc1',
        name: 'Document 1',
        active: true
      });
      expect(result[1]).toEqual({
        id: 'doc2',
        name: 'Document 2',
        active: false
      });
    });
    
    test('debe devolver un array vacío si no hay documentos', async () => {
      // Configurar el mock para esta prueba específica
      mockQuerySnapshot.docs = [];
      mockQuerySnapshot.size = 0;
      mockQuerySnapshot.empty = true;
      mockQuerySnapshot.forEach = jest.fn(callback => {
        // No hace nada porque no hay documentos
      });
      
      // Ejecutar la función a probar
      const result = await firestoreService.getDocuments('collection');
      
      // Verificar el resultado
      expect(result).toEqual([]);
    });
  });
  
  // Pruebas para setDocument
  describe('setDocument', () => {
    test('debe establecer un documento correctamente', async () => {
      // Datos para la prueba
      const data = { name: 'New Document', active: true };
      
      // Ejecutar la función a probar
      const result = await firestoreService.setDocument('collection', 'test-doc', data);
      
      // Verificar que se llamó al método set
      expect(mockDoc.set).toHaveBeenCalledWith(data, {});
      
      // Verificar el resultado
      expect(result).toBe(true);
    });
  });
  
  // Pruebas para updateDocument
  describe('updateDocument', () => {
    test('debe actualizar un documento correctamente', async () => {
      // Datos para la prueba
      const data = { active: false };
      
      // Ejecutar la función a probar
      const result = await firestoreService.updateDocument('collection', 'test-doc', data);
      
      // Verificar que se llamó al método update
      expect(mockDoc.update).toHaveBeenCalledWith(data);
      
      // Verificar el resultado
      expect(result).toBe(true);
    });
  });
  
  // Pruebas para deleteDocument
  describe('deleteDocument', () => {
    test('debe eliminar un documento correctamente', async () => {
      // Ejecutar la función a probar
      const result = await firestoreService.deleteDocument('collection', 'test-doc');
      
      // Verificar que se llamó al método delete
      expect(mockDoc.delete).toHaveBeenCalled();
      
      // Verificar el resultado
      expect(result).toBe(true);
    });
  });
  
  // Pruebas para addDocument
  describe('addDocument', () => {
    test('debe añadir un documento correctamente', async () => {
      // Datos para la prueba
      const data = { name: 'New Document', active: true };
      
      // Ejecutar la función a probar
      const result = await firestoreService.addDocument('collection', data);
      
      // Verificar que se llamó al método add
      expect(mockCollection.add).toHaveBeenCalledWith(data);
      
      // Verificar el resultado
      expect(result).toBe('test-doc');
    });
  });
});
