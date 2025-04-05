// Firebase configuration for Comedor Grupo Avika

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

// Check if Firebase is already initialized
if (typeof firebase !== 'undefined' && (!firebase.apps || !firebase.apps.length)) {
  firebase.initializeApp(firebaseConfig);
}

// Get Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Comprueba si el módulo analytics está disponible antes de usarlo
let analytics = null;
try {
  if (firebase.analytics) {
    analytics = firebase.analytics();
  }
} catch (e) {
  console.warn("Firebase analytics not available: ", e);
}

// Define las colecciones globalmente para que estén disponibles en todo el sistema
window.db = db;
window.auth = auth;
window.analytics = analytics;

// Define las referencias a colecciones como variables globales
window.employeesCollection = db.collection("employees");
window.confirmationsCollection = db.collection("confirmations");
window.menuCollection = db.collection("menus");

// También las exportamos como variables normales para compatibilidad
const employeesCollection = db.collection("employees");
const confirmationsCollection = db.collection("confirmations");
const menuCollection = db.collection("menus");

// Remove the export statement completely to avoid syntax errors in non-module scripts