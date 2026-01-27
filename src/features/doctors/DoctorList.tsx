import { useEffect, useState, useMemo } from "react";
import type { AppUser } from "../calendar/types";
import { Star, Search, MapPin, Filter } from "lucide-react";
import { SPECIALIZATIONS } from "../../utils/specializations";
import type { Backend } from "../../services/backend";

interface Props {
  onSelectDoctor: (doctorId: string) => void;
  backend: Backend;
}

type DocStats = {
  rating: number;
  count: number;
};

type SortOption = "rating" | "alphabetical";

export function DoctorList({ onSelectDoctor, backend }: Props) {
  const [doctors, setDoctors] = useState<AppUser[]>([]);
  const [stats, setStats] = useState<Record<string, DocStats>>({});
  const [loading, setLoading] = useState(true);

  // === STANY FILTRÓW ===
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rating");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const doctorsList = await backend.getDoctors();
        setDoctors(doctorsList);

        const reviewsData = await backend.getAllReviews();
        
        // Przeliczanie statystyk
        const newStats: Record<string, DocStats> = {};
        if (reviewsData) {
          Object.keys(reviewsData).forEach(docId => {
             const docReviewsObj = reviewsData[docId];
             if (!docReviewsObj) return;

             const docReviews = Object.values(docReviewsObj) as any[];
             const count = docReviews.length;
             const sum = docReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
             
             newStats[docId] = { 
               count, 
               rating: count > 0 ? sum / count : 0 
             };
          });
        }
        setStats(newStats);

      } catch (e) { 
        console.error(e); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchData();
  }, [backend]); // odświeżamy, gdy zmienia się backend

  // === LOGIKA FILTROWANIA ===
  const filteredDoctors = useMemo(() => {
    return doctors
      .filter(doc => {
        if (selectedSpec && doc.specialization !== selectedSpec) return false;
        const query = searchQuery.toLowerCase();
        const fullName = `${doc.firstName} ${doc.lastName}`.toLowerCase();
        const city = (doc.city || "").toLowerCase();
        return fullName.includes(query) || city.includes(query);
      })
      .sort((a, b) => {
        if (sortBy === "rating") {
          const statA = stats[a.uid]?.rating || 0;
          const statB = stats[b.uid]?.rating || 0;
          return statB - statA;
        } else {
          return (a.lastName || "").localeCompare(b.lastName || "");
        }
      });
  }, [doctors, stats, searchQuery, selectedSpec, sortBy]);

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Ładowanie listy lekarzy...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: 10 }}>Znajdź Specjalistę</h1>

      <div className="filterBar">
        <div className="searchWrapper">
          <Search size={18} style={{ position: "absolute", left: 10, color: "#9ca3af" }} />
          <input 
            type="text" 
            placeholder="Szukaj lekarza lub miasta..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="selectWrapper">
          <select 
            value={selectedSpec} 
            onChange={e => setSelectedSpec(e.target.value)}
          >
            <option value="">Wszystkie specjalizacje</option>
            {SPECIALIZATIONS.map(spec => (
              <option key={spec} value={spec}>{spec}</option>
            ))}
          </select>
        </div>

        <div className="sortWrapper">
          <span style={{ fontSize: '0.9rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
             <Filter size={16} /> Sortuj:
          </span>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value as SortOption)}
            style={{ padding: "8px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #d1d5db" }}
          >
            <option value="rating">Wg oceny</option>
            <option value="alphabetical">Alfabetycznie</option>
          </select>
        </div>
      </div>

      {filteredDoctors.length === 0 ? (
        <div style={{textAlign: 'center', padding: 40, color: '#6b7280'}}>
           Nie znaleziono lekarzy spełniających kryteria.
           <br/>
           <small>(Jeśli jesteś w trybie Local JSON, upewnij się, że dodałeś lekarzy w Panelu Admina)</small>
        </div>
      ) : (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", 
          gap: 25 
        }}>
          {filteredDoctors.map(doc => {
            const s = stats[doc.uid] || { rating: 0, count: 0 };

            return (
              <div 
                key={doc.uid} 
                onClick={() => onSelectDoctor(doc.uid)}
                style={{
                  background: "white", borderRadius: 16, padding: 20, 
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05)", 
                  cursor: "pointer", transition: "all 0.2s", 
                  textAlign: "center", border: "1px solid #f3f4f6",
                  position: 'relative', overflow: 'hidden'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 10px 20px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
                }}
              >
                <img 
                  src={doc.avatarUrl || `https://ui-avatars.com/api/?name=${doc.firstName}+${doc.lastName}`} 
                  alt="Avatar"
                  style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", marginBottom: 15, border: "4px solid #f9fafb" }}
                />
                
                <h3 style={{ margin: "0 0 4px 0", color: "#1f2937", fontSize: "1.1rem" }}>
                  {doc.firstName} {doc.lastName}
                </h3>
                
                <div style={{ color: "#3b82f6", fontWeight: 600, fontSize: "0.85rem", marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {doc.specialization || "Lekarz"}
                </div>

                {doc.city && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#6b7280', fontSize: '0.85rem', marginBottom: 12 }}>
                    <MapPin size={14} /> {doc.city}
                  </div>
                )}

                <div style={{ 
                   display: 'inline-flex', alignItems: 'center', gap: 6, 
                   background: '#fffbeb', padding: '6px 12px', borderRadius: 20, 
                   marginBottom: 20, border: '1px solid #fef3c7'
                }}>
                  <Star size={16} fill="#fbbf24" color="#fbbf24" />
                  <span style={{ fontWeight: 'bold', color: '#b45309' }}>
                    {s.count > 0 ? s.rating.toFixed(1) : "-"}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#d97706' }}>
                    ({s.count} opinii)
                  </span>
                </div>

                <button className="btn" style={{ width: "100%" }}>
                  Umów wizytę
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}