// Variable global para modo desarrollo
const DEVELOPMENT_MODE = true;

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCIyAwAEqFEw_bcqmun5BlNjVPiRy2-bMs",
    authDomain: "comedor-grupoavika.firebaseapp.com",
    databaseURL: "https://comedor-grupoavika-default-rtdb.firebaseio.com",
    projectId: "comedor-grupoavika",
    storageBucket: "comedor-grupoavika.firebasestorage.app",
    messagingSenderId: "277401445097",
    appId: "1:277401445097:web:f1da7e5c8b3f3ab3570678",
    measurementId: "G-P3ZDJJQVW9"
};

// Cargar configuración de desarrollo si está disponible
let DEV_CONFIG = {
    bypassAuth: false,
    bypassRoleValidation: false,
    bypassDateValidations: false,
    enableDevLogs: true,
    useTestData: false
};

// Función para registrar logs de desarrollo
function devLog(message, data = null) {
    if (DEVELOPMENT_MODE && DEV_CONFIG.enableDevLogs) {
        console.log(`[DEV] ${message}`, data ? data : '');
    }
}

// Cargar script de desarrollo dinámicamente
if (DEVELOPMENT_MODE) {
    devLog('Modo desarrollo activado');
    
    // Intentar cargar configuración de desarrollo
    const devScript = document.createElement('script');
    devScript.src = '../../js/config/development.js';
    devScript.onload = function() {
        devLog('Configuración de desarrollo cargada correctamente');
        // Actualizar configuración con valores del script de desarrollo
        if (window.DEV_CONFIG) {
            DEV_CONFIG = window.DEV_CONFIG;
            devLog('Configuración de desarrollo aplicada', DEV_CONFIG);
        }
        
        // Cargar el panel de desarrollo
        const devPanelScript = document.createElement('script');
        devPanelScript.src = '../../js/config/dev-panel.js';
        devPanelScript.onload = function() {
            devLog('Panel de desarrollo cargado correctamente');
            
            // Cargar script de inicialización de datos de prueba
            if (DEV_CONFIG.useTestData) {
                const devInitScript = document.createElement('script');
                devInitScript.src = '../../js/config/dev-init.js';
                devInitScript.onload = function() {
                    devLog('Script de inicialización de datos de prueba cargado correctamente');
                };
                devInitScript.onerror = function() {
                    console.warn('No se pudo cargar el script de inicialización de datos de prueba');
                };
                document.head.appendChild(devInitScript);
            }
        };
        devPanelScript.onerror = function() {
            console.warn('No se pudo cargar el panel de desarrollo');
        };
        document.head.appendChild(devPanelScript);
    };
    devScript.onerror = function() {
        console.warn('No se pudo cargar la configuración de desarrollo');
    };
    document.head.appendChild(devScript);
    
    // Cargar configuración guardada en localStorage si existe
    try {
        const savedConfig = localStorage.getItem('dev_config');
        if (savedConfig) {
            const parsedConfig = JSON.parse(savedConfig);
            if (parsedConfig && typeof parsedConfig === 'object') {
                DEV_CONFIG = { ...DEV_CONFIG, ...parsedConfig };
                devLog('Configuración cargada desde localStorage', DEV_CONFIG);
            }
        }
    } catch (e) {
        console.error('Error al cargar configuración desde localStorage:', e);
    }
}

// Initialize Firebase
try {
    // Verificar si Firebase ya está inicializado para evitar inicializaciones múltiples
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        devLog("Firebase inicializado correctamente");
    } else {
        devLog("Firebase ya estaba inicializado");
    }
    
    // Initialize services
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Configurar persistencia para mejorar la experiencia offline
    if (!DEVELOPMENT_MODE || !DEV_CONFIG.useTestData) {
        db.enablePersistence({ synchronizeTabs: true })
            .catch(err => {
                if (err.code === 'failed-precondition') {
                    // Múltiples pestañas abiertas, la persistencia solo puede habilitarse en una pestaña a la vez
                    console.warn('La persistencia de Firebase no pudo habilitarse: múltiples pestañas abiertas');
                } else if (err.code === 'unimplemented') {
                    // El navegador actual no soporta todas las características necesarias
                    console.warn('La persistencia de Firebase no está disponible en este navegador');
                }
            });
    }
    
    // Optional: Initialize Analytics
    const analytics = firebase.analytics ? firebase.analytics() : null;
    
    // Crear funciones de acceso a Firestore para evitar problemas de inicialización
    const getFirestore = () => firebase.firestore();
    const getAuth = () => firebase.auth();
    
    // Hacer que las variables estén disponibles globalmente
    window.auth = auth;
    window.db = db;
    window.analytics = analytics;
    window.getFirestore = getFirestore;
    window.getAuth = getAuth;
    window.DEVELOPMENT_MODE = DEVELOPMENT_MODE;
    window.devLog = devLog;
    
} catch (error) {
    console.error("Error al inicializar Firebase:", error);
    alert("Error al conectar con el servidor. Por favor, recargue la página o inténtelo más tarde.");
}