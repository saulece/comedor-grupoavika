/**
 * Mock para Firebase y Firestore
 * 
 * Este archivo proporciona mocks para las funciones de Firebase y Firestore
 * que se utilizan en las pruebas unitarias.
 */

// Mock para Firebase Auth
const authMock = {
  currentUser: {
    uid: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User'
  },
  onAuthStateChanged: jest.fn(callback => {
    callback(authMock.currentUser);
    return jest.fn(); // Función de cancelación
  }),
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve({
    user: authMock.currentUser
  })),
  signOut: jest.fn(() => Promise.resolve())
};

// Mock para documentos de Firestore
class DocumentSnapshot {
  constructor(id, data, exists = true) {
    this.id = id;
    this._data = data;
    this._exists = exists;
  }
  
  data() {
    return this._data;
  }
  
  get exists() {
    return this._exists;
  }
}

// Mock para consultas de Firestore
class QuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }
  
  forEach(callback) {
    this.docs.forEach(callback);
  }
}

// Mock para DocumentReference
class DocumentReference {
  constructor(id, data, exists = true) {
    this.id = id;
    this._data = data || {};
    this._exists = exists;
  }
  
  get() {
    return Promise.resolve(new DocumentSnapshot(this.id, this._data, this._exists));
  }
  
  set(data, options = {}) {
    if (options.merge) {
      this._data = { ...this._data, ...data };
    } else {
      this._data = { ...data };
    }
    this._exists = true;
    return Promise.resolve();
  }
  
  update(data) {
    this._data = { ...this._data, ...data };
    return Promise.resolve();
  }
  
  delete() {
    this._exists = false;
    return Promise.resolve();
  }
  
  onSnapshot(onNext, onError) {
    // Simular una actualización inicial
    setTimeout(() => {
      onNext(new DocumentSnapshot(this.id, this._data, this._exists));
    }, 0);
    
    // Devolver función para cancelar la escucha
    return jest.fn();
  }
}

// Mock para CollectionReference
class CollectionReference {
  constructor(id) {
    this.id = id;
    this._docs = {};
  }
  
  doc(id) {
    if (!this._docs[id]) {
      this._docs[id] = new DocumentReference(id, {}, false);
    }
    return this._docs[id];
  }
  
  add(data) {
    const id = `auto-id-${Date.now()}`;
    const docRef = this.doc(id);
    docRef.set(data);
    return Promise.resolve(docRef);
  }
  
  where() {
    return this; // Para encadenar métodos
  }
  
  orderBy() {
    return this; // Para encadenar métodos
  }
  
  limit() {
    return this; // Para encadenar métodos
  }
  
  startAfter() {
    return this; // Para encadenar métodos
  }
  
  get() {
    const docs = Object.values(this._docs)
      .filter(doc => doc._exists)
      .map(doc => new DocumentSnapshot(doc.id, doc._data, true));
    
    return Promise.resolve(new QuerySnapshot(docs));
  }
  
  onSnapshot(onNext, onError) {
    // Simular una actualización inicial
    setTimeout(() => {
      const docs = Object.values(this._docs)
        .filter(doc => doc._exists)
        .map(doc => new DocumentSnapshot(doc.id, doc._data, true));
      
      onNext(new QuerySnapshot(docs));
    }, 0);
    
    // Devolver función para cancelar la escucha
    return jest.fn();
  }
}

// Mock para Firestore
const firestoreMock = {
  collection: jest.fn(id => new CollectionReference(id)),
  doc: jest.fn((path) => {
    const parts = path.split('/');
    const collectionId = parts[0];
    const docId = parts[1];
    return new CollectionReference(collectionId).doc(docId);
  }),
  runTransaction: jest.fn(async (transactionFn) => {
    const transaction = {
      get: jest.fn(async (docRef) => {
        return await docRef.get();
      }),
      set: jest.fn((docRef, data, options) => {
        docRef.set(data, options);
      }),
      update: jest.fn((docRef, data) => {
        docRef.update(data);
      }),
      delete: jest.fn((docRef) => {
        docRef.delete();
      })
    };
    
    return await transactionFn(transaction);
  }),
  batch: jest.fn(() => {
    const operations = [];
    
    return {
      set: jest.fn((docRef, data, options) => {
        operations.push({ type: 'set', docRef, data, options });
        return this;
      }),
      update: jest.fn((docRef, data) => {
        operations.push({ type: 'update', docRef, data });
        return this;
      }),
      delete: jest.fn((docRef) => {
        operations.push({ type: 'delete', docRef });
        return this;
      }),
      commit: jest.fn(async () => {
        // Ejecutar todas las operaciones
        for (const op of operations) {
          if (op.type === 'set') {
            await op.docRef.set(op.data, op.options);
          } else if (op.type === 'update') {
            await op.docRef.update(op.data);
          } else if (op.type === 'delete') {
            await op.docRef.delete();
          }
        }
        
        return Promise.resolve();
      })
    };
  }),
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date().toISOString()),
    delete: jest.fn(() => null),
    arrayUnion: jest.fn((...elements) => elements),
    arrayRemove: jest.fn((...elements) => elements),
    increment: jest.fn(n => n)
  }
};

// Mock para Firebase
const firebaseMock = {
  initializeApp: jest.fn(),
  auth: jest.fn(() => authMock),
  firestore: jest.fn(() => firestoreMock)
};

// Exportar los mocks
module.exports = {
  firebase: firebaseMock,
  auth: authMock,
  firestore: firestoreMock,
  DocumentSnapshot,
  QuerySnapshot,
  DocumentReference,
  CollectionReference
};
