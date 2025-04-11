/**
 * Inicialización del modo desarrollo
 * Este archivo se encarga de inicializar los datos de prueba cuando se activa el modo desarrollo
 */

// Función para inicializar datos de prueba en Firestore
async function initializeTestData() {
    if (typeof devLog !== 'function') {
        console.log('[DEV] Inicializando datos de prueba...');
    } else {
        devLog('Inicializando datos de prueba...');
    }
    
    // Verificar si Firebase está disponible
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error('[DEV] Firebase no está disponible. No se pueden inicializar datos de prueba.');
        return;
    }
    
    // Obtener instancia de Firestore
    const firestore = firebase.firestore();
    
    try {
        // Cargar datos de prueba si están disponibles
        if (typeof TEST_BRANCHES === 'undefined' || 
            typeof TEST_USERS === 'undefined' || 
            typeof TEST_WEEKLY_MENUS === 'undefined' || 
            typeof TEST_EMPLOYEES === 'undefined') {
            
            console.warn('[DEV] Datos de prueba no definidos. Cargue primero development.js');
            return;
        }
        
        // Inicializar sucursales de prueba
        for (const branch of TEST_BRANCHES) {
            await firestore.collection('branches').doc(branch.id).set(branch);
            if (typeof devLog === 'function') {
                devLog(`Sucursal de prueba creada: ${branch.name}`);
            }
        }
        
        // Inicializar usuarios de prueba
        for (const [key, user] of Object.entries(TEST_USERS)) {
            await firestore.collection('users').doc(user.uid).set({
                displayName: user.displayName,
                email: user.email,
                role: user.role,
                branch: user.branch,
                permissions: user.permissions || [],
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            if (typeof devLog === 'function') {
                devLog(`Usuario de prueba creado: ${user.displayName} (${user.role})`);
            }
        }
        
        // Inicializar menús semanales de prueba
        for (const menu of TEST_WEEKLY_MENUS) {
            // Crear documento principal del menú
            const menuRef = firestore.collection('weeklyMenus').doc(menu.id);
            await menuRef.set({
                name: menu.name,
                startDate: menu.startDate,
                status: menu.status,
                confirmStartDate: menu.confirmStartDate,
                confirmEndDate: menu.confirmEndDate,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Crear menús diarios
            if (menu.dailyMenus) {
                for (const [day, dailyMenu] of Object.entries(menu.dailyMenus)) {
                    await menuRef.collection('dailyMenus').doc(day).set({
                        ...dailyMenu,
                        day: day
                    });
                }
            }
            
            if (typeof devLog === 'function') {
                devLog(`Menú semanal de prueba creado: ${menu.name}`);
            }
        }
        
        // Inicializar empleados de prueba
        for (const employee of TEST_EMPLOYEES) {
            await firestore.collection('employees').doc(employee.id).set({
                ...employee,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            if (typeof devLog === 'function') {
                devLog(`Empleado de prueba creado: ${employee.name}`);
            }
        }
        
        if (typeof devLog === 'function') {
            devLog('Datos de prueba inicializados correctamente');
        } else {
            console.log('[DEV] Datos de prueba inicializados correctamente');
        }
        
        // Actualizar el panel de desarrollo si existe
        if (typeof updateDevLog === 'function') {
            updateDevLog('Datos de prueba inicializados correctamente');
        }
        
    } catch (error) {
        console.error('[DEV] Error al inicializar datos de prueba:', error);
        
        if (typeof devLog === 'function') {
            devLog(`Error al inicializar datos de prueba: ${error.message}`);
        }
        
        // Actualizar el panel de desarrollo si existe
        if (typeof updateDevLog === 'function') {
            updateDevLog(`Error al inicializar datos: ${error.message}`);
        }
    }
}

// Función para limpiar datos de prueba
async function clearTestData() {
    if (typeof devLog !== 'function') {
        console.log('[DEV] Limpiando datos de prueba...');
    } else {
        devLog('Limpiando datos de prueba...');
    }
    
    // Verificar si Firebase está disponible
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.error('[DEV] Firebase no está disponible. No se pueden limpiar datos de prueba.');
        return;
    }
    
    // Obtener instancia de Firestore
    const firestore = firebase.firestore();
    
    try {
        // Eliminar datos de prueba si están disponibles
        if (typeof TEST_BRANCHES === 'undefined' || 
            typeof TEST_USERS === 'undefined' || 
            typeof TEST_WEEKLY_MENUS === 'undefined' || 
            typeof TEST_EMPLOYEES === 'undefined') {
            
            console.warn('[DEV] Datos de prueba no definidos. No se pueden limpiar.');
            return;
        }
        
        // Eliminar sucursales de prueba
        for (const branch of TEST_BRANCHES) {
            await firestore.collection('branches').doc(branch.id).delete();
        }
        
        // Eliminar usuarios de prueba
        for (const [key, user] of Object.entries(TEST_USERS)) {
            await firestore.collection('users').doc(user.uid).delete();
        }
        
        // Eliminar menús semanales de prueba
        for (const menu of TEST_WEEKLY_MENUS) {
            // Eliminar menús diarios primero
            const dailyMenusSnapshot = await firestore.collection('weeklyMenus')
                .doc(menu.id)
                .collection('dailyMenus')
                .get();
            
            const batch = firestore.batch();
            dailyMenusSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            
            // Eliminar el documento principal del menú
            await firestore.collection('weeklyMenus').doc(menu.id).delete();
        }
        
        // Eliminar empleados de prueba
        for (const employee of TEST_EMPLOYEES) {
            await firestore.collection('employees').doc(employee.id).delete();
        }
        
        if (typeof devLog === 'function') {
            devLog('Datos de prueba eliminados correctamente');
        } else {
            console.log('[DEV] Datos de prueba eliminados correctamente');
        }
        
        // Actualizar el panel de desarrollo si existe
        if (typeof updateDevLog === 'function') {
            updateDevLog('Datos de prueba eliminados correctamente');
        }
        
    } catch (error) {
        console.error('[DEV] Error al limpiar datos de prueba:', error);
        
        if (typeof devLog === 'function') {
            devLog(`Error al limpiar datos de prueba: ${error.message}`);
        }
        
        // Actualizar el panel de desarrollo si existe
        if (typeof updateDevLog === 'function') {
            updateDevLog(`Error al limpiar datos: ${error.message}`);
        }
    }
}

// Exponer funciones para uso global
window.initializeTestData = initializeTestData;
window.clearTestData = clearTestData;

// Inicializar datos de prueba automáticamente si está habilitado
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si estamos en modo desarrollo con datos de prueba
    if (typeof DEVELOPMENT_MODE !== 'undefined' && DEVELOPMENT_MODE && 
        typeof DEV_CONFIG !== 'undefined' && DEV_CONFIG.useTestData) {
        
        // Esperar a que Firebase esté inicializado
        const checkFirebase = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                clearInterval(checkFirebase);
                
                // Inicializar datos de prueba
                setTimeout(() => {
                    initializeTestData();
                }, 1000); // Esperar 1 segundo para asegurar que todo esté cargado
            }
        }, 100);
    }
});
