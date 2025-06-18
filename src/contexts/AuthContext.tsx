
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
  // setAuthState is removed as state is now primarily driven by onAuthStateChanged
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
          ...firebaseUser, // Spread properties from Firebase Auth user
          uid: firebaseUser.uid, // Ensure uid is explicitly set
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
          providerId: firebaseUser.providerId, // Added from FirebaseUserType
         };

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          appUser = {
            ...appUser,
            role: userData.role || null,
            fullName: userData.fullName || firebaseUser.displayName, // Prioritize Firestore fullName
            address: userData.address,
            phoneNumber: userData.phoneNumber,
            dob: userData.dob,
            strikes: userData.strikes,
            isBlocked: userData.isBlocked,
            blockedUntil: userData.blockedUntil,
          };
          setRole(userData.role || null);
        } else {
          // User exists in Auth but not in Firestore (e.g., incomplete signup or manual deletion)
          // For now, set role to null. Production app might redirect to a profile completion page.
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
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and role from Firestore
      // For immediate return, we can optimistically fetch role here too or wait for onAuthStateChanged
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
      setUser(null);
      setRole(null);
      throw error;
    } finally {
      // setLoading(false); // onAuthStateChanged will set loading to false
    }
  };

  const signUp = async (email?: string, password?: string, fullName?: string) => {
    if (!email || !password || !fullName) throw new Error("Email, password, and full name required.");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile
      await updateProfile(firebaseUser, { displayName: fullName });

      // Create user document in Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userRole = 'patient'; // Default role for new sign-ups
      await setDoc(userDocRef, {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: fullName, // Store the full name from form
        fullName: fullName, 
        role: userRole,
        createdAt: serverTimestamp(),
        strikes: 0,
        isBlocked: false,
      });
      
      // onAuthStateChanged will pick up the new user and their Firestore data
      const appUser = {
        ...firebaseUser,
        displayName: fullName,
        role: userRole,
        fullName: fullName,
      } as AppUser;
      return { user: appUser, role: userRole };
    } catch (error) {
      setUser(null);
      setRole(null);
      throw error;
    } finally {
      // setLoading(false); // onAuthStateChanged will set loading to false
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will set user and role to null
      router.push('/'); 
    } catch (error) {
      console.error("Sign out error", error);
    } finally {
      // setLoading(false); // onAuthStateChanged will set loading to false
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
