import type { Absence, AvailabilityRule, Consultation } from "../features/calendar/types";

export type BackendType = "firebase" | "local";

export interface Backend {
  /* === LISTENERS === */
  listenConsultations(cb: (data: Consultation[]) => void): () => void;
  listenAvailability(cb: (data: AvailabilityRule[]) => void): () => void;
  listenAbsences(cb: (data: Absence[]) => void): () => void;

  /* === CONSULTATIONS === */
  addConsultation(c: Consultation): Promise<void>;
  updateConsultation(id: string, data: Partial<Consultation>): Promise<void>;
  removeConsultation(id: string): Promise<void>;

  /* === AVAILABILITY === */
  addAvailability(rule: AvailabilityRule): Promise<void>;
  removeAvailability(id: string): Promise<void>;

  /* === ABSENCES === */
  addAbsence(absence: Absence): Promise<void>;
  removeAbsence(id: string): Promise<void>;
}
