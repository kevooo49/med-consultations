import db from "../data/db.json";
import type { Consultation } from "../features/calendar/types";

export async function getConsultationsForDoctor(doctorId: string): Promise<Consultation[]> {
  // dziś: “udajemy API”
  const all = (db as any).consultations as Consultation[];
  return all.filter(c => c.doctorId === doctorId);
}
