// Firebase configuration for Comedor Grupo Avika

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCIyAwAEqFEw_bcqmun5BlNjVPiRy2-bMs",
  authDomain: "comedor-grupoavika.firebaseapp.com",
  databaseURL: "https://comedor-grupoavika-default-rtdb.firebaseio.com",
  projectId: "comedor-grupoavika",
  storageBucket: "comedor-grupoavika.appspot.com",
  messagingSenderId: "277401445097",
  appId: "1:277401445097:web:f1da7e5c8b3f3ab3570678",
  measurementId: "G-P3ZDJJQVW9"
};

// Initialize Firebase
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;
  
  try {
    if (typeof firebase === 'undefined') {
      console.error("Firebase no está disponible. Asegúrese de incluir los scripts de Firebase.");
      return;
    }
    
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
      console.log("Firebase inicializado correctamente");
    } else {
      console.log("Firebase ya estaba inicializado");
    }
    
    // Inicializar Firestore
    window.db = firebase.firestore();
    
    // Inicializar colecciones
    window.employeesCollection = window.db.collection('employees');
    window.menusCollection = window.db.collection('menus');
    window.confirmationsCollection = window.db.collection('confirmations');
    
    firebaseInitialized = true;
    
    // Disparar evento cuando Firebase está listo
    const event = new CustomEvent('firebase-ready');
    window.dispatchEvent(event);
    
    return true;
  } catch (error) {
    console.error("Error al inicializar Firebase:", error);
    return false;
  }
}

// Ejecutar la inicialización
document.addEventListener('DOMContentLoaded', () => {
  initializeFirebase();
});

// Exportar la función para que pueda ser llamada manualmente si es necesario
window.initializeFirebase = initializeFirebase;