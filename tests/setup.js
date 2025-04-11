// Jest setup file

// Configuración para ESM
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock del DOM
document.body.innerHTML = `
  <div id="confirmationStatus"></div>
  <div id="weekDates"></div>
  <div id="menuPreview"></div>
  <div id="dayTabsContainer"></div>
  <div id="totalEmployees"></div>
  <div id="activeEmployees"></div>
  <div id="confirmedEmployees"></div>
  <div id="activityList"></div>
  <div id="confirmationContainer"></div>
  <div id="loadingIndicator" style="display: none;"></div>
  <div id="noMenuModal" style="display: none;"></div>
  <div id="confirmationClosedModal" style="display: none;"></div>
  <div id="confirmStartDate"></div>
  <div id="confirmEndDate"></div>
  <div id="errorContainer" style="display: none;"></div>
`;

// Mock de Firebase
global.firebase = {
  firestore: jest.fn(() => ({
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      empty: false,
      docs: [],
      size: 0
    })
  }))
};

// Mock de funciones globales
global.showError = jest.fn();
global.formatDateTime = jest.fn(date => date.toLocaleString());
global.formatDateDMY = jest.fn(date => date.toLocaleDateString());
global.getDayName = jest.fn(() => 'Lunes');

// Evitar errores de consola durante las pruebas
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};
