import { useState, useEffect } from "react";
import { 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  inMemoryPersistence 
} from "firebase/auth";
import { auth } from "../../firebaseConfig";

export function PersistenceSettings() {
  // POPRAWKA: Stan początkowy ładujemy z localStorage (lub domyślnie LOCAL)
  const [currentMode, setCurrentMode] = useState(() => {
    return localStorage.getItem("persistenceMode") || "LOCAL";
  });

  const handleChange = async (mode: string) => {
    let persistenceType;
    if (mode === "SESSION") persistenceType = browserSessionPersistence;
    else if (mode === "NONE") persistenceType = inMemoryPersistence;
    else persistenceType = browserLocalPersistence;

    try {
      await setPersistence(auth, persistenceType);
      
      // POPRAWKA: Zapisujemy wybór do localStorage, żeby przetrwał odświeżenie
      localStorage.setItem("persistenceMode", mode);
      setCurrentMode(mode);
      
      alert(`Zmieniono tryb sesji na: ${mode}.`);
    } catch (error) {
      console.error(error);
      alert("Błąd zmiany ustawień sesji");
    }
  };

  return (
    <div style={{ marginTop: 20, padding: 15, background: "#fff", border: "1px solid #ddd", borderRadius: 8 }}>
      <h3>Ustawienia Sesji (Zadanie 3)</h3>
      <p style={{ fontSize: "0.9em", color: "#666" }}>
        Decyduje o tym, czy użytkownik pozostaje zalogowany po zamknięciu karty.
      </p>
      
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button 
          onClick={() => handleChange("LOCAL")}
          className="btn"
          style={{ background: currentMode === "LOCAL" ? "#2196f3" : "#ddd", color: currentMode === "LOCAL" ? "#fff" : "#000" }}
        >
          LOCAL
        </button>
        <button 
          onClick={() => handleChange("SESSION")}
          className="btn"
          style={{ background: currentMode === "SESSION" ? "#2196f3" : "#ddd", color: currentMode === "SESSION" ? "#fff" : "#000" }}
        >
          SESSION
        </button>
        <button 
          onClick={() => handleChange("NONE")}
          className="btn"
          style={{ background: currentMode === "NONE" ? "#2196f3" : "#ddd", color: currentMode === "NONE" ? "#fff" : "#000" }}
        >
          NONE
        </button>
      </div>
    </div>
  );
}