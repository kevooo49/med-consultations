import type { Backend, Review, AppNotification } from "./backend";
import type { Absence, AvailabilityRule, Consultation, AppUser } from "../features/calendar/types";

const API_URL = "http://localhost:3001";

/* === MECHANIZM POWIADOMIEŃ (Event Bus) === */
const listeners: Record<string, ((data: any) => void)[]> = {
  consultations: [],
  availability: [],
  absences: [],
};
const reviewListeners: Record<string, ((data: Review[]) => void)[]> = {};
const notifListeners: Record<string, ((data: AppNotification[]) => void)[]> = {};

async function refresh(resource: "consultations" | "availability" | "absences") {
  try {
    // Pobieramy aktualne dane z "serwera"
    const res = await fetch(`${API_URL}/${resource}`);
    const data = await res.json();
    // Spradzamy czy ktoś nasłuchuje
    if (listeners[resource]) {
      // wywołujemy funkcje callback z aktualnymi danymi
      listeners[resource].forEach(cb => cb(data));
    }
  } catch (err) { console.error(err); }
}

async function refreshReviews(doctorId: string) {
  if (!reviewListeners[doctorId]) return;
  try {
    const res = await fetch(`${API_URL}/reviews?doctorId=${doctorId}&_sort=date&_order=desc`);
    const data: Review[] = await res.json();
    reviewListeners[doctorId].forEach(cb => cb(data));
  } catch (err) { console.error(err); }
}

async function refreshNotifications(userId: string) {
  if (!notifListeners[userId]) return;
  try {
    // Pobieramy powiadomienia tylko dla tego usera
    const res = await fetch(`${API_URL}/notifications?userId=${userId}&_sort=timestamp&_order=desc`);
    const data: AppNotification[] = await res.json();
    notifListeners[userId].forEach(cb => cb(data));
  } catch (err) { console.error(err); }
}

function subscribe<T>(resource: string, cb: (data: T[]) => void) {
  if (!listeners[resource]) listeners[resource] = [];
  listeners[resource].push(cb as any); // dodanie do listy
  refresh(resource as any); // początkowe załadowanie danych
  return () => { // funkcja do odsubskrybowania
    listeners[resource] = listeners[resource].filter(fn => fn !== cb);
  };
}

export const localBackend: Backend = {
  /* === LISTENERS === */
  listenConsultations: (cb) => subscribe<Consultation>("consultations", cb),
  listenAvailability: (cb) => subscribe<AvailabilityRule>("availability", cb),
  listenAbsences: (cb) => subscribe<Absence>("absences", cb),

  /* === CONSULTATIONS === */
  async addConsultation(c) {
    await fetch(`${API_URL}/consultations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c),
    });
    await refresh("consultations");
  },
  async updateConsultation(id, data) {
    await fetch(`${API_URL}/consultations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await refresh("consultations");
  },
  async removeConsultation(id) {
    await fetch(`${API_URL}/consultations/${id}`, { method: "DELETE" });
    await refresh("consultations");
  },

  /* === AVAILABILITY & ABSENCES === */
  async addAvailability(r) {
    await fetch(`${API_URL}/availability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    });
    await refresh("availability");
  },
  async removeAvailability(id) {
    await fetch(`${API_URL}/availability/${id}`, { method: "DELETE" });
    await refresh("availability");
  },
  async addAbsence(a) {
    await fetch(`${API_URL}/absences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(a),
    });
    await refresh("absences");
  },
  async removeAbsence(id) {
    await fetch(`${API_URL}/absences/${id}`, { method: "DELETE" });
    await refresh("absences");
  },

  /* === UŻYTKOWNICY === */
  async getDoctors() {
    const res = await fetch(`${API_URL}/users?role=doctor`);
    const users: AppUser[] = await res.json();
    return users;
  },
  async createUser(user) {
    // Sprawdzamy duplikat (json-server nie pilnuje unikalności ID)
    const check = await fetch(`${API_URL}/users?id=${user.uid}`);
    const existing = await check.json();
    if (existing.length === 0) {
      // Dodajemy pole 'id', bo json-server go wymaga
      await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...user, id: user.uid }),
      });
    }
  },

  async updateUser(uid, data) {
    await fetch(`${API_URL}/users/${uid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  /* === OPINIE === */
  async getAllReviews() {
    const res = await fetch(`${API_URL}/reviews`);
    const flat: any[] = await res.json();
    const result: Record<string, any> = {};
    flat.forEach(r => {
      if (!result[r.doctorId]) result[r.doctorId] = {};
      result[r.doctorId][r.id] = r;
    });
    return result;
  },

  listenReviews(doctorId, cb) {
    if (!reviewListeners[doctorId]) reviewListeners[doctorId] = [];
    reviewListeners[doctorId].push(cb);
    refreshReviews(doctorId);
    return () => {
      reviewListeners[doctorId] = reviewListeners[doctorId].filter(fn => fn !== cb);
    };
  },

  async addReview(doctorId, review) {
    // Generujemy ID i dodajemy doctorId do obiektu
    const payload = { ...review, doctorId };
    await fetch(`${API_URL}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await refreshReviews(doctorId);
  },

  async deleteReview(doctorId, reviewId) {
    await fetch(`${API_URL}/reviews/${reviewId}`, { method: "DELETE" });
    await refreshReviews(doctorId);
  },

  async replyToReview(doctorId, reviewId, reply) {
    await fetch(`${API_URL}/reviews/${reviewId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    });
    await refreshReviews(doctorId);
  },

  async getUsers() {
    const res = await fetch(`${API_URL}/users`);
    return await res.json();
  },

  /* === POWIADOMIENIA === */
  async sendNotification(userId, message, senderName, type) {
    const newNotif = {
      userId, // Ważne dla json-servera, żeby wiedział czyje to
      message,
      senderName,
      type,
      timestamp: Date.now(), // Local nie ma serverTimestamp, używamy czasu przeglądarki
      read: false
    };

    await fetch(`${API_URL}/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newNotif),
    });
    // Odświeżamy odbiorcę (jeśli jest zalogowany w tym samym oknie - np. testy)
    await refreshNotifications(userId); 
  },

  listenNotifications(userId, cb) {
    if (!notifListeners[userId]) notifListeners[userId] = [];
    notifListeners[userId].push(cb);
    refreshNotifications(userId);
    return () => {
      notifListeners[userId] = notifListeners[userId].filter(fn => fn !== cb);
    };
  },

  async dismissNotification(userId, notifId) {
    await fetch(`${API_URL}/notifications/${notifId}`, { method: "DELETE" });
    await refreshNotifications(userId);
  }
};