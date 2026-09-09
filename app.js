/* ============================================================
   Fintrack — Smart Expense & Budget Management System
   Vanilla JavaScript (no framework, no build step).

   Data layer: talks to the Python (Flask) API when available
   (served from server.py); otherwise falls back to the browser's
   localStorage so the app works fully offline and standalone.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------------------------------------------------- *
   *  Reference data
   * ---------------------------------------------------------- */
  const CURRENCIES = [
    { code: 'USD', label: 'US Dollar ($)' },
    { code: 'EUR', label: 'Euro (€)' },
    { code: 'GBP', label: 'British Pound (£)' },
    { code: 'JPY', label: 'Japanese Yen (¥)' },
    { code: 'INR', label: 'Indian Rupee (₹)' },
    { code: 'CAD', label: 'Canadian Dollar (C$)' },
    { code: 'AUD', label: 'Australian Dollar (A$)' },
    { code: 'CNY', label: 'Chinese Yuan (¥)' },
    { code: 'BRL', label: 'Brazilian Real (R$)' },
    { code: 'ZAR', label: 'South African Rand (R)' },
    { code: 'NGN', label: 'Nigerian Naira (₦)' },
    { code: 'SGD', label: 'Singapore Dollar (S$)' },
    { code: 'CHF', label: 'Swiss Franc (CHF)' },
    { code: 'AED', label: 'UAE Dirham (د.إ)' },
  ];

  const DEFAULT_CATEGORIES = [
    { id: 'cat-groceries', name: 'Groceries', icon: 'shopping-cart', color: '#16a34a', type: 'expense' },
    { id: 'cat-dining', name: 'Dining Out', icon: 'utensils', color: '#f97316', type: 'expense' },
    { id: 'cat-transport', name: 'Transport', icon: 'car', color: '#0ea5e9', type: 'expense' },
    { id: 'cat-housing', name: 'Housing & Rent', icon: 'home', color: '#8b5cf6', type: 'expense' },
    { id: 'cat-utilities', name: 'Utilities', icon: 'plug', color: '#eab308', type: 'expense' },
    { id: 'cat-shopping', name: 'Shopping', icon: 'shopping-bag', color: '#ec4899', type: 'expense' },
    { id: 'cat-entertainment', name: 'Entertainment', icon: 'clapperboard', color: '#ef4444', type: 'expense' },
    { id: 'cat-health', name: 'Health', icon: 'heart-pulse', color: '#14b8a6', type: 'expense' },
    { id: 'cat-education', name: 'Education', icon: 'graduation-cap', color: '#6366f1', type: 'expense' },
    { id: 'cat-travel', name: 'Travel', icon: 'plane', color: '#06b6d4', type: 'expense' },
    { id: 'cat-subscriptions', name: 'Subscriptions', icon: 'repeat', color: '#a855f7', type: 'expense' },
    { id: 'cat-other-expense', name: 'Other', icon: 'ellipsis', color: '#64748b', type: 'expense' },
    { id: 'cat-salary', name: 'Salary', icon: 'briefcase', color: '#22c55e', type: 'income' },
    { id: 'cat-freelance', name: 'Freelance', icon: 'laptop', color: '#3b82f6', type: 'income' },
    { id: 'cat-investments', name: 'Investments', icon: 'trending-up', color: '#10b981', type: 'income' },
    { id: 'cat-gift', name: 'Gifts', icon: 'gift', color: '#f43f5e', type: 'income' },
    { id: 'cat-other-income', name: 'Other Income', icon: 'wallet', color: '#0d9488', type: 'income' },
  ];

  const CATEGORY_COLOR_CHOICES = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b',
  ];
  const CATEGORY_ICON_CHOICES = [
    'shopping-cart', 'utensils', 'car', 'home', 'plug', 'shopping-bag', 'clapperboard', 'heart-pulse',
    'graduation-cap', 'plane', 'repeat', 'briefcase', 'laptop', 'trending-up', 'gift', 'wallet', 'coffee',
    'dumbbell', 'gamepad-2', 'book', 'fuel', 'pizza', 'baby', 'dog', 'phone', 'wifi', 'droplet', 'zap',
    'piggy-bank', 'ellipsis',
  ];
  const ICON_EMOJI = {
    'shopping-cart': '🛒', utensils: '🍽️', car: '🚗', home: '🏠', plug: '🔌', 'shopping-bag': '🛍️',
    clapperboard: '🎬', 'heart-pulse': '🩺', 'graduation-cap': '🎓', plane: '✈️', repeat: '🔁',
    briefcase: '💼', laptop: '💻', 'trending-up': '📈', gift: '🎁', wallet: '👛', coffee: '☕',
    dumbbell: '🏋️', 'gamepad-2': '🎮', book: '📚', fuel: '⛽', pizza: '🍕', baby: '👶', dog: '🐶',
    phone: '📞', wifi: '📶', droplet: '💧', zap: '⚡', 'piggy-bank': '🐷', ellipsis: '📦',
  };
  function catEmoji(key) { return ICON_EMOJI[key] || '💲'; }

  const DEFAULT_SETTINGS = { currency: 'USD', locale: 'en-US', theme: 'system', monthlyIncomeTarget: 5000 };

  /* ---------------------------------------------------------- *
   *  Helpers
   * ---------------------------------------------------------- */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid(p) { return (p || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function currentMonthKey() { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function shiftMonthKey(key, delta) { const p = key.split('-').map(Number); const d = new Date(p[0], p[1] - 1 + delta, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function monthKeyOf(iso) { return iso.slice(0, 7); }
  function monthLabel(key) { const p = key.split('-').map(Number); return MONTHS_LONG[p[1] - 1] + ' ' + p[0]; }
  function shortMonthLabel(key) { const p = key.split('-').map(Number); return MONTHS_SHORT[p[1] - 1] + ' ' + String(p[0]).slice(2); }
  function recentMonthKeys(count) { const keys = []; const n = new Date(); for (let i = count - 1; i >= 0; i--) { const d = new Date(n.getFullYear(), n.getMonth() - i, 1); keys.push(d.getFullYear() + '-' + pad(d.getMonth() + 1)); } return keys; }
  function parseISO(s) { const p = s.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
  function fmtDate(iso, mode) {
    const d = parseISO(iso);
    if (mode === 'md') return MONTHS_SHORT[d.getMonth()] + ' ' + d.getDate();
    if (mode === 'weekday') return WEEKDAYS[d.getDay()] + ', ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getDate();
    return MONTHS_SHORT[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  /* ---------------------------------------------------------- *
   *  Formatting
   * ---------------------------------------------------------- */
  function formatCurrency(amount, currency, locale, opts) {
    opts = opts || {};
    try {
      return new Intl.NumberFormat(locale || 'en-US', {
        style: 'currency',
        currency: currency || 'USD',
        notation: opts.compact ? 'compact' : 'standard',
        maximumFractionDigits: opts.hideCents ? 0 : 2,
        minimumFractionDigits: opts.hideCents ? 0 : undefined,
      }).format(amount);
    } catch (e) {
      return '$' + Number(amount).toFixed(2);
    }
  }
  function money(amount, opts) { return formatCurrency(amount, state.data.settings.currency, state.data.settings.locale, opts); }

  /* ---------------------------------------------------------- *
   *  Analytics
   * ---------------------------------------------------------- */
  function filterByMonth(txns, mKey) { return txns.filter((t) => monthKeyOf(t.date) === mKey); }
  function sumByType(txns, type) { return txns.filter((t) => t.type === type).reduce((a, t) => a + t.amount, 0); }
  function totalIncome(txns) { return sumByType(txns, 'income'); }
  function totalExpense(txns) { return sumByType(txns, 'expense'); }
  function catById(cats) { const m = {}; cats.forEach((c) => (m[c.id] = c)); return m; }

  function categoryBreakdown(txns, cats, type) {
    type = type || 'expense';
    const byId = catById(cats);
    const filtered = txns.filter((t) => t.type === type);
    const total = filtered.reduce((a, t) => a + t.amount, 0);
    const map = {};
    filtered.forEach((t) => { const c = map[t.categoryId] || { total: 0, count: 0 }; c.total += t.amount; c.count += 1; map[t.categoryId] = c; });
    return Object.keys(map).map((id) => ({
      categoryId: id, category: byId[id], total: map[id].total, count: map[id].count,
      percent: total > 0 ? (map[id].total / total) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
  }
  function budgetStatuses(data, mKey) {
    const byId = catById(data.categories);
    const monthTxns = filterByMonth(data.transactions, mKey);
    return data.budgets.map((budget) => {
      const spent = monthTxns.filter((t) => t.type === 'expense' && t.categoryId === budget.categoryId).reduce((a, t) => a + t.amount, 0);
      const remaining = budget.amount - spent;
      const percent = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const st = percent >= 100 ? 'over' : percent >= 80 ? 'warning' : 'ok';
      return { budget, category: byId[budget.categoryId], spent, remaining, percent, state: st };
    }).sort((a, b) => b.percent - a.percent);
  }
  function monthlySeries(txns, count) {
    return recentMonthKeys(count).map((key) => {
      const m = filterByMonth(txns, key);
      const income = totalIncome(m), expense = totalExpense(m);
      return { key, label: shortMonthLabel(key), income, expense, net: income - expense };
    });
  }
  function dailyCumulativeExpense(txns, mKey) {
    const p = mKey.split('-').map(Number);
    const dim = new Date(p[0], p[1], 0).getDate();
    const byDay = new Array(dim + 1).fill(0);
    txns.forEach((t) => {
      if (t.type !== 'expense' || monthKeyOf(t.date) !== mKey) return;
      const day = Number(t.date.slice(8, 10));
      if (day >= 1 && day <= dim) byDay[day] += t.amount;
    });
    const out = []; let running = 0;
    for (let d = 1; d <= dim; d++) { running += byDay[d]; out.push({ day: d, amount: byDay[d], cumulative: running }); }
    return out;
  }
  function averageDailySpend(txns, mKey) {
    const m = filterByMonth(txns, mKey);
    const expense = totalExpense(m);
    const p = mKey.split('-').map(Number);
    const now = new Date();
    const isCurrent = now.getFullYear() === p[0] && now.getMonth() + 1 === p[1];
    const days = isCurrent ? now.getDate() : new Date(p[0], p[1], 0).getDate();
    return days > 0 ? expense / days : 0;
  }
  function buildInsights(data, mKey) {
    const insights = [];
    const prevKey = shiftMonthKey(mKey, -1);
    const monthTxns = filterByMonth(data.transactions, mKey);
    const prevTxns = filterByMonth(data.transactions, prevKey);
    const expense = totalExpense(monthTxns), income = totalIncome(monthTxns), prevExpense = totalExpense(prevTxns);

    if (income > 0) {
      const rate = ((income - expense) / income) * 100;
      if (rate >= 20) insights.push({ id: 'sg', tone: 'positive', title: "You're saving " + rate.toFixed(0) + '% of your income', detail: 'Great job! A savings rate above 20% builds long-term financial resilience.' });
      else if (rate < 0) insights.push({ id: 'sn', tone: 'danger', title: 'Spending exceeds income this month', detail: "You've spent " + Math.abs(rate).toFixed(0) + '% more than you earned. Review large expenses below.' });
      else insights.push({ id: 'sl', tone: 'warning', title: 'Savings rate is ' + rate.toFixed(0) + '%', detail: 'Aim for at least 20%. Small cuts in top categories add up quickly.' });
    }
    if (prevExpense > 0) {
      const change = ((expense - prevExpense) / prevExpense) * 100;
      if (change > 10) insights.push({ id: 'su', tone: 'warning', title: 'Spending is up ' + change.toFixed(0) + '% vs last month', detail: 'Check which categories grew the most and adjust if it was unplanned.' });
      else if (change < -10) insights.push({ id: 'sd', tone: 'positive', title: 'Spending is down ' + Math.abs(change).toFixed(0) + '% vs last month', detail: 'Nice work trimming expenses compared to last month.' });
    }
    const statuses = budgetStatuses(data, mKey);
    const over = statuses.filter((s) => s.state === 'over');
    const warning = statuses.filter((s) => s.state === 'warning');
    if (over.length) insights.push({ id: 'bo', tone: 'danger', title: over.length + ' budget' + (over.length > 1 ? 's' : '') + ' exceeded', detail: 'Over limit: ' + over.map((s) => (s.category ? s.category.name : 'Unknown')).join(', ') + '.' });
    else if (warning.length) insights.push({ id: 'bw', tone: 'warning', title: warning.length + ' budget' + (warning.length > 1 ? 's' : '') + ' near the limit', detail: 'Watch: ' + warning.map((s) => (s.category ? s.category.name : 'Unknown')).join(', ') + '.' });
    else if (statuses.length) insights.push({ id: 'bok', tone: 'positive', title: 'All budgets are on track', detail: 'Every category is under its monthly limit so far.' });
    const breakdown = categoryBreakdown(monthTxns, data.categories, 'expense');
    if (breakdown.length) { const top = breakdown[0]; insights.push({ id: 'tc', tone: 'info', title: (top.category ? top.category.name : 'Uncategorized') + ' is your biggest expense', detail: 'It accounts for ' + top.percent.toFixed(0) + "% of this month's spending across " + top.count + ' transactions.' }); }
    return insights;
  }

  /* ---------------------------------------------------------- *
   *  Seed / empty data
   * ---------------------------------------------------------- */
  const EXPENSE_NOTES = {
    'cat-groceries': ['Weekly groceries', 'Supermarket run', 'Farmers market', 'Costco haul'],
    'cat-dining': ['Lunch with team', 'Dinner out', 'Coffee & pastry', 'Weekend brunch'],
    'cat-transport': ['Fuel', 'Metro card', 'Ride share', 'Parking'],
    'cat-housing': ['Monthly rent', 'Home maintenance'],
    'cat-utilities': ['Electricity bill', 'Water bill', 'Internet', 'Gas bill'],
    'cat-shopping': ['New shoes', 'Household items', 'Clothing', 'Electronics'],
    'cat-entertainment': ['Movie night', 'Concert tickets', 'Streaming rental'],
    'cat-health': ['Pharmacy', 'Gym membership', 'Doctor visit'],
    'cat-education': ['Online course', 'Books', 'Workshop'],
    'cat-travel': ['Flight booking', 'Hotel stay', 'Airport taxi'],
    'cat-subscriptions': ['Netflix', 'Spotify', 'Cloud storage', 'News subscription'],
    'cat-other-expense': ['Misc expense', 'Gift for friend'],
  };
  function rand(min, max) { return round2(min + Math.random() * (max - min)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function createSeedData() {
    const transactions = [];
    const now = new Date();
    const expenseCats = DEFAULT_CATEGORIES.filter((c) => c.type === 'expense');
    function add(type, amount, categoryId, note, y, m, d) {
      const iso = y + '-' + pad(m) + '-' + pad(d);
      transactions.push({ id: uid('txn'), type: type, amount: amount, categoryId: categoryId, note: note, date: iso, createdAt: new Date(y, m - 1, d).toISOString() });
    }
    for (let monthsAgo = 4; monthsAgo >= 0; monthsAgo--) {
      const base = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
      const y = base.getFullYear(), m = base.getMonth() + 1;
      const dim = new Date(y, m, 0).getDate();
      const isCurrent = monthsAgo === 0;
      const dayCap = isCurrent ? now.getDate() : dim;
      add('income', 5200, 'cat-salary', 'Monthly salary', y, m, 1);
      if (Math.random() > 0.4) add('income', rand(300, 1200), 'cat-freelance', 'Freelance project', y, m, Math.min((parseInt(rand(10, 20)) || 12), dayCap));
      add('expense', 1450, 'cat-housing', 'Monthly rent', y, m, Math.min(3, dayCap));
      add('expense', 42.97, 'cat-subscriptions', 'Streaming & apps', y, m, Math.min(5, dayCap));
      const count = 18 + Math.floor(Math.random() * 10);
      for (let i = 0; i < count; i++) {
        const day = 1 + Math.floor(Math.random() * dayCap);
        const cat = pick(expenseCats.filter((c) => c.id !== 'cat-housing'));
        let amount;
        switch (cat.id) {
          case 'cat-groceries': amount = rand(25, 120); break;
          case 'cat-dining': amount = rand(8, 65); break;
          case 'cat-transport': amount = rand(5, 60); break;
          case 'cat-utilities': amount = rand(30, 140); break;
          case 'cat-shopping': amount = rand(20, 220); break;
          case 'cat-travel': amount = rand(80, 600); break;
          case 'cat-health': amount = rand(15, 150); break;
          default: amount = rand(6, 80);
        }
        add('expense', amount, cat.id, pick(EXPENSE_NOTES[cat.id] || ['Expense']), y, m, day);
      }
    }
    transactions.sort((a, b) => (a.date < b.date ? 1 : -1));
    const ts = now.toISOString();
    const budgets = [
      { id: uid('bdg'), categoryId: 'cat-groceries', amount: 600, createdAt: ts },
      { id: uid('bdg'), categoryId: 'cat-dining', amount: 350, createdAt: ts },
      { id: uid('bdg'), categoryId: 'cat-transport', amount: 250, createdAt: ts },
      { id: uid('bdg'), categoryId: 'cat-shopping', amount: 400, createdAt: ts },
      { id: uid('bdg'), categoryId: 'cat-entertainment', amount: 200, createdAt: ts },
      { id: uid('bdg'), categoryId: 'cat-utilities', amount: 300, createdAt: ts },
    ];
    const goals = [
      { id: uid('goal'), name: 'Emergency Fund', target: 10000, saved: 6200, color: '#22c55e', createdAt: ts },
      { id: uid('goal'), name: 'Vacation to Japan', target: 4000, saved: 1450, color: '#06b6d4', createdAt: ts },
      { id: uid('goal'), name: 'New Laptop', target: 2200, saved: 1800, color: '#8b5cf6', createdAt: ts },
    ];
    return { version: 1, transactions, budgets, categories: clone(DEFAULT_CATEGORIES), goals, settings: Object.assign({}, DEFAULT_SETTINGS, { monthlyIncomeTarget: 5500 }) };
  }
  function emptyData() {
    return { version: 1, transactions: [], budgets: [], categories: clone(DEFAULT_CATEGORIES), goals: [], settings: Object.assign({}, DEFAULT_SETTINGS) };
  }

  /* ---------------------------------------------------------- *
   *  Data layer — local (localStorage) reducer
   * ---------------------------------------------------------- */
  const STORAGE_KEY = 'fintrack:data:v1';
  function sortTxns(list) {
    return list.slice().sort((a, b) => { if (a.date === b.date) return a.createdAt < b.createdAt ? 1 : -1; return a.date < b.date ? 1 : -1; });
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.transactions) && Array.isArray(p.categories)) {
        return Object.assign(emptyData(), p, { settings: Object.assign(emptyData().settings, p.settings || {}) });
      }
    } catch (e) {}
    return null;
  }
  function saveLocal(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {} }

  function applyAction(state, action) {
    const d = clone(state);
    switch (action.type) {
      case 'ADD_TRANSACTION':
        d.transactions = sortTxns([Object.assign({}, action.payload, { id: uid('txn'), createdAt: new Date().toISOString() })].concat(d.transactions));
        return d;
      case 'UPDATE_TRANSACTION':
        d.transactions = sortTxns(d.transactions.map((t) => (t.id === action.payload.id ? action.payload : t)));
        return d;
      case 'DELETE_TRANSACTION':
        d.transactions = d.transactions.filter((t) => t.id !== action.payload.id);
        return d;
      case 'ADD_BUDGET': {
        const ex = d.budgets.find((b) => b.categoryId === action.payload.categoryId);
        if (ex) ex.amount = action.payload.amount;
        else d.budgets.push(Object.assign({}, action.payload, { id: uid('bdg'), createdAt: new Date().toISOString() }));
        return d;
      }
      case 'UPDATE_BUDGET':
        d.budgets = d.budgets.map((b) => (b.id === action.payload.id ? Object.assign({}, b, { amount: action.payload.amount, categoryId: action.payload.categoryId }) : b));
        return d;
      case 'DELETE_BUDGET':
        d.budgets = d.budgets.filter((b) => b.id !== action.payload.id);
        return d;
      case 'ADD_CATEGORY':
        d.categories.push(Object.assign({}, action.payload, { id: uid('cat') }));
        return d;
      case 'UPDATE_CATEGORY':
        d.categories = d.categories.map((c) => (c.id === action.payload.id ? action.payload : c));
        return d;
      case 'DELETE_CATEGORY':
        d.categories = d.categories.filter((c) => c.id !== action.payload.id);
        d.budgets = d.budgets.filter((b) => b.categoryId !== action.payload.id);
        return d;
      case 'ADD_GOAL':
        d.goals.push(Object.assign({}, action.payload, { id: uid('goal'), createdAt: new Date().toISOString() }));
        return d;
      case 'UPDATE_GOAL':
        d.goals = d.goals.map((g) => (g.id === action.payload.id ? action.payload : g));
        return d;
      case 'DELETE_GOAL':
        d.goals = d.goals.filter((g) => g.id !== action.payload.id);
        return d;
      case 'CONTRIBUTE_GOAL':
        d.goals = d.goals.map((g) => (g.id === action.payload.id ? Object.assign({}, g, { saved: Math.max(0, round2(g.saved + action.payload.amount)) }) : g));
        return d;
      case 'UPDATE_SETTINGS':
        d.settings = Object.assign({}, d.settings, action.payload);
        return d;
      case 'IMPORT_DATA':
        return Object.assign(emptyData(), action.payload, { settings: Object.assign(emptyData().settings, action.payload.settings || {}), transactions: sortTxns(action.payload.transactions || []) });
      case 'RESET_DEMO':
        return createSeedData();
      case 'CLEAR_ALL':
        return emptyData();
      default:
        return d;
    }
  }

  /* ---------------------------------------------------------- *
   *  Data layer — server (Python/Flask API)
   * ---------------------------------------------------------- */
  const API_BASE = 'api';
  let serverMode = false;
  async function apiFetch(path, options) {
    const res = await fetch(API_BASE + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options));
    if (!res.ok) throw new Error('API ' + res.status);
    return res.json();
  }
  async function detectServer() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch(API_BASE + '/health', { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch (e) { return false; }
  }
  function serverCommit(action) {
    switch (action.type) {
      case 'ADD_TRANSACTION': return apiFetch('/transactions', { method: 'POST', body: JSON.stringify(action.payload) });
      case 'UPDATE_TRANSACTION': return apiFetch('/transactions/' + action.payload.id, { method: 'PUT', body: JSON.stringify(action.payload) });
      case 'DELETE_TRANSACTION': return apiFetch('/transactions/' + action.payload.id, { method: 'DELETE' });
      case 'ADD_BUDGET': return apiFetch('/budgets', { method: 'POST', body: JSON.stringify(action.payload) });
      case 'UPDATE_BUDGET': return apiFetch('/budgets/' + action.payload.id, { method: 'PUT', body: JSON.stringify({ amount: action.payload.amount, categoryId: action.payload.categoryId }) });
      case 'DELETE_BUDGET': return apiFetch('/budgets/' + action.payload.id, { method: 'DELETE' });
      case 'ADD_CATEGORY': return apiFetch('/categories', { method: 'POST', body: JSON.stringify(action.payload) });
      case 'UPDATE_CATEGORY': return apiFetch('/categories/' + action.payload.id, { method: 'PUT', body: JSON.stringify(action.payload) });
      case 'DELETE_CATEGORY': return apiFetch('/categories/' + action.payload.id, { method: 'DELETE' });
      case 'ADD_GOAL': return apiFetch('/goals', { method: 'POST', body: JSON.stringify(action.payload) });
      case 'UPDATE_GOAL': return apiFetch('/goals/' + action.payload.id, { method: 'PUT', body: JSON.stringify(action.payload) });
      case 'DELETE_GOAL': return apiFetch('/goals/' + action.payload.id, { method: 'DELETE' });
      case 'CONTRIBUTE_GOAL': return apiFetch('/goals/' + action.payload.id + '/contribute', { method: 'POST', body: JSON.stringify({ amount: action.payload.amount }) });
      case 'UPDATE_SETTINGS': return apiFetch('/settings', { method: 'PUT', body: JSON.stringify(action.payload) });
      case 'IMPORT_DATA': return apiFetch('/import', { method: 'POST', body: JSON.stringify(action.payload) });
      case 'RESET_DEMO': return apiFetch('/reset-demo', { method: 'POST' });
      case 'CLEAR_ALL': return apiFetch('/clear', { method: 'POST' });
      default: return Promise.resolve(state.data);
    }
  }
  async function commit(action) {
    if (serverMode) return serverCommit(action);
    const next = applyAction(state.data, action);
    saveLocal(next);
    return next;
  }

  /* ---------------------------------------------------------- *
   *  App state
   * ---------------------------------------------------------- */
  const state = {
    data: emptyData(),
    view: 'dashboard',
    month: currentMonthKey(),
    // transactions view
    txnSearch: '', txnScope: 'all', txnType: 'all', txnCategory: 'all', txnSort: 'date-desc',
    // analytics view
    trendRange: 6, catType: 'expense',
  };
  let pendingCharts = [];

  async function dispatch(action) {
    try { setData(await commit(action)); }
    catch (e) { console.error(e); toast('Something went wrong', 'error'); }
  }
  function setData(data) { state.data = data; applyTheme(); renderApp(); }

  function resolveTheme() {
    const t = state.data.settings.theme;
    if (t === 'dark') return 'dark';
    if (t === 'light') return 'light';
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  function applyTheme() {
    const resolved = resolveTheme();
    document.documentElement.setAttribute('data-theme', resolved);
    const meta = qs('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#020617' : '#1b6ff5');
  }

  /* ---------------------------------------------------------- *
   *  Icons (inline SVG, stroke = currentColor)
   * ---------------------------------------------------------- */
  const ICONS = {
    'layout-grid': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    'arrow-left-right': '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
    'pie-chart': '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10Z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    tags: '<path d="M9 5H4a2 2 0 0 0-2 2v5l7 7a2 2 0 0 0 3 0l4-4a2 2 0 0 0 0-3L9 5Z"/><path d="M6 9h.01"/><path d="m14 5 7 7a2 2 0 0 1 0 3l-1 1"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'trending-up': '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    'trending-down': '<path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
    'piggy-bank': '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.4-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5Z"/><path d="M2 9v1c0 1.1.9 2 2 2h1"/>',
    lightbulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
    'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>',
    'circle-dollar-sign': '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 6v2m0 8v2"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"/>',
    'arrow-down-up': '<path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>',
    'rotate-ccw': '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4M16.71 13.88l.7.71-2.82 2.82"/>',
    palette: '<circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/><circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/><path d="M12 2a10 10 0 0 0 0 20 2.5 2.5 0 0 0 2-4 2.5 2.5 0 0 1 2-4h2a4 4 0 0 0 4-4 10 10 0 0 0-10-8Z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    'alert-triangle': '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h0"/>',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    'party-popper': '<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 12"/><path d="m9.5 14.5 3 3"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  };
  function icon(name, cls) {
    const body = ICONS[name] || ICONS.info;
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
  }

  /* ---------------------------------------------------------- *
   *  Charts (SVG + HTML)
   * ---------------------------------------------------------- */
  function niceMax(v) {
    if (v <= 0) return 10;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
  }
  function trendBars(w, h, series) {
    const padL = 50, padR = 8, padT = 12, padB = 22;
    const iw = w - padL - padR, ih = h - padT - padB;
    const maxV = niceMax(Math.max(1, ...series.map((s) => Math.max(s.income, s.expense))));
    const n = series.length, groupW = iw / n, barW = Math.min(14, (groupW - 10) / 2);
    const y = (v) => padT + ih - (v / maxV) * ih;
    let grid = '', ylabels = '';
    for (let g = 0; g <= 4; g++) {
      const gy = padT + (ih * g) / 4;
      grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '"/>';
      ylabels += '<text x="' + (padL - 6) + '" y="' + (gy + 3) + '" text-anchor="end">' + esc(money(maxV * (1 - g / 4), { compact: true })) + '</text>';
    }
    let bars = '', xlabels = '';
    series.forEach((s, i) => {
      const cx = padL + groupW * i + groupW / 2, base = padT + ih;
      const iy = y(s.income), ey = y(s.expense);
      bars += '<rect class="bar-hover" x="' + (cx - barW - 2) + '" y="' + iy + '" width="' + barW + '" height="' + Math.max(0, base - iy) + '" rx="3" fill="#22c55e"><title>Income: ' + esc(money(s.income)) + '</title></rect>';
      bars += '<rect class="bar-hover" x="' + (cx + 2) + '" y="' + ey + '" width="' + barW + '" height="' + Math.max(0, base - ey) + '" rx="3" fill="#f43f5e"><title>Expense: ' + esc(money(s.expense)) + '</title></rect>';
      xlabels += '<text x="' + cx + '" y="' + (h - 6) + '" text-anchor="middle">' + esc(s.label) + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '"><g class="chart-grid">' + grid + '</g>' + bars + '<g class="chart-axis">' + ylabels + xlabels + '</g></svg>';
  }
  function cumulativeArea(w, h, daily) {
    const padL = 50, padR = 8, padT = 12, padB = 22;
    const iw = w - padL - padR, ih = h - padT - padB;
    const maxV = niceMax(Math.max(1, ...daily.map((d) => d.cumulative)));
    const n = daily.length;
    const x = (i) => padL + (n <= 1 ? iw / 2 : (iw * i) / (n - 1));
    const y = (v) => padT + ih - (v / maxV) * ih;
    let line = '';
    daily.forEach((d, i) => { line += (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(d.cumulative).toFixed(1) + ' '; });
    const area = line + 'L' + x(n - 1).toFixed(1) + ' ' + (padT + ih) + ' L' + x(0).toFixed(1) + ' ' + (padT + ih) + ' Z';
    let grid = '', ylabels = '';
    for (let g = 0; g <= 4; g++) {
      const gy = padT + (ih * g) / 4;
      grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (w - padR) + '" y2="' + gy + '"/>';
      ylabels += '<text x="' + (padL - 6) + '" y="' + (gy + 3) + '" text-anchor="end">' + esc(money(maxV * (1 - g / 4), { compact: true })) + '</text>';
    }
    let xlabels = '';
    daily.forEach((d, i) => { if (i % 5 === 0 || i === n - 1) xlabels += '<text x="' + x(i) + '" y="' + (h - 6) + '" text-anchor="middle">' + d.day + '</text>'; });
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '"><defs><linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1b6ff5" stop-opacity="0.35"/><stop offset="100%" stop-color="#1b6ff5" stop-opacity="0"/></linearGradient></defs>' +
      '<g class="chart-grid">' + grid + '</g><path d="' + area + '" fill="url(#spendGrad)"/><path d="' + line + '" fill="none" stroke="#1b6ff5" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<g class="chart-axis">' + ylabels + xlabels + '</g></svg>';
  }
  function donutSVG(segments) {
    const size = 220, cx = 110, cy = 110, r = 82, thickness = 26;
    const c = 2 * Math.PI * r;
    const total = segments.reduce((a, s) => a + s.value, 0);
    let offset = 0, arcs = '';
    if (total <= 0) {
      arcs = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--surface-2)" stroke-width="' + thickness + '"/>';
    } else {
      segments.forEach((s) => {
        const len = (s.value / total) * c;
        const gap = Math.min(2, len * 0.08);
        arcs += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + s.color + '" stroke-width="' + thickness + '" stroke-dasharray="' + Math.max(0, len - gap).toFixed(2) + ' ' + (c - Math.max(0, len - gap)).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '"/>';
        offset += len;
      });
    }
    return '<svg class="chart" viewBox="0 0 ' + size + ' ' + size + '"><g transform="rotate(-90 ' + cx + ' ' + cy + ')">' + arcs + '</g></svg>';
  }
  function categoryBarsHTML(breakdown) {
    const rows = breakdown.slice(0, 8);
    const max = Math.max(1, ...rows.map((b) => b.total));
    return '<div class="cbars">' + rows.map((b) => {
      const color = b.category ? b.category.color : '#94a3b8';
      const w = (b.total / max) * 100;
      return '<div class="cbar"><span class="cbar-name truncate">' + esc(b.category ? b.category.name : 'Uncategorized') + '</span>' +
        '<span class="cbar-track"><span class="cbar-fill" style="width:' + w + '%;background:' + color + '"></span></span>' +
        '<span class="cbar-val tabular">' + money(b.total, { compact: true }) + '</span></div>';
    }).join('') + '</div>';
  }
  function registerChart(id, builder) { pendingCharts.push({ id: id, builder: builder }); }
  function flushCharts() {
    pendingCharts.forEach((c) => {
      const box = document.getElementById(c.id);
      if (!box) return;
      const w = Math.max(240, box.clientWidth || 320);
      const hh = box.clientHeight || 260;
      box.innerHTML = c.builder(w, hh);
    });
    pendingCharts = [];
  }

  /* ---------------------------------------------------------- *
   *  Reusable fragments
   * ---------------------------------------------------------- */
  function catBadge(cat, size, radius) {
    const color = cat ? cat.color : '#94a3b8';
    return '<span class="cat-badge" style="width:' + size + 'px;height:' + size + 'px;border-radius:' + (radius || 12) + 'px;background:' + color + '20">' + catEmoji(cat ? cat.icon : 'ellipsis') + '</span>';
  }
  function progressBar(value, color) {
    return '<div class="progress"><span style="width:' + clamp(value, 0, 100) + '%;background:' + (color || 'var(--brand-600)') + '"></span></div>';
  }
  function emptyState(iconName, title, desc, actionHTML) {
    return '<div class="empty"><span class="ic">' + icon(iconName) + '</span><h3>' + esc(title) + '</h3><p>' + esc(desc) + '</p>' + (actionHTML ? '<div class="action">' + actionHTML + '</div>' : '') + '</div>';
  }
  function catOf(id) { return state.data.categories.find((c) => c.id === id); }

  /* ---------------------------------------------------------- *
   *  App shell
   * ---------------------------------------------------------- */
  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-grid' },
    { id: 'transactions', label: 'Transactions', icon: 'arrow-left-right' },
    { id: 'budgets', label: 'Budgets', icon: 'wallet' },
    { id: 'analytics', label: 'Analytics', icon: 'pie-chart' },
    { id: 'goals', label: 'Goals', icon: 'target' },
    { id: 'categories', label: 'Categories', icon: 'tags' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];
  const VIEW_META = {
    dashboard: { title: 'Dashboard', subtitle: 'Your financial overview at a glance', month: true },
    transactions: { title: 'Transactions', subtitle: 'Every income and expense you record', month: true },
    budgets: { title: 'Budgets', subtitle: 'Set limits and track your spending', month: true },
    analytics: { title: 'Analytics', subtitle: 'Understand your spending patterns', month: true },
    goals: { title: 'Savings Goals', subtitle: 'Plan and track your financial goals', month: false },
    categories: { title: 'Categories', subtitle: 'Manage your transaction categories', month: false },
    settings: { title: 'Settings', subtitle: 'Preferences and data management', month: false },
  };
  function brandHTML() {
    return '<div class="brand"><span class="brand-logo">' + icon('trending-up') + '</span><div><div class="brand-name">Fintrack</div><div class="brand-sub">Expense &amp; Budget</div></div></div>';
  }
  function navHTML() {
    return NAV.map((n) => '<button class="nav-btn ' + (state.view === n.id ? 'active' : '') + '" data-nav="' + n.id + '">' + icon(n.icon) + n.label + '</button>').join('');
  }
  function sidebarFooter() {
    const n = state.data.transactions.length;
    return '<div class="side-card"><p class="side-card-title">Stay on budget 💪</p><p class="side-card-sub">You\'ve logged ' + n + ' transaction' + (n === 1 ? '' : 's') + '. Keep it up!</p></div>';
  }
  function monthPickerHTML() {
    const isCurrent = state.month >= currentMonthKey();
    return '<div class="month-switch"><button data-month="prev" aria-label="Previous month">' + icon('chevron-left') + '</button>' +
      '<span class="month-label">' + monthLabel(state.month) + '</span>' +
      '<button data-month="next" ' + (isCurrent ? 'disabled' : '') + ' aria-label="Next month">' + icon('chevron-right') + '</button></div>';
  }
  function renderApp() {
    const app = qs('#app');
    const meta = VIEW_META[state.view];
    const isDark = resolveTheme() === 'dark';
    app.innerHTML =
      '<div class="layout">' +
      '<aside class="sidebar">' + brandHTML() + '<nav class="nav">' + navHTML() + '</nav>' + sidebarFooter() + '</aside>' +
      '<div class="drawer-backdrop" data-drawer-close></div>' +
      '<aside class="mobile-drawer">' + brandHTML() + '<nav class="nav">' + navHTML() + '</nav>' + sidebarFooter() + '</aside>' +
      '<div class="main"><header class="topbar"><div class="topbar-row">' +
      '<button class="icon-btn hamburger" data-drawer-open aria-label="Open menu">' + icon('menu') + '</button>' +
      '<div class="topbar-title"><h1>' + esc(meta.title) + '</h1><p class="topbar-sub">' + esc(meta.subtitle) + '</p></div>' +
      '<div class="topbar-actions">' +
      (meta.month ? '<span class="month-desktop">' + monthPickerHTML() + '</span>' : '') +
      '<button class="icon-btn bordered" data-theme-toggle aria-label="Toggle theme">' + icon(isDark ? 'sun' : 'moon') + '</button>' +
      '<button class="btn btn-primary" data-add-txn>' + icon('plus') + '<span class="hide-sm">Add</span></button>' +
      '</div></div>' +
      (meta.month ? '<div class="month-mobile">' + monthPickerHTML() + '</div>' : '') +
      '</header><main class="page" id="view"></main></div></div>';

    qsa('[data-nav]', app).forEach((b) => b.addEventListener('click', () => navigate(b.getAttribute('data-nav'))));
    qsa('[data-add-txn]', app).forEach((b) => b.addEventListener('click', () => openTxnModal(null)));
    qsa('[data-theme-toggle]', app).forEach((b) => b.addEventListener('click', () => dispatch({ type: 'UPDATE_SETTINGS', payload: { theme: resolveTheme() === 'dark' ? 'light' : 'dark' } })));
    qsa('[data-month]', app).forEach((b) => b.addEventListener('click', () => {
      const a = b.getAttribute('data-month');
      if (a === 'prev') state.month = shiftMonthKey(state.month, -1);
      else if (a === 'next' && state.month < currentMonthKey()) state.month = shiftMonthKey(state.month, 1);
      renderApp();
    }));
    const openD = qs('[data-drawer-open]', app);
    if (openD) openD.addEventListener('click', () => { qs('.mobile-drawer').classList.add('open'); qs('.drawer-backdrop').classList.add('open'); });
    const closeD = qs('[data-drawer-close]', app);
    if (closeD) closeD.addEventListener('click', closeDrawer);
    renderView();
  }
  function closeDrawer() {
    const d = qs('.mobile-drawer'); if (d) d.classList.remove('open');
    const b = qs('.drawer-backdrop'); if (b) b.classList.remove('open');
  }
  function navigate(view) { state.view = view; closeDrawer(); renderApp(); window.scrollTo({ top: 0 }); }
  function renderView() {
    const el = qs('#view');
    if (!el) return;
    pendingCharts = [];
    const map = { dashboard: viewDashboard, transactions: viewTransactions, budgets: viewBudgets, analytics: viewAnalytics, goals: viewGoals, categories: viewCategories, settings: viewSettings };
    el.innerHTML = (map[state.view] || viewDashboard)();
    el.classList.remove('animate-fade'); void el.offsetWidth; el.classList.add('animate-fade');
    bindView();
    flushCharts();
  }

  /* ---------------------------------------------------------- *
   *  Dashboard
   * ---------------------------------------------------------- */
  function statCard(label, value, iconName, accent, hint, change) {
    let delta = '';
    if (change && isFinite(change.value)) {
      const positive = change.positiveIsGood ? change.value >= 0 : change.value <= 0;
      delta = '<span class="delta ' + (positive ? 'up' : 'down') + '">' + icon(change.value >= 0 ? 'trending-up' : 'trending-down') + Math.abs(change.value).toFixed(0) + '%</span>';
    }
    return '<div class="card card-p stat"><div class="row-between"><span class="stat-icon ' + accent + '">' + icon(iconName) + '</span>' + delta + '</div>' +
      '<div class="stat-label">' + esc(label) + '</div><div class="stat-value truncate">' + value + '</div>' +
      (hint ? '<div class="stat-hint truncate">' + esc(hint) + '</div>' : '') + '</div>';
  }
  function viewDashboard() {
    const d = state.data, mKey = state.month;
    const monthTxns = filterByMonth(d.transactions, mKey);
    const income = totalIncome(monthTxns), expense = totalExpense(monthTxns), net = income - expense;
    const savingsRate = income > 0 ? (net / income) * 100 : 0;
    const prevKey = shiftMonthKey(mKey, -1), prevTxns = filterByMonth(d.transactions, prevKey);
    const prevExpense = totalExpense(prevTxns), prevIncome = totalIncome(prevTxns);
    const expenseChange = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : NaN;
    const incomeChange = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : NaN;
    const breakdown = categoryBreakdown(monthTxns, d.categories, 'expense');
    const trend = monthlySeries(d.transactions, 6);
    const budgets = budgetStatuses(d, mKey).slice(0, 4);
    const insights = buildInsights(d, mKey);
    const recent = monthTxns.slice(0, 6);
    const avgDaily = averageDailySpend(d.transactions, mKey);

    registerChart('chart-trend', (w, h) => trendBars(w, h, trend));
    const donutSegs = breakdown.slice(0, 8).map((b) => ({ value: b.total, color: b.category ? b.category.color : '#94a3b8' }));

    const donutBlock = breakdown.length === 0
      ? '<div class="empty-chart">No expenses recorded.</div>'
      : '<div class="donut-wrap">' + donutSVG(donutSegs) + '<div class="donut-center"><small>Total</small><strong>' + money(expense, { compact: true }) + '</strong><small>spent</small></div></div>' +
        '<div class="stack-xs" style="margin-top:.75rem">' + breakdown.slice(0, 4).map((b) => '<div class="legend-item"><span class="dot" style="background:' + (b.category ? b.category.color : '#94a3b8') + '"></span><span class="name truncate">' + esc(b.category ? b.category.name : 'Uncategorized') + '</span><span class="val">' + b.percent.toFixed(0) + '%</span></div>').join('') + '</div>';

    const budgetBlock = budgets.length === 0
      ? emptyState('wallet', 'No budgets yet', 'Set monthly limits per category to track spending.', '<button class="btn btn-primary" data-nav="budgets">' + icon('plus') + 'Add budget</button>')
      : '<div class="stack-sm">' + budgets.map((b) => {
        const color = b.state === 'over' ? '#f43f5e' : b.state === 'warning' ? '#f59e0b' : (b.category ? b.category.color : '#1b6ff5');
        return '<div><div class="row-between" style="font-size:.85rem;margin-bottom:.4rem"><span class="row" style="gap:.5rem">' + catBadge(b.category, 28, 8) + '<span style="font-weight:600;color:var(--text)">' + esc(b.category ? b.category.name : 'Uncategorized') + '</span></span>' +
          '<span style="color:var(--muted)">' + money(b.spent) + ' / ' + money(b.budget.amount) + '</span></div>' + progressBar(b.percent, color) + '</div>';
      }).join('') + '</div>';

    const recentBlock = recent.length === 0
      ? emptyState('circle-dollar-sign', 'Nothing here yet', 'Add your first transaction to get started.', '<button class="btn btn-primary" data-add-txn>' + icon('plus') + 'Add transaction</button>')
      : '<ul class="divide">' + recent.map((t) => {
        const cat = catOf(t.categoryId);
        return '<li class="row" style="padding:.6rem 0"><span>' + catBadge(cat, 36, 12) + '</span>' +
          '<div style="min-width:0;flex:1"><div class="truncate" style="font-size:.875rem;font-weight:600;color:var(--text)">' + esc(t.note || (cat ? cat.name : 'Transaction')) + '</div>' +
          '<div style="font-size:.72rem;color:var(--muted-2)">' + esc(cat ? cat.name : 'Uncategorized') + ' · ' + fmtDate(t.date, 'md') + '</div></div>' +
          '<span style="font-weight:700;font-size:.875rem;' + (t.type === 'income' ? 'color:var(--emerald)' : 'color:var(--text)') + '">' + (t.type === 'income' ? '+' : '−') + money(t.amount) + '</span></li>';
      }).join('') + '</ul>';

    const insightBlock = insights.length === 0 ? '' :
      '<div class="card card-p"><div class="row" style="gap:.5rem;margin-bottom:.75rem"><span style="color:#f59e0b;display:inline-flex">' + icon('lightbulb') + '</span><div class="section-title">Smart Insights</div></div>' +
      '<div class="grid grid-2">' + insights.map((ins) => '<div class="insight tone-' + ins.tone + '"><span class="idot"></span><div><div class="insight-title">' + esc(ins.title) + '</div><div class="insight-detail">' + esc(ins.detail) + '</div></div></div>').join('') + '</div></div>';

    return '<div class="stack">' +
      '<div class="grid grid-4">' +
      statCard('Income', money(income), 'trending-up', 'accent-emerald', monthLabel(mKey), isFinite(incomeChange) ? { value: incomeChange, positiveIsGood: true } : null) +
      statCard('Expenses', money(expense), 'trending-down', 'accent-rose', 'Avg ' + money(avgDaily) + '/day', isFinite(expenseChange) ? { value: expenseChange, positiveIsGood: false } : null) +
      statCard('Net Balance', money(net), 'wallet', net >= 0 ? 'accent-brand' : 'accent-rose', net >= 0 ? 'Surplus this month' : 'Deficit this month') +
      statCard('Savings Rate', savingsRate.toFixed(0) + '%', 'piggy-bank', 'accent-violet', savingsRate >= 20 ? 'Healthy' : savingsRate >= 0 ? 'Could improve' : 'Overspending') +
      '</div>' +
      '<div class="grid dash-main">' +
      '<div class="card card-p"><div class="row-between" style="margin-bottom:.25rem"><div><div class="section-title">Cash Flow</div><div class="section-sub">Income vs expenses, last 6 months</div></div>' +
      '<div class="row" style="gap:.75rem"><span class="legend"><span class="dot" style="background:#22c55e"></span>Income</span><span class="legend"><span class="dot" style="background:#f43f5e"></span>Expense</span></div></div>' +
      '<div class="chart-box" id="chart-trend"></div></div>' +
      '<div class="card card-p"><div class="section-title">Spending Mix</div><div class="section-sub">' + monthLabel(mKey) + '</div>' + donutBlock + '</div>' +
      '</div>' +
      insightBlock +
      '<div class="grid grid-2 lg-2">' +
      '<div class="card card-p"><div class="row-between" style="margin-bottom:.75rem"><div class="section-title">Budget Progress</div><button class="link" data-nav="budgets">Manage</button></div>' + budgetBlock + '</div>' +
      '<div class="card card-p"><div class="row-between" style="margin-bottom:.5rem"><div class="section-title">Recent Activity</div><button class="link" data-nav="transactions">View all</button></div>' + recentBlock + '</div>' +
      '</div></div>';
  }

  /* ---------------------------------------------------------- *
   *  Transactions
   * ---------------------------------------------------------- */
  function viewTransactions() {
    const d = state.data;
    let list = d.transactions.slice();
    if (state.txnScope === 'month') list = list.filter((t) => t.date.slice(0, 7) === state.month);
    if (state.txnType !== 'all') list = list.filter((t) => t.type === state.txnType);
    if (state.txnCategory !== 'all') list = list.filter((t) => t.categoryId === state.txnCategory);
    const q = state.txnSearch.trim().toLowerCase();
    if (q) list = list.filter((t) => { const cat = catOf(t.categoryId); return t.note.toLowerCase().indexOf(q) !== -1 || (cat && cat.name.toLowerCase().indexOf(q) !== -1) || String(t.amount).indexOf(q) !== -1; });
    list.sort((a, b) => {
      switch (state.txnSort) {
        case 'date-asc': return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
        case 'amount-desc': return b.amount - a.amount;
        case 'amount-asc': return a.amount - b.amount;
        default: return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.createdAt < b.createdAt ? 1 : -1);
      }
    });
    const income = list.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0);
    const expense = list.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
    const net = income - expense;

    const groups = []; const gmap = {};
    list.forEach((t) => { if (!gmap[t.date]) { gmap[t.date] = []; groups.push(t.date); } gmap[t.date].push(t); });

    const scopeBtns = ['all', 'month'].map((s) => '<button class="seg-btn ' + (state.txnScope === s ? 'active' : '') + '" data-scope="' + s + '">' + (s === 'all' ? 'All time' : 'This month') + '</button>').join('');
    const catOptions = '<option value="all">All categories</option>' + d.categories.map((c) => '<option value="' + c.id + '"' + (state.txnCategory === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');

    const toolbar = '<div class="card card-p"><div class="tx-toolbar">' +
      '<div class="input-affix" style="flex:1;min-width:200px"><span class="prefix">' + icon('search') + '</span><input class="input" id="tx-search" placeholder="Search by note, category, or amount…" value="' + esc(state.txnSearch) + '" style="padding-left:2.4rem"/></div>' +
      '<div class="row" style="gap:.5rem;flex-wrap:wrap"><div class="segment-inline">' + scopeBtns + '</div>' +
      '<button class="btn btn-secondary" data-export-csv>' + icon('download') + '<span class="hide-sm">Export</span></button>' +
      '<button class="btn btn-primary" data-add-txn>' + icon('plus') + 'Add</button></div></div>' +
      '<div class="tx-filters"><span class="filters-label">' + icon('filter') + 'Filters</span>' +
      '<select class="select select-sm" id="tx-type"><option value="all"' + (state.txnType === 'all' ? ' selected' : '') + '>All types</option><option value="expense"' + (state.txnType === 'expense' ? ' selected' : '') + '>Expenses</option><option value="income"' + (state.txnType === 'income' ? ' selected' : '') + '>Income</option></select>' +
      '<select class="select select-sm" id="tx-cat">' + catOptions + '</select>' +
      '<select class="select select-sm" id="tx-sort">' +
      ['date-desc:Newest first', 'date-asc:Oldest first', 'amount-desc:Highest amount', 'amount-asc:Lowest amount'].map((o) => { const p = o.split(':'); return '<option value="' + p[0] + '"' + (state.txnSort === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') +
      '</select></div></div>';

    const totals = '<div class="grid grid-3">' +
      '<div class="card card-p"><div class="kpi-label">Income</div><div class="kpi-val" style="color:var(--emerald)">' + money(income) + '</div></div>' +
      '<div class="card card-p"><div class="kpi-label">Expenses</div><div class="kpi-val" style="color:var(--rose)">' + money(expense) + '</div></div>' +
      '<div class="card card-p"><div class="kpi-label">Net</div><div class="kpi-val" style="color:' + (net >= 0 ? 'var(--text-strong)' : 'var(--rose)') + '">' + money(net) + '</div></div></div>';

    let listBlock;
    if (list.length === 0) {
      listBlock = emptyState('search', 'No transactions found', 'Try adjusting your filters or add a new transaction.', '<button class="btn btn-primary" data-add-txn>' + icon('plus') + 'Add transaction</button>');
    } else {
      listBlock = '<div class="stack-sm">' + groups.map((date) => {
        const items = gmap[date];
        const dayTotal = items.reduce((a, t) => a + (t.type === 'income' ? t.amount : -t.amount), 0);
        return '<div><div class="day-head"><span class="date">' + fmtDate(date, 'weekday') + '</span><span class="total ' + (dayTotal >= 0 ? 'pos' : 'neg') + '">' + (dayTotal >= 0 ? '+' : '−') + money(Math.abs(dayTotal)) + '</span></div>' +
          '<div class="card" style="padding:.35rem"><div class="divide">' + items.map(txnRowHTML).join('') + '</div></div></div>';
      }).join('') + '</div>';
    }
    return '<div class="stack-sm">' + toolbar + totals + listBlock + '</div>';
  }
  function txnRowHTML(t) {
    const cat = catOf(t.categoryId);
    return '<div class="txn-row"><span>' + catBadge(cat, 40, 12) + '</span>' +
      '<div style="min-width:0;flex:1"><div class="truncate" style="font-size:.875rem;font-weight:600;color:var(--text-strong)">' + esc(t.note || (cat ? cat.name : 'Transaction')) + '</div>' +
      '<div style="font-size:.72rem;color:var(--muted-2)">' + esc(cat ? cat.name : 'Uncategorized') + ' · ' + fmtDate(t.date, 'md') + '</div></div>' +
      '<span style="font-weight:700;font-size:.9rem;' + (t.type === 'income' ? 'color:var(--emerald)' : 'color:var(--text)') + '">' + (t.type === 'income' ? '+' : '−') + money(t.amount) + '</span>' +
      '<span class="row-actions"><button class="mini-btn" data-edit-txn="' + t.id + '" aria-label="Edit">' + icon('pencil') + '</button><button class="mini-btn danger" data-del-txn="' + t.id + '" aria-label="Delete">' + icon('trash') + '</button></span></div>';
  }

  /* ---------------------------------------------------------- *
   *  Budgets
   * ---------------------------------------------------------- */
  function viewBudgets() {
    const d = state.data, mKey = state.month;
    const statuses = budgetStatuses(d, mKey);
    const budgeted = statuses.reduce((a, s) => a + s.budget.amount, 0);
    const spent = statuses.reduce((a, s) => a + s.spent, 0);
    const remaining = budgeted - spent;
    const pct = budgeted > 0 ? (spent / budgeted) * 100 : 0;
    const available = d.categories.filter((c) => c.type === 'expense' && !d.budgets.some((b) => b.categoryId === c.id));

    const overview = '<div class="card"><div class="budget-overview">' +
      '<div class="bo-cell"><div class="kpi-label">Total Budgeted</div><div class="bo-val">' + money(budgeted) + '</div><div class="bo-sub">' + monthLabel(mKey) + '</div></div>' +
      '<div class="bo-cell"><div class="kpi-label">Spent</div><div class="bo-val" style="color:var(--rose)">' + money(spent) + '</div><div class="bo-sub">' + pct.toFixed(0) + '% of budget used</div></div>' +
      '<div class="bo-cell"><div class="kpi-label">Remaining</div><div class="bo-val" style="color:' + (remaining >= 0 ? 'var(--emerald)' : 'var(--rose)') + '">' + money(remaining) + '</div><div class="bo-sub">' + (remaining >= 0 ? 'Available to spend' : 'Over budget') + '</div></div>' +
      '</div>' + (budgeted > 0 ? '<div style="padding:0 1.25rem 1.25rem">' + progressBar(pct, pct >= 100 ? '#f43f5e' : pct >= 80 ? '#f59e0b' : '#1b6ff5') + '</div>' : '') + '</div>';

    const header = '<div class="row-between"><div><div class="section-title">Category Budgets</div><div class="section-sub">Monthly spending limits per category</div></div>' +
      '<button class="btn btn-primary" data-new-budget ' + (available.length === 0 ? 'disabled' : '') + '>' + icon('plus') + 'New budget</button></div>';

    let body;
    if (statuses.length === 0) {
      body = emptyState('wallet', 'No budgets set', 'Create a budget for a category to track how much you spend against a monthly limit.', '<button class="btn btn-primary" data-new-budget>' + icon('plus') + 'Create your first budget</button>');
    } else {
      body = '<div class="grid grid-2 sm-1">' + statuses.map((s) => {
        const color = s.state === 'over' ? '#f43f5e' : s.state === 'warning' ? '#f59e0b' : (s.category ? s.category.color : '#1b6ff5');
        const chipCls = s.state === 'over' ? 'chip-rose' : s.state === 'warning' ? 'chip-amber' : 'chip-emerald';
        const chipIcon = s.state === 'over' ? 'alert-triangle' : 'check-circle';
        return '<div class="card card-p budget-card"><div class="row" style="align-items:flex-start">' +
          catBadge(s.category, 44, 12) +
          '<div style="min-width:0;flex:1"><div style="font-weight:700;color:var(--text-strong)" class="truncate">' + esc(s.category ? s.category.name : 'Uncategorized') + '</div><div style="font-size:.72rem;color:var(--muted-2)">Limit ' + money(s.budget.amount) + '</div></div>' +
          '<span class="row-actions"><button class="mini-btn" data-edit-budget="' + s.budget.id + '" aria-label="Edit">' + icon('pencil') + '</button><button class="mini-btn danger" data-del-budget="' + s.budget.id + '" aria-label="Delete">' + icon('trash') + '</button></span></div>' +
          '<div style="margin-top:1rem"><div class="row-between" style="margin-bottom:.4rem;font-size:.875rem"><span style="font-weight:600;color:var(--text)">' + money(s.spent) + '</span>' +
          '<span class="chip ' + chipCls + '">' + icon(chipIcon) + s.percent.toFixed(0) + '%</span></div>' + progressBar(s.percent, color) +
          '<div style="margin-top:.5rem;font-size:.72rem;color:var(--muted-2)">' + (s.remaining >= 0 ? money(s.remaining) + ' left this month' : money(Math.abs(s.remaining)) + ' over budget') + '</div></div></div>';
      }).join('') + '</div>';
    }
    return '<div class="stack">' + overview + header + body + '</div>';
  }

  /* ---------------------------------------------------------- *
   *  Analytics
   * ---------------------------------------------------------- */
  function viewAnalytics() {
    const d = state.data, mKey = state.month;
    if (d.transactions.length === 0) {
      return emptyState('layers', 'No data to analyze yet', 'Once you add transactions, this page will visualize your spending patterns and trends.');
    }
    const range = state.trendRange, ttype = state.catType;
    const monthTxns = filterByMonth(d.transactions, mKey);
    const trend = monthlySeries(d.transactions, range);
    const breakdown = categoryBreakdown(monthTxns, d.categories, ttype);
    const cumulative = dailyCumulativeExpense(d.transactions, mKey);
    const monthExpense = totalExpense(monthTxns), monthIncome = totalIncome(monthTxns);
    const trIncome = trend.reduce((a, t) => a + t.income, 0), trExpense = trend.reduce((a, t) => a + t.expense, 0);
    const trAvg = trend.length ? trExpense / trend.length : 0;

    registerChart('chart-atrend', (w, h) => trendBars(w, h, trend));
    registerChart('chart-cum', (w, h) => cumulativeArea(w, h, cumulative));
    const donutSegs = breakdown.slice(0, 8).map((b) => ({ value: b.total, color: b.category ? b.category.color : '#94a3b8' }));

    const rangeToggle = '<div class="segment-inline">' + [6, 12].map((r) => '<button class="seg-btn ' + (range === r ? 'active' : '') + '" data-range="' + r + '">' + r + 'M</button>').join('') + '</div>';
    const typeToggle = '<div class="segment-inline">' + ['expense', 'income'].map((t) => '<button class="seg-btn ' + (ttype === t ? 'active' : '') + '" data-cattype="' + t + '" style="text-transform:capitalize">' + t + '</button>').join('') + '</div>';

    const donutBlock = breakdown.length === 0 ? '<div class="empty-chart">No ' + ttype + ' data for this month.</div>'
      : '<div class="donut-wrap">' + donutSVG(donutSegs) + '<div class="donut-center"><small>Total</small><strong>' + money(ttype === 'expense' ? monthExpense : monthIncome, { compact: true }) + '</strong><small>' + ttype + '</small></div></div>';

    const table = breakdown.length === 0 ? '' :
      '<div class="card" style="overflow:hidden"><div style="padding:1rem 1.25rem;border-bottom:1px solid var(--border)"><div class="section-title">Category Details</div></div>' +
      '<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Category</th><th class="r">Transactions</th><th class="r">Total</th><th class="r">Share</th></tr></thead><tbody>' +
      breakdown.map((b) => '<tr><td><span class="row" style="gap:.6rem">' + catBadge(b.category, 32, 8) + '<span style="font-weight:600;color:var(--text)">' + esc(b.category ? b.category.name : 'Uncategorized') + '</span></span></td>' +
        '<td class="r" style="color:var(--muted)">' + b.count + '</td><td class="r" style="font-weight:700;color:var(--text-strong)">' + money(b.total) + '</td>' +
        '<td class="r"><span class="row" style="justify-content:flex-end;gap:.5rem"><span class="mini-track"><span style="width:' + b.percent + '%;background:' + (b.category ? b.category.color : '#94a3b8') + '"></span></span><span style="width:2.5rem;text-align:right;font-weight:600;color:var(--muted)">' + b.percent.toFixed(0) + '%</span></span></td></tr>').join('') +
      '</tbody></table></div></div>';

    return '<div class="stack">' +
      '<div class="card card-p"><div class="row-between" style="flex-wrap:wrap;gap:.75rem;margin-bottom:.25rem"><div><div class="section-title">Income vs Expenses</div><div class="section-sub">Trend over the last ' + range + ' months</div></div>' + rangeToggle + '</div>' +
      '<div class="chart-box" id="chart-atrend"></div>' +
      '<div class="grid grid-3 trend-totals"><div><div class="tt-label">' + icon('trending-up') + ' Total income</div><div class="tt-val">' + money(trIncome) + '</div></div>' +
      '<div><div class="tt-label">' + icon('trending-down') + ' Total expenses</div><div class="tt-val">' + money(trExpense) + '</div></div>' +
      '<div><div class="tt-label">' + icon('calendar') + ' Avg / month</div><div class="tt-val">' + money(trAvg) + '</div></div></div></div>' +
      '<div class="grid grid-2 lg-2">' +
      '<div class="card card-p"><div class="row-between" style="margin-bottom:.5rem"><div><div class="section-title">By Category</div><div class="section-sub">' + monthLabel(mKey) + '</div></div>' + typeToggle + '</div>' +
      (breakdown.length === 0 ? '<div class="empty-chart">No ' + ttype + ' data for this month.</div>' : categoryBarsHTML(breakdown)) + '</div>' +
      '<div class="card card-p"><div class="section-title">Distribution</div><div class="section-sub" style="text-transform:capitalize">' + ttype + ' share · ' + monthLabel(mKey) + '</div>' + donutBlock + '</div>' +
      '</div>' +
      '<div class="card card-p"><div class="section-title">Cumulative Spending</div><div class="section-sub">How expenses accumulated through ' + monthLabel(mKey) + '</div><div class="chart-box" id="chart-cum"></div></div>' +
      table + '</div>';
  }

  /* ---------------------------------------------------------- *
   *  Goals
   * ---------------------------------------------------------- */
  function viewGoals() {
    const d = state.data;
    const totalSaved = d.goals.reduce((a, g) => a + g.saved, 0);
    const totalTarget = d.goals.reduce((a, g) => a + g.target, 0);
    const hero = '<div class="card card-p row-between" style="flex-wrap:wrap;gap:1rem">' +
      '<div class="row" style="gap:1rem"><span class="stat-icon accent-violet" style="width:48px;height:48px;border-radius:16px">' + icon('piggy-bank') + '</span>' +
      '<div><div class="kpi-label">Total saved across goals</div><div style="font-size:1.5rem;font-weight:800;color:var(--text-strong)">' + money(totalSaved) + ' <span style="font-size:1rem;font-weight:600;color:var(--muted-2)">/ ' + money(totalTarget) + '</span></div></div></div>' +
      '<button class="btn btn-primary" data-new-goal>' + icon('plus') + 'New goal</button></div>';

    let body;
    if (d.goals.length === 0) {
      body = emptyState('target', 'No savings goals yet', "Set a target for things you're saving toward — an emergency fund, a trip, or a big purchase.", '<button class="btn btn-primary" data-new-goal>' + icon('plus') + 'Create a goal</button>');
    } else {
      body = '<div class="grid grid-3 goals-grid">' + d.goals.map((g) => {
        const pctv = g.target > 0 ? clamp((g.saved / g.target) * 100, 0, 100) : 0;
        const done = g.saved >= g.target;
        return '<div class="card card-p goal-card"><div class="row-between" style="align-items:flex-start"><span class="stat-icon" style="background:' + g.color + '20;color:' + g.color + '">' + icon(done ? 'party-popper' : 'target') + '</span>' +
          '<span class="row-actions"><button class="mini-btn" data-edit-goal="' + g.id + '" aria-label="Edit">' + icon('pencil') + '</button><button class="mini-btn danger" data-del-goal="' + g.id + '" aria-label="Delete">' + icon('trash') + '</button></span></div>' +
          '<h3 style="margin-top:.75rem;font-weight:700;color:var(--text-strong)">' + esc(g.name) + '</h3><p style="font-size:.85rem;color:var(--muted)">' + money(g.saved) + ' of ' + money(g.target) + '</p>' +
          '<div style="margin-top:.75rem">' + progressBar(pctv, g.color) + '<div class="row-between" style="margin-top:.4rem;font-size:.72rem"><span style="font-weight:600;color:var(--muted)">' + pctv.toFixed(0) + '%</span>' +
          '<span style="' + (done ? 'color:var(--emerald);font-weight:600' : 'color:var(--muted-2)') + '">' + (done ? 'Goal reached! 🎉' : money(g.target - g.saved) + ' to go') + '</span></div></div>' +
          '<div class="row" style="gap:.5rem;margin-top:1rem"><button class="btn btn-secondary" style="flex:1;padding:.5rem" data-goal-add="' + g.id + '">' + icon('plus') + 'Add</button>' +
          '<button class="btn btn-secondary" style="flex:1;padding:.5rem" data-goal-withdraw="' + g.id + '" ' + (g.saved <= 0 ? 'disabled' : '') + '>' + icon('minus') + 'Withdraw</button></div></div>';
      }).join('') + '</div>';
    }
    return '<div class="stack">' + hero + body + '</div>';
  }

  /* ---------------------------------------------------------- *
   *  Categories
   * ---------------------------------------------------------- */
  function viewCategories() {
    const d = state.data;
    const counts = {};
    d.transactions.forEach((t) => { counts[t.categoryId] = (counts[t.categoryId] || 0) + 1; });
    function group(title, list, type) {
      return '<div class="card card-p"><div class="row-between" style="margin-bottom:1rem"><div><div class="section-title">' + title + '</div><div class="section-sub">' + list.length + ' categories</div></div>' +
        '<button class="btn btn-secondary" data-add-cat="' + type + '">' + icon('plus') + 'Add</button></div>' +
        '<div class="grid grid-2 sm-1" style="gap:.5rem">' + (list.length === 0 ? '<p style="grid-column:1/-1;text-align:center;color:var(--muted-2);padding:1.5rem 0;font-size:.85rem">No categories yet.</p>' :
          list.map((c) => '<div class="cat-manage">' + catBadge(c, 40, 12) +
            '<div style="min-width:0;flex:1"><div class="truncate" style="font-weight:600;color:var(--text)">' + esc(c.name) + '</div><div style="font-size:.72rem;color:var(--muted-2)">' + (counts[c.id] || 0) + ' transaction' + ((counts[c.id] || 0) === 1 ? '' : 's') + '</div></div>' +
            '<span class="row-actions"><button class="mini-btn" data-edit-cat="' + c.id + '" aria-label="Edit">' + icon('pencil') + '</button><button class="mini-btn danger" data-del-cat="' + c.id + '" aria-label="Delete">' + icon('trash') + '</button></span></div>').join('')) + '</div></div>';
    }
    return '<div class="stack">' + group('Expense Categories', d.categories.filter((c) => c.type === 'expense'), 'expense') + group('Income Categories', d.categories.filter((c) => c.type === 'income'), 'income') + '</div>';
  }

  /* ---------------------------------------------------------- *
   *  Settings
   * ---------------------------------------------------------- */
  function viewSettings() {
    const d = state.data, s = d.settings;
    const currencyOptions = CURRENCIES.map((c) => '<option value="' + c.code + '"' + (c.code === s.currency ? ' selected' : '') + '>' + esc(c.label) + '</option>').join('');
    const themes = [['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['system', 'System', 'monitor']];
    const stats = [['transactions', d.transactions.length], ['categories', d.categories.length], ['budgets', d.budgets.length], ['goals', d.goals.length]];

    return '<div class="settings-wrap stack">' +
      '<section class="card card-p"><div class="row" style="gap:.5rem;margin-bottom:1rem"><span style="color:var(--brand-600);display:inline-flex">' + icon('coins') + '</span><div class="section-title">Preferences</div></div>' +
      '<div class="grid grid-2 sm-1"><div><label class="label">Currency</label><select class="select" id="set-currency">' + currencyOptions + '</select></div>' +
      '<div><label class="label">Monthly income target</label><input class="input" id="set-income" inputmode="decimal" value="' + esc(String(s.monthlyIncomeTarget)) + '"/></div></div></section>' +

      '<section class="card card-p"><div class="row" style="gap:.5rem;margin-bottom:1rem"><span style="color:var(--violet-500);display:inline-flex">' + icon('palette') + '</span><div class="section-title">Appearance</div></div>' +
      '<label class="label">Theme</label><div class="grid grid-3">' + themes.map((t) => '<button class="theme-btn ' + (s.theme === t[0] ? 'active' : '') + '" data-set-theme="' + t[0] + '">' + icon(t[2]) + '<span>' + t[1] + '</span></button>').join('') + '</div></section>' +

      '<section class="card card-p"><div class="row" style="gap:.5rem;margin-bottom:1rem"><span style="color:var(--emerald);display:inline-flex">' + icon('database') + '</span><div class="section-title">Data</div></div>' +
      '<div class="grid grid-4 stat-mini">' + stats.map((st) => '<div class="mini-stat"><div class="ms-val">' + st[1] + '</div><div class="ms-label">' + st[0] + '</div></div>').join('') + '</div>' +
      '<div class="grid grid-2 sm-1" style="margin-top:1rem">' +
      '<button class="btn btn-secondary" style="justify-content:flex-start" data-export-json>' + icon('download') + 'Export backup (JSON)</button>' +
      '<button class="btn btn-secondary" style="justify-content:flex-start" data-import-json>' + icon('upload') + 'Import backup</button>' +
      '<button class="btn btn-secondary" style="justify-content:flex-start" data-load-demo>' + icon('rotate-ccw') + 'Load demo data</button>' +
      '<button class="btn btn-danger-soft" style="justify-content:flex-start" data-clear-all>' + icon('trash') + 'Clear all data</button>' +
      '<input type="file" id="import-file" accept="application/json,.json" class="hidden"/></div>' +
      '<div class="info-note">' + icon('info') + '<p>' + (serverMode ? 'Connected to your Python backend — data is stored on the server in SQLite.' : 'Your data is stored privately in this browser using local storage — nothing is uploaded to a server. Export a backup regularly to keep your records safe.') + '</p></div></section>' +
      '</div>';
  }

  /* ---------------------------------------------------------- *
   *  View event binding
   * ---------------------------------------------------------- */
  function bindView() {
    const root = qs('#view');
    qsa('[data-nav]', root).forEach((b) => b.addEventListener('click', () => navigate(b.getAttribute('data-nav'))));
    qsa('[data-add-txn]', root).forEach((b) => b.addEventListener('click', () => openTxnModal(null)));
    qsa('[data-edit-txn]', root).forEach((b) => b.addEventListener('click', () => { const t = state.data.transactions.find((x) => x.id === b.getAttribute('data-edit-txn')); if (t) openTxnModal(t); }));
    qsa('[data-del-txn]', root).forEach((b) => b.addEventListener('click', () => {
      const t = state.data.transactions.find((x) => x.id === b.getAttribute('data-del-txn'));
      if (t) confirmModal('Delete transaction?', 'This will permanently remove "' + (t.note || (catOf(t.categoryId) || {}).name || 'this transaction') + '".', 'Delete', true, () => dispatch({ type: 'DELETE_TRANSACTION', payload: { id: t.id } }).then(() => toast('Transaction deleted', 'info')));
    }));

    // Transactions controls
    const search = qs('#tx-search', root);
    if (search) search.addEventListener('input', (e) => { const pos = e.target.selectionStart; state.txnSearch = e.target.value; renderView(); const ns = qs('#tx-search'); if (ns) { ns.focus(); try { ns.setSelectionRange(pos, pos); } catch (x) {} } });
    qsa('[data-scope]', root).forEach((b) => b.addEventListener('click', () => { state.txnScope = b.getAttribute('data-scope'); renderView(); }));
    const tt = qs('#tx-type', root); if (tt) tt.addEventListener('change', (e) => { state.txnType = e.target.value; renderView(); });
    const tc = qs('#tx-cat', root); if (tc) tc.addEventListener('change', (e) => { state.txnCategory = e.target.value; renderView(); });
    const tsr = qs('#tx-sort', root); if (tsr) tsr.addEventListener('change', (e) => { state.txnSort = e.target.value; renderView(); });
    const exportCsv = qs('[data-export-csv]', root); if (exportCsv) exportCsv.addEventListener('click', doExportCsv);

    // Budgets
    qsa('[data-new-budget]', root).forEach((b) => b.addEventListener('click', () => openBudgetModal(null)));
    qsa('[data-edit-budget]', root).forEach((b) => b.addEventListener('click', () => { const bd = state.data.budgets.find((x) => x.id === b.getAttribute('data-edit-budget')); if (bd) openBudgetModal(bd); }));
    qsa('[data-del-budget]', root).forEach((b) => b.addEventListener('click', () => {
      const bd = state.data.budgets.find((x) => x.id === b.getAttribute('data-del-budget'));
      const cat = bd && catOf(bd.categoryId);
      if (bd) confirmModal('Delete budget?', 'Remove the budget for ' + (cat ? cat.name : 'this category') + "? Your transactions won't be affected.", 'Delete', true, () => dispatch({ type: 'DELETE_BUDGET', payload: { id: bd.id } }).then(() => toast('Budget deleted', 'info')));
    }));

    // Analytics
    qsa('[data-range]', root).forEach((b) => b.addEventListener('click', () => { state.trendRange = Number(b.getAttribute('data-range')); renderView(); }));
    qsa('[data-cattype]', root).forEach((b) => b.addEventListener('click', () => { state.catType = b.getAttribute('data-cattype'); renderView(); }));

    // Goals
    qsa('[data-new-goal]', root).forEach((b) => b.addEventListener('click', () => openGoalModal(null)));
    qsa('[data-edit-goal]', root).forEach((b) => b.addEventListener('click', () => { const g = state.data.goals.find((x) => x.id === b.getAttribute('data-edit-goal')); if (g) openGoalModal(g); }));
    qsa('[data-del-goal]', root).forEach((b) => b.addEventListener('click', () => {
      const g = state.data.goals.find((x) => x.id === b.getAttribute('data-del-goal'));
      if (g) confirmModal('Delete goal?', 'Remove "' + g.name + "\"? This can't be undone.", 'Delete', true, () => dispatch({ type: 'DELETE_GOAL', payload: { id: g.id } }).then(() => toast('Goal deleted', 'info')));
    }));
    qsa('[data-goal-add]', root).forEach((b) => b.addEventListener('click', () => { const g = state.data.goals.find((x) => x.id === b.getAttribute('data-goal-add')); if (g) openContributeModal(g, 'add'); }));
    qsa('[data-goal-withdraw]', root).forEach((b) => b.addEventListener('click', () => { const g = state.data.goals.find((x) => x.id === b.getAttribute('data-goal-withdraw')); if (g) openContributeModal(g, 'withdraw'); }));

    // Categories
    qsa('[data-add-cat]', root).forEach((b) => b.addEventListener('click', () => openCategoryModal(null, b.getAttribute('data-add-cat'))));
    qsa('[data-edit-cat]', root).forEach((b) => b.addEventListener('click', () => { const c = state.data.categories.find((x) => x.id === b.getAttribute('data-edit-cat')); if (c) openCategoryModal(c); }));
    qsa('[data-del-cat]', root).forEach((b) => b.addEventListener('click', () => {
      const c = state.data.categories.find((x) => x.id === b.getAttribute('data-del-cat'));
      if (!c) return;
      const count = state.data.transactions.filter((t) => t.categoryId === c.id).length;
      const msg = count > 0 ? c.name + ' is used by ' + count + ' transaction' + (count > 1 ? 's' : '') + ', which will become "Uncategorized". Continue?' : 'Remove the "' + c.name + '" category?';
      confirmModal('Delete category?', msg, 'Delete', true, () => dispatch({ type: 'DELETE_CATEGORY', payload: { id: c.id } }).then(() => toast('Category deleted', 'info')));
    }));

    // Settings
    const cur = qs('#set-currency', root); if (cur) cur.addEventListener('change', (e) => dispatch({ type: 'UPDATE_SETTINGS', payload: { currency: e.target.value } }).then(() => toast('Currency updated')));
    const inc = qs('#set-income', root); if (inc) inc.addEventListener('change', (e) => { const v = parseFloat((e.target.value || '').replace(/[^0-9.]/g, '')) || 0; dispatch({ type: 'UPDATE_SETTINGS', payload: { monthlyIncomeTarget: v } }); });
    qsa('[data-set-theme]', root).forEach((b) => b.addEventListener('click', () => dispatch({ type: 'UPDATE_SETTINGS', payload: { theme: b.getAttribute('data-set-theme') } })));
    const ej = qs('[data-export-json]', root); if (ej) ej.addEventListener('click', doExportJson);
    const ij = qs('[data-import-json]', root); if (ij) ij.addEventListener('click', () => qs('#import-file').click());
    const impFile = qs('#import-file', root); if (impFile) impFile.addEventListener('change', doImportFile);
    const ld = qs('[data-load-demo]', root); if (ld) ld.addEventListener('click', () => confirmModal('Load demo data?', 'This replaces your current data with a fresh set of sample transactions, budgets, and goals.', 'Load demo', false, () => dispatch({ type: 'RESET_DEMO' }).then(() => toast('Demo data loaded'))));
    const ca = qs('[data-clear-all]', root); if (ca) ca.addEventListener('click', () => confirmModal('Clear all data?', 'This permanently deletes all your transactions, budgets, and goals. This cannot be undone.', 'Delete everything', true, () => dispatch({ type: 'CLEAR_ALL' }).then(() => toast('All data cleared', 'info'))));
  }

  /* ---------------------------------------------------------- *
   *  Export / import
   * ---------------------------------------------------------- */
  function downloadFile(name, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }
  function csvEscape(v) { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function doExportCsv() {
    const d = state.data;
    let list = d.transactions.slice();
    if (state.txnScope === 'month') list = list.filter((t) => t.date.slice(0, 7) === state.month);
    if (state.txnType !== 'all') list = list.filter((t) => t.type === state.txnType);
    if (state.txnCategory !== 'all') list = list.filter((t) => t.categoryId === state.txnCategory);
    const header = ['Date', 'Type', 'Category', 'Note', 'Amount'];
    const rows = list.map((t) => { const cat = catOf(t.categoryId); return [t.date, t.type, cat ? cat.name : 'Uncategorized', t.note, t.amount.toFixed(2)].map(csvEscape).join(','); });
    downloadFile('fintrack-transactions-' + todayISO() + '.csv', [header.join(',')].concat(rows).join('\n'), 'text/csv');
    toast('Exported CSV');
  }
  function doExportJson() {
    downloadFile('fintrack-backup-' + todayISO() + '.json', JSON.stringify(state.data, null, 2), 'application/json');
    toast('Backup exported');
  }
  function doImportFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.categories)) throw new Error('Invalid backup file');
        dispatch({ type: 'IMPORT_DATA', payload: parsed }).then(() => toast('Backup imported successfully'));
      } catch (x) { toast('Failed to import backup', 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  /* ---------------------------------------------------------- *
   *  Modals
   * ---------------------------------------------------------- */
  function openModal(html, size) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = '<div class="modal ' + (size || '') + '">' + html + '</div>';
    qs('#modal-root').appendChild(wrap);
    document.body.style.overflow = 'hidden';
    function close() { wrap.remove(); if (qsa('.modal-backdrop').length === 0) document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    return { wrap: wrap, close: close };
  }
  function modalHead(title) {
    return '<div class="modal-head"><h2>' + esc(title) + '</h2><button class="mini-btn" data-close aria-label="Close">' + icon('x') + '</button></div>';
  }

  // ---- Transaction modal
  function openTxnModal(editing) {
    const d = state.data;
    const form = {
      type: editing ? editing.type : 'expense',
      amount: editing ? String(editing.amount) : '',
      categoryId: editing ? editing.categoryId : '',
      note: editing ? editing.note : '',
      date: editing ? editing.date : todayISO(),
    };
    const modal = openModal(
      modalHead(editing ? 'Edit transaction' : 'Add transaction') +
      '<form class="modal-body" id="txn-form">' +
      '<div class="segment"><button type="button" data-type="expense">Expense</button><button type="button" data-type="income">Income</button></div>' +
      '<div><label class="label">Amount</label><input class="input input-lg" id="f-amount" inputmode="decimal" placeholder="0.00" value="' + esc(form.amount) + '"/></div>' +
      '<div><label class="label">Category</label><div class="cat-grid" id="f-cats"></div></div>' +
      '<div class="grid grid-2"><div><label class="label">Date</label><input class="input" id="f-date" type="date" max="' + todayISO() + '" value="' + esc(form.date) + '"/></div>' +
      '<div><label class="label">Note</label><input class="input" id="f-note" maxlength="80" placeholder="Optional description" value="' + esc(form.note) + '"/></div></div>' +
      '<div id="f-error" class="form-error hidden"></div>' +
      '<div class="modal-actions">' + (editing ? '<button type="button" class="btn btn-ghost" data-del style="color:var(--rose);margin-right:auto">' + icon('trash') + '</button>' : '') +
      '<button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="submit" class="btn btn-primary">' + (editing ? 'Save changes' : 'Add transaction') + '</button></div></form>'
    );
    const root = modal.wrap;
    function renderCats() {
      const cats = d.categories.filter((c) => c.type === form.type);
      if (!cats.some((c) => c.id === form.categoryId)) form.categoryId = cats[0] ? cats[0].id : '';
      qs('#f-cats', root).innerHTML = cats.map((c) => '<button type="button" class="cat-pick ' + (form.categoryId === c.id ? 'active' : '') + '" data-pick="' + c.id + '">' + catBadge(c, 36, 999) + '<span class="lbl">' + esc(c.name) + '</span></button>').join('');
      qsa('[data-pick]', root).forEach((b) => b.addEventListener('click', () => { form.categoryId = b.getAttribute('data-pick'); renderCats(); }));
    }
    function setType(t) { form.type = t; qsa('.segment button', root).forEach((b) => b.classList.remove('active-expense', 'active-income')); qs('[data-type="' + t + '"]', root).classList.add(t === 'expense' ? 'active-expense' : 'active-income'); renderCats(); }
    qsa('.segment button', root).forEach((b) => b.addEventListener('click', () => setType(b.getAttribute('data-type'))));
    setType(form.type);
    qsa('[data-close]', root).forEach((b) => b.addEventListener('click', modal.close));
    const del = qs('[data-del]', root);
    if (del) del.addEventListener('click', () => confirmModal('Delete transaction?', 'This will permanently remove "' + (editing.note || (catOf(editing.categoryId) || {}).name || 'this transaction') + '".', 'Delete', true, () => { dispatch({ type: 'DELETE_TRANSACTION', payload: { id: editing.id } }).then(() => toast('Transaction deleted', 'info')); }) && modal.close());
    qs('#f-amount', root).addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^0-9.]/g, ''); });
    qs('#txn-form', root).addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(qs('#f-amount', root).value);
      const err = qs('#f-error', root);
      if (!amount || amount <= 0 || isNaN(amount)) { err.textContent = 'Enter an amount greater than 0.'; err.classList.remove('hidden'); return; }
      if (!form.categoryId) { err.textContent = 'Pick a category.'; err.classList.remove('hidden'); return; }
      const payload = { type: form.type, amount: round2(amount), categoryId: form.categoryId, note: qs('#f-note', root).value.trim(), date: qs('#f-date', root).value || todayISO() };
      if (editing) dispatch({ type: 'UPDATE_TRANSACTION', payload: Object.assign({}, editing, payload) }).then(() => toast('Transaction updated'));
      else dispatch({ type: 'ADD_TRANSACTION', payload: payload }).then(() => toast('Transaction added'));
      modal.close();
    });
    setTimeout(() => { const a = qs('#f-amount', root); if (a) a.focus(); }, 40);
  }

  // ---- Budget modal
  function openBudgetModal(editing) {
    const d = state.data;
    const available = d.categories.filter((c) => c.type === 'expense' && (!d.budgets.some((b) => b.categoryId === c.id) || (editing && c.id === editing.categoryId)));
    let categoryId = editing ? editing.categoryId : (available[0] ? available[0].id : '');
    const modal = openModal(
      modalHead(editing ? 'Edit budget' : 'New budget') +
      '<form class="modal-body" id="budget-form">' +
      '<div><label class="label">Category</label><select class="select" id="b-cat" ' + (editing ? 'disabled' : '') + '>' + available.map((c) => '<option value="' + c.id + '"' + (categoryId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></div>' +
      '<div><label class="label">Monthly limit</label><input class="input input-lg" id="b-amount" inputmode="decimal" placeholder="0.00" value="' + (editing ? editing.amount : '') + '"/></div>' +
      '<div id="b-error" class="form-error hidden"></div>' +
      '<div class="modal-actions"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="submit" class="btn btn-primary">' + (editing ? 'Save' : 'Create budget') + '</button></div></form>',
      'sm'
    );
    const root = modal.wrap;
    const sel = qs('#b-cat', root); if (sel) sel.addEventListener('change', (e) => { categoryId = e.target.value; });
    qs('#b-amount', root).addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^0-9.]/g, ''); });
    qsa('[data-close]', root).forEach((b) => b.addEventListener('click', modal.close));
    qs('#budget-form', root).addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(qs('#b-amount', root).value);
      const err = qs('#b-error', root);
      if (!amount || amount <= 0 || isNaN(amount)) { err.textContent = 'Enter a limit greater than 0.'; err.classList.remove('hidden'); return; }
      if (!categoryId) { err.textContent = 'Choose a category.'; err.classList.remove('hidden'); return; }
      if (editing) dispatch({ type: 'UPDATE_BUDGET', payload: { id: editing.id, amount: round2(amount), categoryId: categoryId } }).then(() => toast('Budget updated'));
      else dispatch({ type: 'ADD_BUDGET', payload: { categoryId: categoryId, amount: round2(amount) } }).then(() => toast('Budget created'));
      modal.close();
    });
    setTimeout(() => { const a = qs('#b-amount', root); if (a) a.focus(); }, 40);
  }

  // ---- Category modal
  function openCategoryModal(editing, presetType) {
    const form = {
      name: editing ? editing.name : '',
      type: editing ? editing.type : (presetType || 'expense'),
      icon: editing ? editing.icon : CATEGORY_ICON_CHOICES[0],
      color: editing ? editing.color : CATEGORY_COLOR_CHOICES[Math.floor(Math.random() * CATEGORY_COLOR_CHOICES.length)],
    };
    const modal = openModal(
      modalHead(editing ? 'Edit category' : 'New category') +
      '<form class="modal-body" id="cat-form">' +
      '<div class="row" style="gap:.75rem"><span class="cat-badge" id="c-preview" style="width:56px;height:56px;border-radius:16px;font-size:1.6rem;background:' + form.color + '20">' + catEmoji(form.icon) + '</span>' +
      '<div style="flex:1"><label class="label">Name</label><input class="input" id="c-name" placeholder="Category name" maxlength="30" value="' + esc(form.name) + '"/></div></div>' +
      '<div class="segment"><button type="button" data-type="expense" ' + (editing ? 'disabled' : '') + '>Expense</button><button type="button" data-type="income" ' + (editing ? 'disabled' : '') + '>Income</button></div>' +
      '<div><label class="label">Icon</label><div class="icon-grid" id="c-icons">' + CATEGORY_ICON_CHOICES.map((k) => '<button type="button" class="icon-opt" data-icon="' + k + '">' + catEmoji(k) + '</button>').join('') + '</div></div>' +
      '<div><label class="label">Color</label><div class="color-grid" id="c-colors">' + CATEGORY_COLOR_CHOICES.map((c) => '<button type="button" class="color-opt" data-color="' + c + '" style="background:' + c + '"></button>').join('') + '</div></div>' +
      '<div id="c-error" class="form-error hidden"></div>' +
      '<div class="modal-actions"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="submit" class="btn btn-primary">' + (editing ? 'Save' : 'Add category') + '</button></div></form>',
      'sm'
    );
    const root = modal.wrap;
    function refresh() {
      qsa('.segment button', root).forEach((b) => b.classList.toggle('active-plain', b.getAttribute('data-type') === form.type));
      qsa('[data-icon]', root).forEach((b) => b.classList.toggle('active', b.getAttribute('data-icon') === form.icon));
      qsa('[data-color]', root).forEach((b) => { const on = b.getAttribute('data-color') === form.color; b.classList.toggle('active', on); b.style.color = b.getAttribute('data-color'); });
      const pv = qs('#c-preview', root); pv.textContent = catEmoji(form.icon); pv.style.background = form.color + '20';
    }
    qsa('.segment button', root).forEach((b) => b.addEventListener('click', () => { if (editing) return; form.type = b.getAttribute('data-type'); refresh(); }));
    qsa('[data-icon]', root).forEach((b) => b.addEventListener('click', () => { form.icon = b.getAttribute('data-icon'); refresh(); }));
    qsa('[data-color]', root).forEach((b) => b.addEventListener('click', () => { form.color = b.getAttribute('data-color'); refresh(); }));
    refresh();
    qsa('[data-close]', root).forEach((b) => b.addEventListener('click', modal.close));
    qs('#cat-form', root).addEventListener('submit', (e) => {
      e.preventDefault();
      const name = qs('#c-name', root).value.trim();
      const err = qs('#c-error', root);
      if (!name) { err.textContent = 'Enter a category name.'; err.classList.remove('hidden'); return; }
      const payload = { name: name, type: form.type, icon: form.icon, color: form.color };
      if (editing) dispatch({ type: 'UPDATE_CATEGORY', payload: Object.assign({}, editing, payload) }).then(() => toast('Category updated'));
      else dispatch({ type: 'ADD_CATEGORY', payload: payload }).then(() => toast('Category added'));
      modal.close();
    });
    setTimeout(() => { const n = qs('#c-name', root); if (n) n.focus(); }, 40);
  }

  // ---- Goal modal
  function openGoalModal(editing) {
    const form = {
      name: editing ? editing.name : '',
      target: editing ? String(editing.target) : '',
      saved: editing ? String(editing.saved) : '',
      color: editing ? editing.color : CATEGORY_COLOR_CHOICES[5],
    };
    const modal = openModal(
      modalHead(editing ? 'Edit goal' : 'New goal') +
      '<form class="modal-body" id="goal-form">' +
      '<div><label class="label">Goal name</label><input class="input" id="g-name" placeholder="e.g. Emergency fund" value="' + esc(form.name) + '"/></div>' +
      '<div class="grid grid-2"><div><label class="label">Target amount</label><input class="input" id="g-target" inputmode="decimal" placeholder="0.00" value="' + esc(form.target) + '"/></div>' +
      '<div><label class="label">Already saved</label><input class="input" id="g-saved" inputmode="decimal" placeholder="0.00" value="' + esc(form.saved) + '"/></div></div>' +
      '<div><label class="label">Color</label><div class="color-grid" id="g-colors">' + CATEGORY_COLOR_CHOICES.map((c) => '<button type="button" class="color-opt" data-color="' + c + '" style="background:' + c + '"></button>').join('') + '</div></div>' +
      '<div id="g-error" class="form-error hidden"></div>' +
      '<div class="modal-actions"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="submit" class="btn btn-primary">' + (editing ? 'Save' : 'Create goal') + '</button></div></form>',
      'sm'
    );
    const root = modal.wrap;
    function refresh() { qsa('[data-color]', root).forEach((b) => { const on = b.getAttribute('data-color') === form.color; b.classList.toggle('active', on); b.style.color = b.getAttribute('data-color'); }); }
    qsa('[data-color]', root).forEach((b) => b.addEventListener('click', () => { form.color = b.getAttribute('data-color'); refresh(); }));
    refresh();
    ['g-target', 'g-saved'].forEach((id) => { const el = qs('#' + id, root); el.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^0-9.]/g, ''); }); });
    qsa('[data-close]', root).forEach((b) => b.addEventListener('click', modal.close));
    qs('#goal-form', root).addEventListener('submit', (e) => {
      e.preventDefault();
      const err = qs('#g-error', root);
      const name = qs('#g-name', root).value.trim();
      const target = parseFloat(qs('#g-target', root).value);
      const saved = parseFloat(qs('#g-saved', root).value || '0');
      if (!name) { err.textContent = 'Give your goal a name.'; err.classList.remove('hidden'); return; }
      if (!target || target <= 0) { err.textContent = 'Target must be greater than 0.'; err.classList.remove('hidden'); return; }
      const payload = { name: name, target: round2(target), saved: Math.max(0, round2(saved || 0)), color: form.color };
      if (editing) dispatch({ type: 'UPDATE_GOAL', payload: Object.assign({}, editing, payload) }).then(() => toast('Goal updated'));
      else dispatch({ type: 'ADD_GOAL', payload: payload }).then(() => toast('Goal created'));
      modal.close();
    });
    setTimeout(() => { const n = qs('#g-name', root); if (n) n.focus(); }, 40);
  }

  // ---- Contribute modal
  function openContributeModal(goal, mode) {
    const modal = openModal(
      modalHead((mode === 'add' ? 'Add to ' : 'Withdraw from ') + goal.name) +
      '<form class="modal-body" id="contrib-form">' +
      '<div><label class="label">Amount</label><input class="input input-lg" id="ct-amount" inputmode="decimal" placeholder="0.00"/>' +
      '<p style="margin-top:.4rem;font-size:.72rem;color:var(--muted-2)">Current balance: ' + money(goal.saved) + '</p></div>' +
      '<div class="modal-actions"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button type="submit" class="btn ' + (mode === 'add' ? 'btn-primary' : 'btn-danger') + '">' + (mode === 'add' ? 'Add funds' : 'Withdraw') + '</button></div></form>',
      'sm'
    );
    const root = modal.wrap;
    qs('#ct-amount', root).addEventListener('input', (e) => { e.target.value = e.target.value.replace(/[^0-9.]/g, ''); });
    qsa('[data-close]', root).forEach((b) => b.addEventListener('click', modal.close));
    qs('#contrib-form', root).addEventListener('submit', (e) => {
      e.preventDefault();
      const value = parseFloat(qs('#ct-amount', root).value);
      if (!value || value <= 0) return;
      const signed = mode === 'add' ? value : -value;
      dispatch({ type: 'CONTRIBUTE_GOAL', payload: { id: goal.id, amount: signed } }).then(() => toast(mode === 'add' ? 'Added ' + money(value) + ' to ' + goal.name : 'Withdrew ' + money(value)));
      modal.close();
    });
    setTimeout(() => { const a = qs('#ct-amount', root); if (a) a.focus(); }, 40);
  }

  // ---- Confirm modal
  function confirmModal(title, message, confirmLabel, danger, onConfirm) {
    const modal = openModal(
      modalHead(title) + '<div class="modal-body"><p style="color:var(--muted);font-size:.9rem">' + esc(message) + '</p>' +
      '<div class="modal-actions"><button class="btn btn-secondary" data-close>Cancel</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-confirm>' + esc(confirmLabel) + '</button></div></div>',
      'sm'
    );
    const root = modal.wrap;
    qsa('[data-close]', root).forEach((b) => b.addEventListener('click', modal.close));
    qs('[data-confirm]', root).addEventListener('click', () => { modal.close(); onConfirm(); });
    return true;
  }

  /* ---------------------------------------------------------- *
   *  Toast
   * ---------------------------------------------------------- */
  let toastTimer = null;
  function toast(msg, kind) {
    const ex = qs('.toast'); if (ex) ex.remove();
    const t = document.createElement('div');
    t.className = 'toast ' + (kind || 'success');
    t.innerHTML = icon(kind === 'error' ? 'alert-triangle' : kind === 'info' ? 'info' : 'check-circle') + '<span>' + esc(msg) + '</span>';
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 2600);
  }

  /* ---------------------------------------------------------- *
   *  Boot
   * ---------------------------------------------------------- */
  let resizeTimer = null;
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (state.view === 'dashboard' || state.view === 'analytics') renderView(); }, 200); });
  if (window.matchMedia) {
    try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (state.data.settings.theme === 'system') { applyTheme(); renderView(); } }); } catch (e) {}
  }

  async function init() {
    serverMode = await detectServer();
    if (serverMode) {
      try { state.data = await apiFetch('/data'); }
      catch (e) { serverMode = false; state.data = loadLocal() || createSeedData(); if (!localStorage.getItem(STORAGE_KEY)) saveLocal(state.data); }
    } else {
      const loaded = loadLocal();
      if (loaded) state.data = loaded;
      else { state.data = createSeedData(); saveLocal(state.data); }
    }
    applyTheme();
    renderApp();
  }
  init();
})();
