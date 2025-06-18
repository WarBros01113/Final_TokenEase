// This is a placeholder for Firebase initialization.
// In a real application, you would initialize Firebase here using your SDK and config.
// For example:
// import { initializeApp, getApps, getApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
// import { getStorage } from "firebase/storage";

// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
// };

// let app;
// if (!getApps().length) {
//   app = initializeApp(firebaseConfig);
// } else {
//   app = getApp();
// }

// export const auth = getAuth(app);
// export const db = getFirestore(app);
// export const storage = getStorage(app);

// For now, we'll export mock objects or leave it empty.
// This allows other parts of the app to import from this file
// without breaking if Firebase isn't fully set up for this exercise.

export const mockSignInWithEmailAndPassword = async (email?: string, password?: string) => {
  if (!email || !password) return Promise.reject(new Error("Email and password required"));
  if (email === "patient@example.com" && password === "password123") {
    return Promise.resolve({ user: { uid: "patient123", email, displayName: "Test Patient", photoURL: null }, role: "patient" });
  }
  if (email === "doctor@example.com" && password === "password123") {
    return Promise.resolve({ user: { uid: "doctor123", email, displayName: "Dr. Test", photoURL: null }, role: "doctor" });
  }
  if (email === "admin@example.com" && password === "password123") {
    return Promise.resolve({ user: { uid: "admin123", email, displayName: "Admin User", photoURL: null }, role: "admin" });
  }
  return Promise.reject(new Error("Invalid credentials"));
};

export const mockCreateUserWithEmailAndPassword = async (email?: string, password?: string) => {
  if (!email || !password) return Promise.reject(new Error("Email and password required"));
  // Simulate user creation
  return Promise.resolve({ user: { uid: "newUser123", email, displayName: "New Patient", photoURL: null }, role: "patient" });
};

export const mockSignOut = async () => {
  return Promise.resolve();
};

export const mockOnAuthStateChanged = (callback: (user: any) => void) => {
  // Simulate an initial check, e.g., no user logged in
  // In a real app, this would be Firebase's onAuthStateChanged
  // setTimeout(() => callback(null), 100); 
  // For now, let's not call it automatically to avoid hydration issues with default null state.
  // The AuthContext will manage the user state.
  return () => {}; // Unsubscribe function
};

// Placeholder for Firestore interactions
export const db = {
  collection: (path: string) => ({
    doc: (id?: string) => ({
      get: async () => Promise.resolve({ exists: () => false, data: () => null }),
      set: async (data: any) => Promise.resolve(),
      update: async (data: any) => Promise.resolve(),
      delete: async () => Promise.resolve(),
      onSnapshot: (callback: any) => { console.warn(`Realtime listener for ${path}/${id} not implemented`); return () => {}; }
    }),
    add: async (data: any) => Promise.resolve({ id: 'mockDocId' }),
    where: (field: string, op: string, value: any) => ({
      get: async () => Promise.resolve({ empty: true, docs: [] }),
      onSnapshot: (callback: any) => { console.warn(`Realtime query for ${path} not implemented`); return () => {}; }
    }),
    get: async () => Promise.resolve({ empty: true, docs: [] }),
    orderBy: (field: string, direction?: "asc" | "desc") => ({
       get: async () => Promise.resolve({ empty: true, docs: [] })
    })
  }),
};

// Placeholder for Storage interactions
export const storage = {
  ref: (path: string) => ({
    put: async (file: File) => Promise.resolve({ ref: { getDownloadURL: async () => `https://placehold.co/100x100.png?text=${file.name}` } }),
    getDownloadURL: async () => `https://placehold.co/100x100.png`
  })
};
