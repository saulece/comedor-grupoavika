// Este código podría ir en un archivo js/admin/create-users.js
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { db } from "../firebase-config.js";
import { doc, setDoc } from "firebase/firestore";

async function createCoordinatorUser(email, password, name, branch) {
  try {
    const auth = getAuth();
    // Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Crear documento de usuario en Firestore
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      role: "coordinator",
      branch: branch,
      createdAt: new Date()
    });
    
    console.log(`Usuario coordinador creado para sucursal ${branch}`);
    return user.uid;
  } catch (error) {
    console.error("Error al crear usuario coordinador:", error);
    throw error;
  }
}

// Ejemplo de uso para crear coordinadores para cada sucursal
const sucursales = [
  "Fuentes", "Delicias", "Centenario", "Ishinoka", 
  "Matriz", "Cedis", "Coorporativo"
];

async function createAllCoordinators() {
  for (let sucursal of sucursales) {
    const email = `coordinador.${sucursal.toLowerCase()}@tuempresa.com`;
    const password = "Contraseña123"; // Deberías generar contraseñas seguras y únicas
    const name = `Coordinador ${sucursal}`;
    
    try {
      await createCoordinatorUser(email, password, name, sucursal);
    } catch (error) {
      console.error(`Error al crear coordinador para ${sucursal}:`, error);
    }
  }
}

// Este botón podría estar en una página de administración
document.getElementById("createCoordinatorsBtn").addEventListener("click", async () => {
  await createAllCoordinators();
  alert("Usuarios coordinadores creados exitosamente");
});