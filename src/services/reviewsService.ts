import { ref, push, set, remove, onValue, update, get } from "firebase/database";
import { db } from "../firebaseConfig";

export interface Review {
  id: string;
  patientId: string;
  patientEmail: string;
  rating: number;
  text: string;
  date: string;
  reply?: string;
}

// Nasłuchiwanie opinii
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

// Dodawanie opinii (BEZ edycji profilu lekarza - to naprawia błąd Permission Denied)
export async function addReview(doctorId: string, review: Omit<Review, "id" | "reply">) {
  const reviewsRef = ref(db, `reviews/${doctorId}`);
  
  // 1. Walidacja duplikatów (zostaje)
  const snapshot = await get(reviewsRef);
  if (snapshot.exists()) {
    const existing = Object.values(snapshot.val()) as Review[];
    const hasReviewed = existing.some(r => r.patientId === review.patientId);
    if (hasReviewed) {
      throw new Error("Dodałeś już opinię dla tego lekarza.");
    }
  }

  // 2. Dodaj opinię
  const newRef = push(reviewsRef);
  await set(newRef, review);
}

export async function replyToReview(doctorId: string, reviewId: string, replyText: string) {
  const reviewRef = ref(db, `reviews/${doctorId}/${reviewId}`);
  await update(reviewRef, { reply: replyText });
}

export async function deleteReview(doctorId: string, reviewId: string) {
  const reviewRef = ref(db, `reviews/${doctorId}/${reviewId}`);
  await remove(reviewRef);
}