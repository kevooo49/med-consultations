import { useMemo, useState, useEffect, useRef } from "react";
import { differenceInMinutes, format, parseISO } from "date-fns";
import type { Consultation } from "../types";
import { isPastEvent, minutesFromTop } from "../utils/calendarMath";
import clsx from "clsx";
import { ConfirmModal } from "./ConfirmModal";

const typeColors: Record<string, string> = {
  first_visit: "#bfdbfe",
  control: "#bbf7d0",
  chronic: "#fde68a",
  prescription: "#fecaca",
};

type Props = {
  consultation: Consultation;
  dayStart: Date;
  now: Date;
  onCancel?: () => void;
  isForeign?: boolean;
};

export function EventBlock({
  consultation,
  dayStart,
  now,
  onCancel,
  isForeign
}: Props) {
  // 1. Obliczenia geometryczne
  const start = parseISO(consultation.start);
  const end = parseISO(consultation.end);

  const topMinutes = minutesFromTop(dayStart, start);
  const heightMinutes = differenceInMinutes(end, start);

  const topPx = topMinutes * 2;
  const heightPx = Math.max(30, heightMinutes * 2);

  const isPast = isPastEvent(end, now);
  const isCancelled = consultation.status === "cancelled";

  // --- TRYB 1: WIZYTA OBCA (ANONIMOWA) ---
  if (isForeign) {
    return (
      <div
        className={clsx("eventBlock", isPast && "eventPast")}
        style={{
          top: topPx,
          height: heightPx,
          background: "repeating-linear-gradient(45deg, #f3f4f6, #f3f4f6 10px, #e5e7eb 10px, #e5e7eb 20px)", // Szary wzorek
          border: "1px solid #d1d5db",
          color: "#9ca3af",
          cursor: "default",
          zIndex: 1
        }}
        title="Termin zajęty"
      >
        <div 
          style={{ 
            fontSize: "0.8rem", 
            fontWeight: "bold", 
            textAlign: "center", 
            paddingTop: 4,
            width: "100%",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis"
          }}
        >
          Zarezerwowane
        </div>
      </div>
    );
  }

  // --- TRYB 2: WIZYTA WŁASNA / LEKARZA (PEŁNE DANE) ---

  const [hover, setHover] = useState(false);
  const [showBelow, setShowBelow] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const bg = typeColors[consultation.type] ?? "#e5e7eb";

  const label = useMemo(() => {
    return `${format(start, "HH:mm")}–${format(end, "HH:mm")}`;
  }, [start, end]);

  useEffect(() => {
    if (!hover || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const HEADER_SAFE_ZONE = 120;
    setShowBelow(rect.top < HEADER_SAFE_ZONE);
  }, [hover]);

  return (
    <>
      <div
        ref={ref}
        className={clsx("eventBlock", isPast && "eventPast", isCancelled && "eventCancelled")}
        // Tutaj był błąd - scaliłem wszystko w jeden obiekt style
        style={{ 
            top: topPx, 
            height: heightPx, 
            // Logika koloru tła (draft vs normalny)
            background: consultation.status === 'draft' ? '#fff7ed' : bg, 
            // Logika obramowania
            border: consultation.status === 'draft' ? '1px solid #fdba74' : '1px solid transparent',
            // Logika kursora
            cursor: onCancel ? "pointer" : "default"
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (onCancel) {
            setConfirmOpen(true);
          }
        }}
      >
        <div style={{ fontWeight: 650 }}>{label}</div>
        <div>
          {consultation.status === 'draft' && <span style={{color: '#ea580c', marginRight: 4}}>(Koszyk)</span>}
          {consultation.patient?.fullName ?? "Rezerwacja"} • {consultation.type}
        </div>

        {/* TOOLTIP */}
        {hover && (
          <div className={clsx("tooltip", showBelow && "tooltipBelow")} style={{zIndex: 100}}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Szczegóły wizyty</div>
            <div><b>Pacjent:</b> {consultation.patient?.fullName ?? "—"}</div>
            <div><b>Typ:</b> {consultation.type}</div>
            <div><b>Status:</b> {consultation.status === 'draft' ? 'W koszyku' : consultation.status}</div>

            {consultation.notes && (
              <div style={{ marginTop: 6 }}>
                <b>Info:</b> {consultation.notes}
              </div>
            )}

            <div style={{ marginTop: 6, opacity: 0.85 }}>
              <b>Czas trwania:</b> {heightMinutes} min
            </div>
            
            {onCancel && (
               <div style={{ marginTop: 8, fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>
                 Kliknij, aby odwołać
               </div>
            )}
          </div>
        )}
      </div>

      {confirmOpen && onCancel && (
        <ConfirmModal
          message="Czy na pewno chcesz odwołać tę wizytę? Termin wróci do puli wolnych."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            onCancel();
          }}
        />
      )}
    </>
  );
}