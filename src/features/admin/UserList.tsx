import { useEffect, useState } from "react";
import { ref, get, update } from "firebase/database";
import { db } from "../../firebaseConfig";
import type { AppUser } from "../calendar/types";

export function UserList() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Pobieranie listy użytkowników
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await get(ref(db, "users"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Zamiana obiektu {uid: {data}} na tablicę [{uid, ...data}]
        const usersArray = Object.entries(data).map(([uid, val]: [string, any]) => ({
          uid,
          ...val,
        }));
        setUsers(usersArray);
      }
    } catch (error) {
      console.error("Błąd pobierania użytkowników:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Funkcja banowania (Zadanie 4 [cite: 110-111])
  const toggleBan = async (uid: string, currentBanStatus?: boolean) => {
    try {
      // Jeśli jest zbanowany -> false (odbanuj), jeśli nie -> true (zbanuj)
      const newStatus = !currentBanStatus; 
      
      await update(ref(db, `users/${uid}`), {
        isBanned: newStatus
      });
      
      // Odświeżamy listę lokalnie (optymistycznie)
      setUsers(prev => prev.map(u => 
        u.uid === uid ? { ...u, isBanned: newStatus } : u
      ));
      
    } catch (e) {
      alert("Nie udało się zmienić statusu bana.");
      console.error(e);
    }
  };

  if (loading) return <div>Ładowanie listy użytkowników...</div>;

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <h3>Lista zarejestrowanych użytkowników</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, background: "white" }}>
        <thead>
          <tr style={{ background: "#f0f0f0", textAlign: "left" }}>
            <th style={{ padding: 10, borderBottom: "2px solid #ddd" }}>Email</th>
            <th style={{ padding: 10, borderBottom: "2px solid #ddd" }}>Rola</th>
            <th style={{ padding: 10, borderBottom: "2px solid #ddd" }}>Status</th>
            <th style={{ padding: 10, borderBottom: "2px solid #ddd" }}>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.uid} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 10 }}>{u.email}</td>
              <td style={{ padding: 10 }}>
                {u.role === 'doctor' ? '👨‍⚕️ Lekarz' : u.role === 'admin' ? '🛡️ Admin' : '👤 Pacjent'}
              </td>
              <td style={{ padding: 10 }}>
                {u.isBanned ? (
                  <span style={{ color: "red", fontWeight: "bold" }}>ZBANOWANY</span>
                ) : (
                  <span style={{ color: "green" }}>Aktywny</span>
                )}
              </td>
              <td style={{ padding: 10 }}>
                {/* Nie pozwalamy zbanować samego siebie ani innych adminów */}
                {u.role !== 'admin' && (
                  <button 
                    onClick={() => toggleBan(u.uid, u.isBanned)}
                    style={{
                      cursor: "pointer",
                      padding: "5px 10px",
                      background: u.isBanned ? "#4CAF50" : "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: 4
                    }}
                  >
                    {u.isBanned ? "Odbanuj" : "Zbanuj"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}