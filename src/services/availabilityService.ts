import type { AvailabilityRule } from "../features/calendar/types";

const KEY = "availability";

export async function getAvailability(): Promise<AvailabilityRule[]> {
  return JSON.parse(localStorage.getItem(KEY) ?? "[]");
}

export async function addAvailability(rule: AvailabilityRule) {
  const all = await getAvailability();
  localStorage.setItem(KEY, JSON.stringify([...all, rule]));
}

export async function removeAvailability(id: string) {
  const all = await getAvailability();
  localStorage.setItem(
    KEY,
    JSON.stringify(all.filter(r => r.id !== id))
  );
}
