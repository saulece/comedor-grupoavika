// Firebase configuration for Comedor Grupo Avika
// Este archivo ahora solo carga el servicio centralizado

/**
 * Cargar el servicio centralizado de Firebase
 */
function loadFirebaseService() {
  if (window.firebaseService) {
    console.log("FirebaseService ya está cargado");
    return;
  }
  
  console.log("Cargando FirebaseService...");
  
  // Verificar si el script ya está cargado
  const existingScript = document.querySelector('script[src*="firebase-service.js"]');
  if (existingScript) {
    console.log("Script de FirebaseService ya está incluido");
    return;
  }
  
  // Crear y añadir el script
  const script = document.createElement('script');
  script.src = getBasePath() + "js/services/firebase-service.js";
  script.async = true;
  script.onload = function() {
    console.log("FirebaseService cargado correctamente");
  };
  script.onerror = function() {
    console.error("Error al cargar FirebaseService");
  };
  
  document.head.appendChild(script);
}

/**
 * Obtener la ruta base dependiendo de la ubicación actual
 * @returns {string} - Ruta base para usar en las redirecciones
 */
function getBasePath() {
  let basePath = "";
  
  // Determinar si estamos en una subcarpeta verificando la ruta actual
  if (window.location.pathname.includes('/pages/')) {
    basePath = "../../";
  }
  
  return basePath;
}

// Ejecutar la carga del servicio cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Cargar el servicio centralizado
  loadFirebaseService();
});

// Función para redirigir a la inicialización centralizada
window.initializeFirebase = function() {
  console.log("Redirigiendo inicialización a FirebaseService...");
  
  // Si el servicio centralizado está disponible, usarlo
  if (window.firebaseService) {
    return window.firebaseService.initialize();
  }
  
  // Si el servicio no está disponible, cargar scripts necesarios
  loadFirebaseService();
  
  // Intentar nuevamente después de un breve retraso
  setTimeout(() => {
    if (window.firebaseService) {
      window.firebaseService.initialize();
    } else {
      console.error("No se pudo cargar el servicio de Firebase");
    }
  }, 500);
  
  return false;
};