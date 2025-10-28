// app.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, onSnapshot, updateDoc, orderBy, limit, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// IMPORTANT: Replace this with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDljzxdpoUFcSwWY9bCvdvYfXJoHhnBdgs",
  authDomain: "carryease-f4b48.firebaseapp.com",
  projectId: "carryease-f4b48",
  storageBucket: "carryease-f4b48.firebasestorage.app",
  messagingSenderId: "287791437903",
  appId: "1:287791437903:web:580f5f08120f99f9b5b23a",
  measurementId: "G-M0NVZ5325R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export all the Firebase services you'll need across the app
export { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    onSnapshot, 
    updateDoc, 
    orderBy, 
    limit,
    serverTimestamp,
    deleteDoc
};







// // This code should be at the end of app.js

// document.addEventListener('DOMContentLoaded', () => {
//     // Form switching logic
//     const showLogin = document.getElementById('show-login');
//     const showRegister = document.getElementById('show-register');
//     const registerForm = document.getElementById('register-form');
//     const loginForm = document.getElementById('login-form');

//     if (showLogin && showRegister) {
//         showLogin.addEventListener('click', () => {
//             registerForm.style.display = 'none';
//             loginForm.style.display = 'block';
//         });

//         showRegister.addEventListener('click', () => {
//             loginForm.style.display = 'none';
//             registerForm.style.display = 'block';
//         });
//     }

//     // Registration logic
//     const registerBtn = document.getElementById('register-btn');
//     if (registerBtn) {
//         registerBtn.addEventListener('click', async () => {
//             const name = document.getElementById('register-name').value;
//             const email = document.getElementById('register-email').value;
//             const password = document.getElementById('register-password').value;
//             const role = document.getElementById('register-role').value;

//             try {
//                 const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//                 const user = userCredential.user;

//                 // Store user role and name in Firestore
//                 await setDoc(doc(db, "users", user.uid), {
//                     name: name,
//                     email: email,
//                     role: role,
//                     isAvailable: role === 'porter' ? true : null // Set availability for porters
//                 });

//                 alert('Registration successful!');
//                 window.location.href = role + '.html'; // Redirect to the respective dashboard
//             } catch (error) {
//                 alert('Error: ' + error.message);
//             }
//         });
//     }

//     // Login logic
//     const loginBtn = document.getElementById('login-btn');
//     if (loginBtn) {
//         loginBtn.addEventListener('click', async () => {
//             const email = document.getElementById('login-email').value;
//             const password = document.getElementById('login-password').value;

//             try {
//                 const userCredential = await signInWithEmailAndPassword(auth, email, password);
//                 const user = userCredential.user;

//                 // Get user role from Firestore
//                 const userDoc = await getDoc(doc(db, "users", user.uid));
//                 if (userDoc.exists()) {
//                     const userData = userDoc.data();
//                     alert('Login successful!');
//                     window.location.href = userData.role + '.html'; // Redirect based on role
//                 } else {
//                     alert('User data not found.');
//                 }
//             } catch (error) {
//                 alert('Error: ' + error.message);
//             }
//         });
//     }

//     // Auth state observer
//     onAuthStateChanged(auth, async (user) => {
//         if (user) {
//             // User is signed in, get their role and redirect
//             const userDoc = await getDoc(doc(db, "users", user.uid));
//             if (userDoc.exists() && window.location.pathname.includes('index.html')) {
//                 const userData = userDoc.data();
//                 window.location.href = userData.role + '.html';
//             }
//         } else {
//             // User is signed out, redirect to login page if not already there
//             if (!window.location.pathname.includes('index.html')) {
//                 window.location.href = 'index.html';
//             }
//         }
//     });
// });

