# TRŪ Bowl Tip Calculator

![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white)

A tip-pooling and distribution tool built for a real superfood bar, replacing a manual, error-prone spreadsheet process with a fast, mobile-friendly web app.

## About

My manager mentioned that manually calculating and distributing tips was taking a long time. I took the initiative and offered to build something that would make the task more efficient, easier to use, and easier to audit.

The app now runs in production for the store. Because the store owner operates multiple locations, the same app is shared across managers — each one signs in with their own account, and Supabase Row-Level Security keeps every manager's roster and tip data completely isolated from everyone else's.

## Live Link

**[tru-bowl-tip-calculator.vercel.app](https://tru-bowl-tip-calculator.vercel.app/)** — try it in the browser, no install required.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS + [shadcn/ui](https://ui.shadcn.com) components |
| Backend | Supabase — PostgreSQL database, Auth, Row-Level Security |
| Hosting | Vercel (auto-deploys on push to `main`) |
| IDs | [`nanoid`](https://github.com/ai/nanoid) for client-generated record IDs |

## Features

- **Two modes of use**
  - **Guest** — jump in instantly, no account needed. Data lives in `localStorage` and is wiped at the start of every new guest session (one-time use; nothing persists between sessions).
  - **Authenticated** — create an account and your roster and pay periods sync to Supabase, available from any device.
- **Username/password accounts** — sign up and log in with just a username; the email Supabase requires under the hood is generated automatically and never shown to the user.
- **Guest → account migration** — if a guest decides to create an account, their in-progress roster and pay periods are carried over automatically instead of being lost.
- **Employee roster** — add, edit, and remove employees; the list is always displayed alphabetically regardless of entry order.
- **Pay periods** — create periods with any custom date range, switch between past periods, and delete a period (with a confirmation prompt) along with all of its tip entries. Deleting the active period automatically falls back to the most recent remaining one, or shows an empty state if none are left.
- **Daily tip entry** — log Cash, App, and Credit tips per day and record which employees worked and for how many hours.
- **Fair tip distribution** — tips are split across employees by hours worked using a largest-remainder algorithm, so distributed shares always reconcile to the exact total (no lost or duplicated pennies).
- **Pay period summary** — a bar chart and an employee × day breakdown; employees who've since left the roster still show correctly as "Former employee" against their historical entries.
- **Mobile-first responsive design** — the day × employee table collapses into per-employee cards with a collapsible daily breakdown, tip inputs stack full-width, and header actions tuck into a small menu — all sized for comfortable one-handed use on a phone.
- **Data isolation** — every table is protected by Supabase Row-Level Security, so each manager only ever sees their own data.
- **Dark/light mode** — toggle between themes from the header; defaults to dark, and your choice is saved so it persists across sessions.
- **TRŪ Bowl branding** — pink (`#d76ba9`) and teal (`#35bfb0`) brand colors throughout.

## Getting Started

### Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) project (only required for authenticated accounts — guest mode works with zero setup)

### 1. Clone and install

```bash
git clone <repo-url>
cd tru-bowl-tip-calculator
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Database → SQL Editor → New query**, paste in the contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the `profiles`, `employees`, `pay_periods`, `daily_entries`, and `entry_hours` tables, their Row-Level Security policies, and the `get_login_email()` helper used for username login.
3. Go to **Authentication → Sign In / Providers → Email** and turn **off** "Confirm email." Usernames are mapped to addresses like `uid_<username>@trubowl.internal` that can never receive a real confirmation email, so sign-ups would otherwise get stuck unconfirmed.
4. Copy your project's API URL and anon key into a `.env` file (see `.env.example`):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 3. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and either continue as a guest or create an account.

### Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build locally |
| `npm run test` | Run the test suite (Vitest) |
| `npm run lint` | Run ESLint |

### Deploying

The live site is deployed on Vercel: import the repo and Vercel auto-detects the Next.js build, zero config needed. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables in the Vercel project settings so authenticated accounts work in production — guest mode needs no configuration there. Every push to `main` redeploys automatically.

## Project Structure

```
src/
├── app/
│   ├── layout.js             # Root layout: <html>/<body>, metadata, theme-init script
│   ├── page.js                # The single route (/); loads App client-only (no SSR)
│   └── globals.css            # Tailwind directives, brand theme (light/dark CSS vars)
├── components/
│   ├── App.jsx                 # Mode switching (guest/auth), layout, top-level state
│   ├── AuthScreen.jsx           # Log in / create account / continue-as-guest
│   ├── RosterManager.jsx        # Add, edit, and remove employees
│   ├── DayEntry.jsx             # Per-day tip entry and hours
│   ├── PeriodSummary.jsx        # Summary table (desktop) / cards (mobile) + chart
│   ├── TipDistributionChart.jsx
│   ├── ThemeToggle.jsx          # Dark/light mode toggle button
│   └── ui/                      # shadcn/ui primitives (Button, Card, Input, Badge, Label)
├── hooks/
│   ├── useLocalStorage.js    # Guest-mode persistence, user-scoped keys
│   ├── useAuth.js            # Supabase session + profile state
│   ├── useSupabaseStorage.js # Authenticated-mode persistence (Supabase)
│   └── useTheme.js           # Dark/light theme state, persisted to localStorage
├── lib/
│   ├── constants.js          # Storage keys, userKey()
│   ├── periodHelpers.js      # Date ranges, createPayPeriod()
│   ├── supabaseClient.js     # Supabase client instance
│   ├── auth.js               # signUpWithUsername / signInWithUsername / signOut
│   ├── migrateLocalData.js   # One-time guest -> Supabase migration on signup
│   └── utils.js               # cn() class-merging helper for shadcn/ui
└── utils/
    └── calculations.js       # distributeTipsByHours, computePeriodTotals

supabase/
└── schema.sql                # Tables, RLS policies, get_login_email() function
```

## How It Works

- **Guest mode** is intentionally single-use: every time someone taps "Continue as Guest," any guest data left over from a previous session on that device is wiped first, so each session starts from a clean slate.
- **Accounts** are Supabase Auth users under the hood, signed in with a hidden, derived email (`uid_<username>@trubowl.internal`) so the user only ever sees a username. A `profiles` table maps username → `auth.uid()`. Roster, pay period, tip, and hours data all live in Supabase tables, each scoped to its owner by Row-Level Security policies — one manager's data is never visible to another's queries, even if the app layer got it wrong.
- **Tip distribution** divides each day's total tips across the employees who worked, proportional to hours, using the largest-remainder method: whole cents are assigned first, then any leftover pennies go to the employees with the largest fractional remainder, so the distributed total always equals the entered total exactly.
- **Summaries** are computed from every day in the period and rendered as a bar chart plus an employee × day breakdown; on phone-width screens that breakdown becomes one card per employee with a tap-to-expand daily detail list.

## License

This is a private project built for an actual business; the source is shared here for portfolio purposes. Please don't reuse it commercially without permission.
