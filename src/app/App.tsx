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

/* === BACKENDS === */
import type { BackendType } from "../services/backend";
import { firebaseBackend } from "../services/firebaseBackend";
import { localBackend } from "../services/localBackend";

/* === AUTH & ADMIN === */
import { useAuth } from "../context/AuthContext";
import { AuthForm } from "../features/calendar/components/AuthForm";
import { UserList } from "../features/admin/UserList";
import { CreateDoctorForm } from "../features/admin/CreateDoctorForm";
import { PersistenceSettings } from "../features/admin/PersistenceSettings";
import { DoctorList } from "../features/doctors/DoctorList";
import { ReviewsSection } from "../features/reviews/ReviewsSection";

/* === ICONS & UI === */
import { LogOut, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Settings, ArrowLeft } from "lucide-react";
import { EditProfileModal } from "../features/calendar/components/EditProfileModal";

/* === NOTIFICATIONS === */
import { sendNotificationToUser } from "../services/notificationService";
import { NotificationToast } from "../features/calendar/components/NotificationToast";
import { Megaphone } from "lucide-react";

export default function App() {
  const { user, logout } = useAuth();
  
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  // === POPRAWKA 1: Płynne przejście po zalogowaniu ===
  useEffect(() => {
    if (user) {
      if (user.role === 'doctor') {
        setSelectedDoctorId(user.uid);
      } else {
        // Jeśli pacjent zalogował się będąc na ekranie logowania ("LOGIN_MODE"),
        // przenosimy go do listy lekarzy (null).
        // Jeśli był już na jakimś lekarzu (np. jako gość wybrał lekarza i się zalogował),
        // to zostawiamy go tam.
        if (selectedDoctorId === "LOGIN_MODE") {
          setSelectedDoctorId(null);
        }
      }
    }
  }, [user, selectedDoctorId]);

  /* =====================
      STATE
  ===================== */
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date());
  const [now, setNow] = useState<Date>(() => new Date());

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRule[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [announcement, setAnnouncement] = useState("");
  const [showAnnouncementInput, setShowAnnouncementInput] = useState(false);

  const [backendType, setBackendType] = useState<BackendType>(() => {
    return (localStorage.getItem("backendType") as BackendType) || "firebase";
  });

  const handleBackendChange = (newType: BackendType) => {
    setBackendType(newType);
    localStorage.setItem("backendType", newType);
  };

  const backend = backendType === "firebase"
    ? firebaseBackend
    : localBackend;

  const weekStart = useMemo(() => getWeekStart(anchorDate), [anchorDate]);

  /* =====================
      HELPERS - ROLE
  ===================== */
  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';
  const isAdmin = user?.role === 'admin';

  /* =====================
      DERIVED DATA (FILTROWANIE)
  ===================== */
  const targetDoctorId = selectedDoctorId || "none";

  const doctorConsultations = useMemo(
    () => consultations.filter(c => c.doctorId === targetDoctorId),
    [consultations, targetDoctorId]
  );

  // === POPRAWKA 2: Filtrujemy dostępność i absencje dla wybranego lekarza ===
  // Dzięki temu dane jednego lekarza nie pojawią się u drugiego
  const doctorAvailability = useMemo(
    () => availabilityRules.filter(r => r.doctorId === targetDoctorId),
    [availabilityRules, targetDoctorId]
  );

  const doctorAbsences = useMemo(
    () => absences.filter(a => a.doctorId === targetDoctorId),
    [absences, targetDoctorId]
  );

  const cartItems = useMemo(() => 
    doctorConsultations.filter(c => c.status === "draft" && (c as any).patientId === user?.uid),
  [doctorConsultations, user]);

  /* =====================
      LISTENERS
  ===================== */
  useEffect(() => {
    if (isAdmin) return;
    if (!selectedDoctorId || selectedDoctorId === "LOGIN_MODE") return;

    const u1 = backend.listenConsultations(setConsultations);
    const u2 = backend.listenAvailability(setAvailabilityRules);
    const u3 = backend.listenAbsences(setAbsences);

    return () => {
      u1();
      u2();
      u3();
    };
  }, [backendType, backend, isAdmin, selectedDoctorId]);

  /* =====================
      HANDLERS
  ===================== */
  async function handleAddAvailability(rule: AvailabilityRule) {
    if (!isDoctor) return; 
    // === POPRAWKA 3: Przypisujemy ID lekarza przy zapisie ===
    await backend.addAvailability({ ...rule, doctorId: user.uid });
  }

  async function handleRemoveAvailability(id: string) {
    if (!isDoctor) return;
    const updatedAvailability = availabilityRules.filter(r => r.id !== id);
    let cancelledAny = false;
    
    // Znajdź konflikty
    const conflicts = doctorConsultations.filter(c =>
      c.status === "booked" && consultationConflictsWithAvailability(c, updatedAvailability)
    );

    if (conflicts.length > 0) {
      cancelledAny = true;
      const doctorName = `${user?.firstName} ${user?.lastName}`;

      // NOWOŚĆ: Powiadom każdego pacjenta z osobna
      // Używamy Promise.all żeby wysłać równolegle
      await Promise.all(conflicts.map(async (c) => {
         const patientId = (c as any).patientId;
         if (patientId) {
            const dateStr = format(new Date(c.start), "dd.MM HH:mm");
            await sendNotificationToUser(
               patientId,
               `Lekarz zmienił grafik. Twoja wizyta (${dateStr}) została odwołana.`,
               doctorName,
               "warning"
            );
         }
         // Anulowanie w bazie
         return backend.updateConsultation(c.id, { status: "cancelled" });
      }));
    }
    
    await backend.removeAvailability(id);
    if (cancelledAny) setInfoMessage("Usunięto dostępność. Pacjenci otrzymali powiadomienia.");
  }

  async function handleAddAbsence(absence: Absence) {
    if (!isDoctor) return;

    let cancelledAny = false;

    // 1. Szukamy konfliktów (wizyt, które wpadają w czas tej absencji)
    const conflicts = doctorConsultations.filter(c =>
      c.status === "booked" &&
      consultationConflictsWithAbsence(c, absence)
    );

    if (conflicts.length > 0) {
      cancelledAny = true;
      const doctorName = user?.firstName ? `${user.firstName} ${user.lastName}` : "Twój Lekarz";

      // 2. Dla każdego konfliktu: wyślij powiadomienie i anuluj wizytę
      await Promise.all(conflicts.map(async (c) => {
        const patientId = (c as any).patientId;
        
        // Wysyłamy powiadomienie tylko jeśli mamy ID pacjenta
        if (patientId) {
           const dateStr = format(new Date(c.start), "dd.MM HH:mm");
           await sendNotificationToUser(
              patientId,
              `Lekarz dodał nieobecność. Twoja wizyta z dnia ${dateStr} została odwołana.`,
              doctorName,
              "warning"
           );
        }

        // Aktualizujemy status w bazie
        return backend.updateConsultation(c.id, { status: "cancelled" });
      }));
    }

    // 3. Dodajemy absencję do bazy (przypisujemy ID lekarza)
    await backend.addAbsence({ ...absence, doctorId: user.uid });

    if (cancelledAny) {
      setInfoMessage(
        "Dodano absencję. Kolidujące wizyty zostały odwołane, a pacjenci otrzymali powiadomienia."
      );
    }
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
        fullName: `${user?.firstName || ''} ${user?.lastName || user?.email}`, 
        age: 30,
        gender: "Other"
      }
    };
    await backend.addConsultation(consultationWithPatientId as Consultation);
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

    if (isDoctor || isAdmin) {
       const patientId = (targetConsultation as any).patientId;
       // Wysyłamy tylko jeśli wizyta ma przypisanego pacjenta (nie jest pusta)
       if (patientId) {
          const doctorName = `${user?.firstName} ${user?.lastName}`;
          const dateStr = format(new Date(targetConsultation.start), "dd.MM HH:mm");
          
          await sendNotificationToUser(
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

  const handleSendAnnouncement = async () => {
    if (!announcement.trim()) return;
    const doctorName = user?.firstName ? `${user.firstName} ${user.lastName}` : "Lekarz";
      
      // 1. Znajdź unikalnych pacjentów tego lekarza
      // Pobieramy ID pacjentów ze wszystkich konsultacji (nawet przeszłych lub anulowanych, jeśli są w bazie)
      // Używamy Set, żeby nie wysłać 5 razy do tego samego pacjenta
    const uniquePatients = new Set<string>();
      
    doctorConsultations.forEach(c => {
         // Zakładamy, że consultation ma pole patientId (dodaliśmy je wcześniej)
      const pid = (c as any).patientId;
      if (pid) uniquePatients.add(pid);
    });

    if (uniquePatients.size === 0) {
      alert("Nie masz jeszcze przypisanych pacjentów.");
      return;
    }

      // 2. Wyślij do każdego
    const promises = Array.from(uniquePatients).map(pid => 
      sendNotificationToUser(pid, announcement, doctorName, "info")
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
      RENDER
  ===================== */

  if (isAdmin) {
    return (
      <div className="calendar" style={{height: '100vh', display: 'flex', flexDirection: 'column'}}>
        <UserBar user={user} logout={logout} />
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
                 <UserList />
               </div>
            </div>
            <div>
               <h4>Kreator Kont Lekarskich</h4>
               <CreateDoctorForm />
            </div>
          </div>
          <PersistenceSettings />
        </div>
      </div>
    );
  }

  if (!selectedDoctorId) {
    return (
      <div style={{minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column'}}>
        <div style={{padding: '10px 20px', background: 'white', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'flex-end'}}>
           {user ? (
             <UserBar user={user} logout={logout} />
           ) : (
             <button onClick={() => setSelectedDoctorId("LOGIN_MODE")} className="btn secondary">
               Zaloguj się
             </button>
           )}
        </div>
        <DoctorList onSelectDoctor={setSelectedDoctorId} />
        <NotificationToast />
      </div>
    );
  }

  if (selectedDoctorId === "LOGIN_MODE") {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', position: 'relative' }}>
         <button 
           onClick={() => setSelectedDoctorId(null)} 
           style={{position: 'absolute', top: 20, left: 20, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5}}
         >
           <ArrowLeft size={20}/> Wróć do listy
         </button>
         <h1>Portal Medyczny</h1>
         <AuthForm />
         <NotificationToast />
      </div>
    );
  }

  return (
    <div className="calendar">
      {user ? (
        <UserBar user={user} logout={logout} />
      ) : (
        <div style={{padding: '10px 20px', background: '#f3f4f6', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <span>Tryb Gościa (Tylko podgląd)</span>
          <div style={{display: 'flex', gap: 10}}>
             <button onClick={() => setSelectedDoctorId("LOGIN_MODE")} className="btn secondary">Zaloguj się</button>
             <button onClick={() => setSelectedDoctorId(null)} className="btn secondary">Inny lekarz</button>
          </div>
        </div>
      )}

      <div className="calendarTopBar">
        {!isDoctor && (
          <button 
            onClick={() => setSelectedDoctorId(null)} 
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
        
        // === POPRAWKA 2: Przekazujemy przefiltrowane dane ===
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
        <ReviewsSection doctorId={targetDoctorId} />
      </div>
      <NotificationToast />
    </div>
  );
}

// UserBar bez zmian
function UserBar({ user, logout }: { user: any, logout: () => void }) {
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
        <NotificationToast />
      </div>
      {isEditing && <EditProfileModal onClose={() => setIsEditing(false)} />}
    </>
  );
}