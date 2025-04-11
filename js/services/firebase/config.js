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

// Initialize Firebase
try {
    // Verificar si Firebase ya está inicializado para evitar inicializaciones múltiples
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase inicializado correctamente");
    } else {
        console.log("Firebase ya estaba inicializado");
    }
    
    // Initialize services
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Configurar persistencia para mejorar la experiencia offline
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
    
    // Optional: Initialize Analytics
    const analytics = firebase.analytics ? firebase.analytics() : null;
    
    // Hacer que las variables estén disponibles globalmente
    window.auth = auth;
    window.db = db;
    window.analytics = analytics;
    
} catch (error) {
    console.error("Error al inicializar Firebase:", error);
    alert("Error al conectar con el servidor. Por favor, recargue la página o inténtelo más tarde.");
}