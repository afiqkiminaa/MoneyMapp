import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth, firestore } from "@/config/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Alert, AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage"; // Added AsyncStorage

// --- CRITICAL CHANGE: COMMENT THIS OUT FOR EXPO GO ---
// The line below is what crashes Expo Go. Uncomment it only when you move to Dev Build.
// import { GoogleSignin } from '@react-native-google-signin/google-signin';

// --- TYPE DEFINITIONS ---
interface AuthResponse {
  success: boolean;
  msg: string;
  user?: User;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (email: string, password: string, name: string) => Promise<AuthResponse>;
  logout: () => Promise<AuthResponse>;
  forgotPassword: (email: string) => Promise<AuthResponse>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<AuthResponse>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Added: 2 Days in milliseconds (2 * 24 * 60 * 60 * 1000)
const SESSION_TIMEOUT = 172800000; 

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Added: Track app state for inactivity check
  const appState = useRef(AppState.currentState);

  // --- SESSION MANAGER HELPERS ---
  const updateLastActive = async () => {
    try {
      await AsyncStorage.setItem("lastActive", Date.now().toString());
    } catch (e) {
      console.error("Failed to update session time", e);
    }
  };

  const checkSessionTimeout = async (currentUser: User | null): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const lastActiveStr = await AsyncStorage.getItem("lastActive");
      
      if (lastActiveStr) {
        const lastActive = parseInt(lastActiveStr, 10);
        const now = Date.now();

        // If more than 2 days have passed
        if (now - lastActive > SESSION_TIMEOUT) {
          console.log("Session expired. Logging out.");
          // Clear session and auth
          await signOut(auth);
          await AsyncStorage.removeItem("lastActive");
          setUser(null);
          Alert.alert("Session Expired", "You have been logged out due to inactivity.");
          return false; // <--- RETURN FALSE (Expired)
        }
      }
      
      // If session is valid, refresh the timestamp
      await updateLastActive();
      return true; // <--- RETURN TRUE (Valid)
    } catch (e) {
      console.error("Session check failed", e);
      return true; // Default to keep user logged in on error
    }
  };

  // --- COMMENT OUT CONFIGURATION ---
  /*
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "YOUR_WEB_CLIENT_ID_HERE", 
      offlineAccess: true,
    });
  }, []);
  */

  // Monitor auth state
 useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // MODIFIED: Check if the session is valid BEFORE setting state
        const isSessionValid = await checkSessionTimeout(currentUser);
        
        if (isSessionValid) {
          setUser(currentUser);
        } else {
          // If session is invalid, checkSessionTimeout already handled the cleanup
          // and triggered signOut. We explicitly ensure user is null here.
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // Added: Monitor App State (Background vs Foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to foreground -> check if session expired
        if (user) {
          checkSessionTimeout(user);
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  // --- TEMPORARY GOOGLE FUNCTION (SAFE FOR EXPO GO) ---
  const signInWithGoogle = async (): Promise<AuthResponse> => {
    // Alert the user that this feature is disabled in Expo Go
    Alert.alert(
      "Development Mode",
      "Google Sign In is disabled because you are using Expo Go. You must use a Development Build to test this feature."
    );
    return { success: false, msg: "Disabled in Expo Go" };

    /* // UNCOMMENT THIS BLOCK WHEN  SWITCH TO DEV BUILD
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      
      if (!idToken) throw new Error('No ID token found');

      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);

      const userRef = doc(firestore, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: result.user.displayName || "User", 
          email: result.user.email,
          createdAt: new Date(),
          authProvider: "google",
        });
      }
      
      // Added: Update session on Google login
      await updateLastActive();

      return { success: true, msg: "Google sign-in successful" };

    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.code === 'SIGN_IN_CANCELLED') {
        return { success: false, msg: "User cancelled the login flow" };
      } else if (error.code === 'IN_PROGRESS') {
        return { success: false, msg: "Sign in is already in progress" };
      } else {
        return { success: false, msg: error.message || "Google sign-in failed" };
      }
    }
    */
  };

  // --- OTHER FUNCTIONS (UNCHANGED) ---
  
  const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
    try {
      if (!email || !password || !name) return { success: false, msg: "All fields are required" };
      if (password.length < 8) return { success: false, msg: "Password must be at least 8 characters long" };

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });

      const userRef = doc(firestore, "users", userCredential.user.uid);
      await setDoc(userRef, {
        name: name,
        email: email,
        createdAt: new Date(),
        authProvider: "email",
      });

      // Added: Start session timer
      await updateLastActive();

      return { success: true, msg: "Account created successfully", user: userCredential.user };
    } catch (error: any) {
      return { success: false, msg: error.message };
    }
  };

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      if (!email || !password) return { success: false, msg: "Email and password are required" };
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Added: Start session timer
      await updateLastActive();
      
      return { success: true, msg: "Login successful", user: userCredential.user };
    } catch (error: any) {
      return { success: false, msg: error.message };
    }
  };

  const logout = async (): Promise<AuthResponse> => {
    try {
      // COMMENT OUT GOOGLE SIGNOUT
      // try { await GoogleSignin.signOut(); } catch (e) {}
      
      await signOut(auth);
      
      // Added: Clear session timer
      await AsyncStorage.removeItem("lastActive");
      
      setUser(null);
      return { success: true, msg: "Logged out successfully" };
    } catch (error: any) {
      setUser(null);
      return { success: false, msg: error.message };
    }
  };

  const forgotPassword = async (email: string): Promise<AuthResponse> => {
    try {
      if (!email) return { success: false, msg: "Email is required" };
      await sendPasswordResetEmail(auth, email);
      return { success: true, msg: "Password reset link sent" };
    } catch (error: any) {
      return { success: false, msg: error.message };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<AuthResponse> => {
    try {
      if (!currentPassword || !newPassword) return { success: false, msg: "All fields are required" };
      if (newPassword.length < 8) return { success: false, msg: "New password must be 8+ chars" };
      if (!user?.email) return { success: false, msg: "User not authenticated" };

      const cred = await signInWithEmailAndPassword(auth, user.email, currentPassword);
      await updatePassword(cred.user, newPassword);
      
      // Added: Update session because user is active
      await updateLastActive();
      
      return { success: true, msg: "Password changed successfully" };
    } catch (error: any) {
      return { success: false, msg: error.message };
    }
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    changePassword,
    signInWithGoogle,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};