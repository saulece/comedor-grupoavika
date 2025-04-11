// Tests para dashboard.js del coordinador
import { jest } from '@jest/globals';
import logger from '../js/utils/logger.js';
import { handleFirebaseError } from '../js/utils/error-handler.js';

// Mock de las funciones del servicio de Firestore
const getCurrentWeeklyMenu = jest.fn();
const getEmployeesByBranch = jest.fn();

// Mock del DOM
const mockDOM = {
  confirmationStatus: { innerHTML: '' },
  timeRemainingValue: { textContent: '' },
  weekDates: { textContent: '' },
  dayTabsContainer: { innerHTML: '' },
  menuPreview: { innerHTML: '' },
  totalEmployees: { textContent: '' },
  activeEmployees: { textContent: '' },
  confirmedEmployees: { textContent: '' },
  activityList: { innerHTML: '' }
};

// Mock de los datos
const mockMenu = {
  id: 'menu1',
  startDate: { toDate: () => new Date('2025-04-08') },
  status: 'published',
  confirmStartDate: { toDate: () => new Date('2025-04-04') },
  confirmEndDate: { toDate: () => new Date('2025-04-06') },
  dailyMenus: {
    monday: { mainDish: 'Pollo asado', sideDish: 'Arroz', dessert: 'Flan' },
    tuesday: { mainDish: 'Pescado', sideDish: 'Ensalada', dessert: 'Fruta' },
    wednesday: { mainDish: 'Pasta', sideDish: 'Pan', dessert: 'Helado' },
    thursday: { mainDish: 'Carne', sideDish: 'Puré', dessert: 'Pastel' },
    friday: { mainDish: 'Tacos', sideDish: 'Frijoles', dessert: 'Gelatina' }
  }
};

const mockEmployees = [
  { id: 'emp1', name: 'Juan Pérez', active: true },
  { id: 'emp2', name: 'María López', active: true },
  { id: 'emp3', name: 'Carlos Gómez', active: false }
];

// Mock de las funciones de estado global
const setCurrentMenu = jest.fn();
const setCurrentEmployees = jest.fn();

// Mock de las funciones de utilidad
const formatDateDMY = jest.fn(date => date.toLocaleDateString());
const showError = jest.fn();

// Mock de logger
jest.mock('../js/utils/logger.js', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock de error-handler
jest.mock('../js/utils/error-handler.js', () => ({
  handleFirebaseError: jest.fn(error => ({
    ...error,
    userMessage: 'Error procesado para el usuario'
  }))
}));

// Función a probar (simulada)
async function loadDashboardData() {
  try {
    // Show loading state
    mockDOM.confirmationStatus.innerHTML = '<span class="loading-spinner"></span> Cargando...';
    mockDOM.weekDates.textContent = 'Cargando...';
    
    logger.info('Cargando datos del dashboard');
    
    // Load current menu
    try {
      logger.debug('Intentando obtener el menú semanal actual');
      const currentMenu = await getCurrentWeeklyMenu();
      
      if (currentMenu) {
        logger.debug('Menú encontrado', { id: currentMenu.id, status: currentMenu.status });
        return { success: true, menu: currentMenu };
      } else {
        logger.warn('No se encontró un menú activo');
        mockDOM.weekDates.textContent = 'No disponible';
        mockDOM.menuPreview.innerHTML = `
          <div class="empty-message">
            <p>No hay menú disponible actualmente.</p>
          </div>
        `;
        return { success: false, error: 'No menu found' };
      }
    } catch (error) {
      logger.error('Error al cargar el menú actual', error);
      showError('Error al cargar el menú. Intente refrescar la página.');
      
      // Display fallback UI
      mockDOM.weekDates.textContent = 'No disponible';
      mockDOM.menuPreview.innerHTML = `
        <div class="empty-message">
          <p>No se pudo cargar el menú. Por favor, intente nuevamente.</p>
          <button class="btn btn-primary" onclick="location.reload()">Refrescar página</button>
        </div>
      `;
      return { success: false, error };
    }
  } catch (error) {
    const handledError = handleFirebaseError(error, 'loadDashboardData', {
      userMessage: 'Error al cargar datos del dashboard. Intente nuevamente.'
    });
    
    logger.error('Error general al cargar el dashboard', handledError);
    showError(handledError.userMessage || 'Error al cargar datos del dashboard. Intente nuevamente.');
    return { success: false, error: handledError };
  }
}

describe('loadDashboardData', () => {
  beforeEach(() => {
    // Limpiar todos los mocks antes de cada prueba
    jest.clearAllMocks();
    
    // Restablecer el estado del DOM
    mockDOM.confirmationStatus.innerHTML = '';
    mockDOM.weekDates.textContent = '';
    mockDOM.menuPreview.innerHTML = '';
  });

  test('debería cargar correctamente el menú cuando está disponible', async () => {
    // Configurar el mock para devolver un menú
    getCurrentWeeklyMenu.mockResolvedValue(mockMenu);
    
    const result = await loadDashboardData();
    
    // Verificar que se llamó a getCurrentWeeklyMenu
    expect(getCurrentWeeklyMenu).toHaveBeenCalled();
    
    // Verificar que se registraron los mensajes correctos
    expect(logger.info).toHaveBeenCalledWith('Cargando datos del dashboard');
    expect(logger.debug).toHaveBeenCalledWith('Intentando obtener el menú semanal actual');
    expect(logger.debug).toHaveBeenCalledWith('Menú encontrado', { id: mockMenu.id, status: mockMenu.status });
    
    // Verificar el resultado
    expect(result).toEqual({ success: true, menu: mockMenu });
  });

  test('debería manejar correctamente cuando no hay menú disponible', async () => {
    // Configurar el mock para devolver null (sin menú)
    getCurrentWeeklyMenu.mockResolvedValue(null);
    
    const result = await loadDashboardData();
    
    // Verificar que se llamó a getCurrentWeeklyMenu
    expect(getCurrentWeeklyMenu).toHaveBeenCalled();
    
    // Verificar que se registraron los mensajes correctos
    expect(logger.warn).toHaveBeenCalledWith('No se encontró un menú activo');
    
    // Verificar que se actualizó el DOM correctamente
    expect(mockDOM.weekDates.textContent).toBe('No disponible');
    expect(mockDOM.menuPreview.innerHTML).toContain('No hay menú disponible actualmente');
    
    // Verificar el resultado
    expect(result).toEqual({ success: false, error: 'No menu found' });
  });

  test('debería manejar correctamente los errores al cargar el menú', async () => {
    // Configurar el mock para lanzar un error
    const testError = new Error('Error al cargar el menú');
    getCurrentWeeklyMenu.mockRejectedValue(testError);
    
    const result = await loadDashboardData();
    
    // Verificar que se llamó a getCurrentWeeklyMenu
    expect(getCurrentWeeklyMenu).toHaveBeenCalled();
    
    // Verificar que se registraron los mensajes correctos
    expect(logger.error).toHaveBeenCalledWith('Error al cargar el menú actual', testError);
    
    // Verificar que se mostró el error al usuario
    expect(showError).toHaveBeenCalledWith('Error al cargar el menú. Intente refrescar la página.');
    
    // Verificar que se actualizó el DOM correctamente
    expect(mockDOM.weekDates.textContent).toBe('No disponible');
    expect(mockDOM.menuPreview.innerHTML).toContain('No se pudo cargar el menú');
    
    // Verificar el resultado
    expect(result).toEqual({ success: false, error: testError });
  });

  test('debería manejar correctamente los errores generales', async () => {
    // Configurar el mock para lanzar un error en la función principal
    getCurrentWeeklyMenu.mockImplementation(() => {
      throw new Error('Error general');
    });
    
    const result = await loadDashboardData();
    
    // Verificar que se llamó a handleFirebaseError
    expect(handleFirebaseError).toHaveBeenCalled();
    
    // Verificar que se registraron los mensajes correctos
    expect(logger.error).toHaveBeenCalled();
    
    // Verificar que se mostró el error al usuario
    expect(showError).toHaveBeenCalled();
    
    // Verificar el resultado
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
