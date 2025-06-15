// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import {initializeAuth, getReactNativePersistence} from 'firebase/auth';
import AsyncStorage from "@react-native-async-storage/async-storage";
import {getFirestore} from "firebase/firestore"; 

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBq36H09C04G3pqeWA0kfwObEMkY2Jj5o",
  authDomain: "moneymap-f497e.firebaseapp.com",
  projectId: "moneymap-f497e",
  storageBucket: "moneymap-f497e.firebasestorage.app",
  messagingSenderId: "960728835851",
  appId: "1:960728835851:web:10517cb456507c0e63240e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

//auth
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
});

//db
export const firestore = getFirestore(app);