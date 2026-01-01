export type ConsultationType =
  | "first_visit"
  | "control"
  | "chronic"
  | "prescription";

export type ConsultationStatus = "free" | "booked" | "cancelled" | "draft";

export interface PatientInfo {
  fullName: string;
  gender: "M" | "F" | "Other";
  age: number;
}

export interface Consultation {
  id: string;
  doctorId: string;
  start: string; // ISO
  end: string;   // ISO
  type: ConsultationType;
  status: ConsultationStatus;
  patient?: PatientInfo;
  notes?: string;
  documents?: Array<{ name: string; url?: string }>;
  price?: {
    net: number;
    vat: number;
    gross: number;
  };
}

export type TimeRange = {
  start: string; // "08:00"
  end: string;   // "12:30"
};

export type AvailabilityRule = {
  id: string;
  type: "single" | "recurring";
  date?: string; // yyyy-MM-dd
  from?: string;
  to?: string;
  weekdays?: number[];
  timeRanges: TimeRange[];
  doctorId: string;
};

export type Absence = {
  id: string;
  from: string; // yyyy-MM-dd
  to: string;   // yyyy-MM-dd
  doctorId: string;
};

export type UserRole = "patient" | "doctor" | "admin";

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  isBanned?: boolean;

  specialization?: string;
  avatarUrl?: string;
}