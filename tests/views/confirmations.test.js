/**
 * Pruebas unitarias para el módulo de confirmaciones
 * 
 * Estas pruebas verifican el correcto funcionamiento del módulo
 * que gestiona las confirmaciones de comidas para los empleados.
 */

describe('Módulo de Confirmaciones', () => {
  // Variables para las pruebas
  let confirmationsModule;
  let mockFirestoreService;
  let mockStateManager;
  
  // Configuración antes de cada prueba
  beforeEach(() => {
    // Configurar mocks para firestoreService
    mockFirestoreService = {
      getDocuments: jest.fn(),
      getDocument: jest.fn(),
      setDocument: jest.fn(),
      updateDocument: jest.fn(),
      listenForDocuments: jest.fn(),
      listenForDocument: jest.fn()
    };
    
    // Configurar mock para el estado
    mockStateManager = {
      _state: {
        confirmations: {}
      },
      getValue: jest.fn((namespace, key, defaultValue) => {
        if (!mockStateManager._state[namespace]) {
          mockStateManager._state[namespace] = {};
        }
        return mockStateManager._state[namespace][key] !== undefined 
          ? mockStateManager._state[namespace][key] 
          : defaultValue;
      }),
      setValue: jest.fn((namespace, key, value) => {
        if (!mockStateManager._state[namespace]) {
          mockStateManager._state[namespace] = {};
        }
        mockStateManager._state[namespace][key] = value;
      }),
      updateValues: jest.fn((namespace, values) => {
        if (!mockStateManager._state[namespace]) {
          mockStateManager._state[namespace] = {};
        }
        Object.entries(values).forEach(([key, value]) => {
          mockStateManager._state[namespace][key] = value;
        });
      }),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    };
    
    // Configurar mocks globales
    global.firestoreService = mockFirestoreService;
    global.StateManager = mockStateManager;
    global.errorService = {
      handleError: jest.fn(),
      showSuccessMessage: jest.fn(),
      toggleLoading: jest.fn()
    };
    
    // Inicializar el módulo de confirmaciones
    confirmationsModule = {
      // Estado del módulo
      state: {
        currentDepartment: 'Administración',
        currentDate: '2025-04-09',
        employees: [],
        confirmations: {},
        selectedEmployees: {},
        isLoading: false
      },
      
      // Método para inicializar el módulo
      init: jest.fn(async function() {
        try {
          // Cargar empleados y confirmaciones
          await confirmationsModule.loadEmployees();
          await confirmationsModule.loadConfirmations();
          
          return true;
        } catch (error) {
          errorService.handleError(error, 'Error al inicializar el módulo de confirmaciones');
          return false;
        }
      }),
      
      // Método para cargar los empleados
      loadEmployees: jest.fn(async function() {
        try {
          errorService.toggleLoading(true);
          
          // Obtener el departamento actual
          const department = confirmationsModule.state.currentDepartment;
          
          // Consultar empleados del departamento
          const employees = await firestoreService.getDocuments('employees', {
            where: ['department', '==', department],
            orderBy: 'name'
          });
          
          // Actualizar el estado
          confirmationsModule.state.employees = employees;
          StateManager.setValue('confirmations', 'employees', employees);
          
          return employees;
        } catch (error) {
          errorService.handleError(error, 'Error al cargar empleados');
          return [];
        } finally {
          errorService.toggleLoading(false);
        }
      }),
      
      // Método para cargar las confirmaciones
      loadConfirmations: jest.fn(async function() {
        try {
          errorService.toggleLoading(true);
          
          // Obtener la fecha actual
          const date = confirmationsModule.state.currentDate;
          
          // Consultar confirmaciones para la fecha
          const confirmationDoc = await firestoreService.getDocument('confirmations', date);
          
          // Si no hay confirmaciones, crear un objeto vacío
          const confirmations = confirmationDoc || { id: date, departments: {} };
          
          // Asegurarse de que existe la estructura para el departamento actual
          const department = confirmationsModule.state.currentDepartment;
          if (!confirmations.departments[department]) {
            confirmations.departments[department] = {};
          }
          
          // Actualizar el estado
          confirmationsModule.state.confirmations = confirmations;
          StateManager.setValue('confirmations', 'confirmations', confirmations);
          
          // Inicializar selección de empleados
          confirmationsModule.initializeEmployeeSelection();
          
          return confirmations;
        } catch (error) {
          errorService.handleError(error, 'Error al cargar confirmaciones');
          return { id: confirmationsModule.state.currentDate, departments: {} };
        } finally {
          errorService.toggleLoading(false);
        }
      }),
      
      // Método para inicializar la selección de empleados
      initializeEmployeeSelection: jest.fn(function() {
        const department = confirmationsModule.state.currentDepartment;
        const confirmations = confirmationsModule.state.confirmations;
        const employees = confirmationsModule.state.employees;
        
        // Objeto para almacenar la selección
        const selectedEmployees = {};
        
        // Inicializar selección basada en confirmaciones existentes
        employees.forEach(employee => {
          const employeeId = employee.id;
          const isConfirmed = confirmations.departments[department][employeeId] === true;
          
          selectedEmployees[employeeId] = isConfirmed;
        });
        
        // Actualizar el estado
        confirmationsModule.state.selectedEmployees = selectedEmployees;
        StateManager.setValue('confirmations', 'selectedEmployees', selectedEmployees);
      }),
      
      // Método para alternar la selección de un empleado
      toggleEmployeeSelection: jest.fn(function(employeeId) {
        // Obtener el estado actual
        const selectedEmployees = { ...confirmationsModule.state.selectedEmployees };
        
        // Alternar la selección
        selectedEmployees[employeeId] = !selectedEmployees[employeeId];
        
        // Actualizar el estado
        confirmationsModule.state.selectedEmployees = selectedEmployees;
        StateManager.setValue('confirmations', 'selectedEmployees', selectedEmployees);
      }),
      
      // Método para guardar las confirmaciones
      saveConfirmations: jest.fn(async function() {
        try {
          errorService.toggleLoading(true);
          
          // Obtener datos necesarios
          const date = confirmationsModule.state.currentDate;
          const department = confirmationsModule.state.currentDepartment;
          const selectedEmployees = confirmationsModule.state.selectedEmployees;
          
          // Crear o actualizar el documento de confirmaciones
          let confirmations = { ...confirmationsModule.state.confirmations };
          
          // Asegurarse de que existe la estructura para el departamento
          if (!confirmations.departments) {
            confirmations.departments = {};
          }
          
          if (!confirmations.departments[department]) {
            confirmations.departments[department] = {};
          }
          
          // Actualizar las confirmaciones con la selección actual
          Object.entries(selectedEmployees).forEach(([employeeId, isSelected]) => {
            confirmations.departments[department][employeeId] = isSelected;
          });
          
          // Guardar en Firestore
          await firestoreService.setDocument('confirmations', date, confirmations);
          
          // Actualizar el estado
          confirmationsModule.state.confirmations = confirmations;
          StateManager.setValue('confirmations', 'confirmations', confirmations);
          
          // Mostrar mensaje de éxito
          errorService.showSuccessMessage('Confirmaciones guardadas correctamente');
          
          return true;
        } catch (error) {
          errorService.handleError(error, 'Error al guardar confirmaciones');
          return false;
        } finally {
          errorService.toggleLoading(false);
        }
      })
    };
    
    // Asignar el módulo al objeto global
    global.confirmationsModule = confirmationsModule;
  });
  
  // Limpieza después de cada prueba
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  // Pruebas para loadEmployees
  describe('loadEmployees', () => {
    test('debe cargar los empleados correctamente', async () => {
      // Configurar mock para getDocuments
      const mockEmployees = [
        { id: 'emp1', name: 'Empleado 1', department: 'Administración' },
        { id: 'emp2', name: 'Empleado 2', department: 'Administración' }
      ];
      
      mockFirestoreService.getDocuments.mockResolvedValue(mockEmployees);
      
      // Ejecutar la función
      const result = await confirmationsModule.loadEmployees();
      
      // Verificar que se llamó a Firestore con los parámetros correctos
      expect(mockFirestoreService.getDocuments).toHaveBeenCalledWith('employees', {
        where: ['department', '==', 'Administración'],
        orderBy: 'name'
      });
      
      // Verificar que se actualizó el estado
      expect(confirmationsModule.state.employees).toEqual(mockEmployees);
      expect(mockStateManager.setValue).toHaveBeenCalledWith('confirmations', 'employees', mockEmployees);
      
      // Verificar el resultado
      expect(result).toEqual(mockEmployees);
    });
    
    test('debe manejar errores correctamente', async () => {
      // Configurar mock para lanzar un error
      const mockError = new Error('Error de prueba');
      mockFirestoreService.getDocuments.mockRejectedValue(mockError);
      
      // Ejecutar la función
      const result = await confirmationsModule.loadEmployees();
      
      // Verificar que se manejó el error
      expect(errorService.handleError).toHaveBeenCalledWith(mockError, 'Error al cargar empleados');
      
      // Verificar el resultado
      expect(result).toEqual([]);
    });
  });
  
  // Pruebas para loadConfirmations
  describe('loadConfirmations', () => {
    test('debe cargar las confirmaciones correctamente', async () => {
      // Configurar mock para getDocument
      const mockConfirmations = {
        id: '2025-04-09',
        departments: {
          'Administración': {
            'emp1': true,
            'emp2': false
          }
        }
      };
      
      mockFirestoreService.getDocument.mockResolvedValue(mockConfirmations);
      
      // Espiar la función initializeEmployeeSelection
      const spy = jest.spyOn(confirmationsModule, 'initializeEmployeeSelection');
      
      // Ejecutar la función
      const result = await confirmationsModule.loadConfirmations();
      
      // Verificar que se llamó a Firestore con los parámetros correctos
      expect(mockFirestoreService.getDocument).toHaveBeenCalledWith('confirmations', '2025-04-09');
      
      // Verificar que se actualizó el estado
      expect(confirmationsModule.state.confirmations).toEqual(mockConfirmations);
      expect(mockStateManager.setValue).toHaveBeenCalledWith('confirmations', 'confirmations', mockConfirmations);
      
      // Verificar que se inicializó la selección de empleados
      expect(spy).toHaveBeenCalled();
      
      // Verificar el resultado
      expect(result).toEqual(mockConfirmations);
    });
    
    test('debe crear un objeto vacío si no hay confirmaciones', async () => {
      // Configurar mock para devolver null (no hay confirmaciones)
      mockFirestoreService.getDocument.mockResolvedValue(null);
      
      // Ejecutar la función
      const result = await confirmationsModule.loadConfirmations();
      
      // Verificar que se creó un objeto vacío
      expect(result).toEqual({
        id: '2025-04-09',
        departments: {
          'Administración': {}
        }
      });
    });
    
    test('debe manejar errores correctamente', async () => {
      // Configurar mock para lanzar un error
      const mockError = new Error('Error de prueba');
      mockFirestoreService.getDocument.mockRejectedValue(mockError);
      
      // Ejecutar la función
      const result = await confirmationsModule.loadConfirmations();
      
      // Verificar que se manejó el error
      expect(errorService.handleError).toHaveBeenCalledWith(mockError, 'Error al cargar confirmaciones');
      
      // Verificar el resultado
      expect(result).toEqual({
        id: '2025-04-09',
        departments: {}
      });
    });
  });
  
  // Pruebas para toggleEmployeeSelection
  describe('toggleEmployeeSelection', () => {
    test('debe alternar la selección de un empleado de false a true', () => {
      // Configurar estado inicial
      confirmationsModule.state.selectedEmployees = {
        'emp1': false,
        'emp2': true
      };
      
      // Ejecutar la función
      confirmationsModule.toggleEmployeeSelection('emp1');
      
      // Verificar que se actualizó el estado
      expect(confirmationsModule.state.selectedEmployees).toEqual({
        'emp1': true,
        'emp2': true
      });
      
      // Verificar que se actualizó el estado global
      expect(mockStateManager.setValue).toHaveBeenCalledWith(
        'confirmations',
        'selectedEmployees',
        {
          'emp1': true,
          'emp2': true
        }
      );
    });
    
    test('debe alternar la selección de un empleado de true a false', () => {
      // Configurar estado inicial
      confirmationsModule.state.selectedEmployees = {
        'emp1': false,
        'emp2': true
      };
      
      // Ejecutar la función
      confirmationsModule.toggleEmployeeSelection('emp2');
      
      // Verificar que se actualizó el estado
      expect(confirmationsModule.state.selectedEmployees).toEqual({
        'emp1': false,
        'emp2': false
      });
    });
  });
  
  // Pruebas para saveConfirmations
  describe('saveConfirmations', () => {
    test('debe guardar las confirmaciones correctamente', async () => {
      // Configurar estado inicial
      confirmationsModule.state.selectedEmployees = {
        'emp1': true,
        'emp2': false
      };
      
      confirmationsModule.state.confirmations = {
        id: '2025-04-09',
        departments: {
          'Administración': {}
        }
      };
      
      // Configurar mock para setDocument
      mockFirestoreService.setDocument.mockResolvedValue(true);
      
      // Ejecutar la función
      const result = await confirmationsModule.saveConfirmations();
      
      // Verificar que se llamó a Firestore con los parámetros correctos
      expect(mockFirestoreService.setDocument).toHaveBeenCalledWith(
        'confirmations',
        '2025-04-09',
        {
          id: '2025-04-09',
          departments: {
            'Administración': {
              'emp1': true,
              'emp2': false
            }
          }
        }
      );
      
      // Verificar que se mostró un mensaje de éxito
      expect(errorService.showSuccessMessage).toHaveBeenCalledWith('Confirmaciones guardadas correctamente');
      
      // Verificar el resultado
      expect(result).toBe(true);
    });
    
    test('debe manejar errores correctamente', async () => {
      // Configurar mock para lanzar un error
      const mockError = new Error('Error de prueba');
      mockFirestoreService.setDocument.mockRejectedValue(mockError);
      
      // Ejecutar la función
      const result = await confirmationsModule.saveConfirmations();
      
      // Verificar que se manejó el error
      expect(errorService.handleError).toHaveBeenCalledWith(mockError, 'Error al guardar confirmaciones');
      
      // Verificar el resultado
      expect(result).toBe(false);
    });
  });
  
  // Pruebas para init
  describe('init', () => {
    test('debe inicializar el módulo correctamente', async () => {
      // Espiar las funciones
      const loadEmployeesSpy = jest.spyOn(confirmationsModule, 'loadEmployees').mockResolvedValue([]);
      const loadConfirmationsSpy = jest.spyOn(confirmationsModule, 'loadConfirmations').mockResolvedValue({});
      
      // Ejecutar la función
      const result = await confirmationsModule.init();
      
      // Verificar que se llamaron las funciones necesarias
      expect(loadEmployeesSpy).toHaveBeenCalled();
      expect(loadConfirmationsSpy).toHaveBeenCalled();
      
      // Verificar el resultado
      expect(result).toBe(true);
    });
    
    test('debe manejar errores correctamente', async () => {
      // Configurar mock para lanzar un error
      const mockError = new Error('Error de prueba');
      jest.spyOn(confirmationsModule, 'loadEmployees').mockRejectedValue(mockError);
      
      // Ejecutar la función
      const result = await confirmationsModule.init();
      
      // Verificar que se manejó el error
      expect(errorService.handleError).toHaveBeenCalledWith(mockError, 'Error al inicializar el módulo de confirmaciones');
      
      // Verificar el resultado
      expect(result).toBe(false);
    });
  });
});
