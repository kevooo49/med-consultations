import { addMinutes } from "date-fns";
import { SLOT_MINUTES, timeLabel } from "../utils/calendarMath";

type Props = {
  totalSlots: number;
};

export function TimeGutter({ totalSlots }: Props) {
  const base = new Date();
  base.setHours(0, 0, 0, 0); // pełna doba

  return (
    <div className="timeGutter">
      {Array.from({ length: totalSlots + 1 }, (_, i) => {
        const t = addMinutes(base, i * SLOT_MINUTES);
        const top = i * 60; // 1 slot = 60px

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top,
              left: 8,
              fontSize: 12,
              opacity: i % 2 === 0 ? 0.85 : 0, // co godzinę
            }}
          >
            {i % 2 === 0 ? timeLabel(t) : ""}
          </div>
        );
      })}
    </div>
  );
}
