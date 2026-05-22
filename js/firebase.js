import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js"; // Added for file uploads

const firebaseConfig = {
    apiKey: "AIzaSyDcBm76C9A1u20LOLEgIhBi3kD4kLufRgg",
    authDomain: "study-room-1f41f.firebaseapp.com",
    projectId: "study-room-1f41f",
    storageBucket: "study-room-1f41f.firebasestorage.app",
    messagingSenderId: "787077433801",
    appId: "1:787077433801:web:1463bdcd7c95c3ff780018"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export instances with modern syntax
export const db = getFirestore(app);
export const storage = getStorage(app);