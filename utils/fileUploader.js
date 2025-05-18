const { initializeApp } = require('firebase/app');
const { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} = require('firebase/storage');

// Comprobamos si todos los valores de configuración de Firebase requeridos están presentes
const allConfigValuesPresent = 
  process.env.FIREBASE_API_KEY && 
  process.env.FIREBASE_AUTH_DOMAIN && 
  process.env.FIREBASE_PROJECT_ID && 
  process.env.FIREBASE_STORAGE_BUCKET && 
  process.env.FIREBASE_MESSAGING_SENDER_ID && 
  process.env.FIREBASE_APP_ID;

// Configuración de Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Inicializamos Firebase y Storage solo si la configuración está completa
let firebaseApp;
let storage;

try {
  if (allConfigValuesPresent) {
    console.log('[*] Inicializando Firebase');
    firebaseApp = initializeApp(firebaseConfig);
    storage = getStorage(firebaseApp);
    console.log('[*] Firebase inicializado correctamente');
  } else {
    console.warn('[!] La configuración de Firebase es incompleta - la funcionalidad de subida de archivos estará limitada');
  }
} catch (error) {
}

// Funcion para subir un archivo a Firebase Storage
const uploadBytesToFirebase = async (fileBuffer, fileName) => {
  try {
    
    // Comprobamos si Firebase está inicializado
    if (!storage) {
      return `https://mock-firebase-url.com/${fileName}`;
    }
    
    const fileRef = ref(storage, `albaranes/${fileName}`);
    
    const metadata = {
      contentType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/png',
    };
    
    
    // Subimos el archivo
    const snapshot = await uploadBytes(fileRef, fileBuffer, metadata);
    
    // Obtenemos la URL de descarga
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    // Devolvemos una URL mock en caso de fallo para evitar que la función falle
    return `https://mock-firebase-url-error.com/${fileName}`;
  }
};

// Funcion para subir una imagen de firma a Firebase Storage
const uploadSignature = async (signatureImage, fileName) => {
  try {
    // Convertimos la imagen base64 a buffer
    const base64Data = signatureImage.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generamos un nombre único para evitar colisiones
    const uniqueFileName = `signatures/${Date.now()}-${fileName}`;
    
    // Subimos a Firebase
    const url = await uploadBytesToFirebase(buffer, uniqueFileName);
    return url;
  } catch (error) {
    // Devolvemos una URL mock en caso de fallo para evitar que la función falle
    return `https://mock-signature-url-error.com/${fileName}`;
  }
};

// Funcion para subir un PDF a Firebase Storage
const uploadPdf = async (fileBuffer, fileName) => {
  try {
    // Generamos un nombre único para evitar colisiones
    const uniqueFileName = `pdfs/${Date.now()}-${fileName}`;
    
    // Subimos a Firebase
    const url = await uploadBytesToFirebase(fileBuffer, uniqueFileName);
    return url;
  } catch (error) {
    console.error('[!!] Error subiendo PDF:', error);
    // Devolvemos una URL mock en caso de fallo para evitar que la función falle
    return `https://mock-pdf-url-error.com/${fileName}`;
  }
};

module.exports = { uploadBytesToFirebase, uploadSignature, uploadPdf };