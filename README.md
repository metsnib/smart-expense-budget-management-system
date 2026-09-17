#Smart Expense & Budget Management System

A polished, privacy-first personal finance app. Track income and expenses, set
per-category budgets, plan savings goals, and get automatic, personalized
insights into your spending.

Built with **plain HTML, CSS, JavaScript and a Python (Flask) backend** — no
front-end framework and no build step required.

## How it works

- **Front-end** — `index.html` + `styles.css` + `app.js` (vanilla JavaScript).
  Renders the whole app, draws charts with hand-written SVG, and stores data in
  the browser's `localStorage`.
- **Back-end** *(optional)* — `server.py` is a small Flask app with a SQLite
  database and a JSON REST API. When it's running, the front-end automatically
  detects it (`GET /api/health`) and uses the server as the source of truth.
  When it isn't, the app works fully offline via `localStorage`.

## Features

- **Dashboard** — income, expenses, net balance and savings rate (with
  month-over-month change), cash-flow bar chart, spending-mix donut, smart
  insights, budget progress and recent activity. Browse any month.
- **Transactions** — add / edit / delete income & expenses with category, note
  and date. Search, type/category filters, all-time or this-month scope,
  sorting, day-by-day grouping and **CSV export**.
- **Budgets** — set monthly spending limits per category with live progress,
  totals overview and over/near-limit warnings.
- **Analytics** — 6/12-month income-vs-expense trend, category breakdown bars
  (expense/income), distribution donut, cumulative-spend area chart and a
  detailed category table.
- **Goals** — create savings goals with a target and color, add/withdraw funds
  and watch your progress toward each goal.
- **Categories** — full CRUD for custom categories with emoji icons and colors.
- **Smart insights** — savings rate vs 20% target, spend vs last month,
  exceeded/near budgets and your biggest category.
- **Settings** — currency (14 options), monthly income target, light/dark/system
  theme, data stats, JSON export/import, load demo data and clear all.

## Run it

### Option A — full stack (Python)

```bash
pip install -r requirements.txt
python server.py
# open http://localhost:8000
```

The Flask server serves the static files **and** the REST API, persisting your
data to a local SQLite database (`fintrack.db`).

### Option B — front-end only (no Python)

Open `index.html` in a browser, or serve the folder statically:

```bash
python3 -m http.server 8000    # or: npm run serve
```

Your data is saved in the browser's `localStorage`.

## Build a shareable single file

Produce one fully self-contained `index.html` (all CSS/JS inlined, zero external
requests):

```bash
node build.js        # writes dist/index.html
# or
npm run build
```

## REST API (server.py)

| Method | Endpoint                          | Description                    |
| ------ | --------------------------------- | ------------------------------ |
| GET    | `/api/health`                     | Health check                   |
| GET    | `/api/data`                       | Full app data                  |
| POST   | `/api/transactions`               | Add a transaction              |
| PUT    | `/api/transactions/<id>`          | Update a transaction           |
| DELETE | `/api/transactions/<id>`          | Delete a transaction           |
| POST   | `/api/categories`                 | Add a category                 |
| PUT    | `/api/categories/<id>`            | Update a category              |
| DELETE | `/api/categories/<id>`            | Delete a category              |
| POST   | `/api/budgets`                    | Create / replace a budget      |
| PUT    | `/api/budgets/<id>`               | Update a budget                |
| DELETE | `/api/budgets/<id>`               | Delete a budget                |
| POST   | `/api/goals`                      | Add a savings goal             |
| PUT    | `/api/goals/<id>`                 | Update a goal                  |
| DELETE | `/api/goals/<id>`                 | Delete a goal                  |
| POST   | `/api/goals/<id>/contribute`      | Add/withdraw goal funds        |
| PUT    | `/api/settings`                   | Update settings                |
| POST   | `/api/reset-demo`                 | Load demo data                 |
| POST   | `/api/clear`                      | Clear all data                 |
| POST   | `/api/import`                     | Replace all data (JSON backup) |

No accounts, no tracking — your financial data stays on your device or your own server.
