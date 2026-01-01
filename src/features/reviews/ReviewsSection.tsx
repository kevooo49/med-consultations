import { useEffect, useState, useMemo } from "react"; // Dodano useMemo
import { useAuth } from "../../context/AuthContext";
import { addReview, deleteReview, listenReviews, replyToReview, type Review } from "../../services/reviewsService";
import { format } from "date-fns";
import { Star } from "lucide-react"; // Import ikonki

interface Props {
  doctorId: string;
}

export function ReviewsSection({ doctorId }: Props) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  
  const [newRating, setNewRating] = useState(5);
  const [newText, setNewText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    const unsub = listenReviews(doctorId, setReviews);
    return () => unsub();
  }, [doctorId]);

  // === OBLICZANIE ŚREDNIEJ ===
  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const alreadyReviewed = user && reviews.some(r => r.patientId === user.uid);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      // Wywołujemy funkcję, która teraz tylko dodaje do reviews (bez edycji usera)
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
    } catch (err: any) {
      alert(err.message);
    }
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
  const isDoctor = user?.role === 'doctor';
  const isAdmin = user?.role === 'admin';
  const isBanned = user?.isBanned;

  return (
    <div style={{ padding: "20px 40px", maxWidth: 900, margin: "0 auto" }}>
      {/* Nagłówek ze średnią */}
      <div style={{display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20}}>
         <h2 style={{margin: 0}}>Opinie pacjentów</h2>
         <div style={{display: 'flex', alignItems: 'center', gap: 5, background: '#fffbeb', padding: '5px 10px', borderRadius: 20}}>
            <Star size={20} fill="#fbbf24" color="#fbbf24" />
            <span style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#b45309'}}>
              {reviews.length > 0 ? averageRating : "-"}
            </span>
            <span style={{color: '#92400e', fontSize: '0.9rem'}}>
              ({reviews.length} ocen)
            </span>
         </div>
      </div>

      {/* FORMULARZ (Bez zmian w logice) */}
      {isPatient && !isBanned && !alreadyReviewed && (
        <form onSubmit={handleAddReview} style={{ background: "#f9f9f9", padding: 15, borderRadius: 8, marginBottom: 20 }}>
          <h4>Oceń wizytę</h4>
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

      {isPatient && alreadyReviewed && (
        <div style={{ padding: 15, background: "#e3f2fd", borderRadius: 8, marginBottom: 20, color: "#0d47a1" }}>
          Dziękujemy! Dodałeś już opinię dla tego lekarza.
        </div>
      )}

      {isPatient && isBanned && (
        <div style={{ background: "#ffebee", color: "#c62828", padding: 15, borderRadius: 8, marginBottom: 20, border: "1px solid #ef9a9a" }}>
          <strong>Twoje konto zostało zawieszone.</strong> Nie możesz dodawać opinii.
        </div>
      )}

      {/* Lista opinii */}
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
            
            {isAdmin && (
              <button 
                onClick={() => handleDelete(r.id)}
                style={{ background: "red", color: "white", border: "none", padding: "4px 8px", fontSize: "0.8em", cursor: "pointer", borderRadius: 4 }}
              >
                Usuń komentarz (Admin)
              </button>
            )}

            {r.reply ? (
              <div style={{ marginTop: 10, background: "#e3f2fd", padding: 10, borderRadius: 4, borderLeft: "4px solid #2196f3" }}>
                <strong>Odpowiedź lekarza:</strong>
                <p style={{ margin: "5px 0 0 0" }}>{r.reply}</p>
              </div>
            ) : (
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