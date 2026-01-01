import { ref, push, onValue, remove, set, serverTimestamp } from "firebase/database";
import { db } from "../firebaseConfig";

export interface AppNotification {
  id: string;
  message: string;
  senderName: string; // Np. "Lek. Jan Kowalski"
  type: "info" | "warning" | "alert";
  timestamp: number;
  read: boolean;
}

// 1. Wyślij do KONKRETNEGO użytkownika (np. przy anulowaniu wizyty)
export async function sendNotificationToUser(userId: string, message: string, senderName: string, type: "info" | "warning" = "info") {
  const userNotifRef = ref(db, `userNotifications/${userId}`);
  const newRef = push(userNotifRef);
  await set(newRef, {
    message,
    senderName,
    type,
    timestamp: serverTimestamp(),
    read: false
  });
}

// 2. Nasłuchuj SWOICH powiadomień (Dla Pacjenta i Lekarza)
export function listenToMyNotifications(myUserId: string, callback: (notifs: AppNotification[]) => void) {
  const myNotifRef = ref(db, `userNotifications/${myUserId}`);
  
  return onValue(myNotifRef, (snapshot) => {
    const val = snapshot.val();
    if (!val) {
      callback([]);
      return;
    }
    // Mapujemy obiekt na tablicę
    const list = Object.entries(val).map(([id, data]: [string, any]) => ({
      id,
      ...data
    })) as AppNotification[];
    
    // Sortujemy od najnowszych
    list.sort((a, b) => b.timestamp - a.timestamp);
    
    callback(list);
  });
}

// 3. Usuń powiadomienie (Jak użytkownik kliknie X / Przeczytane)
export async function dismissNotification(userId: string, notificationId: string) {
  const notifRef = ref(db, `userNotifications/${userId}/${notificationId}`);
  await remove(notifRef);
}