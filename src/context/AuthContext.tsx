import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence
} from "firebase/auth";
import { ref, get, set, child } from "firebase/database"; 
import { auth, db } from "../firebaseConfig";
import type { AppUser, UserRole } from "../features/calendar/types";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedMode = localStorage.getItem("persistenceMode");
    if (savedMode) {
        let type = browserLocalPersistence;
        if (savedMode === "SESSION") type = browserSessionPersistence;
        if (savedMode === "NONE") type = inMemoryPersistence;
        setPersistence(auth, type).catch(err => console.error("Błąd persystencji:", err));
    }
  }, []);

  useEffect(() => {
    // listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // sprawdzamy Firebase Realtime Database
          const dbRef = ref(db);
          const snapshot = await get(child(dbRef, `users/${firebaseUser.uid}`));
          
          if (snapshot.exists()) {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email!, ...snapshot.val() } as AppUser);
          } else {
            // nie ma w firebase, sprawdzamy lokalny json
            try {
              const res = await fetch(`http://localhost:3001/users?id=${firebaseUser.uid}`);
              const localData = await res.json();

              if (localData && localData.length > 0) {
                setUser(localData[0]);
              } else {
                // fallback
                console.warn("Brak profilu, tworzę tymczasowy.");
                setUser({ uid: firebaseUser.uid, email: firebaseUser.email!, role: "patient" });
              }
            } catch (localErr) {
              setUser({ uid: firebaseUser.uid, email: firebaseUser.email!, role: "patient" });
            }
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Błąd w AuthContext:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (email: string, pass: string, role: UserRole = "patient") => {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    try {
      await set(ref(db, 'users/' + res.user.uid), {
        email,
        role,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Błąd zapisu do RTDB:", e);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {loading ? <div style={{padding: 20}}>Ładowanie aplikacji...</div> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};