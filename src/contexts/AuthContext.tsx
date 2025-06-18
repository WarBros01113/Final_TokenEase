
"use client";
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  User as FirebaseUserType, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { auth, db, doc, getDoc, setDoc, serverTimestamp } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export interface AppUser extends FirebaseUserType {
  role?: 'patient' | 'doctor' | 'admin' | null;
  fullName?: string; // Stored in Firestore, might differ from displayName
  // Add other custom fields from Firestore if needed
  address?: string;
  phoneNumber?: string;
  dob?: string;
  strikes?: number;
  isBlocked?: boolean;
  blockedUntil?: string;
}

interface AuthContextType {
  user: AppUser | null;
  role: 'patient' | 'doctor' | 'admin' | null; // Kept for convenience, derived from user.role
  loading: boolean;
  signIn: (email?: string, password?: string) => Promise<{ user: AppUser; role: string | null }>;
  signUp: (email?: string, password?: string, fullName?: string) => Promise<{ user: AppUser; role: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let appUser: AppUser = { 
          ...firebaseUser, 
          uid: firebaseUser.uid, 
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          isAnonymous: firebaseUser.isAnonymous,
          metadata: firebaseUser.metadata,
          providerData: firebaseUser.providerData,
          refreshToken: firebaseUser.refreshToken,
          tenantId: firebaseUser.tenantId,
          delete: firebaseUser.delete,
          getIdToken: firebaseUser.getIdToken,
          getIdTokenResult: firebaseUser.getIdTokenResult,
          reload: firebaseUser.reload,
          toJSON: firebaseUser.toJSON,
          providerId: firebaseUser.providerId, 
         };

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          appUser = {
            ...appUser,
            role: userData.role || null,
            fullName: userData.fullName || firebaseUser.displayName, 
            address: userData.address,
            phoneNumber: userData.phoneNumber,
            dob: userData.dob,
            strikes: userData.strikes,
            isBlocked: userData.isBlocked,
            blockedUntil: userData.blockedUntil,
          };
          setRole(userData.role || null);
        } else {
          setRole(null);
          appUser.role = null;
        }
        setUser(appUser);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email?: string, password?: string) => {
    if (!email || !password) throw new Error("Email and password required.");
    // setLoading(true); // Removed: onAuthStateChanged manages the context's loading state.
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userRole = userDocSnap.exists() ? userDocSnap.data().role : null;
      
      const appUser = {
        ...userCredential.user,
        role: userRole,
        fullName: userDocSnap.exists() ? userDocSnap.data().fullName : userCredential.user.displayName,
      } as AppUser;

      return { user: appUser, role: userRole };
    } catch (error) {
      // setUser(null); // These are effectively handled by onAuthStateChanged if auth fails.
      // setRole(null);
      throw error;
    }
  };

  const signUp = async (email?: string, password?: string, fullName?: string) => {
    if (!email || !password || !fullName) throw new Error("Email, password, and full name required.");
    // setLoading(true); // Removed: onAuthStateChanged manages the context's loading state.
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      await updateProfile(firebaseUser, { displayName: fullName });

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userRole = 'patient'; 
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: fullName, 
        fullName: fullName, 
        role: userRole,
        createdAt: serverTimestamp(),
        strikes: 0,
        isBlocked: false,
      });
      
      const appUser = {
        ...firebaseUser,
        displayName: fullName,
        role: userRole,
        fullName: fullName,
      } as AppUser;
      return { user: appUser, role: userRole };
    } catch (error) {
      // setUser(null); // These are effectively handled by onAuthStateChanged if auth fails.
      // setRole(null);
      throw error;
    }
  };

  const signOut = async () => {
    // setLoading(true); // Removed: onAuthStateChanged will set loading to true, then false.
    try {
      await firebaseSignOut(auth);
      router.push('/'); 
    } catch (error) {
      console.error("Sign out error", error);
      // Let onAuthStateChanged handle UI updates related to loading/user state.
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
