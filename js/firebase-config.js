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

// Initialize Firebase only if it hasn't been initialized already
if (typeof firebase !== 'undefined') {
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase inicializado correctamente");
  } else {
    console.log("Firebase ya estaba inicializado");
  }
} else {
  console.error("Firebase no está disponible. Verifica que los scripts se hayan cargado correctamente.");
}

// Get Firebase services
let db;
try {
  db = firebase.firestore();
  console.log("Firestore inicializado correctamente");
} catch (error) {
  console.error("Error al inicializar Firestore:", error);
}

// Create references to collections
let employeesCollection, menusCollection, confirmationsCollection;

try {
  // Initialize collections
  employeesCollection = db.collection('employees');
  menusCollection = db.collection('menus');
  confirmationsCollection = db.collection('confirmations');
  
  // Make collections available globally
  window.db = db;
  window.employeesCollection = employeesCollection;
  window.menusCollection = menusCollection;
  window.confirmationsCollection = confirmationsCollection;
  
  console.log("Colecciones de Firestore inicializadas correctamente");
} catch (error) {
  console.error("Error al inicializar colecciones de Firestore:", error);
}