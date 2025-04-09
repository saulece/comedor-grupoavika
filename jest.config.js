module.exports = {
  // Directorio raíz donde Jest buscará archivos
  rootDir: '.',
  
  // Patrones de archivos de prueba
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  
  // Entorno de prueba
  testEnvironment: 'jsdom',
  
  // Configuración de cobertura
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'js/utils/**/*.js',
    '!**/node_modules/**'
  ],
  
  // Transformaciones
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Módulos a mockear automáticamente
  automock: false,
  
  // Configuración de reportes
  reporters: ['default'],
  
  // Configuración para manejo de módulos
  moduleNameMapper: {
    // Si hay alias de rutas, se pueden configurar aquí
  },
  
  // Configuración para setup de pruebas
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ]
};
