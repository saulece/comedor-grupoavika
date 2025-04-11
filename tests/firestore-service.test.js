// Tests para firestore-service.js
import { jest } from '@jest/globals';
import logger from '../js/utils/logger.js';
import { handleFirebaseError } from '../js/utils/error-handler.js';

// Mock de Firebase
const mockDailyMenus = {
  monday: { mainDish: 'Pollo asado', sideDish: 'Arroz', dessert: 'Flan' },
  tuesday: { mainDish: 'Pescado', sideDish: 'Ensalada', dessert: 'Fruta' },
  wednesday: { mainDish: 'Pasta', sideDish: 'Pan', dessert: 'Helado' },
  thursday: { mainDish: 'Carne', sideDish: 'Puré', dessert: 'Pastel' },
  friday: { mainDish: 'Tacos', sideDish: 'Frijoles', dessert: 'Gelatina' },
  saturday: { mainDish: 'Pizza', sideDish: 'Papas', dessert: 'Brownie' },
  sunday: { mainDish: 'Hamburguesa', sideDish: 'Ensalada', dessert: 'Galletas' }
};

// Mock de la colección weeklyMenus
const mockMenus = [
  {
    id: 'menu1',
    data: {
      startDate: { toDate: () => new Date('2025-04-08') }, // Martes de esta semana
      status: 'published',
      confirmStartDate: { toDate: () => new Date('2025-04-04') },
      confirmEndDate: { toDate: () => new Date('2025-04-06') }
    }
  },
  {
    id: 'menu2',
    data: {
      startDate: { toDate: () => new Date('2025-04-01') }, // Semana pasada
      status: 'published',
      confirmStartDate: { toDate: () => new Date('2025-03-28') },
      confirmEndDate: { toDate: () => new Date('2025-03-30') }
    }
  },
  {
    id: 'menu3',
    data: {
      startDate: { toDate: () => new Date('2025-04-15') }, // Próxima semana
      status: 'pending',
      confirmStartDate: { toDate: () => new Date('2025-04-11') },
      confirmEndDate: { toDate: () => new Date('2025-04-13') }
    }
  }
];

// Mock de Firebase Firestore
const mockFirestore = {
  collection: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({
    empty: false,
    docs: mockMenus,
    size: mockMenus.length
  }),
  forEach: jest.fn(callback => {
    Object.keys(mockDailyMenus).forEach((day, index) => {
      callback({
        id: day,
        data: () => mockDailyMenus[day]
      });
    });
  })
};

// Mock de logger
jest.mock('../js/utils/logger.js', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock de error-handler
jest.mock('../js/utils/error-handler.js', () => ({
  handleFirebaseError: jest.fn(error => error)
}));

// Mock global de db
global.db = mockFirestore;

// Importar la función a probar
import { getCurrentWeeklyMenu } from '../js/services/firebase/firestore-service.js';

describe('getCurrentWeeklyMenu', () => {
  beforeEach(() => {
    // Limpiar todos los mocks antes de cada prueba
    jest.clearAllMocks();
  });

  test('debería devolver el menú de la semana actual', async () => {
    // Configurar la fecha actual para que esté dentro de la semana del primer menú
    const mockDate = new Date('2025-04-10'); // Jueves de esta semana
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    const result = await getCurrentWeeklyMenu();

    // Verificar que se llamó a Firestore con los parámetros correctos
    expect(mockFirestore.collection).toHaveBeenCalledWith('weeklyMenus');
    expect(mockFirestore.where).toHaveBeenCalledWith('status', 'in', ['published', 'in-progress']);
    expect(mockFirestore.orderBy).toHaveBeenCalledWith('startDate', 'desc');
    expect(mockFirestore.get).toHaveBeenCalled();

    // Verificar que se devolvió el menú correcto
    expect(result).toEqual({
      id: 'menu1',
      ...mockMenus[0].data,
      dailyMenus: mockDailyMenus
    });

    // Verificar que se registraron los mensajes correctos
    expect(logger.debug).toHaveBeenCalledWith('Fetching current weekly menu');
    expect(logger.info).toHaveBeenCalledWith('Found current week menu: menu1');
  });

  test('debería devolver el menú más reciente si no hay un menú para la semana actual', async () => {
    // Configurar la fecha actual para que esté fuera de todas las semanas de menú
    const mockDate = new Date('2025-04-20'); // Fuera de todos los rangos
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

    const result = await getCurrentWeeklyMenu();

    // Verificar que se devolvió el menú más reciente
    expect(result).toEqual({
      id: 'menu3', // El menú más reciente según startDate
      ...mockMenus[2].data,
      dailyMenus: mockDailyMenus
    });

    // Verificar que se registraron los mensajes correctos
    expect(logger.info).toHaveBeenCalledWith('No current week menu found, using most recent: menu3');
  });

  test('debería devolver null si no hay menús disponibles', async () => {
    // Configurar Firestore para devolver una colección vacía
    mockFirestore.get.mockResolvedValueOnce({
      empty: true,
      docs: [],
      size: 0
    });

    const result = await getCurrentWeeklyMenu();

    // Verificar que se devolvió null
    expect(result).toBeNull();

    // Verificar que se registraron los mensajes correctos
    expect(logger.info).toHaveBeenCalledWith('No active weekly menu found');
  });

  test('debería manejar errores correctamente', async () => {
    // Configurar Firestore para lanzar un error
    const testError = new Error('Test error');
    mockFirestore.get.mockRejectedValueOnce(testError);

    // Verificar que la función lanza el error
    await expect(getCurrentWeeklyMenu()).rejects.toThrow();

    // Verificar que se llamó a handleFirebaseError
    expect(handleFirebaseError).toHaveBeenCalledWith(
      testError,
      'getCurrentWeeklyMenu',
      expect.objectContaining({
        indexHelp: expect.any(String),
        userMessage: expect.any(String)
      })
    );

    // Verificar que se registró el error
    expect(logger.error).toHaveBeenCalled();
  });
});
