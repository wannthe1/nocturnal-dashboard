// Forecasting maths. Plain statistics, no AI model and nothing leaves the app:
//   1. Work out each weekday's pattern (Saturdays run above average, and so on).
//   2. Measure the recent level and trend with that pattern taken out.
//   3. Carry the trend forward, flattening it over time so one good week doesn't
//      project forever, then put the weekday pattern back.
//   4. Test the method by hiding the last 14 days and predicting them. That error
//      is shown to the user and sets the width of the likely range.

const DAY = 86_400_000;
const MIN_DAYS = 7; // less than this and there's nothing to go on
const SEASONAL_DAYS = 28; // four of each weekday before trusting a weekly pattern
const BACKTEST_DAYS = 14;
const STALE_AFTER = 14; // no sales for this long and old patterns no longer apply
const TREND_DAMPING = 0.97;
const MAX_DAILY_TREND = 0.015; // the trend can't exceed 1.5% of the level per day

const time = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const addDays = (iso: string, days: number) => new Date(time(iso) + days * DAY).toISOString().slice(0, 10);
export const daysBetween = (from: string, to: string) => Math.round((time(to) - time(from)) / DAY);
export const weekdayOf = (iso: string) => (new Date(time(iso)).getUTCDay() + 6) % 7; // Monday = 0

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

function slopeOf(values: number[]) {
  const meanX = (values.length - 1) / 2;
  const meanY = average(values);
  let top = 0;
  let bottom = 0;
  values.forEach((y, x) => {
    top += (x - meanX) * (y - meanY);
    bottom += (x - meanX) ** 2;
  });
  return bottom ? top / bottom : 0;
}

// Learns from consecutive daily values and returns a function that predicts a date.
function fit(values: number[], firstDate: string) {
  const factors = new Array<number>(7).fill(1);
  if (values.length >= SEASONAL_DAYS) {
    // Compare each day with the overall trend line, so growth isn't mistaken for a weekday effect.
    const meanValue = average(values) || 1;
    const overallSlope = slopeOf(values);
    const midpoint = (values.length - 1) / 2;
    const buckets: number[][] = [[], [], [], [], [], [], []];
    values.forEach((v, i) => buckets[weekdayOf(addDays(firstDate, i))].push(v / Math.max(meanValue + overallSlope * (i - midpoint), meanValue * 0.1)));
    buckets.forEach((b, w) => (factors[w] = b.length ? average(b) : 1));
  }

  const adjusted = values.map((v, i) => v / (factors[weekdayOf(addDays(firstDate, i))] || 1));
  const recent = adjusted.slice(-BACKTEST_DAYS);
  const level = average(recent);
  const limit = Math.abs(level) * MAX_DAILY_TREND;
  const slope = values.length >= SEASONAL_DAYS ? Math.max(-limit, Math.min(limit, slopeOf(adjusted.slice(-56)))) : 0;
  const levelAtEnd = level + slope * ((recent.length - 1) / 2);
  const lastDate = addDays(firstDate, values.length - 1);

  return (date: string) => {
    let carried = 0;
    let weight = 1;
    for (let i = daysBetween(lastDate, date); i > 0; i--) {
      weight *= TREND_DAMPING;
      carried += weight;
    }
    return Math.max(0, (levelAtEnd + slope * carried) * factors[weekdayOf(date)]);
  };
}

export type Accuracy = { missed: number; actual: number; percent: number };

export type Projection = {
  dates: string[];
  values: number[];
  low: number[];
  high: number[];
  total: number;
  totalLow: number;
  totalHigh: number;
  accuracy: Accuracy | null; // null when there isn't enough history to test
};

// `history` maps YYYY-MM-DD to a value. Forecasts the `horizon` days after `today`.
// Returns null when there's too little recent data to say anything useful.
export function project(history: Record<string, number>, today: string, horizon: number): Projection | null {
  const days = Object.keys(history).filter((d) => history[d] > 0).sort();
  if (days.length === 0) return null;
  const first = days[0];
  const last = days[days.length - 1];
  if (daysBetween(last, today) > STALE_AFTER) return null;

  const length = daysBetween(first, last) + 1;
  if (length < MIN_DAYS) return null;
  const values = Array.from({ length }, (_, i) => history[addDays(first, i)] ?? 0);

  let accuracy: Accuracy | null = null;
  let dailyError = 0.25;
  let totalError = 0.25;
  if (length >= SEASONAL_DAYS + BACKTEST_DAYS) {
    const predict = fit(values.slice(0, -BACKTEST_DAYS), first);
    const held = values.slice(-BACKTEST_DAYS);
    const guesses = held.map((_, i) => predict(addDays(last, i - BACKTEST_DAYS + 1)));
    const actual = held.reduce((a, b) => a + b, 0);
    const missed = held.reduce((sum, v, i) => sum + Math.abs(v - guesses[i]), 0);
    if (actual > 0) {
      accuracy = { missed, actual, percent: (missed / actual) * 100 };
      dailyError = Math.max(missed / actual, 0.05);
      // Daily misses partly cancel out, so a total is more accurate than its days.
      const netMiss = Math.abs(actual - guesses.reduce((a, b) => a + b, 0)) / actual;
      totalError = Math.max(netMiss, dailyError / 2);
    }
  }

  const predict = fit(values, first);
  const dates = Array.from({ length: horizon }, (_, i) => addDays(today, i + 1));
  const forecast = dates.map(predict);
  const total = forecast.reduce((a, b) => a + b, 0);
  return {
    dates,
    values: forecast,
    low: forecast.map((v) => v * (1 - dailyError)),
    high: forecast.map((v) => v * (1 + dailyError)),
    total,
    totalLow: total * (1 - totalError),
    totalHigh: total * (1 + totalError),
    accuracy,
  };
}

export type StockOutlook = {
  used: number; // expected use over the forecast
  runsOutOn: string | null; // null = lasts beyond the forecast
  suggestedOrder: number; // enough for the forecast and to stay above the reorder level
};

// Walks the expected daily use down from what's on hand.
// Stock counted in whole pieces or packs is ordered in whole pieces or packs.
export function stockOutlook(onHand: number, reorderLevel: number, dates: string[], dailyUse: number[], wholeUnits = false): StockOutlook {
  let left = onHand;
  let runsOutOn: string | null = null;
  dailyUse.forEach((use, i) => {
    left -= use;
    if (left <= 0 && runsOutOn === null) runsOutOn = dates[i];
  });
  const used = dailyUse.reduce((a, b) => a + b, 0);
  const needed = Math.max(0, used + reorderLevel - onHand);
  return { used, runsOutOn, suggestedOrder: wholeUnits ? Math.ceil(needed) : Math.ceil(needed * 100) / 100 };
}
