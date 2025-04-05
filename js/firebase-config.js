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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firebase services
const db = firebase.firestore();
const auth = firebase.auth();
const analytics = firebase.analytics();

// Collection references
const usersCollection = db.collection("users");
const employeesCollection = db.collection("employees");
const confirmationsCollection = db.collection("confirmations");
const menuCollection = db.collection("menus");

// Export initialized services for use in other files
export { db, auth, analytics };