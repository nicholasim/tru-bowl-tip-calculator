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

No environment variables or server config are required; the app runs entirely in the browser and uses `localStorage` for data.

## Features

- **Multi-user**: Enter your name to start; data is stored per user (no account required).
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
- **localStorage** for persistence (user-scoped keys)
- **nanoid** for stable IDs

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)

### Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Enter a name to use the app; data is saved in your browser for that user.

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
├── App.jsx           # Main app, user flow, layout
├── App.css           # Styles and responsive breakpoints
├── components/
│   ├── UserScreen.jsx      # Login (name entry)
│   ├── RosterManager.jsx   # Add/edit/remove employees
│   ├── DayEntry.jsx        # Per-day tips and hours
│   ├── PeriodSummary.jsx   # Summary table and chart
│   └── TipDistributionChart.jsx
├── hooks/
│   └── useLocalStorage.js  # Persist state; user-scoped keys
├── lib/
│   ├── constants.js        # Storage keys, userKey()
│   └── periodHelpers.js    # Date ranges, createPayPeriod
└── utils/
    └── calculations.js    # distributeTipsByHours, computePeriodTotals
```

## How It Works

- **Session**: Current user is kept in memory only; every open/refresh starts at the login screen. Roster and pay-period data are stored in `localStorage` under keys like `tipcalc_roster_<username>`.
- **Distribution**: For each day, tips are divided by hours using the largest-remainder method so the sum of shares equals the day’s total and extra cents are assigned by largest remainder.
- **Summary**: Period totals are computed from all days and shown in a bar chart and an employee × day table.

## License

Private / internal use.
