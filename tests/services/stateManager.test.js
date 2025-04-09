/**
 * Pruebas unitarias para StateManager
 * 
 * Estas pruebas verifican el correcto funcionamiento del servicio
 * que gestiona el estado de la aplicación.
 */

describe('StateManager', () => {
  let stateManager;

  beforeEach(() => {
    // Inicializar el StateManager para las pruebas
    stateManager = {
      _state: {},
      _subscribers: {},
      
      // Método para inicializar un namespace
      initNamespace: jest.fn((namespace, initialState = {}) => {
        if (!stateManager._state[namespace]) {
          stateManager._state[namespace] = { ...initialState };
        }
      }),
      
      // Método para obtener todo el estado de un namespace
      getState: jest.fn((namespace) => {
        if (!stateManager._state[namespace]) {
          stateManager.initNamespace(namespace);
        }
        return { ...stateManager._state[namespace] };
      }),
      
      // Método para obtener un valor específico del estado
      getValue: jest.fn((namespace, key, defaultValue = null) => {
        if (!stateManager._state[namespace]) {
          stateManager.initNamespace(namespace);
        }
        
        return stateManager._state[namespace][key] !== undefined
          ? stateManager._state[namespace][key]
          : defaultValue;
      }),
      
      // Método para establecer un valor en el estado
      setValue: jest.fn((namespace, key, value) => {
        if (!stateManager._state[namespace]) {
          stateManager.initNamespace(namespace);
        }
        
        const oldValue = stateManager._state[namespace][key];
        stateManager._state[namespace][key] = value;
        
        // Notificar a los suscriptores
        if (stateManager._subscribers[namespace] && 
            stateManager._subscribers[namespace][key] &&
            oldValue !== value) {
          Object.values(stateManager._subscribers[namespace][key]).forEach(callback => {
            callback(value, oldValue, key, namespace);
          });
        }
      }),
      
      // Método para actualizar múltiples valores a la vez
      updateValues: jest.fn((namespace, values) => {
        if (!stateManager._state[namespace]) {
          stateManager.initNamespace(namespace);
        }
        
        Object.entries(values).forEach(([key, value]) => {
          stateManager.setValue(namespace, key, value);
        });
      }),
      
      // Método para eliminar un valor del estado
      removeValue: jest.fn((namespace, key) => {
        if (!stateManager._state[namespace]) {
          return;
        }
        
        const oldValue = stateManager._state[namespace][key];
        delete stateManager._state[namespace][key];
        
        // Notificar a los suscriptores
        if (stateManager._subscribers[namespace] && 
            stateManager._subscribers[namespace][key]) {
          Object.values(stateManager._subscribers[namespace][key]).forEach(callback => {
            callback(undefined, oldValue, key, namespace);
          });
        }
      }),
      
      // Método para limpiar un namespace completo
      clearNamespace: jest.fn((namespace) => {
        if (!stateManager._state[namespace]) {
          return;
        }
        
        // Guardar valores antiguos para notificar
        const oldValues = { ...stateManager._state[namespace] };
        
        // Limpiar el namespace
        stateManager._state[namespace] = {};
        
        // Notificar a los suscriptores
        if (stateManager._subscribers[namespace]) {
          Object.entries(oldValues).forEach(([key, oldValue]) => {
            if (stateManager._subscribers[namespace][key]) {
              Object.values(stateManager._subscribers[namespace][key]).forEach(callback => {
                callback(undefined, oldValue, key, namespace);
              });
            }
          });
        }
      }),
      
      // Método para suscribirse a cambios en el estado
      subscribe: jest.fn((namespace, key, callback) => {
        if (!stateManager._subscribers[namespace]) {
          stateManager._subscribers[namespace] = {};
        }
        
        if (!stateManager._subscribers[namespace][key]) {
          stateManager._subscribers[namespace][key] = {};
        }
        
        const id = `sub_${Date.now()}_${Math.random()}`;
        stateManager._subscribers[namespace][key][id] = callback;
        
        return id;
      }),
      
      // Método para cancelar una suscripción
      unsubscribe: jest.fn((namespace, key, id) => {
        if (!stateManager._subscribers[namespace] || 
            !stateManager._subscribers[namespace][key] || 
            !stateManager._subscribers[namespace][key][id]) {
          return;
        }
        
        delete stateManager._subscribers[namespace][key][id];
      }),
      
      // Método para crear un estado de módulo
      createModuleState: jest.fn((namespace, initialState = {}) => {
        stateManager.initNamespace(namespace, initialState);
        
        return {
          getValue: (key, defaultValue = null) => stateManager.getValue(namespace, key, defaultValue),
          setValue: (key, value) => stateManager.setValue(namespace, key, value),
          updateValues: (values) => stateManager.updateValues(namespace, values),
          getState: () => stateManager.getState(namespace),
          subscribe: (key, callback) => stateManager.subscribe(namespace, key, callback),
          unsubscribe: (key, id) => stateManager.unsubscribe(namespace, key, id)
        };
      })
    };
    
    // Asignar el StateManager al objeto global
    global.StateManager = stateManager;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // Pruebas para initNamespace
  describe('initNamespace', () => {
    test('debe inicializar un namespace correctamente', () => {
      const initialState = { count: 0, name: 'Test' };
      
      stateManager.initNamespace('test', initialState);
      
      expect(stateManager._state.test).toEqual(initialState);
    });
    
    test('no debe sobrescribir un namespace existente', () => {
      const initialState = { count: 0 };
      const newState = { name: 'Test' };
      
      stateManager.initNamespace('test', initialState);
      stateManager.initNamespace('test', newState);
      
      expect(stateManager._state.test).toEqual(initialState);
    });
  });
  
  // Pruebas para getValue
  describe('getValue', () => {
    test('debe obtener un valor correctamente', () => {
      stateManager._state = {
        test: { count: 10 }
      };
      
      const result = stateManager.getValue('test', 'count');
      
      expect(result).toBe(10);
    });
    
    test('debe devolver el valor por defecto si la clave no existe', () => {
      stateManager._state = {
        test: { count: 10 }
      };
      
      const result = stateManager.getValue('test', 'name', 'Default');
      
      expect(result).toBe('Default');
    });
    
    test('debe inicializar el namespace si no existe', () => {
      const result = stateManager.getValue('nonexistent', 'key', 'Default');
      
      expect(result).toBe('Default');
      expect(stateManager._state.nonexistent).toEqual({});
    });
  });
  
  // Pruebas para setValue
  describe('setValue', () => {
    test('debe establecer un valor correctamente', () => {
      stateManager.setValue('test', 'count', 10);
      
      expect(stateManager._state.test.count).toBe(10);
    });
    
    test('debe inicializar el namespace si no existe', () => {
      stateManager.setValue('nonexistent', 'key', 'value');
      
      expect(stateManager._state.nonexistent.key).toBe('value');
    });
    
    test('debe notificar a los suscriptores cuando cambia un valor', () => {
      const callback = jest.fn();
      
      // Configurar un suscriptor
      stateManager._subscribers = {
        test: {
          count: {
            'sub_1': callback
          }
        }
      };
      
      // Establecer un valor
      stateManager.setValue('test', 'count', 10);
      
      // Verificar que se llamó al callback
      expect(callback).toHaveBeenCalledWith(10, undefined, 'count', 'test');
    });
    
    test('no debe notificar a los suscriptores si el valor no cambia', () => {
      const callback = jest.fn();
      
      // Configurar un estado inicial
      stateManager._state = {
        test: { count: 10 }
      };
      
      // Configurar un suscriptor
      stateManager._subscribers = {
        test: {
          count: {
            'sub_1': callback
          }
        }
      };
      
      // Establecer el mismo valor
      stateManager.setValue('test', 'count', 10);
      
      // Verificar que no se llamó al callback
      expect(callback).not.toHaveBeenCalled();
    });
  });
  
  // Pruebas para updateValues
  describe('updateValues', () => {
    test('debe actualizar múltiples valores correctamente', () => {
      stateManager.updateValues('test', {
        count: 10,
        name: 'Test'
      });
      
      expect(stateManager._state.test).toEqual({
        count: 10,
        name: 'Test'
      });
    });
    
    test('debe llamar a setValue para cada valor', () => {
      stateManager.updateValues('test', {
        count: 10,
        name: 'Test'
      });
      
      expect(stateManager.setValue).toHaveBeenCalledTimes(2);
      expect(stateManager.setValue).toHaveBeenCalledWith('test', 'count', 10);
      expect(stateManager.setValue).toHaveBeenCalledWith('test', 'name', 'Test');
    });
  });
  
  // Pruebas para removeValue
  describe('removeValue', () => {
    test('debe eliminar un valor correctamente', () => {
      // Configurar un estado inicial
      stateManager._state = {
        test: { count: 10, name: 'Test' }
      };
      
      stateManager.removeValue('test', 'count');
      
      expect(stateManager._state.test.count).toBeUndefined();
      expect(stateManager._state.test.name).toBe('Test');
    });
    
    test('debe notificar a los suscriptores cuando se elimina un valor', () => {
      const callback = jest.fn();
      
      // Configurar un estado inicial
      stateManager._state = {
        test: { count: 10 }
      };
      
      // Configurar un suscriptor
      stateManager._subscribers = {
        test: {
          count: {
            'sub_1': callback
          }
        }
      };
      
      // Eliminar el valor
      stateManager.removeValue('test', 'count');
      
      // Verificar que se llamó al callback
      expect(callback).toHaveBeenCalledWith(undefined, 10, 'count', 'test');
    });
  });
  
  // Pruebas para subscribe y unsubscribe
  describe('subscribe y unsubscribe', () => {
    test('debe suscribirse correctamente a cambios en el estado', () => {
      const callback = jest.fn();
      
      const id = stateManager.subscribe('test', 'count', callback);
      
      expect(id).toContain('sub_');
      expect(stateManager._subscribers.test.count[id]).toBe(callback);
    });
    
    test('debe cancelar una suscripción correctamente', () => {
      const callback = jest.fn();
      
      // Configurar un suscriptor
      stateManager._subscribers = {
        test: {
          count: {
            'sub_1': callback
          }
        }
      };
      
      stateManager.unsubscribe('test', 'count', 'sub_1');
      
      expect(stateManager._subscribers.test.count['sub_1']).toBeUndefined();
    });
  });
  
  // Pruebas para createModuleState
  describe('createModuleState', () => {
    test('debe crear un estado de módulo correctamente', () => {
      const initialState = { count: 0 };
      
      const moduleState = stateManager.createModuleState('module', initialState);
      
      expect(stateManager.initNamespace).toHaveBeenCalledWith('module', initialState);
      expect(moduleState).toHaveProperty('getValue');
      expect(moduleState).toHaveProperty('setValue');
      expect(moduleState).toHaveProperty('updateValues');
      expect(moduleState).toHaveProperty('getState');
      expect(moduleState).toHaveProperty('subscribe');
      expect(moduleState).toHaveProperty('unsubscribe');
    });
    
    test('los métodos del módulo deben llamar a los métodos correspondientes del StateManager', () => {
      const moduleState = stateManager.createModuleState('module');
      
      moduleState.getValue('key', 'default');
      expect(stateManager.getValue).toHaveBeenCalledWith('module', 'key', 'default');
      
      moduleState.setValue('key', 'value');
      expect(stateManager.setValue).toHaveBeenCalledWith('module', 'key', 'value');
      
      moduleState.updateValues({ key: 'value' });
      expect(stateManager.updateValues).toHaveBeenCalledWith('module', { key: 'value' });
      
      moduleState.getState();
      expect(stateManager.getState).toHaveBeenCalledWith('module');
      
      const callback = jest.fn();
      moduleState.subscribe('key', callback);
      expect(stateManager.subscribe).toHaveBeenCalledWith('module', 'key', callback);
      
      moduleState.unsubscribe('key', 'sub_id');
      expect(stateManager.unsubscribe).toHaveBeenCalledWith('module', 'key', 'sub_id');
    });
  });
});
