import { isSameDay } from "date-fns";

type Props = {
  weekDays: Date[];
  totalSlots: number;
  now: Date;
};

export function NowIndicator({ weekDays, totalSlots, now }: Props) {
  const todayIndex = weekDays.findIndex(d => isSameDay(d, now));
  if (todayIndex === -1) return null;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const minutesFromStart =
    (now.getTime() - startOfDay.getTime()) / 60000;

  const topPx = minutesFromStart * 2; // 1 min = 2px

  if (topPx < 0 || topPx > totalSlots * 60) return null;

  const colWidthPercent = 100 / 7;
  const leftPercent = todayIndex * colWidthPercent;
  const rightPercent = 100 - (todayIndex + 1) * colWidthPercent;

  return (
    <div
      className="nowLine"
      style={{
        top: topPx,
        left: `${leftPercent}%`,
        right: `${rightPercent}%`,
      }}
    />
  );
}
