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

export function EventBlock({
  consultation,
  dayStart,
  now,
  onCancel
}: {
  consultation: Consultation;
  dayStart: Date;
  now: Date;
  onCancel: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [showBelow, setShowBelow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const start = parseISO(consultation.start);
  const end = parseISO(consultation.end);

  const topMinutes = minutesFromTop(dayStart, start);
  const heightMinutes = differenceInMinutes(end, start);

  const topPx = topMinutes * 2;
  const heightPx = Math.max(30, heightMinutes * 2);

  const isPast = isPastEvent(end, now);
  const isCancelled = consultation.status === "cancelled";
  const bg = typeColors[consultation.type] ?? "#e5e7eb";

  const [confirmOpen, setConfirmOpen] = useState(false);

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
        style={{ top: topPx, height: heightPx, background: bg }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          setConfirmOpen(true);
        }}
      >
        <div style={{ fontWeight: 650 }}>{label}</div>
        <div>
          {consultation.patient?.fullName ?? "Rezerwacja"} • {consultation.type}
        </div>

        {hover && (
          <div className={clsx("tooltip", showBelow && "tooltipBelow")}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Szczegóły</div>
            <div><b>Pacjent:</b> {consultation.patient?.fullName ?? "—"}</div>
            <div><b>Typ:</b> {consultation.type}</div>
            <div><b>Status:</b> {consultation.status}</div>

            {consultation.notes && (
              <div style={{ marginTop: 6 }}>
                <b>Info:</b> {consultation.notes}
              </div>
            )}

            <div style={{ marginTop: 6, opacity: 0.85 }}>
              <b>Czas trwania:</b> {heightMinutes} min
            </div>
          </div>
        )}
      </div>

      {confirmOpen && (
        <ConfirmModal
          message="Czy na pewno chcesz odwołać wizytę? Operacja ta umożliwi innym użytkownikom rezerwację tego terminu."
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
