import { useEffect, useState } from "react";
import { Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
// 1. Importujemy interfejs Backend
import type { Backend } from "../../services/backend";

type AdminReview = {
  reviewId: string;
  doctorId: string;
  patientEmail: string;
  rating: number;
  text: string;
  date: string;
};

// 2. Przyjmujemy backend w propsach
export function AdminReviewsPanel({ backend }: { backend: Backend }) {
  const [allReviews, setAllReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // 3. Używamy abstrakcji backendu zamiast bezpośredniego strzału do Firebase
      const data = await backend.getAllReviews();
      
      if (data) {
        const flatList: AdminReview[] = [];

        // Logika spłaszczania zostaje ta sama, bo oba backendy zwracają podobną strukturę
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
    // odświeżenie jak zmieni się backend
  }, [backend]);

  const handleDelete = async (doctorId: string, reviewId: string) => {
    if (window.confirm("Czy na pewno chcesz usunąć ten komentarz (jako Admin)?")) {
      
      // 4. Usuwanie przez backend
      await backend.deleteReview(doctorId, reviewId);
      
      // Odśwież listę lokalnie
      setAllReviews(prev => prev.filter(r => r.reviewId !== reviewId));
    }
  };

  if (loading) return <div>Ładowanie opinii...</div>;

  return (
    <div style={{ marginTop: 20, padding: 20, background: "white", border: "1px solid #e5e7eb", borderRadius: 8 }}>
      <h3><MessageSquare size={20} style={{verticalAlign: 'middle', marginRight: 8}}/>Moderacja Komentarzy</h3>
      <p style={{fontSize: '0.9rem', color: '#666', marginBottom: 15}}>
        Jako administrator możesz usuwać naruszające regulamin opinie ze wszystkich profili.
        (Tryb bazy: <strong>{localStorage.getItem('backendType') || 'firebase'}</strong>)
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