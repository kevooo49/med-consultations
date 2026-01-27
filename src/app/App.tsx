import { useEffect, useMemo, useState } from "react";
import { addWeeks, format, subWeeks } from "date-fns";
import { CalendarWeek } from "../features/calendar/components/CalendarWeek";
import { getWeekStart } from "../features/calendar/utils/calendarMath";
import type { Absence, AvailabilityRule, Consultation } from "../features/calendar/types";
import "../styles/calendar.css";
import { consultationConflictsWithAbsence } from "../features/calendar/utils/conflicts";
import { consultationConflictsWithAvailability } from "../features/calendar/utils/availabilityConflicts";
import { InfoModal } from "../features/calendar/components/InfoModal";
import { Cart } from "../features/calendar/components/Cart";

/* === BACKENDY === */
import type { BackendType } from "../services/backend";
import { firebaseBackend } from "../services/firebaseBackend";
import { localBackend } from "../services/localBackend";
import type { Backend } from "../services/backend";

/* === AUTH I ADMIN === */
import { useAuth } from "../context/AuthContext";
import { AuthForm } from "../features/calendar/components/AuthForm";
import { UserList } from "../features/admin/UserList";
import { CreateDoctorForm } from "../features/admin/CreateDoctorForm";
import { PersistenceSettings } from "../features/admin/PersistenceSettings";
import { DoctorList } from "../features/doctors/DoctorList";
import { ReviewsSection } from "../features/reviews/ReviewsSection";
import { AdminReviewsPanel } from "../features/admin/AdminReviewsPanel";

/* === INTERFEJS === */
import { LogOut, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Settings, ArrowLeft, Megaphone } from "lucide-react";
import { EditProfileModal } from "../features/calendar/components/EditProfileModal";

/* === POWIADOMIENIA === */
import { NotificationToast } from "../features/calendar/components/NotificationToast";

/* === ROUTING === */
import { Routes, Route, useNavigate, useMatch, Navigate } from "react-router-dom";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout mode="list" />} />
      <Route path="/login" element={<MainLayout mode="login" />} />
      <Route path="/admin" element={<MainLayout mode="admin" />} />
      <Route path="/doctor/:id" element={<MainLayout mode="calendar" />} />
    </Routes>
  );
}

// === GŁÓWNY KOMPONENT LOGIKI (Obsługuje wszystkie tryby) ===
function MainLayout({ mode }: { mode: "list" | "login" | "calendar" | "admin" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Pobieramy ID lekarza z URL (tylko w trybie kalendarza)
  const match = useMatch("/doctor/:id");
  const urlDoctorId = match?.params.id;

  // === LOGIKA PRZEKIEROWAŃ ===
  useEffect(() => {
    if (user) {
      // 1. Admina zawsze wyrzucamy do panelu admina (jeśli tam nie jest)
      if (user.role === 'admin' && mode !== 'admin') {
        navigate('/admin');
        return;
      } 
      
      // 2. Lekarza zawsze do JEGO kalendarza
      if (user.role === 'doctor') {
        if (urlDoctorId !== user.uid) {
           navigate(`/doctor/${user.uid}`);
        }
        return;
      }

      // 3. Pacjent: Jeśli zalogował się na stronie logowania, wraca na listę
      if (mode === 'login') {
        navigate('/');
      }
    }
  }, [user, mode, navigate, urlDoctorId]);

  // Wyznaczamy "wybranego lekarza" na podstawie URL
  const selectedDoctorId = mode === 'calendar' ? urlDoctorId : null;

  /* =====================
      STATE
  ===================== */
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [now, setNow] = useState<Date>(() => new Date());

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Stan dla powiadomień (Megafon)
  const [announcement, setAnnouncement] = useState("");
  const [showAnnouncementInput, setShowAnnouncementInput] = useState(false);

  const [backendType, setBackendType] = useState<BackendType>(() => {
    return (localStorage.getItem("backendType") as BackendType) || "firebase";
  });

  const handleBackendChange = (newType: BackendType) => {
    setBackendType(newType);
    localStorage.setItem("backendType", newType);
  };

  const backend = backendType === "firebase" ? firebaseBackend : localBackend;
  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);

  // Reset anchorDate do dzisiaj przy zmianie trybu lub lekarza
  useEffect(() => {
    if (mode === 'calendar') {
      setAnchorDate(new Date());
    }
  }, [mode, urlDoctorId]);

  // ROLE UŻYTKOWNIKA
  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';
  // const isAdmin = user?.role === 'admin';

  // Filtracja danych według wybranego lekarza
  const targetDoctorId = selectedDoctorId || "none";
  // Filtrowanie konsultacji (Izolacja danych)
  const doctorConsultations = useMemo(
    () => consultations.filter(c => c.doctorId === targetDoctorId),
    [consultations, targetDoctorId]
  );

  // Filtrowanie dostępności i absencji (Izolacja danych)
  const doctorAvailability = useMemo(
    () => availabilityRules.filter(r => r.doctorId === targetDoctorId),
    [availabilityRules, targetDoctorId]
  );

  const doctorAbsences = useMemo(
    () => absences.filter(a => a.doctorId === targetDoctorId),
    [absences, targetDoctorId]
  );
  // Elementy w koszyku (tylko dla pacjentów)
  const cartItems = useMemo(() => 
    doctorConsultations.filter(c => c.status === "draft" && (c as any).patientId === user?.uid),
  [doctorConsultations, user]);

  // Listenery do backendu (ładowanie danych)
  useEffect(() => {
    // Admin i lista lekarzy nie potrzebują ładować szczegółów kalendarza
    if (mode === 'admin') return;
    if (mode !== 'calendar' || !targetDoctorId) return;

    const u1 = backend.listenConsultations(setConsultations);
    const u2 = backend.listenAvailability(setAvailabilityRules);
    const u3 = backend.listenAbsences(setAbsences);

    return () => {
      u1(); u2(); u3();
    };
  }, [backendType, backend, mode, targetDoctorId]);

  /* =====================
      HANDLERS
  ===================== */
  async function handleAddAvailability(rule: AvailabilityRule) {
    if (!isDoctor) return; 
    
    try {
        // Tworzymy obiekt z ID lekarza
        const payload = { ...rule, doctorId: user?.uid };
        
        const cleanPayload = JSON.parse(JSON.stringify(payload));
        
        console.log("Wysyłam dostępność:", cleanPayload); // Debug w konsoli
        await backend.addAvailability(cleanPayload);
        
    } catch (e: any) {
        console.error("Błąd dodawania dostępności:", e);
        alert("Wystąpił błąd przy zapisie: " + e.message);
    }
  }

  async function handleRemoveAvailability(id: string) {
    if (!isDoctor) return;
    const updatedAvailability = availabilityRules.filter(r => r.id !== id);
    let cancelledAny = false;
    const conflicts = doctorConsultations.filter(c =>
      c.status === "booked" && consultationConflictsWithAvailability(c, updatedAvailability)
    );
    if (conflicts.length > 0) {
      cancelledAny = true;
      const doctorName = `${user?.firstName} ${user?.lastName}`;
      await Promise.all(conflicts.map(async (c) => {
         const patientId = (c as any).patientId;
         if (patientId) {
            const dateStr = format(new Date(c.start), "dd.MM HH:mm");
            await backend.sendNotification(
               patientId,
               `Lekarz zmienił grafik. Twoja wizyta (${dateStr}) została odwołana.`,
               doctorName,
               "warning"
            );
         }
         return backend.updateConsultation(c.id, { status: "cancelled" });
      }));
    }
    await backend.removeAvailability(id);
    if (cancelledAny) setInfoMessage("Usunięto dostępność. Pacjenci otrzymali powiadomienia.");
  }

  async function handleAddAbsence(absence: Absence) {
    if (!isDoctor) return;
    const payload = { ...absence, doctorId: user?.uid };
    const cleanPayload = JSON.parse(JSON.stringify(payload));

    let cancelledAny = false;
    const conflicts = doctorConsultations.filter(c =>
      c.status === "booked" && consultationConflictsWithAbsence(c, absence)
    );
    if (conflicts.length > 0) {
      cancelledAny = true;
      const doctorName = user?.firstName ? `${user.firstName} ${user.lastName}` : "Twój Lekarz";
      await Promise.all(conflicts.map(async (c) => {
        const patientId = (c as any).patientId;
        if (patientId) {
           const dateStr = format(new Date(c.start), "dd.MM HH:mm");
           await backend.sendNotification(
              patientId,
              `Lekarz dodał nieobecność. Twoja wizyta z dnia ${dateStr} została odwołana.`,
              doctorName,
              "warning"
           );
        }
        return backend.updateConsultation(c.id, { status: "cancelled" });
      }));
    }
    await backend.addAbsence(cleanPayload);
    if (cancelledAny) setInfoMessage("Dodano absencję. Kolidujące wizyty odwołane.");
  }

  async function handleRemoveAbsence(id: string) {
    if (!isDoctor) return;
    await backend.removeAbsence(id);
  }

  async function handleAddConsultation(c: Consultation) {
    if (!isPatient) return; 
    const consultationWithPatientId = {
      ...c,
      doctorId: targetDoctorId,
      patientId: user?.uid,
      patient: {
        fullName: c.patient?.fullName || `${user?.firstName || ''} ${user?.lastName || user?.email}`, 
        age: 30,
        gender: "Other"
      }
    };
    // Czyścimy payload
    const cleanPayload = JSON.parse(JSON.stringify(consultationWithPatientId));
    await backend.addConsultation(cleanPayload);
  }

  async function handleCancelConsultation(id: string) {
    const targetConsultation = consultations.find(c => c.id === id);
    if (!targetConsultation) return;

    if (isPatient) {
      const ownerId = (targetConsultation as any).patientId;
      if (ownerId !== user?.uid) {
        alert("⛔ Nie możesz anulować wizyty innego pacjenta!");
        return;
      }
    }

    if (isDoctor || user?.role === 'admin') {
       const patientId = (targetConsultation as any).patientId;
       if (patientId) {
          const doctorName = `${user?.firstName} ${user?.lastName}`;
          const dateStr = format(new Date(targetConsultation.start), "dd.MM HH:mm");
          await backend.sendNotification(
             patientId,
             `Twoja wizyta z dnia ${dateStr} została odwołana.`,
             doctorName,
             "warning"
          );
       }
    }
    await backend.removeConsultation(id);
  }

  async function handleRemoveFromCart(id: string) {
    await backend.removeConsultation(id);
  }

  async function handleCheckout() {
    await Promise.all(cartItems.map(c => backend.updateConsultation(c.id, { status: "booked" })));
  }

  // Funkcja Ogłoszenia (Megafon)
  const handleSendAnnouncement = async () => {
    if (!announcement.trim()) return;
    const doctorName = user?.firstName ? `${user.firstName} ${user.lastName}` : "Lekarz";
      
    // 1. Znajdź unikalnych pacjentów tego lekarza
    const uniquePatients = new Set<string>();
    doctorConsultations.forEach(c => {
      const pid = (c as any).patientId;
      if (pid) uniquePatients.add(pid);
    });

    if (uniquePatients.size === 0) {
      alert("Nie masz jeszcze przypisanych pacjentów.");
      return;
    }

    // 2. Wyślij do każdego
    const promises = Array.from(uniquePatients).map(pid => 
      backend.sendNotification(pid, announcement, doctorName, "info")
    );

    await Promise.all(promises);

    setAnnouncement("");
    setShowAnnouncementInput(false);
    setInfoMessage(`Wysłano powiadomienie do ${uniquePatients.size} pacjentów.`);
  };

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  /* =====================
      RENDEROWANIE
  ===================== */

  // 1. ADMIN
  if (mode === 'admin') {
    if (!user || user.role !== 'admin') {
      return <Navigate to="/" replace />;
    }
    
    return (
      <div className="calendar" style={{height: '100vh', display: 'flex', flexDirection: 'column'}}>
        <UserBar user={user} logout={logout} backend={backend} />
        <div style={{ padding: 40, overflowY: "auto" }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
             <h1>Panel Administratora</h1>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <span>Tryb bazy:</span>
               <select 
                 value={backendType} 
                 onChange={e => handleBackendChange(e.target.value as BackendType)}
                 style={{ padding: 5 }}
               >
                  <option value="firebase">Firebase</option>
                  <option value="local">Local JSON</option>
               </select>
             </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
               <h4>Zarejestrowani Użytkownicy</h4>
               <div style={{ background: "#f9f9f9", border: "1px solid #ddd", borderRadius: 8 }}>
                 <UserList backend={backend} />
               </div>
            </div>
            <div>
               <h4>Kreator Kont Lekarskich</h4>
               <CreateDoctorForm backend={backend}/>
            </div>
          </div>

          <AdminReviewsPanel backend={backend}/>
          <PersistenceSettings />
        </div>
      </div>
    );
  }

  // 2. WIDOK LISTY LEKARZY
  if (mode === 'list') {
    return (
      <div style={{minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column'}}>
        <div style={{padding: '10px 20px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'flex-end'}}>
           {user ? (
             <UserBar user={user} logout={logout} backend={backend} />
           ) : (
             <button onClick={() => navigate("/login")} className="btn secondary">
               Zaloguj się
             </button>
           )}
        </div>
        <DoctorList onSelectDoctor={(id) => navigate(`/doctor/${id}`)} backend={backend} />
        <NotificationToast backend={backend}/>
      </div>
    );
  }

  // 3. TRYB LOGOWANIA
  if (mode === 'login') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', position: 'relative' }}>
         <button 
           onClick={() => navigate("/")} 
           style={{position: 'absolute', top: 20, left: 20, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5}}
         >
           <ArrowLeft size={20}/> Wróć do listy
         </button>
         <h1>Portal Medyczny</h1>
         <AuthForm />
         <NotificationToast backend={backend}/>
      </div>
    );
  }

  // 4. WIDOK KALENDARZA
  if (mode === 'calendar') {
    return (
      <div className="calendar">
        {user ? (
          <UserBar user={user} logout={logout} backend={backend} />
        ) : (
          <div style={{padding: '10px 20px', background: '#f3f4f6', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span>Tryb Gościa (Tylko podgląd)</span>
            <div style={{display: 'flex', gap: 10}}>
               <button onClick={() => navigate("/login")} className="btn secondary">Zaloguj się</button>
               <button onClick={() => navigate("/")} className="btn secondary">Inny lekarz</button>
            </div>
          </div>
        )}

        <div className="calendarTopBar">
          {!isDoctor && (
            <button 
              onClick={() => navigate("/")} 
              className="btn secondary" 
              style={{marginRight: 10, padding: "8px 12px"}}
              title="Wróć do listy lekarzy"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <div className="title" style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <CalendarIcon size={20} />
            {isDoctor ? "Mój Grafik" : "Kalendarz Wizyt"} — tydzień{" "}
            {format(weekStart, "dd.MM")}–{format(addWeeks(weekStart, 1), "dd.MM")}
          </div>

          {/* PRZYCISK POWIADOMIEŃ (Dla Lekarza) */}
          {isDoctor && (
            <div style={{position: 'relative'}}>
              <button 
                className="btn secondary" 
                onClick={() => setShowAnnouncementInput(!showAnnouncementInput)}
                title="Wyślij ogłoszenie do pacjentów"
              >
                <Megaphone size={20} />
              </button>
              
              {showAnnouncementInput && (
                <div style={{
                  position: 'absolute', 
                  top: '110%', 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  background: 'white', 
                  padding: 15, 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)', 
                  borderRadius: 8, 
                  zIndex: 100,
                  width: 300
                }}>
                  <h5 style={{margin: '0 0 10px 0'}}>Wyślij powiadomienie</h5>
                  <textarea 
                    value={announcement}
                    onChange={e => setAnnouncement(e.target.value)}
                    placeholder="np. Będę 15 min później..."
                    style={{width: '100%', height: 60, marginBottom: 10, padding: 5}}
                  />
                  <button onClick={handleSendAnnouncement} className="btn" style={{width: '100%'}}>Wyślij</button>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn secondary" onClick={() => setAnchorDate(d => subWeeks(d, 1))}>
              <ChevronLeft size={20} />
            </button>
            <button className="btn secondary" onClick={() => setAnchorDate(new Date())}>
              Dziś
            </button>
            <button className="btn secondary" onClick={() => setAnchorDate(d => addWeeks(d, 1))}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {infoMessage && (
          <InfoModal
            message={infoMessage}
            onClose={() => setInfoMessage(null)}
          />
        )}

        <CalendarWeek
          weekStart={weekStart}
          consultations={doctorConsultations}
          now={now}
          visibleHours={6}
          onAddConsultation={isPatient ? handleAddConsultation : undefined}
          onCancelConsultation={handleCancelConsultation}
          availabilityRules={doctorAvailability}
          onAddAvailability={isDoctor ? handleAddAvailability : undefined}
          onRemoveAvailability={isDoctor ? handleRemoveAvailability : undefined}
          absences={doctorAbsences}
          onAddAbsence={isDoctor ? handleAddAbsence : undefined}
          onRemoveAbsence={isDoctor ? handleRemoveAbsence : undefined}
          currentUserId={user?.uid}
        />

        {isPatient && (
          <Cart
            items={cartItems}
            onRemove={handleRemoveFromCart}
            onCheckout={handleCheckout}
          />
        )}

        <div style={{ marginTop: 40, borderTop: "2px solid #eee", width: "100%", gridColumn: "1 / -1" }}>
          {urlDoctorId && (<ReviewsSection doctorId={urlDoctorId} backend={backend}/>)}
        </div>
        
        <NotificationToast backend={backend}/>
      </div>
    );
  }

  return null;
}

function UserBar({ user, logout, backend }: { user: any, logout: () => void, backend: Backend }) {
  const [isEditing, setIsEditing] = useState(false);
  const roleLabels: Record<string, string> = { patient: 'Pacjent', doctor: 'Lekarz', admin: 'Admin' };
  const roleColors: Record<string, string> = { patient: '#f0f2f5', doctor: '#e3f2fd', admin: '#ffebee' };
  
  return (
    <>
      <div style={{ 
        position: "relative", zIndex: 9999,
        background: roleColors[user.role] || '#fff', 
        padding: "10px 20px", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        borderBottom: "1px solid #ddd",
        marginBottom: 10
      }}>
        <div style={{ fontSize: "0.9rem", color: "#333", display: 'flex', alignItems: 'center', gap: 10 }}>
          <img 
            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.email}`} 
            alt="Avatar" 
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
          />
          <div>
            <div>{user.firstName ? `${user.firstName} ${user.lastName}` : user.email}</div>
            <span style={{ fontSize: '0.75rem', padding: "2px 8px", background: "rgba(0,0,0,0.05)", borderRadius: 4, fontWeight: "bold" }}>
              {roleLabels[user.role] || user.role}
            </span>
          </div>
        </div>

        <div style={{display: 'flex', gap: 10}}>
          <button onClick={() => setIsEditing(true)} className="btn secondary" style={{padding: "6px 12px", fontSize: "0.85rem"}}>
             <Settings size={16} /> Edytuj profil
          </button>
          <button onClick={logout} className="btn" style={{ backgroundColor: "#ff6b6b", border: "none", padding: "6px 12px", fontSize: "0.85rem" }}>
            <LogOut size={16} /> Wyloguj
          </button>
        </div>
      </div>
      {isEditing && <EditProfileModal onClose={() => setIsEditing(false)} backend={backend} />}
    </>
  );
}