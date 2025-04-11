// Tests para confirmations.js del coordinador
import { jest } from '@jest/globals';
import logger from '../js/utils/logger.js';
import { handleFirebaseError } from '../js/utils/error-handler.js';

// Mock de las funciones del servicio de Firestore
const getCurrentWeeklyMenu = jest.fn();
const getEmployeeConfirmations = jest.fn();

// Mock del DOM
const mockDOM = {
  confirmationContainer: { innerHTML: '' },
  loadingIndicator: { style: { display: 'none' } },
  noMenuModal: { style: { display: 'none' } },
  confirmationClosedModal: { style: { display: 'none' } },
  confirmStartDate: { textContent: '' },
  confirmEndDate: { textContent: '' },
  errorContainer: { innerHTML: '', style: { display: 'none' } }
};

// Mock de los datos
const mockMenu = {
  id: 'menu1',
  startDate: { toDate: () => new Date('2025-04-08') },
  status: 'published',
  confirmStartDate: { toDate: () => new Date('2025-04-04') },
  confirmEndDate: { toDate: () => new Date('2025-04-13') }, // Fecha futura
  dailyMenus: {
    monday: { mainDish: 'Pollo asado', sideDish: 'Arroz', dessert: 'Flan' },
    tuesday: { mainDish: 'Pescado', sideDish: 'Ensalada', dessert: 'Fruta' },
    wednesday: { mainDish: 'Pasta', sideDish: 'Pan', dessert: 'Helado' },
    thursday: { mainDish: 'Carne', sideDish: 'Puré', dessert: 'Pastel' },
    friday: { mainDish: 'Tacos', sideDish: 'Frijoles', dessert: 'Gelatina' }
  }
};

const mockConfirmations = [
  { employeeId: 'emp1', confirmed: true, timestamp: { toDate: () => new Date() } },
  { employeeId: 'emp2', confirmed: false, timestamp: { toDate: () => new Date() } }
];

// Mock de las funciones de utilidad
const formatDateTime = jest.fn(date => date.toLocaleString());
const showError = jest.fn();

// Variables de estado
let confirmationState = 'loading';
let currentMenu = null;

// Función para actualizar la UI basada en el estado
function updateUI() {
  switch (confirmationState) {
    case 'loading':
      mockDOM.loadingIndicator.style.display = 'block';
      mockDOM.confirmationContainer.innerHTML = '';
      break;
    case 'unavailable':
      mockDOM.loadingIndicator.style.display = 'none';
      mockDOM.confirmationContainer.innerHTML = '<p>No hay menú disponible</p>';
      break;
    case 'closed':
      mockDOM.loadingIndicator.style.display = 'none';
      mockDOM.confirmationContainer.innerHTML = '<p>Periodo de confirmación cerrado</p>';
      break;
    case 'open':
      mockDOM.loadingIndicator.style.display = 'none';
      mockDOM.confirmationContainer.innerHTML = '<p>Periodo de confirmación abierto</p>';
      break;
  }
}

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
async function loadData(viewOnly = false) {
  try {
    // Reset state
    confirmationState = 'loading';
    updateUI();
    
    logger.info('Cargando datos de confirmaciones');
    
    // Load current menu
    try {
      logger.debug('Intentando obtener el menú semanal actual');
      currentMenu = await getCurrentWeeklyMenu();
      
      if (!currentMenu) {
        logger.warn('No se encontró un menú activo');
        confirmationState = 'unavailable';
        updateUI();
        mockDOM.noMenuModal.style.display = 'block';
        return { success: false, reason: 'no-menu' };
      }
      
      logger.debug('Menú encontrado', { id: currentMenu.id, status: currentMenu.status });
    } catch (error) {
      logger.error('Error al cargar el menú actual', error);
      showError('Error al cargar el menú. Intente refrescar la página.');
      confirmationState = 'unavailable';
      updateUI();
      mockDOM.noMenuModal.style.display = 'block';
      return { success: false, reason: 'menu-error', error };
    }
    
    // Check if confirmation period is open
    const now = new Date('2025-04-10'); // Fecha fija para pruebas
    const confirmStart = currentMenu.confirmStartDate ? currentMenu.confirmStartDate.toDate() : null;
    const confirmEnd = currentMenu.confirmEndDate ? currentMenu.confirmEndDate.toDate() : null;
    
    if (!confirmStart || !confirmEnd) {
      logger.error('Fechas de confirmación no definidas en el menú', { menuId: currentMenu.id });
      showError('El menú no tiene fechas de confirmación definidas. Contacte al administrador.');
      confirmationState = 'unavailable';
      updateUI();
      mockDOM.noMenuModal.style.display = 'block';
      return { success: false, reason: 'no-dates' };
    }
    
    logger.debug('Periodo de confirmación', { 
      start: confirmStart.toISOString(), 
      end: confirmEnd.toISOString(),
      now: now.toISOString(),
      isOpen: now >= confirmStart && now <= confirmEnd
    });
    
    if (!viewOnly && (now < confirmStart || now > confirmEnd)) {
      logger.info('Periodo de confirmación cerrado');
      confirmationState = 'closed';
      mockDOM.confirmStartDate.textContent = formatDateTime(confirmStart);
      mockDOM.confirmEndDate.textContent = formatDateTime(confirmEnd);
      updateUI();
      mockDOM.confirmationClosedModal.style.display = 'block';
      return { success: false, reason: 'period-closed' };
    }
    
    // Si llegamos aquí, todo está bien
    confirmationState = 'open';
    updateUI();
    return { success: true, menu: currentMenu };
  } catch (error) {
    logger.error('Error general al cargar datos', error);
    showError('Error al cargar datos. Intente nuevamente.');
    confirmationState = 'unavailable';
    updateUI();
    return { success: false, reason: 'general-error', error };
  }
}

describe('loadData', () => {
  beforeEach(() => {
    // Limpiar todos los mocks antes de cada prueba
    jest.clearAllMocks();
    
    // Restablecer el estado
    confirmationState = 'loading';
    currentMenu = null;
    
    // Restablecer el DOM
    mockDOM.noMenuModal.style.display = 'none';
    mockDOM.confirmationClosedModal.style.display = 'none';
    mockDOM.errorContainer.style.display = 'none';
    mockDOM.errorContainer.innerHTML = '';
  });

  test('debería cargar correctamente cuando hay un menú y el periodo está abierto', async () => {
    // Configurar el mock para devolver un menú con periodo abierto
    getCurrentWeeklyMenu.mockResolvedValue(mockMenu);
    
    const result = await loadData();
    
    // Verificar que se llamó a getCurrentWeeklyMenu
    expect(getCurrentWeeklyMenu).toHaveBeenCalled();
    
    // Verificar que se registraron los mensajes correctos
    expect(logger.info).toHaveBeenCalledWith('Cargando datos de confirmaciones');
    expect(logger.debug).toHaveBeenCalledWith('Intentando obtener el menú semanal actual');
    expect(logger.debug).toHaveBeenCalledWith('Menú encontrado', { id: mockMenu.id, status: mockMenu.status });
    
    // Verificar el estado final
    expect(confirmationState).toBe('open');
    
    // Verificar que no se mostraron modales de error
    expect(mockDOM.noMenuModal.style.display).toBe('none');
    expect(mockDOM.confirmationClosedModal.style.display).toBe('none');
    
    // Verificar el resultado
    expect(result).toEqual({ success: true, menu: mockMenu });
  });

  test('debería mostrar modal cuando no hay menú disponible', async () => {
    // Configurar el mock para devolver null (sin menú)
    getCurrentWeeklyMenu.mockResolvedValue(null);
    
    const result = await loadData();
    
    // Verificar que se llamó a getCurrentWeeklyMenu
    expect(getCurrentWeeklyMenu).toHaveBeenCalled();
    
    // Verificar que se registraron los mensajes correctos
    expect(logger.warn).toHaveBeenCalledWith('No se encontró un menú activo');
    
    // Verificar el estado final
    expect(confirmationState).toBe('unavailable');
    
    // Verificar que se mostró el modal correcto
    expect(mockDOM.noMenuModal.style.display).toBe('block');
    
    // Verificar el resultado
    expect(result).toEqual({ success: false, reason: 'no-menu' });
  });

  test('debería manejar errores al cargar el menú', async () => {
    // Configurar el mock para lanzar un error
    const testError = new Error('Error al cargar el menú');
    getCurrentWeeklyMenu.mockRejectedValue(testError);
    
    const result = await loadData();
    
    // Verificar que se llamó a getCurrentWeeklyMenu
    expect(getCurrentWeeklyMenu).toHaveBeenCalled();
    
    // Verificar que se registraron los mensajes correctos
    expect(logger.error).toHaveBeenCalledWith('Error al cargar el menú actual', testError);
    
    // Verificar que se mostró el error al usuario
    expect(showError).toHaveBeenCalledWith('Error al cargar el menú. Intente refrescar la página.');
    
    // Verificar el estado final
    expect(confirmationState).toBe('unavailable');
    
    // Verificar que se mostró el modal correcto
    expect(mockDOM.noMenuModal.style.display).toBe('block');
    
    // Verificar el resultado
    expect(result).toEqual({ success: false, reason: 'menu-error', error: testError });
  });

  test('debería mostrar error cuando el menú no tiene fechas de confirmación', async () => {
    // Configurar el mock para devolver un menú sin fechas de confirmación
    const menuSinFechas = { ...mockMenu, confirmStartDate: null, confirmEndDate: null };
    getCurrentWeeklyMenu.mockResolvedValue(menuSinFechas);
    
    const result = await loadData();
    
    // Verificar que se registraron los mensajes correctos
    expect(logger.error).toHaveBeenCalledWith('Fechas de confirmación no definidas en el menú', { menuId: menuSinFechas.id });
    
    // Verificar que se mostró el error al usuario
    expect(showError).toHaveBeenCalledWith('El menú no tiene fechas de confirmación definidas. Contacte al administrador.');
    
    // Verificar el estado final
    expect(confirmationState).toBe('unavailable');
    
    // Verificar que se mostró el modal correcto
    expect(mockDOM.noMenuModal.style.display).toBe('block');
    
    // Verificar el resultado
    expect(result).toEqual({ success: false, reason: 'no-dates' });
  });

  test('debería mostrar modal cuando el periodo de confirmación está cerrado', async () => {
    // Configurar el mock para devolver un menú con periodo cerrado
    const menuPeriodoCerrado = { 
      ...mockMenu, 
      confirmStartDate: { toDate: () => new Date('2025-04-15') }, // Fecha futura
      confirmEndDate: { toDate: () => new Date('2025-04-20') }    // Fecha futura
    };
    getCurrentWeeklyMenu.mockResolvedValue(menuPeriodoCerrado);
    
    const result = await loadData();
    
    // Verificar que se registraron los mensajes correctos
    expect(logger.info).toHaveBeenCalledWith('Periodo de confirmación cerrado');
    
    // Verificar el estado final
    expect(confirmationState).toBe('closed');
    
    // Verificar que se mostró el modal correcto
    expect(mockDOM.confirmationClosedModal.style.display).toBe('block');
    
    // Verificar el resultado
    expect(result).toEqual({ success: false, reason: 'period-closed' });
  });

  test('debería permitir ver confirmaciones incluso si el periodo está cerrado en modo viewOnly', async () => {
    // Configurar el mock para devolver un menú con periodo cerrado
    const menuPeriodoCerrado = { 
      ...mockMenu, 
      confirmStartDate: { toDate: () => new Date('2025-04-15') }, // Fecha futura
      confirmEndDate: { toDate: () => new Date('2025-04-20') }    // Fecha futura
    };
    getCurrentWeeklyMenu.mockResolvedValue(menuPeriodoCerrado);
    
    const result = await loadData(true); // viewOnly = true
    
    // Verificar el estado final
    expect(confirmationState).toBe('open');
    
    // Verificar que NO se mostró el modal de periodo cerrado
    expect(mockDOM.confirmationClosedModal.style.display).toBe('none');
    
    // Verificar el resultado
    expect(result).toEqual({ success: true, menu: menuPeriodoCerrado });
  });
});
