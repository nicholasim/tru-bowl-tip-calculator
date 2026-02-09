# TRŪ Bowl Tip Calculator — Project Learning Guide

Use this guide to understand how the app works so you can explain it clearly in an interview or when someone asks about the project.

---

## 1. High-level: What happens when someone uses the app?

1. **Open the app** → Login screen (enter name). No password; we don’t persist who’s “logged in.”
2. **Enter name** → App loads that user’s data from `localStorage` (roster, pay periods). Main UI appears.
3. **Roster** → Manager adds employees (name only). Stored per user.
4. **Pay period** → Manager creates a date range (e.g. Feb 1–15). App generates one “day” object per date, each with empty tips and hours.
5. **Daily entry** → For each day, manager enters tips (Cash, App, Credit) and assigns employees + hours. Each day’s tips are distributed by hours using the **largest-remainder** algorithm.
6. **Summary** → Period summary shows totals per employee and per day (bar chart + table), derived from all days.
7. **Switch user / Reset** → Switch user clears session and shows login again; Reset wipes this user’s roster and periods (with confirmation).

**One-sentence summary for interviews:**  
“It’s a React SPA that lets store managers enter daily tips and hours, distributes tips fairly by hours using a largest-remainder method, and persists everything per user in localStorage so multiple managers can use the same deployment.”

---

## 2. Entry point and app structure

- **`main.jsx`** renders `<App />` into `#root`.
- **`App.jsx`** holds the main flow:
  - **Session:** `currentUser` is **in-memory only** (`useState(null)`). So every refresh or new tab starts at the login screen.
  - **User data:** When `currentUser` is set, we call `useTipCalcStorage(currentUser)` to get that user’s `roster`, `periods`, `activePeriodId` and their setters. All of that is backed by `localStorage`.
  - **Conditional UI:** If `!currentUser` we render the login view (`UserScreen`). Otherwise we render the main layout: header (name, Reset, Switch user), sidebar (Roster + Pay period selector), and main (Period summary + day entries).

**Interview tip:** “State is split between session (who’s using the app right now) and persisted data (roster and pay periods), keyed by username so we don’t need a backend.”

---

## 3. User and storage: How is data scoped and persisted?

- **`lib/constants.js`**  
  - `STORAGE_KEYS`: base keys for roster, periods, active period.  
  - `userKey(baseKey, username)`: returns e.g. `tipcalc_roster_nick` so each user has their own keys.

- **`hooks/useLocalStorage.js`**  
  - **`useLocalStorage(key, initialValue)`**: React state that syncs with `localStorage`. On mount it reads from storage; when `key` or `value` changes it writes. When `key` changes (e.g. switching user), an effect re-reads from storage so the UI shows the right user’s data.  
  - **`useTipCalcStorage(username)`**: If there’s no username, returns empty roster/periods and no-op setters. Otherwise builds three user-scoped keys (roster, periods, active period) and returns three `useLocalStorage` pairs. So “Nick” and “Jane” never see each other’s data.

**Interview tip:** “We use a custom hook that wraps useState and syncs to localStorage. Another hook takes the current username and returns that user’s roster and periods, so the same code path works for any user and we don’t persist the current user—only their data.”

---

## 4. Data shapes: What’s in state?

- **Roster:** Array of `{ id, name }`. `id` is from `nanoid()` so we have stable keys even if names change.

- **Period:**  
  `{ id, startDate, endDate, days }`  
  - `days`: array of `{ date, tips, hours }`  
  - `date`: ISO date string `"YYYY-MM-DD"`  
  - `tips`: `{ cash, app, creditCard }` (strings or numbers for inputs)  
  - `hours`: `{ [employeeId]: hoursValue }` (employee IDs from roster)

- **Creating a period** (`lib/periodHelpers.js`):  
  `createPayPeriod(startDate, endDate)` creates one day object for each date in the range, each with default tips and empty hours. So the “source of truth” for the period is the `days` array; summary is always derived from it.

**Interview tip:** “Periods are just an array of day objects. We don’t store the summary—we compute it from the days so it can’t get out of sync.”

---

## 5. The tip distribution algorithm (largest-remainder)

**File:** `src/utils/calculations.js`

**Goal:** Split a day’s total tips among employees by hours so that:  
(1) each share is proportional to hours, and  
(2) the sum of rounded shares **exactly** equals the day’s total (no “missing penny” or extra penny).

**Steps (conceptually):**

1. Sum tips (cash + app + credit) and sum hours (only employees with hours > 0).
2. For each employee, compute **exact** share: `(hours / totalHours) * totalTips`.
3. Round down each share to cents (floor). That leaves a few cents unassigned.
4. Compute **remainder** for each: `exact - floor(exact)`.
5. Sort by remainder **descending**. Give one extra cent to the first N employees, where N = number of cents left to assign. That way the “biggest fractional cents” get rounded up first.
6. Return shares and a `reconciled` flag (sum of shares ≈ total tips within 0.001).

**Why largest-remainder?**  
Proportional split is fair; rounding down then assigning extra cents by remainder keeps the total exact and is a standard approach (like apportionment in voting).

**Interview tip:** “We use the largest-remainder method so the distributed amounts add up exactly to the day’s tips and rounding is fair. I can walk through the steps if you’d like.”

---

## 6. How data flows through the UI

- **Roster:** `App` owns `roster` and `setRoster` from `useTipCalcStorage`. It passes them to `RosterManager`. Add/edit/remove update state; the hook persists to localStorage.

- **Periods:** `App` owns `periods`, `setPeriods`, `activePeriodId`, `setActivePeriodId`. Creating a period: `createPayPeriod(start, end)` returns a new period; we prepend it and set it active. Removing a period: filter it out and if it was active, set active to the first remaining (or null).

- **Updating a day:** Each `DayEntry` receives `day` and `onUpdate`. When the user changes tips or hours, `DayEntry` calls `onUpdate(updatedDay)`. `App`’s `handleUpdateDay(dayIndex, updatedDay)` updates `periods` by mapping over and replacing that period’s `days[dayIndex]`. So the single source of truth is `periods` in App; day entries are “controlled” by that state.

- **Summary:** `PeriodSummary` receives `period` and `roster`. It runs `computePeriodTotals(period.days)`, which loops over days and calls `distributeTipsByHours` for each, then aggregates into `byEmployee` and `byDay`. So the summary is **derived** from the same days; no separate summary state.

**Interview tip:** “State lives in App and in the storage hook. Day updates go up via a callback; the summary is computed from the same period data so we don’t duplicate logic or state.”

---

## 7. Important implementation details

- **Controlled inputs:** Tip and hours inputs are controlled (value from state, onChange updates state). We use helpers like `toUsdInput` and `toHoursInput` to restrict to digits and decimals and avoid invalid values.

- **Displaying deleted employees:** If someone is removed from the roster but still has hours in past days, we show “Former employee” instead of their raw ID (in `PeriodSummary` and `TipDistributionChart`).

- **Empty / no period:** If there’s no active period, we show “Create or select a pay period.” If there’s a period but no data yet, the summary shows “Enter tips and hours below to see totals.”

- **Reconciliation message:** Each day’s results show whether the distributed total matches the day’s tips (reconciled) or if there’s a rounding warning.

---

## 8. Tech stack (for “what did you use?”)

- **React 19** — components, hooks (`useState`, `useMemo`, `useEffect`, `useCallback`, `useRef`).
- **Vite** — dev server and production build.
- **JavaScript (ES modules)** — no TypeScript.
- **localStorage** — persistence; keys are user-scoped via `userKey()`.
- **nanoid** — stable IDs for employees and periods.
- **CSS** — custom (no Tailwind/Bootstrap); responsive with media queries and touch-friendly targets.

---

## 9. Practice Q&A for interviews

**Q: How do you handle multiple users without a backend?**  
We don’t persist “who is logged in.” We only persist roster and pay periods, and we scope those by username (e.g. `tipcalc_roster_nick`). So when you enter your name, we load your data; when you switch user, we clear the in-memory user and show the login screen again. Each user’s data is isolated by key.

**Q: How does the tip splitting work?**  
For each day we take total tips and each employee’s hours. We compute the exact proportional share, floor to cents, then assign the leftover cents to the employees with the largest fractional remainders (largest-remainder method). That way the sum of shares equals the day’s total and rounding is fair.

**Q: Where does the summary come from?**  
It’s derived. We have a function that takes the period’s `days` array, runs the distribution for each day, and aggregates into “totals per employee” and “per-day breakdown.” We don’t store the summary—we compute it so it always matches the entered data.

**Q: Why did you use localStorage instead of a database?**  
The project was to make the manager’s job easier without standing up a server. localStorage lets each manager have their own data on the device they use, and we can deploy as a static site. For multiple stores, the same URL works and each manager just enters their name.

**Q: How would you extend this (e.g. export, backup)?**  
We could add “Export CSV” that builds a table from `period.days` and the roster and triggers a download. For backup, we could serialize roster + periods to JSON and let them download a file or paste into a “Restore” text area. Both stay client-side and don’t require a backend.

---

Use this guide alongside the code: open `App.jsx`, then follow the flow into `useLocalStorage.js`, `calculations.js`, and one or two components. That will give you the confidence to explain the project clearly in an interview.
