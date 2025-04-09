/**
 * FirestoreService - Servicio para gestionar operaciones de Firestore
 * 
 * Este servicio proporciona una interfaz centralizada para acceder a Firestore
 * sin depender de variables globales como window.db.
 * 
 * Optimizado con:
 * - Soporte para paginación
 * - Selección de campos específicos
 * - Sistema de caché local
 * - Escuchas en tiempo real
 * - Transacciones mejoradas
 */

// Módulo de servicio Firestore usando patrón Singleton
const FirestoreService = (function() {
    // Instancia privada del servicio
    let instance;
    
    /**
     * Sistema de caché para consultas frecuentes
     */
    const cacheManager = {
        cache: {},
        
        // Guardar en caché
        set: function(key, data, expirationMinutes = 5) {
            this.cache[key] = {
                data: data,
                expiration: Date.now() + (expirationMinutes * 60 * 1000)
            };
        },
        
        // Obtener de caché
        get: function(key) {
            const cached = this.cache[key];
            if (cached && cached.expiration > Date.now()) {
                return cached.data;
            }
            return null;
        },
        
        // Limpiar caché
        clear: function(key) {
            if (key) {
                delete this.cache[key];
            } else {
                this.cache = {};
            }
        }
    };
    
    /**
     * Inicializa el servicio de Firestore
     * @returns {Object} Instancia del servicio
     */
    function init() {
        // Verificar que Firebase esté inicializado
        if (!firebase || !firebase.firestore) {
            throw new Error('Firebase o Firestore no están disponibles. Asegúrese de incluir los scripts de Firebase.');
        }
        
        // Referencia a Firestore
        const db = firebase.firestore();
        
        /**
         * Obtiene una colección de Firestore
         * @param {string} collectionName - Nombre de la colección
         * @returns {Object} Referencia a la colección
         */
        function getCollection(collectionName) {
            return db.collection(collectionName);
        }
        
        /**
         * Obtiene un documento de una colección
         * @param {string} collectionName - Nombre de la colección
         * @param {string} docId - ID del documento
         * @param {Object} options - Opciones adicionales (useCache, cacheExpiration, select)
         * @returns {Promise<Object>} Datos del documento
         */
        async function getDocument(collectionName, docId, options = {}) {
            try {
                // Verificar caché si está habilitado
                if (options.useCache) {
                    const cacheKey = `doc_${collectionName}_${docId}_${JSON.stringify(options.select || [])}`;
                    const cachedData = cacheManager.get(cacheKey);
                    if (cachedData) {
                        return cachedData;
                    }
                }
                
                const docRef = db.collection(collectionName).doc(docId);
                let doc;
                
                // Seleccionar campos específicos si se especifican
                if (options.select && Array.isArray(options.select) && options.select.length > 0) {
                    doc = await docRef.select(...options.select).get();
                } else {
                    doc = await docRef.get();
                }
                
                let result = null;
                if (doc.exists) {
                    result = {
                        id: doc.id,
                        ...doc.data()
                    };
                    
                    // Guardar en caché si está habilitado
                    if (options.useCache) {
                        const cacheKey = `doc_${collectionName}_${docId}_${JSON.stringify(options.select || [])}`;
                        cacheManager.set(cacheKey, result, options.cacheExpiration || 5);
                    }
                }
                
                return result;
            } catch (error) {
                console.error(`Error al obtener documento ${docId} de ${collectionName}:`, error);
                throw error;
            }
        }
        
        /**
         * Obtiene documentos de una colección según una consulta
         * @param {Object} queryOptions - Opciones de consulta
         * @param {string} queryOptions.collection - Nombre de la colección
         * @param {Array} [queryOptions.where] - Condiciones where en formato [campo, operador, valor]
         * @param {string} [queryOptions.orderBy] - Campo para ordenar
         * @param {string} [queryOptions.orderDirection] - Dirección de ordenamiento ('asc' o 'desc')
         * @param {number} [queryOptions.limit] - Límite de resultados
         * @param {Object} [queryOptions.startAfter] - Documento para iniciar la paginación
         * @param {Array} [queryOptions.select] - Campos específicos a seleccionar
         * @param {boolean} [queryOptions.useCache] - Si se debe usar caché
         * @param {number} [queryOptions.cacheExpiration] - Tiempo de expiración de caché en minutos
         * @returns {Promise<Object>} Objeto con datos y último documento para paginación
         */
        async function getDocuments(queryOptions) {
            try {
                // Verificar caché si está habilitado
                if (queryOptions.useCache) {
                    const cacheKey = `query_${JSON.stringify(queryOptions)}`;
                    const cachedData = cacheManager.get(cacheKey);
                    if (cachedData) {
                        return cachedData;
                    }
                }
                
                let query = db.collection(queryOptions.collection);
                
                // Aplicar condiciones where
                if (queryOptions.where && Array.isArray(queryOptions.where)) {
                    if (Array.isArray(queryOptions.where[0])) {
                        // Múltiples condiciones where
                        queryOptions.where.forEach(condition => {
                            if (condition.length === 3) {
                                query = query.where(condition[0], condition[1], condition[2]);
                            }
                        });
                    } else if (queryOptions.where.length === 3) {
                        // Una sola condición where
                        query = query.where(queryOptions.where[0], queryOptions.where[1], queryOptions.where[2]);
                    }
                }
                
                // Aplicar ordenamiento
                if (queryOptions.orderBy) {
                    const direction = queryOptions.orderDirection === 'desc' ? 'desc' : 'asc';
                    query = query.orderBy(queryOptions.orderBy, direction);
                }
                
                // Aplicar paginación
                if (queryOptions.startAfter) {
                    query = query.startAfter(queryOptions.startAfter);
                }
                
                // Aplicar límite
                if (queryOptions.limit && !isNaN(queryOptions.limit)) {
                    query = query.limit(parseInt(queryOptions.limit));
                }
                
                // Seleccionar campos específicos
                if (queryOptions.select && Array.isArray(queryOptions.select) && queryOptions.select.length > 0) {
                    query = query.select(...queryOptions.select);
                }
                
                // Ejecutar consulta
                const snapshot = await query.get();
                
                // Obtener último documento para paginación
                const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
                
                // Procesar resultados
                const results = [];
                snapshot.forEach(doc => {
                    results.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                const resultObject = {
                    data: results,
                    lastDoc: lastDoc,
                    count: results.length,
                    hasMore: results.length === (queryOptions.limit ? parseInt(queryOptions.limit) : 0)
                };
                
                // Guardar en caché si está habilitado
                if (queryOptions.useCache) {
                    const cacheKey = `query_${JSON.stringify(queryOptions)}`;
                    cacheManager.set(cacheKey, resultObject, queryOptions.cacheExpiration || 5);
                }
                
                return resultObject;
            } catch (error) {
                console.error(`Error al obtener documentos de ${queryOptions.collection}:`, error);
                throw error;
            }
        }
        
        /**
         * Configura una escucha en tiempo real para documentos
         * @param {Object} queryOptions - Opciones de consulta (igual que getDocuments)
         * @param {Function} callback - Función a ejecutar cuando hay cambios (error, data)
         * @returns {Function} Función para cancelar la escucha
         */
        function listenForDocuments(queryOptions, callback) {
            try {
                let query = db.collection(queryOptions.collection);
                
                // Aplicar condiciones where
                if (queryOptions.where && Array.isArray(queryOptions.where)) {
                    if (Array.isArray(queryOptions.where[0])) {
                        // Múltiples condiciones where
                        queryOptions.where.forEach(condition => {
                            if (condition.length === 3) {
                                query = query.where(condition[0], condition[1], condition[2]);
                            }
                        });
                    } else if (queryOptions.where.length === 3) {
                        // Una sola condición where
                        query = query.where(queryOptions.where[0], queryOptions.where[1], queryOptions.where[2]);
                    }
                }
                
                // Aplicar ordenamiento
                if (queryOptions.orderBy) {
                    const direction = queryOptions.orderDirection === 'desc' ? 'desc' : 'asc';
                    query = query.orderBy(queryOptions.orderBy, direction);
                }
                
                // Aplicar límite
                if (queryOptions.limit && !isNaN(queryOptions.limit)) {
                    query = query.limit(parseInt(queryOptions.limit));
                }
                
                // Seleccionar campos específicos
                if (queryOptions.select && Array.isArray(queryOptions.select) && queryOptions.select.length > 0) {
                    query = query.select(...queryOptions.select);
                }
                
                // Configurar escucha
                return query.onSnapshot(snapshot => {
                    const results = [];
                    snapshot.forEach(doc => {
                        results.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    
                    // Llamar al callback con los resultados
                    callback(null, {
                        data: results,
                        count: results.length
                    });
                }, error => {
                    console.error(`Error en escucha de ${queryOptions.collection}:`, error);
                    callback(error, null);
                });
            } catch (error) {
                console.error(`Error al configurar escucha para ${queryOptions.collection}:`, error);
                callback(error, null);
                return () => {}; // Devolver función vacía en caso de error
            }
        }
        
        /**
         * Escucha cambios en un documento específico
         * @param {string} collectionName - Nombre de la colección
         * @param {string} docId - ID del documento
         * @param {Function} callback - Función a ejecutar cuando hay cambios
         * @returns {Function} Función para cancelar la escucha
         */
        function listenForDocument(collectionName, docId, callback) {
            try {
                const docRef = db.collection(collectionName).doc(docId);
                
                return docRef.onSnapshot(doc => {
                    if (doc.exists) {
                        callback(null, {
                            id: doc.id,
                            ...doc.data()
                        });
                    } else {
                        callback(null, null);
                    }
                }, error => {
                    console.error(`Error en escucha de documento ${docId} en ${collectionName}:`, error);
                    callback(error, null);
                });
            } catch (error) {
                console.error(`Error al configurar escucha para documento ${docId} en ${collectionName}:`, error);
                callback(error, null);
                return () => {}; // Devolver función vacía en caso de error
            }
        }
        
        /**
         * Crea o actualiza un documento
         * @param {string} collectionName - Nombre de la colección
         * @param {string} docId - ID del documento
         * @param {Object} data - Datos a guardar
         * @param {boolean} [merge=true] - Si se deben combinar los datos existentes
         * @returns {Promise<string>} ID del documento
         */
        async function setDocument(collectionName, docId, data, merge = true) {
            try {
                const docRef = db.collection(collectionName).doc(docId);
                await docRef.set(data, { merge });
                
                // Limpiar caché relacionada
                clearCacheForCollection(collectionName);
                
                return docId;
            } catch (error) {
                console.error(`Error al guardar documento ${docId} en ${collectionName}:`, error);
                throw error;
            }
        }
        
        /**
         * Actualiza campos específicos de un documento
         * @param {string} collectionName - Nombre de la colección
         * @param {string} docId - ID del documento
         * @param {Object} data - Campos a actualizar
         * @returns {Promise<string>} ID del documento
         */
        async function updateDocument(collectionName, docId, data) {
            try {
                const docRef = db.collection(collectionName).doc(docId);
                await docRef.update(data);
                
                // Limpiar caché relacionada
                clearCacheForCollection(collectionName);
                
                return docId;
            } catch (error) {
                console.error(`Error al actualizar documento ${docId} en ${collectionName}:`, error);
                throw error;
            }
        }
        
        /**
         * Elimina un documento
         * @param {string} collectionName - Nombre de la colección
         * @param {string} docId - ID del documento
         * @returns {Promise<void>}
         */
        async function deleteDocument(collectionName, docId) {
            try {
                const docRef = db.collection(collectionName).doc(docId);
                await docRef.delete();
                
                // Limpiar caché relacionada
                clearCacheForCollection(collectionName);
            } catch (error) {
                console.error(`Error al eliminar documento ${docId} de ${collectionName}:`, error);
                throw error;
            }
        }
        
        /**
         * Crea un nuevo documento con ID generado automáticamente
         * @param {string} collectionName - Nombre de la colección
         * @param {Object} data - Datos a guardar
         * @returns {Promise<string>} ID del nuevo documento
         */
        async function addDocument(collectionName, data) {
            try {
                const docRef = await db.collection(collectionName).add(data);
                
                // Limpiar caché relacionada
                clearCacheForCollection(collectionName);
                
                return docRef.id;
            } catch (error) {
                console.error(`Error al añadir documento a ${collectionName}:`, error);
                throw error;
            }
        }
        
        /**
         * Crea un batch para operaciones múltiples
         * @returns {Object} Objeto batch con métodos para operaciones
         */
        function createBatch() {
            const batch = db.batch();
            const affectedCollections = new Set();
            
            return {
                set: (collectionName, docId, data, merge = true) => {
                    const docRef = db.collection(collectionName).doc(docId);
                    batch.set(docRef, data, { merge });
                    affectedCollections.add(collectionName);
                    return this;
                },
                update: (collectionName, docId, data) => {
                    const docRef = db.collection(collectionName).doc(docId);
                    batch.update(docRef, data);
                    affectedCollections.add(collectionName);
                    return this;
                },
                delete: (collectionName, docId) => {
                    const docRef = db.collection(collectionName).doc(docId);
                    batch.delete(docRef);
                    affectedCollections.add(collectionName);
                    return this;
                },
                commit: async () => {
                    await batch.commit();
                    
                    // Limpiar caché para todas las colecciones afectadas
                    affectedCollections.forEach(collection => {
                        clearCacheForCollection(collection);
                    });
                }
            };
        }
        
        /**
         * Crea una transacción para operaciones atómicas
         * @param {Function} transactionFn - Función que recibe el objeto transaction
         * @returns {Promise<any>} Resultado de la transacción
         */
        async function runTransaction(transactionFn) {
            try {
                const affectedCollections = new Set();
                
                const result = await db.runTransaction(async (transaction) => {
                    // Crear métodos de ayuda para la transacción
                    const transactionHelper = {
                        get: async (collectionName, docId) => {
                            const docRef = db.collection(collectionName).doc(docId);
                            const doc = await transaction.get(docRef);
                            if (doc.exists) {
                                return {
                                    id: doc.id,
                                    ...doc.data()
                                };
                            }
                            return null;
                        },
                        set: (collectionName, docId, data, merge = true) => {
                            const docRef = db.collection(collectionName).doc(docId);
                            transaction.set(docRef, data, { merge });
                            affectedCollections.add(collectionName);
                        },
                        update: (collectionName, docId, data) => {
                            const docRef = db.collection(collectionName).doc(docId);
                            transaction.update(docRef, data);
                            affectedCollections.add(collectionName);
                        },
                        delete: (collectionName, docId) => {
                            const docRef = db.collection(collectionName).doc(docId);
                            transaction.delete(docRef);
                            affectedCollections.add(collectionName);
                        }
                    };
                    
                    // Ejecutar función de transacción
                    return await transactionFn(transactionHelper);
                });
                
                // Limpiar caché para todas las colecciones afectadas
                affectedCollections.forEach(collection => {
                    clearCacheForCollection(collection);
                });
                
                return result;
            } catch (error) {
                console.error('Error en transacción de Firestore:', error);
                throw error;
            }
        }
        
        /**
         * Limpia la caché relacionada con una colección
         * @param {string} collectionName - Nombre de la colección
         */
        function clearCacheForCollection(collectionName) {
            // Obtener todas las claves de caché
            const keys = Object.keys(cacheManager.cache);
            
            // Filtrar y limpiar las claves relacionadas con la colección
            keys.forEach(key => {
                if (key.includes(`_${collectionName}_`) || key.includes(`query_{"collection":"${collectionName}`)) {
                    cacheManager.clear(key);
                }
            });
        }
        
        /**
         * Limpia toda la caché
         */
        function clearCache() {
            cacheManager.clear();
        }
        
        // API pública
        return {
            getCollection,
            getDocument,
            getDocuments,
            listenForDocuments,
            listenForDocument,
            setDocument,
            updateDocument,
            deleteDocument,
            addDocument,
            createBatch,
            runTransaction,
            clearCache,
            clearCacheForCollection,
            // Exponer la instancia de Firestore para casos especiales
            getFirestore: () => db
        };
    }
    
    // Devolver un objeto con método getInstance
    return {
        getInstance: function() {
            if (!instance) {
                instance = init();
            }
            return instance;
        }
    };
})();

// Exponer el servicio globalmente
window.firestoreService = FirestoreService.getInstance();
