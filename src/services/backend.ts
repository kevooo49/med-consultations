import type { Absence, AvailabilityRule, Consultation, AppUser } from "../features/calendar/types";

export type BackendType = "firebase" | "local";

export interface Review {
  id: string;
  patientId: string;
  patientEmail: string;
  rating: number;
  text: string;
  date: string;
  reply?: string;
  doctorId: string; 
}

export interface AppNotification {
  id: string;
  userId: string;
  message: string;
  senderName: string;
  type: "info" | "warning" | "alert";
  timestamp: number;
  read: boolean;
}

export interface Backend {
  /* === LISTENERY === */

  // () => void przestajemy słuchać zmian (żeby nie było wycieków pamięci)

  listenConsultations(cb: (data: Consultation[]) => void): () => void;
  listenAvailability(cb: (data: AvailabilityRule[]) => void): () => void;
  listenAbsences(cb: (data: Absence[]) => void): () => void;
  listenReviews(doctorId: string, cb: (reviews: Review[]) => void): () => void;
  listenNotifications(userId: string, cb: (notifs: AppNotification[]) => void): () => void;

  /* === KONSULTACJE === */

  // promise - asynchroniczny zapis do bazy (czekamy aż serwer odpowie)

  addConsultation(c: Consultation): Promise<void>;
  updateConsultation(id: string, data: Partial<Consultation>): Promise<void>;
  removeConsultation(id: string): Promise<void>;

  /* === DOSTĘPNOŚĆ === */
  addAvailability(rule: AvailabilityRule): Promise<void>;
  removeAvailability(id: string): Promise<void>;

  /* === ABSENCJE === */
  addAbsence(absence: Absence): Promise<void>;
  removeAbsence(id: string): Promise<void>;

  /* === UŻYTKOWNICY === */
  getDoctors(): Promise<AppUser[]>;
  getUsers(): Promise<AppUser[]>;
  createUser(user: AppUser): Promise<void>;
  updateUser(uid: string, data: Partial<AppUser>): Promise<void>;

  /* === OPINIE === */
  getAllReviews(): Promise<Record<string, any>>;
  addReview(doctorId: string, review: Omit<Review, "id" | "reply" | "doctorId">): Promise<void>;
  deleteReview(doctorId: string, reviewId: string): Promise<void>;
  replyToReview(doctorId: string, reviewId: string, reply: string): Promise<void>;

  /* === POWIADOMIENIA === */
  sendNotification(userId: string, message: string, senderName: string, type: "info" | "warning"): Promise<void>;
  dismissNotification(userId: string, notifId: string): Promise<void>;
}