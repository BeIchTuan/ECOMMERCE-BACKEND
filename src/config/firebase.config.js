// Import the functions you need from the SDKs you need
const { initializeApp } = require("firebase/app");
const { getAnalytics } = require("firebase/analytics");
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB2XMzdN0kM7l7yo12gKKMI1mXxKtDGj4E",
  authDomain: "e-commercebackend-9ca9f.firebaseapp.com",
  projectId: "e-commercebackend-9ca9f",
  storageBucket: "e-commercebackend-9ca9f.firebasestorage.app",
  messagingSenderId: "574281346370",
  appId: "1:574281346370:web:569d1657dc1bc300316cdb",
  measurementId: "G-P34BCQ9LSB"
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);