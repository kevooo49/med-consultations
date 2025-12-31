import { ref, push, set, remove, onValue, update } from "firebase/database";
import { db } from "../firebaseConfig";

export interface Review {
  id: string;
  patientId: string;
  patientEmail: string;
  rating: number;
  text: string;
  date: string;
  reply?: string; // Odpowiedź lekarza
}

// Nasłuchiwanie opinii dla konkretnego lekarza
export function listenReviews(doctorId: string, callback: (reviews: Review[]) => void) {
  const reviewsRef = ref(db, `reviews/${doctorId}`);
  
  return onValue(reviewsRef, (snapshot) => {
    const val = snapshot.val();
    if (!val) {
      callback([]);
      return;
    }
    const list = Object.entries(val).map(([id, data]: [string, any]) => ({
      id,
      ...data
    }));
    // Sortujemy od najnowszych
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callback(list);
  });
}

// Dodawanie opinii (Tylko pacjent)
export async function addReview(doctorId: string, review: Omit<Review, "id" | "reply">) {
  const reviewsRef = ref(db, `reviews/${doctorId}`);
  const newRef = push(reviewsRef);
  await set(newRef, review);
}

// Odpowiadanie na opinię (Tylko lekarz)
export async function replyToReview(doctorId: string, reviewId: string, replyText: string) {
  const reviewRef = ref(db, `reviews/${doctorId}/${reviewId}`);
  await update(reviewRef, { reply: replyText });
}

// Usuwanie opinii (Tylko Admin)
export async function deleteReview(doctorId: string, reviewId: string) {
  const reviewRef = ref(db, `reviews/${doctorId}/${reviewId}`);
  await remove(reviewRef);
}