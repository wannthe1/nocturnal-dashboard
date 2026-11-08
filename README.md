# Nocturnal Tech — Restaurant Management & BI Dashboard

Nocturnal Tech is a restaurant management and business intelligence dashboard.
Restaurant owners sign in and see their sales, inventory and expenses in one place.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth + Postgres)

## What's built so far

**Stage 1: foundation**
- Nocturnal Tech branding and the dark theme, using the official palette
- Sign in and sign up with email and password (Supabase Auth)
- Signed-in-only dashboard with a sidebar, a branded loading screen and an error screen
- A `restaurants` table with Row Level Security; one is created automatically for each new account

**Stage 2: sales analytics**
- `branches` and `sales` tables (one row per item on an order), protected by Row Level Security
- A `sales_dashboard()` database function that adds up every figure in one call
- Sales page: period and branch filters, revenue / orders / average order value / items sold
  with change vs the previous period, revenue trend, revenue by category, branch and channel,
  busiest hours and top items
- Overview page shows the last 30 days of revenue and orders
- `supabase/demo-data.sql` fills a restaurant with a realistic year of demo orders

**Stage 3: inventory**
- `inventory_items` table: stock per branch with unit, quantity, reorder level and unit cost,
  protected by Row Level Security
- Inventory page: items tracked, low / out of stock counts and stock value; filter by status
  and branch; search; add, edit and delete items
- Overview shows how many items need reordering
- Demo data includes a 26-item stock list per branch

**Stage 4: expenses & profit**
- `expenses` table: date, description, category, amount, and a branch (or none for shared,
  restaurant-wide costs), protected by Row Level Security
- Expenses page: period and branch filters; expenses (vs previous period), revenue, profit and
  profit margin; expenses by category and by branch; expense list; add, edit and delete
- Overview shows revenue, expenses and profit for the last 30 days
- Demo data includes a year of expenses worked out from each branch's sales

**Stage 5: CSV import**
- Import sales (one row per item sold) or expenses from any CSV file
- Columns are matched automatically by name and can be changed; the date format is detected
- Every row is checked before anything is saved: errors are listed and skipped, warnings
  (e.g. rounded quantities, unknown expense categories) are shown, and a preview shows exactly
  what will be saved. The server checks every row again before saving.
- Rows are sent in batches of 500; if any batch fails, the whole import is removed
- Import history with **Undo**, which deletes exactly the rows that file added (`imports` table)
- Downloadable templates in `public/templates/`
- New accounts now start with a branch called "Main"

**Stage 6: reports, custom dates and polish**
- Reports page: monthly profit & loss table (revenue, main cost categories, profit, margin),
  profit-by-month chart, branch comparison, top items, and **Download CSV**
- Custom From–To dates on Sales, Expenses and Reports (any period up to 5 years, e.g. old
  imported data); long periods are charted by month
- Expense totals and the report are added up in the database (`expense_summary`,
  `monthly_report`), so they stay correct however many rows there are
- Inventory search suggests items and categories as you type (arrow keys + Enter), and
  offers "Did you mean …?" for typos
- Skeleton placeholders, shaped like each page, while data loads

**Polish and site essentials**
- Imports show a progress bar with percentage and, for anything over ~10 seconds, the time
  left — both while reading the file and while saving rows
- Taps respond instantly: filter buttons and menu links highlight straight away, and Undo
  removes an import from the list before the server finishes
- Branded 404 page, app icons, social share image, breadcrumbs on sub-pages, privacy policy
  (draft), robots.txt, canonical tag and description on the public page, security headers
- Charts load after the rest of the page, so figures appear sooner

**Redesign: themes, languages and charts**
- New look based on rounded cards, pill filters and a headline tile, with the company logo
  redrawn as a vector for the banner, sidebar, profile picture, favicon and share image
- Light and dark mode (remembered per browser), defined once as colour tokens
- English, Burmese, Thai and Simplified Chinese: text lives in `lib/i18n/`, one file per language
- Themed date pickers, dropdowns and confirm boxes replace the browser's built-in ones
- Charts matched to their job: area trends, doughnut for shares, revenue + profit by month,
  and a waterfall from revenue to profit; stat tiles have small trend lines
- Short, restrained motion that switches off for people who ask for reduced motion
- Figures: the main decision first, every metric labelled with its dates, amount / total beside
  every percentage, a dash when there's no data, the previous period and unfinished days labelled
- Charts are titled with the question they answer, keep one colour per category
  (`lib/chart-colors.ts`), and explain what will appear when there's no data yet

**Forecasting** (`lib/forecast.ts`: plain statistics, no AI model or outside service)
- Sidebar collapses to icons and remembers your choice
- Sales: expected revenue, orders, costs and profit for the next 7, 14 or 30 days, with a likely
  range and a test of how far the method missed on the last 14 days
- Demand: expected units per menu item and category, and the expected busiest hours
- Inventory: expected stock use, what runs out and when, and how much to order. It relies on
  recipes (Inventory → Recipes), which link each menu item to the stock it uses.
  `supabase/demo-recipes.sql` adds recipes for the demo menu.

### Before you go live (hosting only)
These don't matter on your computer, only once the app is online:
1. **Host it** (e.g. Vercel) and add the two Supabase variables from `.env.local`, plus
   `NEXT_PUBLIC_SITE_URL` set to your address.
2. **Custom domain**: connect it in your host's settings (e.g. `app.nocturnaltech.com`).
3. **Supabase → Authentication → URL Configuration**: set the Site URL to the live address and
   add `https://your-domain/auth/callback` to Redirect URLs.
4. **Turn "Confirm email" back on** and set up your own email sender (SMTP) in Supabase; the
   built-in one only sends a few emails per hour.
5. **Privacy policy**: replace the contact address in `app/privacy/page.tsx` and have it reviewed.
6. Remove the demo data from your real account before inviting customers.
7. **Translations**: have a native speaker check `lib/i18n/my.ts`, `th.ts` and `zh.ts`.

### Known limits
- Pages and filter choices are fetched ahead of a tap, and the browser reuses them for up to
  5 minutes. Your own saves and imports, and the Refresh button, update them straight away.
  This pre-fetching only happens in the production build (`npm run build`, then `npm run start`),
  so `npm run dev` always feels slower.
- Dates are grouped in UTC. A restaurant time-zone setting would make "today" and the
  busiest-hours chart match local time.
- There's no screen yet to add or rename branches (new accounts get "Main").

## Brand palette

| Name | Hex | Tailwind class | Used for |
|---|---|---|---|
| Obsidian | `#0B0D12` | `bg-obsidian` | App background |
| Midnight | `#171C26` | `bg-midnight` | Sidebar, cards, panels |
| Silver | `#C5CAD3` | `text-silver`, `border-silver/10` | Secondary text, borders |
| Moon White | `#F7F8FA` | `text-moon` | Headings, key numbers |
| Electric Blue | `#657EFF` | `bg-electric`, `text-electric` | Buttons, active items, chart accents |

The colours are defined once in [`app/globals.css`](app/globals.css) as tokens with a dark and a light value. Screens use the token classes (`bg-surface`, `text-ink`, `text-muted`, `border-line`, `text-accent-text`), so they follow the theme automatically. Never use hard-coded hex values.

## Setup

You need [Node.js](https://nodejs.org) (LTS) and a free [Supabase](https://supabase.com) account.

1. **Install packages**
   ```bash
   npm install
   ```
2. **Create a Supabase project**, then open **SQL Editor**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
3. **Add your keys.** Copy `.env.example` to `.env.local` and fill in the project URL
   and publishable (anon) key from your Supabase project's API settings.
   `.env.local` stays on your computer and is never committed.
4. **Set the redirect URL.** In Supabase, open **Authentication → URL Configuration**,
   set **Site URL** to `http://localhost:3000`, and add `http://localhost:3000/auth/callback`
   to **Redirect URLs**. This is where the "confirm your email" link sends people.
5. **Optional: add demo data.** After creating your account (step 6), run
   [`supabase/demo-data.sql`](supabase/demo-data.sql) in the SQL Editor. It adds a year of
   orders across three branches to the restaurant named at the top of the file
   ("Midnight Bites" by default; change it to match yours).
6. **Start the app**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000. You'll be sent to the sign-in page, where you can create an account.

> Tip: while developing, you can turn off **Confirm email** under
> Authentication → Sign In / Providers → Email, so new accounts can sign in straight away.

## How it fits together

```
app/
  layout.tsx            Root HTML, fonts, page title ("… · Nocturnal Tech")
  globals.css           Brand colours (Tailwind theme)
  login/                Sign-in / sign-up page and its server actions
  auth/callback/        Finishes sign-in after the email confirmation link
  (dashboard)/          Everything behind sign-in: sidebar layout + pages
  (dashboard)/sales/    Sales analytics page
  (dashboard)/inventory/  Stock list, add/edit item forms and their server actions
  (dashboard)/expenses/   Costs & profit page, add/edit expense forms and their server actions
  (dashboard)/import/     CSV import screen (runs in the browser), history and server actions
  (dashboard)/reports/    Profit & loss report and CSV download
components/             Shared UI: logo, skeletons, cards, stat tiles, charts, filters, search box
lib/
  supabase/server.ts    Creates the Supabase client on the server
  auth.ts               getCurrentUser(): the one place pages get the signed-in user
  sales.ts              Loads sales figures (calls sales_dashboard in the database)
  inventory.ts          Loads stock items; inventory-shared.ts holds units and the low/out rule
  expenses.ts           Loads expenses and period totals; expenses-shared.ts holds the categories
  import-shared.ts      CSV column matching, date/number parsing and row checks (browser + server)
  period.ts             Date ranges: presets, custom From–To, and the previous period
  reports.ts            Loads the monthly report
  search.ts             Search suggestion ranking and "did you mean" matching
  format.ts             Money, number and date formatting
  i18n/                 The four languages (en.ts is the master list) and how they're loaded
proxy.ts                Runs before each request: refreshes the session, redirects signed-out visitors
supabase/schema.sql     Database tables, security rules and the sales_dashboard function
supabase/demo-data.sql  Optional: a year of demo sales for one restaurant
```

**How sign-in is protected:** `proxy.ts` sends anyone without a session to `/login`.
Pages also call `getCurrentUser()`, which checks again on the server. And in the
database, Row Level Security means a user can only read their own restaurant's rows,
even if the app code had a bug.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app locally with live reload |
| `npm run build` | Build the production version (also checks for type errors) |
| `npm run start` | Run the production build |
| `npm run lint` | Check the code for common mistakes |

---

© 2026 Nocturnal Tech
