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
if (!window.firebase.apps || !window.firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Get Firebase services
const db = firebase.firestore();
const auth = firebase.auth();
const analytics = firebase.analytics();

// Collection references
const usersCollection = db.collection("users");
const employeesCollection = db.collection("employees");
const confirmationsCollection = db.collection("confirmations");
const menuCollection = db.collection("menus");

// Expose the Firebase services as global variables
window.db = db;
window.auth = auth;
window.analytics = analytics;

// Remove the export statement completely to avoid syntax errors in non-module scripts