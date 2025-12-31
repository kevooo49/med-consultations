import app from "../firebaseConfig";
import {
  getDatabase,
  ref,
  push,
  set,
  remove,
  onValue,
  update,
  type Unsubscribe,
} from "firebase/database";
import type { Absence, AvailabilityRule, Consultation } from "../features/calendar/types";

const db = getDatabase(app);

/* ======================
   CONSULTATIONS
====================== */

export function listenConsultations(callback: (data: Consultation[]) => void): Unsubscribe {
  const dbRef = ref(db, "consultations");

  return onValue(dbRef, (snapshot) => {
    const val = snapshot.val();
    if (!val) {
      callback([]);
      return;
    }

    // Mapujemy obiekt Firebase { "id1":Data, "id2":Data } na tablicę [Data, Data]
    const list = Object.entries(val).map(([id, data]) => ({
      id,
      ...(data as object),
    })) as Consultation[];

    callback(list);
  });
}

// Używamy Omit<Consultation, "id">, bo ID generuje Firebase
export function addConsultation(data: Omit<Consultation, "id"> | Consultation) {
  // Jeśli obiekt ma już ID (np. tymczasowe), usuwamy je, bo Firebase nada własne
  const { id, ...rest } = data as any;
  const newRef = push(ref(db, "consultations"));
  return set(newRef, rest);
}

export function updateConsultation(id: string, data: Partial<Consultation>) {
  return update(ref(db, `consultations/${id}`), data);
}

export function removeConsultation(id: string) {
  return remove(ref(db, `consultations/${id}`));
}

/* ======================
   AVAILABILITY
====================== */

export function listenAvailabilityRules(callback: (data: AvailabilityRule[]) => void): Unsubscribe {
  return onValue(ref(db, "availabilityRules"), (snapshot) => {
    const val = snapshot.val();
    if (!val) {
      callback([]);
      return;
    }

    const list = Object.entries(val).map(([id, v]) => ({
        id, 
        ...(v as object)
    })) as AvailabilityRule[];
    
    callback(list);
  });
}

export function addAvailabilityRule(rule: Omit<AvailabilityRule, "id"> | AvailabilityRule) {
  const { id, ...rest } = rule as any;
  return set(push(ref(db, "availabilityRules")), rest);
}

export function removeAvailabilityRule(id: string) {
  return remove(ref(db, `availabilityRules/${id}`));
}

/* ======================
   ABSENCES
====================== */

export function listenAbsences(callback: (data: Absence[]) => void): Unsubscribe {
  return onValue(ref(db, "absences"), (snapshot) => {
    const val = snapshot.val();
    if (!val) {
      callback([]);
      return;
    }

    const list = Object.entries(val).map(([id, v]) => ({
        id,
        ...(v as object)
    })) as Absence[];

    callback(list);
  });
}

export function addAbsence(absence: Omit<Absence, "id"> | Absence) {
  const { id, ...rest } = absence as any;
  return set(push(ref(db, "absences")), rest);
}

export function removeAbsence(id: string) {
  return remove(ref(db, `absences/${id}`));
}