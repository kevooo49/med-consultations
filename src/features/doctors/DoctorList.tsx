import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../../firebaseConfig";
import type { AppUser } from "../calendar/types";

interface Props {
  onSelectDoctor: (doctorId: string) => void;
}

export function DoctorList({ onSelectDoctor }: Props) {
  const [doctors, setDoctors] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const snapshot = await get(ref(db, "users"));
        if (snapshot.exists()) {
          const data = snapshot.val();
          // POPRAWKA: Używamy Object.entries, aby dostać [klucz, wartość]
          // Klucz to UID, Wartość to dane usera (email, imię...)
          const users: AppUser[] = Object.entries(data).map(([uid, val]: [string, any]) => ({
            uid, // <--- TERAZ UID JEST POPRAWNE
            ...val
          }));
          
          const docs = users.filter(u => u.role === "doctor");
          setDoctors(docs);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Ładowanie listy lekarzy...</div>;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 40 }}>
      <h1 style={{ textAlign: "center", marginBottom: 10 }}>Nasi Specjaliści</h1>
      <p style={{ textAlign: "center", color: "#666", marginBottom: 40 }}>
        Wybierz lekarza, aby sprawdzić dostępność i umówić wizytę.
      </p>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", 
        gap: 20 
      }}>
        {doctors.map(doc => (
          <div 
            key={doc.uid} 
            onClick={() => {
              console.log("Wybrano lekarza:", doc.uid); // Debug
              onSelectDoctor(doc.uid);
            }}
            style={{
              background: "white",
              borderRadius: 12,
              padding: 20,
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              textAlign: "center",
              border: "1px solid #f3f4f6"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)";
            }}
          >
            <img 
              src={doc.avatarUrl || `https://ui-avatars.com/api/?name=${doc.firstName}+${doc.lastName}`} 
              alt="Avatar"
              style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", marginBottom: 15, border: "3px solid #e5e7eb" }}
            />
            <h3 style={{ margin: "0 0 5px 0", color: "#111827" }}>
              {doc.firstName} {doc.lastName}
            </h3>
            <div style={{ color: "#2563eb", fontWeight: 500, fontSize: "0.9rem", marginBottom: 15 }}>
              {doc.specialization || "Lekarz"}
            </div>
            <button className="btn" style={{ width: "100%" }}>
              Zobacz grafik
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}