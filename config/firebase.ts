// config/firebase.ts
import { initializeApp } from "firebase/app";
import { 
  initializeAuth, 
  getReactNativePersistence,
  GoogleAuthProvider
} from 'firebase/auth';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";

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

// Initialize Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Google Provider Configuration
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Initialize Firestore
export const firestore = getFirestore(app);