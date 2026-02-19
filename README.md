# 🏥 System Rezerwacji Medycznych (Medical Booking Portal)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black)

Zaawansowana aplikacja internetowa (Single Page Application) do zarządzania wizytami lekarskimi, grafikami pracy oraz opiniami pacjentów. Projekt demonstruje implementację skomplikowanej logiki biznesowej (obsługa konfliktów czasowych w kalendarzu) oraz elastycznej architektury front-endu opartej na wzorcach projektowych.

## ✨ Główne funkcjonalności

### 🔒 Role-Based Access Control (RBAC)
System obsługuje trzy niezależne typy kont z oddzielnymi ścieżkami (routing) i uprawnieniami:
* **Pacjent:** Przeglądanie listy lekarzy, interaktywna rezerwacja wizyt (mechanizm koszyka wizyt: status *draft* -> *booked*), wystawianie opinii (zabezpieczone wymogiem odbytej wizyty) oraz odbieranie powiadomień.
* **Lekarz:** Dedykowany widok kalendarza, zarządzanie dostępnością (godziny pracy), wprowadzanie urlopów (z automatycznym odwoływaniem kolidujących wizyt) oraz masowa wysyłka powiadomień do swoich pacjentów.
* **Admin:** Zarządzanie użytkownikami (banowanie), moderacja systemu opinii, zakładanie zaufanych kont lekarskich oraz globalna konfiguracja trybu persystencji sesji w przeglądarce.

### 📅 Autorski Kalendarz Wizyt
Zamiast korzystać z gotowych bibliotek UI, kalendarz i siatka godzin zostały zbudowane od podstaw:
* Dynamiczna siatka czasu skalowana w czasie rzeczywistym (1 minuta = 2 piksele).
* Zaznaczanie przedziałów czasowych metodą Drag & Drop.
* Zaawansowana walidacja w locie: blokada tworzenia rezerwacji nakładających się na inne wizyty ("mosty"), blokada rezerwacji poza godzinami pracy lekarza oraz w czasie jego urlopu.
* Dynamiczny wskaźnik aktualnego czasu ("Teraz").

### 🔄 Architektura Hybrydowa (Strategy Pattern)
Warstwa dostępu do danych została wyabstrahowana za pomocą interfejsu. Pozwala to na **dynamiczne przełączanie bazy danych w locie** bez zmiany logiki biznesowej aplikacji. Obsługiwane strategie to:
1. **Firebase Realtime Database:** Komunikacja natywna z wykorzystaniem protokołu WebSockets.
2. **Local JSON Server (REST API):** Implementacja wzorca *Event Bus* (Observer), symulująca reaktywność i odświeżanie danych w czasie rzeczywistym na standardowym protokole HTTP.

### 🔔 Powiadomienia Real-Time
Zaimplementowany system powiadomień typu *Toast*. Pacjenci są natychmiastowo powiadamiani o zmianach w grafiku lekarza, anulowanych wizytach czy ogłoszeniach, bez konieczności odświeżania strony.

---

## 🛠️ Stack Technologiczny

* **Frontend:** React 18, TypeScript
* **Routing & Ochrona widoków:** React Router DOM
* **Manipulacja czasem:** `date-fns`
* **Stylizacja:** CSS3 (Custom Grids, Absolute Positioning), `clsx`, Lucide React (ikony)
* **BaaS & Autoryzacja:** Firebase (Authentication, Realtime Database)
* **Mock API:** `json-server`

---

## 📸 Zrzuty ekranu

![Widok główny](https://github.com/kevooo49/med-consultations/blob/main/public/Zrzut%20ekranu%202026-02-19%20193853.png)

![Widok kalendarza](https://github.com/kevooo49/med-consultations/blob/main/public/Zrzut%20ekranu%202026-02-19%20194038.png)

---

## 🚀 Jak uruchomić projekt lokalnie?

### Wymagania wstępne
* Node.js (v16+)
* Menedżer pakietów (NPM lub Yarn)

### Instalacja

**1. Sklonuj repozytorium**
```bash
git clone [https://github.com/TwojLogin/nazwa-repozytorium.git](https://github.com/TwojLogin/nazwa-repozytorium.git)
cd nazwa-repozytorium

```

**2. Zainstaluj zależności**

```bash
npm install

```

**3. Uruchomienie Mock API (Local JSON Server)**
Aby przetestować działanie w trybie lokalnym, uruchom serwer API w osobnej karcie terminala:

```bash
npx json-server --watch db.json --port 3001

```

**4. Uruchomienie aplikacji React**

```bash
npm start

```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

---

## 👤 Autor

**Kevin Stuka**

* GitHub: [@Kevooo49](https://www.google.com/search?q=https://github.com/kevooo49)

```

```
