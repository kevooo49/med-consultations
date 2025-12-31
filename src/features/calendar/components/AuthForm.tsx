import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";

export function AuthForm() {
  const { login, register, logout } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  // Stan formularza
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  
  // Obsługa błędów i komunikatów
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      if (isLogin) {
        await login(email, pass);
      } else {
        // REJESTRACJA
        await register(email, pass, "patient");
        
        // 1. Firebase domyślnie loguje, więc wylogowujemy ręcznie
        await logout();
        
        // 2. Przełączamy na widok logowania
        setIsLogin(true);
        setMessage("Rejestracja udana! Możesz się teraz zalogować.");
        
        // 3. Czyścimy hasło dla bezpieczeństwa
        setPass("");
      }
    } catch (err: any) {
      // Tłumaczenie popularnych błędów Firebase na polski
      if (err.code === 'auth/email-already-in-use') {
        setError("Ten email jest już zajęty.");
      } else if (err.code === 'auth/weak-password') {
        setError("Hasło jest za słabe (min. 6 znaków).");
      } else if (err.code === 'auth/invalid-credential') {
        setError("Błędny email lub hasło.");
      } else {
        setError("Wystąpił błąd: " + err.message);
      }
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", padding: 20, border: "1px solid #ccc", borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
      <h2 style={{ textAlign: "center" }}>{isLogin ? "Zaloguj się" : "Zarejestruj się"}</h2>
      
      {error && <div style={{ color: "red", background: "#ffe6e6", padding: 10, borderRadius: 4, marginBottom: 10 }}>{error}</div>}
      {message && <div style={{ color: "green", background: "#e6ffe6", padding: 10, borderRadius: 4, marginBottom: 10 }}>{message}</div>}
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <div>
          <label style={{ display: "block", marginBottom: 5 }}>Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 5 }}>Hasło</label>
          <input 
            type="password" 
            value={pass} 
            onChange={e => setPass(e.target.value)} 
            required 
            style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
          />
        </div>
        
        <button type="submit" className="btn" style={{ marginTop: 10, padding: 10, cursor: "pointer" }}>
          {isLogin ? "Zaloguj" : "Zarejestruj"}
        </button>
      </form>
      
      <p style={{ marginTop: 20, textAlign: "center", fontSize: "0.9em" }}>
        {isLogin ? "Nie masz konta? " : "Masz już konto? "}
        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setError("");
            setMessage("");
          }} 
          style={{ background: "none", border: "none", color: "blue", textDecoration: "underline", cursor: "pointer" }}
        >
          {isLogin ? "Zarejestruj się" : "Zaloguj się"}
        </button>
      </p>
    </div>
  );
}