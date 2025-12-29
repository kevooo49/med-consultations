import type { Absence } from "../features/calendar/types";

const KEY = "absences";

export async function getAbsences(): Promise<Absence[]> {
  return JSON.parse(localStorage.getItem(KEY) ?? "[]");
}

export async function addAbsence(a: Absence) {
  const all = await getAbsences();
  localStorage.setItem(KEY, JSON.stringify([...all, a]));
}

export async function removeAbsence(id: string) {
  const all = await getAbsences();
  localStorage.setItem(
    KEY,
    JSON.stringify(all.filter(x => x.id !== id))
  );
}
