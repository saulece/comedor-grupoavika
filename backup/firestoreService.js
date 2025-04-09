/**
 * FirestoreService - Servicio para gestionar operaciones de Firestore
 * 
 * Este servicio proporciona una interfaz centralizada para acceder a Firestore
 * sin depender de variables globales como window.db.
 */

// Módulo de servicio Firestore usando patrón Singleton
const FirestoreService = (function() {
    // Instancia privada del servicio
    let instance;
    
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
         * @returns {Promise<Object>} Datos del documento
         */
        async function getDocument(collectionName, docId) {
            try {
                const docRef = db.collection(collectionName).doc(docId);
                const doc = await docRef.get();
                
                if (doc.exists) {
                    return {
                        id: doc.id,
                        ...doc.data()
                    };
                } else {
                    return null;
                }
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
         * @returns {Promise<Array>} Array de documentos
         */
        async function getDocuments(queryOptions) {
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
                
                // Ejecutar consulta
                const snapshot = await query.get();
                
                // Procesar resultados
                const results = [];
                snapshot.forEach(doc => {
                    results.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                
                return results;
            } catch (error) {
                console.error(`Error al obtener documentos de ${queryOptions.collection}:`, error);
                throw error;
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
            
            return {
                set: (collectionName, docId, data, merge = true) => {
                    const docRef = db.collection(collectionName).doc(docId);
                    batch.set(docRef, data, { merge });
                    return this;
                },
                update: (collectionName, docId, data) => {
                    const docRef = db.collection(collectionName).doc(docId);
                    batch.update(docRef, data);
                    return this;
                },
                delete: (collectionName, docId) => {
                    const docRef = db.collection(collectionName).doc(docId);
                    batch.delete(docRef);
                    return this;
                },
                commit: () => batch.commit()
            };
        }
        
        /**
         * Crea una transacción para operaciones atómicas
         * @param {Function} transactionFn - Función que recibe el objeto transaction
         * @returns {Promise<any>} Resultado de la transacción
         */
        async function runTransaction(transactionFn) {
            try {
                return await db.runTransaction(async (transaction) => {
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
                        },
                        update: (collectionName, docId, data) => {
                            const docRef = db.collection(collectionName).doc(docId);
                            transaction.update(docRef, data);
                        },
                        delete: (collectionName, docId) => {
                            const docRef = db.collection(collectionName).doc(docId);
                            transaction.delete(docRef);
                        }
                    };
                    
                    // Ejecutar función de transacción
                    return await transactionFn(transactionHelper);
                });
            } catch (error) {
                console.error('Error en transacción de Firestore:', error);
                throw error;
            }
        }
        
        // API pública
        return {
            getCollection,
            getDocument,
            getDocuments,
            setDocument,
            updateDocument,
            deleteDocument,
            addDocument,
            createBatch,
            runTransaction,
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
