import type { Consultation } from "../features/calendar/types";

const KEY = "consultations";

export async function getConsultationsForDoctor(doctorId: string): Promise<Consultation[]> {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  return JSON.parse(raw).filter((c: Consultation) => c.doctorId === doctorId);
}

export async function saveConsultations(list: Consultation[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export async function addConsultation(c: Consultation) {
  const all = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  all.push(c);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export async function cancelConsultation(id: string) {
  const all: Consultation[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
  const updated = all.map(c =>
    c.id === id ? { ...c, status: "cancelled" } : c
  );
  localStorage.setItem(KEY, JSON.stringify(updated));
}
