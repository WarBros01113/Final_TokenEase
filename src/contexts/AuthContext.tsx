
"use client";
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { mockOnAuthStateChanged, mockSignOut, mockSignInWithEmailAndPassword, mockCreateUserWithEmailAndPassword } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  user: User | null;
  role: 'patient' | 'doctor' | 'admin' | null;
  loading: boolean;
  signIn: (email?: string, password?: string) => Promise<any>;
  signUp: (email?: string, password?: string) => Promise<any>;
  signOut: () => Promise<void>;
  setAuthState: (user: User | null, role: 'patient' | 'doctor' | 'admin' | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'patient' | 'doctor' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Attempt to load user from localStorage (very basic persistence)
    try {
      const storedUser = localStorage.getItem('tokenease-user');
      const storedRole = localStorage.getItem('tokenease-role') as 'patient' | 'doctor' | 'admin' | null;
      if (storedUser && storedRole) {
        setUser(JSON.parse(storedUser));
        setRole(storedRole);
      }
    } catch (error) {
      console.error("Failed to load user from localStorage", error);
    }
    setLoading(false);
    
    // In a real Firebase app, you'd use onAuthStateChanged here:
    // const unsubscribe = mockOnAuthStateChanged(async (firebaseUser) => {
    //   if (firebaseUser) {
    //     // Fetch role from Firestore
    //     // const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
    //     // setUser(firebaseUser);
    //     // setRole(userDoc.exists() ? userDoc.data().role : null);
    //     setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, photoURL: firebaseUser.photoURL });
    //     // For mock, setting a default role if user exists from mockOnAuthStateChanged
    //     // This part is tricky without real Firebase. We'll rely on explicit signIn for role.
    //   } else {
    //     setUser(null);
    //     setRole(null);
    //   }
    //   setLoading(false);
    // });
    // return () => unsubscribe();
  }, []);

  const setAuthState = (newUser: User | null, newRole: 'patient' | 'doctor' | 'admin' | null) => {
    setUser(newUser);
    setRole(newRole);
    if (newUser && newRole) {
      localStorage.setItem('tokenease-user', JSON.stringify(newUser));
      localStorage.setItem('tokenease-role', newRole);
    } else {
      localStorage.removeItem('tokenease-user');
      localStorage.removeItem('tokenease-role');
    }
  };
  
  const signIn = async (email?: string, password?: string) => {
    setLoading(true);
    try {
      const { user: firebaseUser, role: userRole } = await mockSignInWithEmailAndPassword(email, password);
      setAuthState(firebaseUser, userRole as 'patient' | 'doctor' | 'admin');
      return { user: firebaseUser, role: userRole };
    } catch (error) {
      setAuthState(null, null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email?: string, password?: string) => {
    setLoading(true);
    try {
      const { user: firebaseUser, role: userRole } = await mockCreateUserWithEmailAndPassword(email, password);
      // Typically, after sign up, also sign in the user or handle as per app flow
      // For mock, let's assume sign up also logs them in with patient role
      setAuthState(firebaseUser, userRole as 'patient' | 'doctor' | 'admin');
      return { user: firebaseUser, role: userRole };
    } catch (error) {
      setAuthState(null, null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await mockSignOut();
      setAuthState(null, null);
      router.push('/'); // Redirect to home after sign out
    } catch (error) {
      console.error("Sign out error", error);
      // Potentially keep user signed in if sign out fails, or handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signUp, signOut, setAuthState }}>
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
