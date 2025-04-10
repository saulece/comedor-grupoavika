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

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Optional: Initialize Analytics
const analytics = firebase.analytics ? firebase.analytics() : null;

console.log("Firebase initialized");