import { useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { SPECIALIZATIONS } from "../../utils/specializations";
import type { Backend } from "../../services/backend";

const firebaseConfig = {
  apiKey: "AIzaSyCOBUTHY9Fgq8b-hj8u0kN5w7EUytGiB14",
  authDomain: "med-consultations.firebaseapp.com",
  projectId: "med-consultations",
  storageBucket: "med-consultations.firebasestorage.app",
  messagingSenderId: "742435994386",
  appId: "1:742435994386:web:0e9345e5ebf537a54051cb",
  measurementId: "G-D2X7H66ZW7",
  databaseURL: "https://med-consultations-default-rtdb.europe-west1.firebasedatabase.app/"
};

interface Props {
  backend: Backend;
}

export function CreateDoctorForm({ backend }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [specialization, setSpecialization] = useState(SPECIALIZATIONS[10]);
  const [city, setCity] = useState("");
  
  const [avatarUrl, setAvatarUrl] = useState(""); 
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // 1. Tworzymy konto w Auth (Secondary App trick)
      const secondaryApp = initializeApp(firebaseConfig, "Secondary");
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = userCredential.user.uid;
      await signOut(secondaryAuth);

      // 2. Obsługa zdjęcia (Logika fallbacku)
      let finalAvatarUrl = avatarUrl;
      
      if (!finalAvatarUrl) {
        finalAvatarUrl = `https://ui-avatars.com/api/?background=random&color=fff&name=${firstName}+${lastName}`;
      }

      // 3. Zapis do Bazy Danych
      await backend.createUser({
        uid: newUid,
        email,
        role: "doctor",
        firstName,
        lastName,
        specialization,
        city,
        avatarUrl: finalAvatarUrl,
        createdAt: new Date().toISOString()
      });

      setMessage("✅ Utworzono lekarza!");
      // Reset
      setEmail("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setCity("");
      setAvatarUrl("");
      
    } catch (error: any) {
      console.error(error);
      setMessage("❌ Błąd: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, background: "#fff", border: "1px solid #ddd", borderRadius: 8, maxWidth: 500 }}>
      <h3>Dodaj Nowego Lekarza</h3>
      <form onSubmit={handleCreateDoctor} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        
        <div style={{ display: "flex", gap: 10 }}>
          <input 
            placeholder="Imię" 
            value={firstName} onChange={e => setFirstName(e.target.value)} 
            required style={{ flex: 1, padding: 8 }} 
          />
          <input 
            placeholder="Nazwisko" 
            value={lastName} onChange={e => setLastName(e.target.value)} 
            required style={{ flex: 1, padding: 8 }} 
          />
        </div>

        <input 
          placeholder="Miasto (np. Warszawa)" 
          value={city} onChange={e => setCity(e.target.value)} 
          required style={{ padding: 8 }} 
        />

        <select 
          value={specialization} 
          onChange={e => setSpecialization(e.target.value)}
          style={{ padding: 8 }}
        >
          {SPECIALIZATIONS.map(spec => (
            <option key={spec} value={spec}>{spec}</option>
          ))}
        </select>

        {/* INPUT TEKSTOWY */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 5}}>
          <label style={{fontSize: '0.9rem'}}>Link do zdjęcia (opcjonalne):</label>
          <input 
            type="text" 
            placeholder="https://example.com/photo.jpg"
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            style={{ padding: 8 }} 
          />
          <small style={{color: 'gray'}}>Pozostaw puste, aby wygenerować automatycznie.</small>
        </div>

        <hr style={{border: 'none', borderTop: '1px solid #eee', margin: '5px 0'}}/>

        <input 
          type="email" placeholder="Email" 
          value={email} onChange={e => setEmail(e.target.value)} 
          required style={{ padding: 8 }} 
        />
        <input 
          type="password" placeholder="Hasło" 
          value={password} onChange={e => setPassword(e.target.value)} 
          required style={{ padding: 8 }} 
        />

        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Przetwarzanie..." : "Utwórz konto lekarza"}
        </button>

        {message && <p style={{ marginTop: 10, fontWeight: "bold" }}>{message}</p>}
      </form>
    </div>
  );
}