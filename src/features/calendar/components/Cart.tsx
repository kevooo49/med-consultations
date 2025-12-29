import type { Consultation } from "../types";
import { format, parseISO } from "date-fns";

type Props = {
  items: Consultation[];
  onRemove: (id: string) => void;
  onCheckout: () => void;
};

function money(v: number) {
  return `${v.toFixed(2)} zł`;
}

export function Cart({ items, onRemove, onCheckout }: Props) {
  const totals = items.reduce(
    (acc, c) => {
      acc.net += c.price?.net ?? 0;
      acc.vat += c.price?.vat ?? 0;
      acc.gross += c.price?.gross ?? 0;
      return acc;
    },
    { net: 0, vat: 0, gross: 0 }
  );

  return (
    <section className="cartPage">
      <h2 className="cartTitle">Koszyk</h2>

      {items.length === 0 ? (
        <div className="cartEmpty">Brak wybranych konsultacji</div>
      ) : (
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
                onClick={onCheckout}
              >
                Przejdź do płatności
              </button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
