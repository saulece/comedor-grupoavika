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

// Initialize Firebase only if it hasn't been initialized already
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Get Firebase services
const db = firebase.firestore();
const auth = firebase.auth();

// Initialize analytics if available
let analytics = null;
try {
  if (firebase.analytics) {
    analytics = firebase.analytics();
  }
} catch (e) {
  console.warn("Firebase analytics not available: ", e);
}

// Make services and collections available globally
window.db = db;
window.auth = auth;
window.analytics = analytics;
window.employeesCollection = db.collection("employees");
window.confirmationsCollection = db.collection("confirmations");
window.menuCollection = db.collection("menus");

// Also expose as variables for direct imports
const employeesCollection = db.collection("employees");
const confirmationsCollection = db.collection("confirmations");
const menuCollection = db.collection("menus");