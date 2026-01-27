import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { X } from "lucide-react";
import { SPECIALIZATIONS } from "../../../utils/specializations";
import type { Backend } from "../../../services/backend";

export function EditProfileModal({ onClose, backend }: { onClose: () => void, backend: Backend }) {
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [specialization, setSpecialization] = useState(user?.specialization || "");
  const [city, setCity] = useState(user?.city || "");
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
        city,
        avatarUrl
      };

      if (user.role === 'doctor') {
        updates.specialization = specialization;
      }

      await backend.updateUser(user.uid, updates);
      
      // Reload, żeby odświeżyć kontekst Auth
      window.location.reload(); 
      
    } catch (error) {
      console.error(error);
      alert("Błąd aktualizacji profilu");
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="modalContent" style={{width: 450, padding: 20}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
           <h3>Edytuj Profil</h3>
           <button onClick={onClose} style={{background: 'none', border: 'none', cursor: 'pointer'}}><X /></button>
        </div>
        
        <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: 15}}>
          
          <div style={{textAlign: 'center'}}>
             <img 
               src={avatarUrl || `https://ui-avatars.com/api/?name=${firstName}+${lastName}`} 
               onError={(e) => {
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

          <div>
             <label>Miasto</label>
             <input 
               value={city} onChange={e => setCity(e.target.value)}
               style={{width: '100%', padding: 8, marginTop: 4}} 
               placeholder="np. Kraków"
             />
          </div>

          {user?.role === 'doctor' && (
            <div>
              <label>Specjalizacja</label>
                <select 
                  value={specialization} 
                  onChange={e => setSpecialization(e.target.value)}
                  style={{width: '100%', padding: 8, marginTop: 4}} 
                >
                  {SPECIALIZATIONS.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
              </select>
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