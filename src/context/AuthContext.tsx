import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
} from "firebase/auth";
// ZMIANA: Importujemy funkcje z Realtime Database zamiast Firestore
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // === ZMIANA: POBIERANIE Z REALTIME DATABASE ===
          const dbRef = ref(db);
          // Szukamy w ścieżce: users/{uid}
          const snapshot = await get(child(dbRef, `users/${firebaseUser.uid}`));
          
          if (snapshot.exists()) {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email!, ...snapshot.val() } as AppUser);
          } else {
            console.warn("Brak profilu w bazie, używam domyślnego.");
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email!, role: "patient" });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Błąd w AuthContext:", error);
        setUser(null);
      } finally {
        setLoading(false); // To odblokuje ekran "Ładowanie..."
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (email: string, pass: string, role: UserRole = "patient") => {
    // 1. Tworzenie konta w Auth
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    
    // 2. === ZMIANA: ZAPIS DO REALTIME DATABASE ===
    // Zapisujemy rolę w ścieżce: users/{uid}
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