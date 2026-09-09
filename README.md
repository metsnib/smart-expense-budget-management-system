# Smart Expense & Budget Management System

A polished, fully client-side personal finance app to track expenses and income,
plan budgets, set savings goals, and understand your spending with rich analytics.
Built with **Vite + React + TypeScript + Tailwind CSS**. All data is stored
privately in your browser via `localStorage` — no account or server required.

## Features

- **Dashboard** — income, expenses, net balance, and savings-rate KPIs with
  month-over-month change, a 6-month cash-flow chart, spending mix donut,
  budget progress, recent activity, and auto-generated *Smart Insights*.
- **Transactions** — add / edit / delete income & expenses, search, filter by
  type / category / month, sort, day-grouped list, running totals, and CSV export.
- **Budgets** — set monthly limits per category with live progress bars and
  on-track / warning / over-budget states.
- **Analytics** — income-vs-expense trends (6/12 months), category breakdown
  bars, distribution donut, cumulative spend area chart, and a detailed table.
- **Savings Goals** — track targets, add / withdraw funds, and see progress.
- **Categories** — customizable categories with icons and colors.
- **Settings** — currency, theme (light / dark / system), monthly income target,
  JSON backup export & import, load demo data, and clear all.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
```

## Preview build

```bash
npm run build:preview   # emits a single self-contained dist-preview/index.html
```

This produces one standalone HTML file with all JS and CSS inlined.

## Tech

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- Recharts (charts) · lucide-react (icons) · date-fns (dates)

## Data & privacy

Everything lives in your browser's local storage. Use **Settings → Export backup**
to save a JSON snapshot, and **Import backup** to restore it on any device.
