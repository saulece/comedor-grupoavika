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

// Check if Firebase is already initialized to prevent duplicate initialization
if (!firebase.apps.length) {
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized");
} else {
    console.log("Firebase already initialized");
}

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Optional: Initialize Analytics
const analytics = firebase.analytics ? firebase.analytics() : null;