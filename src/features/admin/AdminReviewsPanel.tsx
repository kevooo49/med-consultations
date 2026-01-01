import { useEffect, useState } from "react";
import { ref, get, remove } from "firebase/database";
import { db } from "../../firebaseConfig";
import { Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";

// Typ pomocniczy (rozszerzona opinia o ID lekarza)
type AdminReview = {
  reviewId: string;
  doctorId: string;
  patientEmail: string;
  rating: number;
  text: string;
  date: string;
};

export function AdminReviewsPanel() {
  const [allReviews, setAllReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // 1. Pobierz WSZYSTKIE opinie z bazy
      const snapshot = await get(ref(db, "reviews"));
      if (snapshot.exists()) {
        const data = snapshot.val(); // Struktura: { doctorId: { reviewId: {...} } }
        const flatList: AdminReview[] = [];

        // 2. Spłaszczamy strukturę drzewiastą do płaskiej listy
        Object.keys(data).forEach((doctorId) => {
          const docReviews = data[doctorId];
          Object.keys(docReviews).forEach((reviewId) => {
            const r = docReviews[reviewId];
            flatList.push({
              reviewId,
              doctorId,
              patientEmail: r.patientEmail,
              rating: r.rating,
              text: r.text,
              date: r.date
            });
          });
        });

        // Sortowanie od najnowszych
        flatList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllReviews(flatList);
      } else {
        setAllReviews([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (doctorId: string, reviewId: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć ten komentarz (jako Admin)?")) {
      await remove(ref(db, `reviews/${doctorId}/${reviewId}`));
      // Odśwież listę lokalnie
      setAllReviews(prev => prev.filter(r => r.reviewId !== reviewId));
      
      // Uwaga: Średnia ocena lekarza przeliczy się automatycznie przy następnym
      // wejściu na listę lekarzy (zgodnie z naszą logiką client-side calculation).
    }
  };

  if (loading) return <div>Ładowanie opinii...</div>;

  return (
    <div style={{ marginTop: 20, padding: 20, background: "white", border: "1px solid #e5e7eb", borderRadius: 8 }}>
      <h3><MessageSquare size={20} style={{verticalAlign: 'middle', marginRight: 8}}/>Moderacja Komentarzy</h3>
      <p style={{fontSize: '0.9rem', color: '#666', marginBottom: 15}}>
        Jako administrator możesz usuwać naruszające regulamin opinie ze wszystkich profili.
      </p>

      {allReviews.length === 0 ? (
        <p>Brak opinii w systemie.</p>
      ) : (
        <div style={{ maxHeight: 400, overflowY: "auto", border: "1px solid #f3f4f6", borderRadius: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead style={{ background: "#f9fafb", position: "sticky", top: 0 }}>
              <tr>
                <th style={{ padding: 10, textAlign: "left" }}>Data</th>
                <th style={{ padding: 10, textAlign: "left" }}>Autor</th>
                <th style={{ padding: 10, textAlign: "left" }}>Ocena</th>
                <th style={{ padding: 10, textAlign: "left" }}>Treść</th>
                <th style={{ padding: 10, textAlign: "center" }}>Akcja</th>
              </tr>
            </thead>
            <tbody>
              {allReviews.map((r) => (
                <tr key={r.reviewId} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 10, color: "#666" }}>
                    {format(new Date(r.date), "dd.MM HH:mm")}
                  </td>
                  <td style={{ padding: 10 }}>{r.patientEmail}</td>
                  <td style={{ padding: 10, color: "#d97706", fontWeight: "bold" }}>
                    {r.rating} ★
                  </td>
                  <td style={{ padding: 10, maxWidth: 300 }}>
                    {r.text}
                    <div style={{fontSize: '0.75rem', color: '#9ca3af'}}>ID Lekarza: {r.doctorId}</div>
                  </td>
                  <td style={{ padding: 10, textAlign: "center" }}>
                    <button 
                      onClick={() => handleDelete(r.doctorId, r.reviewId)}
                      style={{ 
                        background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c",
                        padding: 6, borderRadius: 4, cursor: "pointer"
                      }}
                      title="Usuń komentarz"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}