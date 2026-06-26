# TRŪ Bowl Tip Calculator

## About This Project

My manager mentioned that manually calculating and distributing tips was taking a long time. I took the initiative and offered to build something that would make the task more efficient, easier to use, and would make the data easier to work with.

**Results:** The manager can now calculate and distribute tips much more easily. The store owner runs multiple locations, so the same app can be shared with other store managers to simplify tip handling across all stores.

## Live Link

**[TRŪ Bowl Tip Calculator](https://tru-bowl-tip-calculator.vercel.app/)** — try it in the browser (no install required).

## Deployment (Vercel)

The app is deployed on [Vercel](https://vercel.com). To deploy this project the same way:

1. **Push the project to GitHub** (if it isn’t already).
2. **Sign in to [Vercel](https://vercel.com)** and click **Add New… → Project**.
3. **Import your GitHub repo.** Vercel will detect the Vite app and set:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. **Deploy.** Vercel builds and hosts the static site. Every push to your main branch triggers a new deployment.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables on Vercel (see [Supabase setup](#supabase-setup) below) if you want authenticated accounts to work in production. Guest mode runs entirely in the browser and needs no config.

## Features

- **Guest mode**: Jump straight in with no account or name required; data is stored in `localStorage` on that device only.
- **Accounts**: Create an account or log in with a username and password to sync your roster and pay periods to the cloud via Supabase. Creating an account migrates any existing guest data on that device into the new account.
- **Roster**: Add, edit, and remove employees.
- **Pay periods**: Create bi-weekly (or custom) pay periods and switch between them.
- **Daily entry**: For each day, enter tips (Cash, App, Credit) and assign employees with hours worked.
- **Tip distribution**: Tips are split by hours using a largest-remainder algorithm so totals reconcile and rounding is fair.
- **Pay period summary**: Bar chart and table of totals per employee and per day.
- **Mobile-friendly**: Responsive layout and touch-friendly controls for use on phones and tablets.
- **Reset**: Clear your roster and pay periods, or switch user to start fresh.

## Tech Stack

- **React** (v19) + **Vite**
- **JavaScript** (ES modules)
- **CSS** (responsive, no framework)
- **Supabase** (Postgres + Auth) for authenticated accounts; **localStorage** for guest mode
- **nanoid** for stable IDs

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- A Supabase project (only needed for authenticated accounts; guest mode works without one)

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor (Database → SQL Editor → New query). It creates the `profiles`, `employees`, `pay_periods`, `daily_entries`, and `entry_hours` tables, row-level security policies, and a helper function for username login.
3. In **Authentication → Sign In / Providers → Email**, turn **off** "Confirm email". Usernames are mapped to internal addresses (`uid_<username>@trubowl.internal`) that can't receive a real confirmation email, so signup would otherwise get stuck.
4. Copy your project's URL and anon key into `.env` (see `.env.example`):
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Choose to log in, create an account, or continue as a guest.

### Build for production

```bash
npm run build
npm run preview
```

The built app is in `dist/` and can be deployed to any static host (e.g. Vercel, Netlify).

### Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start dev server         |
| `npm run build`| Production build         |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests (Vitest)       |
| `npm run lint` | Run ESLint               |

## Project Structure

```
src/
├── App.jsx           # Main app, mode switching (guest/auth), layout
├── App.css           # Styles and responsive breakpoints
├── components/
│   ├── AuthScreen.jsx      # Log in / create account / continue-as-guest
│   ├── RosterManager.jsx   # Add/edit/remove employees
│   ├── DayEntry.jsx        # Per-day tips and hours
│   ├── PeriodSummary.jsx   # Summary table and chart
│   └── TipDistributionChart.jsx
├── hooks/
│   ├── useLocalStorage.js     # Guest-mode persistence; user-scoped keys
│   ├── useAuth.js             # Supabase session + profile state
│   └── useSupabaseStorage.js  # Authenticated-mode persistence (Supabase)
├── lib/
│   ├── constants.js        # Storage keys, userKey()
│   ├── periodHelpers.js    # Date ranges, createPayPeriod
│   ├── supabaseClient.js   # Supabase client instance
│   ├── auth.js             # signUpWithUsername/signInWithUsername/signOut
│   └── migrateLocalData.js # One-time guest -> Supabase migration on signup
└── utils/
    └── calculations.js    # distributeTipsByHours, computePeriodTotals

supabase/
└── schema.sql         # Tables, RLS policies, get_login_email() function
```

## How It Works

- **Guest mode**: No name or account needed; "Continue as Guest" drops you straight into the app. Every open/refresh starts at the choice screen. Roster and pay-period data are stored in `localStorage` under one fixed `tipcalc_roster_guest`-style key shared by all guest sessions on that browser.
- **Accounts**: Username/password accounts are backed by Supabase Auth under the hood with a hidden email (`uid_<username>@trubowl.internal`); a `profiles` row maps username → auth user id. Roster, pay periods, daily tip entries, and hours are stored in Supabase tables, each row-level-secured to its owning `auth.uid()`. Signing up migrates any guest data already on the device, then clears it from `localStorage`.
- **Distribution**: For each day, tips are divided by hours using the largest-remainder method so the sum of shares equals the day’s total and extra cents are assigned by largest remainder.
- **Summary**: Period totals are computed from all days and shown in a bar chart and an employee × day table.

## License

Private / internal use.
