import { ref, onValue, push, set, remove, update, get, serverTimestamp } from "firebase/database";
import { db } from "../firebaseConfig";
import type { Backend, Review, AppNotification } from "./backend";
import type { AppUser, Consultation, AvailabilityRule, Absence } from "../features/calendar/types";

// Firebase rzuca błędem, jeśli w obiekcie jest pole o wartości 'undefined'.
// Ta funkcja usuwa 'undefined' i zamienia Daty na stringi.
function cleanPayload(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

export const firebaseBackend: Backend = {
  /* === LISTENERS === */
  listenConsultations(cb) {
    return onValue(ref(db, "consultations"), (snap) => { // onValue nasłuchuje zmiany w czasie rzeczywistym
      const val = snap.val();
      if (!val) { cb([]); return; }
      const list = Object.entries(val).map(([key, data]: [string, any]) => ({
        ...data,
        id: key
      }));
      cb(list as Consultation[]);
    });
  },

  listenAvailability(cb) {
    return onValue(ref(db, "availability"), (snap) => {
      const val = snap.val();
      if (!val) { cb([]); return; }
      const list = Object.entries(val).map(([key, data]: [string, any]) => ({
        ...data,
        id: key
      }));
      cb(list as AvailabilityRule[]);
    });
  },

  listenAbsences(cb) {
    return onValue(ref(db, "absences"), (snap) => {
      const val = snap.val();
      if (!val) { cb([]); return; }
      const list = Object.entries(val).map(([key, data]: [string, any]) => ({
        ...data,
        id: key
      }));
      cb(list as Absence[]);
    });
  },

  /* === KONSULTACJE === */
  async addConsultation(c) {
    const id = c.id || push(ref(db, "consultations")).key as string;
    await set(ref(db, `consultations/${id}`), cleanPayload({ ...c, id })); 
  },
  async updateConsultation(id, data) { 
    await update(ref(db, `consultations/${id}`), cleanPayload(data)); 
  },
  async removeConsultation(id) { await remove(ref(db, `consultations/${id}`)); },

  /* === DOSTĘPNOŚĆ === */
  async addAvailability(r) {
    const id = r.id || push(ref(db, "availability")).key as string;
    // cleanPayload, żeby usunąć opcjonalne pola (undefined)
    await set(ref(db, `availability/${id}`), cleanPayload({ ...r, id }));
  },
  async removeAvailability(id) { await remove(ref(db, `availability/${id}`)); },

  /* === ABSENCJE === */
  async addAbsence(a) {
    const id = a.id || push(ref(db, "absences")).key as string;
    await set(ref(db, `absences/${id}`), cleanPayload({ ...a, id }));
  },
  async removeAbsence(id) { await remove(ref(db, `absences/${id}`)); },

  /* === UŻYTKOWNICY === */
  async getDoctors() {
    const snapshot = await get(ref(db, "users"));
    if (!snapshot.exists()) return [];
    const users = Object.entries(snapshot.val()).map(([key, value]: [string, any]) => ({
      ...value,
      uid: key
    })) as AppUser[];
    return users.filter(u => u.role === "doctor");
  },

  async getUsers() {
    const snapshot = await get(ref(db, "users"));
    if (!snapshot.exists()) return [];
    return Object.entries(snapshot.val()).map(([key, value]: [string, any]) => ({
      ...value,
      uid: key
    })) as AppUser[];
  },

  async createUser(user) {
    await set(ref(db, `users/${user.uid}`), cleanPayload(user));
  },
  
  async updateUser(uid, data) {
    await update(ref(db, `users/${uid}`), cleanPayload(data));
  },

  /* === OPINIE === */
  async getAllReviews() {
    const snapshot = await get(ref(db, "reviews"));
    if (!snapshot.exists()) return {};

    const rawData = snapshot.val();
    const processedData: Record<string, any> = {};

    Object.keys(rawData).forEach(doctorId => {
      const doctorReviews = rawData[doctorId];
      processedData[doctorId] = {};
      Object.keys(doctorReviews).forEach(reviewId => {
        processedData[doctorId][reviewId] = {
          ...doctorReviews[reviewId],
          id: reviewId,
          doctorId: doctorId
        };
      });
    });
    return processedData;
  },

  listenReviews(doctorId, cb) {
    const reviewsRef = ref(db, `reviews/${doctorId}`);
    return onValue(reviewsRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        cb([]);
        return;
      }
      const list = Object.entries(val).map(([id, data]: [string, any]) => ({
        id,
        doctorId,
        ...data
      })) as Review[];
      
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      cb(list);
    });
  },

  async addReview(doctorId, review) {
    const reviewsRef = ref(db, `reviews/${doctorId}`);
    const newRef = push(reviewsRef);
    await set(newRef, cleanPayload({ ...review, doctorId }));
  },

  async deleteReview(doctorId, reviewId) {
    await remove(ref(db, `reviews/${doctorId}/${reviewId}`));
  },

  async replyToReview(doctorId, reviewId, reply) {
    await update(ref(db, `reviews/${doctorId}/${reviewId}`), { reply });
  },

  /* === POWIADOMIENIA === */
  async sendNotification(userId, message, senderName, type) {
    const userNotifRef = ref(db, `userNotifications/${userId}`);
    const newRef = push(userNotifRef);
    await set(newRef, {
      message,
      senderName,
      type,
      timestamp: serverTimestamp(),
      read: false
    });
  },

  listenNotifications(userId, cb) {
    const myNotifRef = ref(db, `userNotifications/${userId}`);
    return onValue(myNotifRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) {
        cb([]);
        return;
      }
      const list = Object.entries(val).map(([id, data]: [string, any]) => ({
        id,
        userId,
        ...data
      })) as AppNotification[];
      
      list.sort((a, b) => b.timestamp - a.timestamp);
      cb(list);
    });
  },

  async dismissNotification(userId, notifId) {
    await remove(ref(db, `userNotifications/${userId}/${notifId}`));
  },
};