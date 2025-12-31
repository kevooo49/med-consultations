import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { addReview, deleteReview, listenReviews, replyToReview, type Review } from "../../services/reviewsService";
import { format } from "date-fns";

interface Props {
  doctorId: string;
}

export function ReviewsSection({ doctorId }: Props) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  
  // Stan formularza dodawania
  const [newRating, setNewRating] = useState(5);
  const [newText, setNewText] = useState("");
  
  // Stan formularza odpowiedzi (dla lekarza)
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    const unsub = listenReviews(doctorId, setReviews);
    return () => unsub();
  }, [doctorId]);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    await addReview(doctorId, {
      patientId: user.uid,
      patientEmail: user.email,
      rating: newRating,
      text: newText,
      date: new Date().toISOString()
    });
    
    setNewText("");
    setNewRating(5);
    alert("Dziękujemy za opinię!");
  };

  const handleReply = async (reviewId: string) => {
    await replyToReview(doctorId, reviewId, replyText);
    setReplyingTo(null);
    setReplyText("");
  };

  const handleDelete = async (reviewId: string) => {
    if (confirm("Czy na pewno usunąć ten komentarz?")) {
      await deleteReview(doctorId, reviewId);
    }
  };

  const isPatient = user?.role === 'patient';
  const isDoctor = user?.role === 'doctor'; // Zakładamy, że to TEN lekarz (d1)
  const isAdmin = user?.role === 'admin';
  const isBanned = user?.isBanned;

  return (
    <div style={{ padding: "20px 40px", maxWidth: 900, margin: "0 auto" }}>
      <h2>Opinie pacjentów</h2>

      {/* === FORMULARZ DODAWANIA (Tylko dla niezbanowanych pacjentów) === */}
      {isPatient && !isBanned && (
        <form onSubmit={handleAddReview} style={{ background: "#f9f9f9", padding: 15, borderRadius: 8, marginBottom: 20 }}>
          <h4>Dodaj opinię</h4>
          <div style={{ marginBottom: 10 }}>
            <label style={{ marginRight: 10 }}>Ocena:</label>
            <select 
              value={newRating} 
              onChange={e => setNewRating(Number(e.target.value))}
              style={{ padding: 5 }}
            >
              <option value="5">⭐⭐⭐⭐⭐ (5)</option>
              <option value="4">⭐⭐⭐⭐ (4)</option>
              <option value="3">⭐⭐⭐ (3)</option>
              <option value="2">⭐⭐ (2)</option>
              <option value="1">⭐ (1)</option>
            </select>
          </div>
          <textarea
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Napisz co myślisz o wizycie..."
            required
            style={{ width: "100%", height: 80, padding: 8, marginBottom: 10 }}
          />
          <button type="submit" className="btn">Wyślij opinię</button>
        </form>
      )}

      {/* === KOMUNIKAT DLA ZBANOWANYCH === */}
      {isPatient && isBanned && (
        <div style={{ background: "#ffebee", color: "#c62828", padding: 15, borderRadius: 8, marginBottom: 20, border: "1px solid #ef9a9a" }}>
          <strong>Twoje konto zostało zawieszone.</strong> <br/>
          Zgodnie z regulaminem nie możesz dodawać nowych opinii.
        </div>
      )}

      {/* === LISTA OPINII === */}
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        {reviews.length === 0 && <p>Brak opinii. Bądź pierwszy!</p>}
        
        {reviews.map(r => (
          <div key={r.id} style={{ border: "1px solid #eee", padding: 15, borderRadius: 8, background: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <strong>{r.patientEmail}</strong>
              <span style={{ color: "#666", fontSize: "0.9em" }}>{format(new Date(r.date), "dd.MM.yyyy HH:mm")}</span>
            </div>
            <div style={{ color: "#fbc02d", marginBottom: 8 }}>{"⭐".repeat(r.rating)}</div>
            <p style={{ margin: "0 0 10px 0" }}>{r.text}</p>
            
            {/* Przycisk USUWANIA (Admin) */}
            {isAdmin && (
              <button 
                onClick={() => handleDelete(r.id)}
                style={{ background: "red", color: "white", border: "none", padding: "4px 8px", fontSize: "0.8em", cursor: "pointer", borderRadius: 4 }}
              >
                Usuń komentarz (Admin)
              </button>
            )}

            {/* ODPOWIEDŹ LEKARZA */}
            {r.reply ? (
              <div style={{ marginTop: 10, background: "#e3f2fd", padding: 10, borderRadius: 4, borderLeft: "4px solid #2196f3" }}>
                <strong>Odpowiedź lekarza:</strong>
                <p style={{ margin: "5px 0 0 0" }}>{r.reply}</p>
              </div>
            ) : (
              // Formularz odpowiedzi (tylko Lekarz i jeśli jeszcze nie ma odpowiedzi)
              isDoctor && (
                <div style={{ marginTop: 10 }}>
                  {replyingTo === r.id ? (
                    <div>
                      <input 
                        type="text" 
                        value={replyText} 
                        onChange={e => setReplyText(e.target.value)} 
                        placeholder="Treść odpowiedzi..."
                        style={{ width: "70%", padding: 5, marginRight: 5 }}
                      />
                      <button onClick={() => handleReply(r.id)} className="btn" style={{ fontSize: "0.8em", padding: "5px 10px" }}>Wyślij</button>
                      <button onClick={() => setReplyingTo(null)} style={{ marginLeft: 5, background: "none", border: "none", cursor: "pointer", color: "grey" }}>Anuluj</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setReplyingTo(r.id)} 
                      style={{ background: "none", border: "none", color: "#2196f3", cursor: "pointer", textDecoration: "underline", fontSize: "0.9em" }}
                    >
                      Odpowiedz na opinię
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}