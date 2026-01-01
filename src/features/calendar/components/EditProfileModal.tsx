import { useState } from "react";
import { ref, update } from "firebase/database";
import { db } from "../../../firebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { X } from "lucide-react";

export function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [specialization, setSpecialization] = useState(user?.specialization || "");
  
  // ZMIANA: Edycja URL jako string
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const updates: any = {
        firstName,
        lastName,
        avatarUrl // Zapisujemy stringa z inputa
      };

      if (user.role === 'doctor') {
        updates.specialization = specialization;
      }

      await update(ref(db, `users/${user.uid}`), updates);
      
      // Reload, żeby odświeżyć kontekst
      window.location.reload(); 
      
    } catch (error) {
      console.error(error);
      alert("Błąd aktualizacji profilu");
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalContent" style={{width: 450}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
           <h3>Edytuj Profil</h3>
           <button onClick={onClose} style={{background: 'none', border: 'none', cursor: 'pointer'}}><X /></button>
        </div>
        
        <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: 15}}>
          
          <div style={{textAlign: 'center'}}>
             {/* Podgląd */}
             <img 
               src={avatarUrl || `https://ui-avatars.com/api/?name=${firstName}+${lastName}`} 
               onError={(e) => {
                   // Fallback jeśli link jest zły
                   (e.target as HTMLImageElement).src = "https://via.placeholder.com/100?text=Brak";
               }}
               style={{width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd'}}
             />
             <br/>
             <div style={{marginTop: 10}}>
                <label style={{fontSize: '0.9rem', fontWeight: 'bold'}}>Link do zdjęcia:</label>
                <input 
                  type="text" 
                  value={avatarUrl} 
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  style={{width: '100%', padding: 8, marginTop: 4}}
                />
             </div>
          </div>

          <div style={{display: 'flex', gap: 10}}>
             <div style={{flex: 1}}>
                <label>Imię</label>
                <input 
                  value={firstName} onChange={e => setFirstName(e.target.value)}
                  style={{width: '100%', padding: 8, marginTop: 4}} 
                />
             </div>
             <div style={{flex: 1}}>
                <label>Nazwisko</label>
                <input 
                  value={lastName} onChange={e => setLastName(e.target.value)}
                  style={{width: '100%', padding: 8, marginTop: 4}} 
                />
             </div>
          </div>

          {user?.role === 'doctor' && (
            <div>
               <label>Specjalizacja</label>
               <input 
                 value={specialization} onChange={e => setSpecialization(e.target.value)}
                 style={{width: '100%', padding: 8, marginTop: 4}} 
               />
            </div>
          )}

          <div className="modalActions">
            <button type="button" onClick={onClose} className="btn secondary">Anuluj</button>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Zapisywanie..." : "Zapisz zmiany"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}