#!/usr/bin/env python3
"""
Fintrack — Smart Expense & Budget Management System
Python (Flask) backend.

Serves the static front-end (index.html, styles.css, app.js) and exposes a
JSON REST API backed by SQLite. When this server is running the JavaScript
front-end automatically talks to it (detected via GET /api/health); otherwise
the app works fully offline via the browser's localStorage.

Run:
    pip install -r requirements.txt
    python server.py
    # open http://localhost:8000
"""

import json
import os
import random
import sqlite3
import time
from datetime import date, datetime

from flask import Flask, g, jsonify, request, send_from_directory
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("FINTRACK_DB", os.path.join(BASE_DIR, "fintrack.db"))

app = Flask(__name__, static_folder=None)
CORS(app)

DATA_VERSION = 1

# --------------------------------------------------------------------------- #
#  Reference data (kept in sync with app.js)
# --------------------------------------------------------------------------- #
DEFAULT_SETTINGS = {
    "currency": "USD",
    "locale": "en-US",
    "theme": "system",
    "monthlyIncomeTarget": 5000,
}

DEFAULT_CATEGORIES = [
    {"id": "cat-groceries", "name": "Groceries", "icon": "shopping-cart", "color": "#16a34a", "type": "expense"},
    {"id": "cat-dining", "name": "Dining Out", "icon": "utensils", "color": "#f97316", "type": "expense"},
    {"id": "cat-transport", "name": "Transport", "icon": "car", "color": "#0ea5e9", "type": "expense"},
    {"id": "cat-housing", "name": "Housing & Rent", "icon": "home", "color": "#8b5cf6", "type": "expense"},
    {"id": "cat-utilities", "name": "Utilities", "icon": "plug", "color": "#eab308", "type": "expense"},
    {"id": "cat-shopping", "name": "Shopping", "icon": "shopping-bag", "color": "#ec4899", "type": "expense"},
    {"id": "cat-entertainment", "name": "Entertainment", "icon": "clapperboard", "color": "#ef4444", "type": "expense"},
    {"id": "cat-health", "name": "Health", "icon": "heart-pulse", "color": "#14b8a6", "type": "expense"},
    {"id": "cat-education", "name": "Education", "icon": "graduation-cap", "color": "#6366f1", "type": "expense"},
    {"id": "cat-travel", "name": "Travel", "icon": "plane", "color": "#06b6d4", "type": "expense"},
    {"id": "cat-subscriptions", "name": "Subscriptions", "icon": "repeat", "color": "#a855f7", "type": "expense"},
    {"id": "cat-other-expense", "name": "Other", "icon": "ellipsis", "color": "#64748b", "type": "expense"},
    {"id": "cat-salary", "name": "Salary", "icon": "briefcase", "color": "#22c55e", "type": "income"},
    {"id": "cat-freelance", "name": "Freelance", "icon": "laptop", "color": "#3b82f6", "type": "income"},
    {"id": "cat-investments", "name": "Investments", "icon": "trending-up", "color": "#10b981", "type": "income"},
    {"id": "cat-gift", "name": "Gifts", "icon": "gift", "color": "#f43f5e", "type": "income"},
    {"id": "cat-other-income", "name": "Other Income", "icon": "wallet", "color": "#0d9488", "type": "income"},
]

EXPENSE_NOTES = {
    "cat-groceries": ["Weekly groceries", "Supermarket run", "Farmers market", "Costco haul"],
    "cat-dining": ["Lunch with team", "Dinner out", "Coffee & pastry", "Weekend brunch"],
    "cat-transport": ["Fuel", "Metro card", "Ride share", "Parking"],
    "cat-housing": ["Monthly rent", "Home maintenance"],
    "cat-utilities": ["Electricity bill", "Water bill", "Internet", "Gas bill"],
    "cat-shopping": ["New shoes", "Household items", "Clothing", "Electronics"],
    "cat-entertainment": ["Movie night", "Concert tickets", "Streaming rental"],
    "cat-health": ["Pharmacy", "Gym membership", "Doctor visit"],
    "cat-education": ["Online course", "Books", "Workshop"],
    "cat-travel": ["Flight booking", "Hotel stay", "Airport taxi"],
    "cat-subscriptions": ["Netflix", "Spotify", "Cloud storage", "News subscription"],
    "cat-other-expense": ["Misc expense", "Gift for friend"],
}


# --------------------------------------------------------------------------- #
#  Database helpers
# --------------------------------------------------------------------------- #
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, icon TEXT NOT NULL,
            color TEXT NOT NULL, type TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY, type TEXT NOT NULL, amount REAL NOT NULL,
            category_id TEXT NOT NULL, note TEXT DEFAULT '', date TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY, category_id TEXT NOT NULL UNIQUE,
            amount REAL NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, target REAL NOT NULL,
            saved REAL NOT NULL, color TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        """
    )
    seeded = db.execute("SELECT value FROM meta WHERE key = 'seeded'").fetchone()
    if seeded is None:
        db.execute("INSERT INTO meta (key, value) VALUES ('settings', ?)", (json.dumps(DEFAULT_SETTINGS),))
        seed_demo(db)
        db.execute("INSERT INTO meta (key, value) VALUES ('seeded', ?)", (json.dumps(True),))
    db.commit()
    db.close()


def seed_categories(db):
    db.execute("DELETE FROM categories")
    for c in DEFAULT_CATEGORIES:
        db.execute(
            "INSERT INTO categories (id, name, icon, color, type) VALUES (?,?,?,?,?)",
            (c["id"], c["name"], c["icon"], c["color"], c["type"]),
        )


def make_id(prefix="id"):
    return "%s-%s-%s" % (prefix, format(int(time.time() * 1000), "x"), format(random.randint(0, 0xFFFFFF), "06x"))


def round2(n):
    return round(float(n) * 100) / 100.0


# --------------------------------------------------------------------------- #
#  Serialization
# --------------------------------------------------------------------------- #
def row_to_txn(r):
    return {"id": r["id"], "type": r["type"], "amount": r["amount"], "categoryId": r["category_id"],
            "note": r["note"] or "", "date": r["date"], "createdAt": r["created_at"]}


def row_to_category(r):
    return {"id": r["id"], "name": r["name"], "icon": r["icon"], "color": r["color"], "type": r["type"]}


def row_to_budget(r):
    return {"id": r["id"], "categoryId": r["category_id"], "amount": r["amount"], "createdAt": r["created_at"]}


def row_to_goal(r):
    return {"id": r["id"], "name": r["name"], "target": r["target"], "saved": r["saved"],
            "color": r["color"], "createdAt": r["created_at"]}


def get_settings(db):
    row = db.execute("SELECT value FROM meta WHERE key = 'settings'").fetchone()
    settings = dict(DEFAULT_SETTINGS)
    if row:
        settings.update(json.loads(row["value"]))
    return settings


def full_data(db):
    return {
        "version": DATA_VERSION,
        "transactions": [row_to_txn(r) for r in db.execute(
            "SELECT * FROM transactions ORDER BY date DESC, created_at DESC")],
        "budgets": [row_to_budget(r) for r in db.execute("SELECT * FROM budgets")],
        "categories": [row_to_category(r) for r in db.execute("SELECT * FROM categories")],
        "goals": [row_to_goal(r) for r in db.execute("SELECT * FROM goals ORDER BY created_at")],
        "settings": get_settings(db),
    }


def data_response():
    return jsonify(full_data(get_db()))


# --------------------------------------------------------------------------- #
#  Demo seed (mirrors app.js createSeedData)
# --------------------------------------------------------------------------- #
def rnd(lo, hi):
    return round2(lo + random.random() * (hi - lo))


def seed_demo(db):
    db.execute("DELETE FROM transactions")
    db.execute("DELETE FROM budgets")
    db.execute("DELETE FROM goals")
    seed_categories(db)

    now = date.today()
    expense_cats = [c for c in DEFAULT_CATEGORIES if c["type"] == "expense"]

    def add_txn(t_type, amount, cat, note, y, m, d):
        iso = "%04d-%02d-%02d" % (y, m, d)
        db.execute(
            "INSERT INTO transactions (id, type, amount, category_id, note, date, created_at) VALUES (?,?,?,?,?,?,?)",
            (make_id("txn"), t_type, amount, cat, note, iso, datetime(y, m, d).isoformat()),
        )

    for months_ago in range(4, -1, -1):
        year = now.year
        month = now.month - months_ago
        while month <= 0:
            month += 12
            year -= 1
        if month == 12:
            dim = 31
        else:
            dim = (date(year, month + 1, 1).toordinal() - date(year, month, 1).toordinal())
        is_current = months_ago == 0
        day_cap = now.day if is_current else dim

        add_txn("income", 5200, "cat-salary", "Monthly salary", year, month, 1)
        if random.random() > 0.4:
            fd = min(int(rnd(10, 20)) or 12, day_cap)
            add_txn("income", rnd(300, 1200), "cat-freelance", "Freelance project", year, month, fd)
        add_txn("expense", 1450, "cat-housing", "Monthly rent", year, month, min(3, day_cap))
        add_txn("expense", 42.97, "cat-subscriptions", "Streaming & apps", year, month, min(5, day_cap))

        count = 18 + random.randint(0, 9)
        for _ in range(count):
            day = 1 + random.randint(0, day_cap - 1)
            cat = random.choice([c for c in expense_cats if c["id"] != "cat-housing"])
            cid = cat["id"]
            if cid == "cat-groceries":
                amount = rnd(25, 120)
            elif cid == "cat-dining":
                amount = rnd(8, 65)
            elif cid == "cat-transport":
                amount = rnd(5, 60)
            elif cid == "cat-utilities":
                amount = rnd(30, 140)
            elif cid == "cat-shopping":
                amount = rnd(20, 220)
            elif cid == "cat-travel":
                amount = rnd(80, 600)
            elif cid == "cat-health":
                amount = rnd(15, 150)
            else:
                amount = rnd(6, 80)
            note = random.choice(EXPENSE_NOTES.get(cid, ["Expense"]))
            add_txn("expense", amount, cid, note, year, month, day)

    now_iso = datetime.now().isoformat()
    for cid, amount in [("cat-groceries", 600), ("cat-dining", 350), ("cat-transport", 250),
                        ("cat-shopping", 400), ("cat-entertainment", 200), ("cat-utilities", 300)]:
        db.execute("INSERT INTO budgets (id, category_id, amount, created_at) VALUES (?,?,?,?)",
                   (make_id("bdg"), cid, amount, now_iso))
    for name, target, saved, color in [
        ("Emergency Fund", 10000, 6200, "#22c55e"),
        ("Vacation to Japan", 4000, 1450, "#06b6d4"),
        ("New Laptop", 2200, 1800, "#8b5cf6"),
    ]:
        db.execute("INSERT INTO goals (id, name, target, saved, color, created_at) VALUES (?,?,?,?,?,?)",
                   (make_id("goal"), name, target, saved, color, now_iso))


# --------------------------------------------------------------------------- #
#  API routes
# --------------------------------------------------------------------------- #
@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/data")
def api_data():
    return data_response()


# --- transactions ---
@app.post("/api/transactions")
def add_transaction():
    p = request.get_json(force=True)
    db = get_db()
    db.execute(
        "INSERT INTO transactions (id, type, amount, category_id, note, date, created_at) VALUES (?,?,?,?,?,?,?)",
        (make_id("txn"), p.get("type", "expense"), round2(p.get("amount", 0)), p.get("categoryId", ""),
         (p.get("note") or "").strip(), p.get("date", date.today().isoformat()), datetime.now().isoformat()),
    )
    db.commit()
    return data_response()


@app.put("/api/transactions/<txn_id>")
def update_transaction(txn_id):
    p = request.get_json(force=True)
    db = get_db()
    db.execute(
        "UPDATE transactions SET type=?, amount=?, category_id=?, note=?, date=? WHERE id=?",
        (p.get("type", "expense"), round2(p.get("amount", 0)), p.get("categoryId", ""),
         (p.get("note") or "").strip(), p.get("date", date.today().isoformat()), txn_id),
    )
    db.commit()
    return data_response()


@app.delete("/api/transactions/<txn_id>")
def delete_transaction(txn_id):
    db = get_db()
    db.execute("DELETE FROM transactions WHERE id=?", (txn_id,))
    db.commit()
    return data_response()


# --- categories ---
@app.post("/api/categories")
def add_category():
    p = request.get_json(force=True)
    db = get_db()
    db.execute("INSERT INTO categories (id, name, icon, color, type) VALUES (?,?,?,?,?)",
               (make_id("cat"), p.get("name", "Category"), p.get("icon", "ellipsis"),
                p.get("color", "#64748b"), p.get("type", "expense")))
    db.commit()
    return data_response()


@app.put("/api/categories/<cat_id>")
def update_category(cat_id):
    p = request.get_json(force=True)
    db = get_db()
    db.execute("UPDATE categories SET name=?, icon=?, color=?, type=? WHERE id=?",
               (p.get("name", "Category"), p.get("icon", "ellipsis"), p.get("color", "#64748b"),
                p.get("type", "expense"), cat_id))
    db.commit()
    return data_response()


@app.delete("/api/categories/<cat_id>")
def delete_category(cat_id):
    db = get_db()
    db.execute("DELETE FROM categories WHERE id=?", (cat_id,))
    db.execute("DELETE FROM budgets WHERE category_id=?", (cat_id,))
    db.commit()
    return data_response()


# --- budgets ---
@app.post("/api/budgets")
def add_budget():
    p = request.get_json(force=True)
    cid = p.get("categoryId")
    amount = round2(p.get("amount", 0))
    db = get_db()
    row = db.execute("SELECT id FROM budgets WHERE category_id=?", (cid,)).fetchone()
    if row:
        db.execute("UPDATE budgets SET amount=? WHERE category_id=?", (amount, cid))
    else:
        db.execute("INSERT INTO budgets (id, category_id, amount, created_at) VALUES (?,?,?,?)",
                   (make_id("bdg"), cid, amount, datetime.now().isoformat()))
    db.commit()
    return data_response()


@app.put("/api/budgets/<budget_id>")
def update_budget(budget_id):
    p = request.get_json(force=True)
    db = get_db()
    db.execute("UPDATE budgets SET amount=?, category_id=? WHERE id=?",
               (round2(p.get("amount", 0)), p.get("categoryId", ""), budget_id))
    db.commit()
    return data_response()


@app.delete("/api/budgets/<budget_id>")
def delete_budget(budget_id):
    db = get_db()
    db.execute("DELETE FROM budgets WHERE id=?", (budget_id,))
    db.commit()
    return data_response()


# --- goals ---
@app.post("/api/goals")
def add_goal():
    p = request.get_json(force=True)
    db = get_db()
    db.execute("INSERT INTO goals (id, name, target, saved, color, created_at) VALUES (?,?,?,?,?,?)",
               (make_id("goal"), p.get("name", "Goal"), round2(p.get("target", 0)),
                max(0, round2(p.get("saved", 0))), p.get("color", "#22c55e"), datetime.now().isoformat()))
    db.commit()
    return data_response()


@app.put("/api/goals/<goal_id>")
def update_goal(goal_id):
    p = request.get_json(force=True)
    db = get_db()
    db.execute("UPDATE goals SET name=?, target=?, saved=?, color=? WHERE id=?",
               (p.get("name", "Goal"), round2(p.get("target", 0)), max(0, round2(p.get("saved", 0))),
                p.get("color", "#22c55e"), goal_id))
    db.commit()
    return data_response()


@app.delete("/api/goals/<goal_id>")
def delete_goal(goal_id):
    db = get_db()
    db.execute("DELETE FROM goals WHERE id=?", (goal_id,))
    db.commit()
    return data_response()


@app.post("/api/goals/<goal_id>/contribute")
def contribute_goal(goal_id):
    p = request.get_json(force=True)
    db = get_db()
    row = db.execute("SELECT saved FROM goals WHERE id=?", (goal_id,)).fetchone()
    if row:
        new_saved = max(0, round2(row["saved"] + p.get("amount", 0)))
        db.execute("UPDATE goals SET saved=? WHERE id=?", (new_saved, goal_id))
        db.commit()
    return data_response()


# --- settings / data management ---
@app.put("/api/settings")
def update_settings():
    p = request.get_json(force=True)
    db = get_db()
    settings = get_settings(db)
    settings.update({k: v for k, v in p.items() if k in DEFAULT_SETTINGS})
    db.execute("UPDATE meta SET value=? WHERE key='settings'", (json.dumps(settings),))
    db.commit()
    return data_response()


@app.post("/api/reset-demo")
def reset_demo():
    db = get_db()
    seed_demo(db)
    db.commit()
    return data_response()


@app.post("/api/clear")
def clear_all():
    db = get_db()
    db.execute("DELETE FROM transactions")
    db.execute("DELETE FROM budgets")
    db.execute("DELETE FROM goals")
    seed_categories(db)
    db.commit()
    return data_response()


@app.post("/api/import")
def import_data():
    p = request.get_json(force=True)
    db = get_db()
    db.execute("DELETE FROM transactions")
    db.execute("DELETE FROM categories")
    db.execute("DELETE FROM budgets")
    db.execute("DELETE FROM goals")
    for c in p.get("categories", []):
        db.execute("INSERT OR REPLACE INTO categories (id, name, icon, color, type) VALUES (?,?,?,?,?)",
                   (c.get("id") or make_id("cat"), c.get("name", "Category"), c.get("icon", "ellipsis"),
                    c.get("color", "#64748b"), c.get("type", "expense")))
    for t in p.get("transactions", []):
        db.execute(
            "INSERT OR REPLACE INTO transactions (id, type, amount, category_id, note, date, created_at) VALUES (?,?,?,?,?,?,?)",
            (t.get("id") or make_id("txn"), t.get("type", "expense"), round2(t.get("amount", 0)),
             t.get("categoryId", ""), t.get("note", ""), t.get("date", date.today().isoformat()),
             t.get("createdAt") or datetime.now().isoformat()))
    for b in p.get("budgets", []):
        db.execute("INSERT OR REPLACE INTO budgets (id, category_id, amount, created_at) VALUES (?,?,?,?)",
                   (b.get("id") or make_id("bdg"), b.get("categoryId", ""), round2(b.get("amount", 0)),
                    b.get("createdAt") or datetime.now().isoformat()))
    for gl in p.get("goals", []):
        db.execute("INSERT OR REPLACE INTO goals (id, name, target, saved, color, created_at) VALUES (?,?,?,?,?,?)",
                   (gl.get("id") or make_id("goal"), gl.get("name", "Goal"), round2(gl.get("target", 0)),
                    max(0, round2(gl.get("saved", 0))), gl.get("color", "#22c55e"),
                    gl.get("createdAt") or datetime.now().isoformat()))
    if isinstance(p.get("settings"), dict):
        settings = dict(DEFAULT_SETTINGS)
        settings.update({k: v for k, v in p["settings"].items() if k in DEFAULT_SETTINGS})
        db.execute("UPDATE meta SET value=? WHERE key='settings'", (json.dumps(settings),))
    db.commit()
    return data_response()


# --------------------------------------------------------------------------- #
#  Static front-end
# --------------------------------------------------------------------------- #
@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<path:path>")
def static_files(path):
    if os.path.isfile(os.path.join(BASE_DIR, path)):
        return send_from_directory(BASE_DIR, path)
    return send_from_directory(BASE_DIR, "index.html")


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 8000))
    print("Fintrack running at http://localhost:%d" % port)
    app.run(host="0.0.0.0", port=port, debug=False)
