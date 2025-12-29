export const VAT_RATE = 0.23;

export function calculatePrice(minutes: number) {
  const halfHours = Math.ceil(minutes / 30);

  let net = 121.95;
  if (halfHours > 1) {
    net += (halfHours - 1) * 81.30;
  }

  const vat = Number((net * VAT_RATE).toFixed(2));
  const gross = Number((net + vat).toFixed(2));

  return {
    net,
    vat,
    gross,
  };
}
