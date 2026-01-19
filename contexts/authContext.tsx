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
  sendEmailVerification, 
} from "firebase/auth";
import { auth, firestore } from "@/config/firebase";
import { doc, setDoc } from "firebase/firestore";
import { Alert, AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage"; 

// DUMMY EMAILS HERE TO SKIP VERIFICATION
const BYPASS_VERIFICATION_EMAILS = [
  "afiq@gmail.com"
]; 

// 2 Days in milliseconds
const SESSION_TIMEOUT = 172800000; 

// --- TYPES ---
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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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

        if (now - lastActive > SESSION_TIMEOUT) {
          console.log("Session expired. Logging out.");
          await signOut(auth);
          await AsyncStorage.removeItem("lastActive");
          setUser(null);
          Alert.alert("Session Expired", "You have been logged out due to inactivity.");
          return false; 
        }
      }
      
      await updateLastActive();
      return true; 
    } catch (e) {
      console.error("Session check failed", e);
      return true; 
    }
  };

 useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // CHECK: Is this user allowed to bypass verification?
        const isBypassed = currentUser.email && BYPASS_VERIFICATION_EMAILS.includes(currentUser.email);

        // If NOT verified AND NOT on the bypass list, ignore this session
        if (!currentUser.emailVerified && !isBypassed) {
           // wait for them to verify or log in manually
           setUser(null);
        } else {
            // User is verified OR is a dummy account -> check session timeout
            const isSessionValid = await checkSessionTimeout(currentUser);
            if (isSessionValid) {
              setUser(currentUser);
            } else {
              setUser(null);
            }
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // Monitor App State
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
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

  const signInWithGoogle = async (): Promise<AuthResponse> => {
    Alert.alert(
      "Development Mode",
      "Google Sign In is disabled in Expo Go."
    );
    return { success: false, msg: "Disabled in Expo Go" };
  };

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

      await sendEmailVerification(userCredential.user);
      await signOut(auth);

      return { success: true, msg: "Verification email sent", user: userCredential.user };
    } catch (error: any) {
      return { success: false, msg: error.message };
    }
  };

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      if (!email || !password) return { success: false, msg: "Email and password are required" };
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // --- BYPASS CHECK ---
      const isBypassed = user.email && BYPASS_VERIFICATION_EMAILS.includes(user.email);
      
      if (!user.emailVerified && !isBypassed) {
        await signOut(auth); 
        return { success: false, msg: "email-not-verified" };
      }

      await updateLastActive();
      setUser(user);

      return { success: true, msg: "Login successful", user: user };
    } catch (error: any) {
      return { success: false, msg: error.message };
    }
  };

  const logout = async (): Promise<AuthResponse> => {
    try {
      await signOut(auth);
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