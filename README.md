# FinWise — Smart Expense & Budget Management System

A polished, privacy-first personal finance app. Track income and expenses, set
per-category budgets, and get automatic, personalized insights into your spending.
All data lives locally in your browser — nothing is sent to a server.

Built with **Vite + React + TypeScript + Tailwind CSS**.

## Features

- **Dashboard** — total balance, monthly income/expenses, savings rate, cash-flow
  chart (income vs expenses over 6 months), top-categories donut, budget progress,
  smart insights and recent activity. Browse any past month.
- **Transactions** — add / edit / delete income & expenses with category, account,
  date and notes. Full-text search, type & category filters, and day-by-day grouping.
- **Budgets** — set monthly spending limits per category with live progress bars and
  over/near-limit warnings.
- **Analytics** — period selector (this month, last month, 3 months, this year),
  income-vs-expense bars, spending-by-category breakdown, daily spending trend,
  largest expenses and spend-by-account.
- **Smart insights** — automatically generated tips: savings-rate vs goal, spending
  trend vs last month, exceeded/near budgets, top categories, budget suggestions and
  subscription detection.
- **Settings** — currency (15 options), light/dark theme, income target & savings
  goal, custom categories (icon + color), plus JSON export/import, sample data and reset.
- **Persistence** — everything is stored in `localStorage`; export a JSON backup anytime.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
```

## Preview build

A single, fully self-contained HTML file (all JS/CSS inlined, zero external requests)
can be produced for sharing/previewing:

```bash
npm run build:preview   # emits dist-preview/index.html
```

## Tech

- React 18 + TypeScript (strict)
- Tailwind CSS 3
- Recharts (charts)
- lucide-react (icons)
- date-fns (dates)

No backend, no accounts, no tracking — your financial data never leaves your device.
