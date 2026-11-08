# Nocturnal Tech

A restaurant dashboard for tracking sales, stock, expenses and profit, and forecasting what comes next. Supports multiple branches, light and dark mode, and English, Burmese, Thai and Chinese.

## Features

| Area | What you get |
|---|---|
| **Overview** | Profit, revenue, costs and orders at a glance, with low-stock alerts |
| **Sales** | Trends, top items, busiest hours, and revenue by category, branch and channel |
| **Forecast** | Expected sales, item demand and stock run-out dates for the next 7, 14 or 30 days |
| **Inventory** | Stock levels per branch, reorder alerts, search, and recipes that link menu items to stock |
| **Expenses** | Costs by category and branch, with profit and margin |
| **Reports** | Monthly profit and loss, branch comparison, and CSV export |
| **Import** | Bring in sales or expenses from any CSV, with a preview, row checks and one-click undo |

Each account only ever sees its own restaurant's data, enforced by Row Level Security in the database.

## Tech stack

- [Next.js 16](https://nextjs.org) and React 19
- [Tailwind CSS 4](https://tailwindcss.com)
- [Supabase](https://supabase.com) for authentication and Postgres
- [Recharts](https://recharts.org) for charts

## Getting started

You'll need [Node.js](https://nodejs.org) (LTS) and a free [Supabase](https://supabase.com) project.

**1. Install dependencies**

```bash
npm install
```

**2. Set up the database**

In the Supabase SQL Editor, run the contents of [`supabase/schema.sql`](supabase/schema.sql).

**3. Add your environment variables**

Copy `.env.example` to `.env.local` and fill in your values from your Supabase project's API settings:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your publishable (anon) key |
| `NEXT_PUBLIC_SITE_URL` | Your public address (production only) |

**4. Configure sign-in redirects**

In Supabase, go to **Authentication → URL Configuration**. Set the Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the Redirect URLs.

**5. Start the app**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

### Demo data (optional)

After creating an account, run these in the SQL Editor, in order:

1. [`supabase/demo-data.sql`](supabase/demo-data.sql) adds a year of sales, stock and expenses across three branches.
2. [`supabase/demo-recipes.sql`](supabase/demo-recipes.sql) adds recipes for the demo menu.

Both target a restaurant named "Midnight Bites". Change the name in each file to match yours.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run the linter |

Pages are only loaded ahead of time in production, so `npm run dev` feels slower than the real app.

## How forecasting works

Forecasts use statistics on your own sales, with no outside service. Each one combines weekday patterns with the recent trend over the last 90 days, and is tested against the most recent 14 days to set its likely range.

Inventory forecasts need recipes, which you can add under **Inventory → Recipes**. They assume no new deliveries during the forecast period.

A forecast needs at least 7 days of recent sales. It doesn't account for holidays or one-off events.

## Project structure

```
app/            Pages and server actions
  (dashboard)/  Signed-in pages
  login/        Sign in and sign up
components/     Shared UI and charts
lib/            Data access, forecasting and formatting
  i18n/         Translations
proxy.ts        Session refresh and sign-in redirects
supabase/       Database schema and demo data
public/         CSV import templates
```

## Deploying

The app can be hosted on any platform that runs Next.js, such as [Vercel](https://vercel.com). Before going live:

1. Add the three environment variables to your host.
2. Add your live address to the Site URL and Redirect URLs in Supabase (`https://your-domain/auth/callback`).
3. Turn on **Confirm email** in Supabase and set up your own SMTP provider. The built-in sender only allows a few emails per hour.
4. Replace the contact address in `app/privacy/page.tsx` and have the policy reviewed.
5. Remove any demo data.

## Known limitations

- Dates are grouped in UTC, so "today" and busiest hours may not match local time.
- Branches can't yet be added or renamed in the app.
- Each restaurant has a single owner account. Staff roles aren't available yet.
- Translations haven't been reviewed by native speakers.

---

© 2026 Nocturnal Tech
