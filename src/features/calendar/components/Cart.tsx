import { useState } from "react";
import type { Consultation } from "../types";
import { format, parseISO } from "date-fns";
import { Loader2, CheckCircle } from "lucide-react";

type Props = {
  items: Consultation[];
  onRemove: (id: string) => void;
  // Zmieniamy typ na Promise, żeby móc poczekać na zakończenie zapisu
  onCheckout: () => Promise<void> | void; 
};

function money(v: number) {
  return `${v.toFixed(2)} zł`;
}

export function Cart({ items, onRemove, onCheckout }: Props) {
  // Nowe stany do obsługi płatności
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const totals = items.reduce(
    (acc, c) => {
      acc.net += c.price?.net ?? 0;
      acc.vat += c.price?.vat ?? 0;
      acc.gross += c.price?.gross ?? 0;
      return acc;
    },
    { net: 0, vat: 0, gross: 0 }
  );

  // Funkcja symulująca płatność
  const handlePay = async () => {
    setIsProcessing(true);

    // 1. Symulacja opóźnienia (2 sekundy)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 2. Wywołanie zapisu w bazie (funkcja z App.tsx)
    await onCheckout();

    setIsProcessing(false);
    setIsSuccess(true);

    // 3. Po 3 sekundach ukrywamy komunikat sukcesu (opcjonalne)
    setTimeout(() => setIsSuccess(false), 3000);
  };

  return (
    <section className="cartPage fullWidth">
      <h2 className="cartTitle">Koszyk</h2>

      {/* 1. Widok Sukcesu */}
      {isSuccess ? (
        <div className="cartEmpty" style={{ flexDirection: "column", gap: "20px", padding: "40px" }}>
          <CheckCircle size={64} color="#10b981" />
          <h3 style={{ margin: 0, fontSize: "1.5rem" }}>Płatność przyjęta!</h3>
          <p style={{ margin: 0, color: "#6b7280" }}>Twoje wizyty zostały potwierdzone.</p>
        </div>
      ) : items.length === 0 ? (
        // 2. Widok Pustego Koszyka
        <div className="cartEmpty">Brak wybranych konsultacji</div>
      ) : (
        // 3. Widok Listy (Standardowy)
        <div className="cartLayout">
          {/* LEWA STRONA — POZYCJE */}
          <div className="cartItems">
            {items.map((c) => {
              const start = parseISO(c.start);
              const end = parseISO(c.end);

              return (
                <div key={c.id} className="cartItemRow">
                  <div className="cartItemDate">
                    <div className="cartItemDay">{format(start, "dd.MM")}</div>
                    <div className="cartItemTime">
                      {format(start, "HH:mm")}–{format(end, "HH:mm")}
                    </div>
                  </div>

                  <div className="cartItemDetails">
                    <div className="cartItemType">{c.type}</div>
                  </div>

                  <div className="cartItemPrice">
                    {money(c.price?.gross ?? 0)}
                    <div className="cartItemVat">
                      w tym VAT {money(c.price?.vat ?? 0)}
                    </div>
                  </div>

                  <button
                    className="cartRemove"
                    onClick={() => onRemove(c.id)}
                    disabled={isProcessing} // Blokujemy usuwanie podczas płacenia
                    style={{ opacity: isProcessing ? 0.5 : 1 }}
                    aria-label="Usuń"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* PRAWA STRONA — PODSUMOWANIE */}
          <aside className="cartSummary">
            <div className="cartSummaryBox">
              <div className="summaryRow">
                <span>Netto</span>
                <span>{money(totals.net)}</span>
              </div>

              <div className="summaryRow">
                <span>VAT (23%)</span>
                <span>{money(totals.vat)}</span>
              </div>

              <div className="summaryRow summaryTotal">
                <span>Razem</span>
                <span>{money(totals.gross)}</span>
              </div>

              <button
                className="btn primary summaryCheckout"
                onClick={handlePay}
                disabled={isProcessing}
                style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="spin" size={20} />
                    Przetwarzanie...
                  </>
                ) : (
                  "Przejdź do płatności"
                )}
              </button>
            </div>
          </aside>
        </div>
      )}
      
      {/* Mały styl dla animacji obracania ikonki */}
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}