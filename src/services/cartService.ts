import type { Consultation } from "../features/calendar/types";

const KEY = "cart";

export function getCart(): Consultation[] {
  return JSON.parse(localStorage.getItem(KEY) ?? "[]");
}

export function saveCart(items: Consultation[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function clearCart() {
  localStorage.removeItem(KEY);
}
