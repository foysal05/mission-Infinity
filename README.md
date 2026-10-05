# Mission Infinity — Mutual Trust Bank & DPS Ledger Portal

A real-time financial tracking and DPS installment management portal for the **Mission Infinity** savings committee, partnered with **Mutual Trust Bank Limited (Kadair Bazar Branch)**.

- **Official Published Google Sheet**: [View Published HTML](https://docs.google.com/spreadsheets/d/e/2PACX-1vQluOdLTn0bbrTbu6U31pwihR5KyabbgK3SqlxAEEERQKd0ZE9_svak3TAB59euaMAqhmrCbWvw3rBD/pubhtml)
- **Live Excel Export (.xlsx)**: [Download XLSX](https://docs.google.com/spreadsheets/d/e/2PACX-1vQluOdLTn0bbrTbu6U31pwihR5KyabbgK3SqlxAEEERQKd0ZE9_svak3TAB59euaMAqhmrCbWvw3rBD/pub?output=xlsx)
- **Live CSV Export (.csv)**: [Download CSV](https://docs.google.com/spreadsheets/d/e/2PACX-1vQluOdLTn0bbrTbu6U31pwihR5KyabbgK3SqlxAEEERQKd0ZE9_svak3TAB59euaMAqhmrCbWvw3rBD/pub?output=csv)
- **Original Edit Link**: [Open in Google Sheets](https://docs.google.com/spreadsheets/d/10u2p8Fsq3DEal-i2Ry_o0V5X2VqCgrfYpcrzDCk7ewA/edit?gid=1633713026#gid=1633713026)

---

## 🌟 Key Features

- **Live Google Sheets Synchronization**: Uses client-side JSONP real-time queries to pull live updates whenever entries are modified on Google Sheets. Zero server or backend needed!
- **Executive Dashboard**: High-level KPIs, 4-year installment milestone progress bars, and special financial adjustments notice.
- **Master Ledger Table**: Complete 48-month installment table (2025–2028) with sticky columns, year filters, status filters, instant search, and verified summary footers.
- **Member Profiles & Statements**: Individual contributor ledger cards with one-click export of personal statement CSVs.
- **Visual Analytics**: Interactive Chart.js charts for cumulative fund growth, monthly deposit trajectories, and contributor allocation shares.
- **DPS & Savings Growth Simulator**: Interactive compound interest and maturity calculator for customizable durations and interest rates.
- **Live Google Sheet Embed**: Integrated official spreadsheet view with fullscreen mode and reload controls.
- **Dark / Light Theme**: Seamless theme toggling persisted in `localStorage`.
- **Offline Resilient**: Ships with an initial data snapshot (`js/initial-data.js`) so the site loads in 0ms even if offline or if Google Sheets is momentarily unreachable.

---

## 🚀 How to Publish on GitHub Pages (`github.io`)

This project is 100% static (HTML, CSS, JavaScript) and requires **no build step, no Node.js, and no PHP**.

### Step 1: Initialize Git and Commit
In your terminal (inside this project folder):
```bash
git init
git add .
git commit -m "Initial release of Mission Infinity live portal"
```

### Step 2: Push to GitHub
1. Go to [GitHub](https://github.com) and click **New Repository**.
2. Name it (for example `mission-infinity` or `<your-username>.github.io`).
3. Push your code:
```bash
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<REPO_NAME>.git
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub.
2. Click **Settings** → **Pages** (under Code and automation in the left sidebar).
3. Under **Branch**, select `main` (or `gh-pages`) and folder `/ (root)`.
4. Click **Save**.

Your site will be live at:
`https://<YOUR_GITHUB_USERNAME>.github.io/<REPO_NAME>/`

---

## 📋 Ledger Bank & Account Details

- **Bank**: Mutual Trust Bank Limited
- **Branch**: Kadair Bazar
- **Account Number**: `1311002535350`
- **DPS Account Number**: `1308010659554`
- **DPS Account Holder**: SALAHUDDIN
- **Duration**: 4 Years (2025–2028 / 48 Installments)
