import type { Backend } from "./backend";
import type { Absence, AvailabilityRule, Consultation } from "../features/calendar/types";

const LS = {
  consultations: "consultations",
  availability: "availability",
  absences: "absences",
};

// Klucz dla zdarzenia wewnątrz tej samej karty
const EVENT_KEY = "local-storage-update";

// Pomocnicza funkcja do czytania z typowaniem
function read<T>(key: string): T[] {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : [];
}

// Pomocnicza funkcja do zapisu + powiadomienie tej samej karty
function write<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
  // Wysyłamy zdarzenie, by odświeżyć widok w bieżącym oknie
  window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: { key } }));
}

function listen<T>(key: string, cb: (data: T[]) => void) {
  // 1. Ładujemy dane na start
  cb(read<T>(key));

  // 2. Handler dla zmian w TEJ SAMEJ karcie (CustomEvent)
  const localHandler = (e: Event) => {
    // Sprawdzamy, czy zmieniono ten konkretny klucz (optymalizacja)
    const detail = (e as CustomEvent).detail;
    if (detail && detail.key === key) {
      cb(read<T>(key));
    }
  };

  // 3. Handler dla zmian w INNYCH kartach (StorageEvent)
  const storageHandler = (e: StorageEvent) => {
    // Reagujemy tylko, jeśli zmienił się nasz klucz
    if (e.key === key) {
      cb(read<T>(key));
    }
  };

  window.addEventListener(EVENT_KEY, localHandler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(EVENT_KEY, localHandler);
    window.removeEventListener("storage", storageHandler);
  };
}

export const localBackend: Backend = {
  listenConsultations: (cb) => listen<Consultation>(LS.consultations, cb),
  listenAvailability: (cb) => listen<AvailabilityRule>(LS.availability, cb),
  listenAbsences: (cb) => listen<Absence>(LS.absences, cb),

  // === Teraz wszędzie używamy jawnego typowania read<Typ> ===

  async addConsultation(c) {
    const current = read<Consultation>(LS.consultations);
    write(LS.consultations, [...current, c]);
  },

  async updateConsultation(id, data) {
    const current = read<Consultation>(LS.consultations);
    const updated = current.map((c) =>
      c.id === id ? { ...c, ...data } : c
    );
    write(LS.consultations, updated);
  },

  async removeConsultation(id) {
    const current = read<Consultation>(LS.consultations);
    const updated = current.filter((c) => c.id !== id);
    write(LS.consultations, updated);
  },

  async addAvailability(r) {
    const current = read<AvailabilityRule>(LS.availability);
    write(LS.availability, [...current, r]);
  },

  async removeAvailability(id) {
    const current = read<AvailabilityRule>(LS.availability);
    const updated = current.filter((r) => r.id !== id);
    write(LS.availability, updated);
  },

  async addAbsence(a) {
    const current = read<Absence>(LS.absences);
    write(LS.absences, [...current, a]);
  },

  async removeAbsence(id) {
    const current = read<Absence>(LS.absences);
    const updated = current.filter((a) => a.id !== id);
    write(LS.absences, updated);
  },
};