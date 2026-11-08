"use client";

// The chart library is the biggest piece of JavaScript in the app (~110 KB
// compressed). Loading the charts separately lets the rest of the page appear
// first; a shimmering placeholder of the same height holds their place meanwhile.

import dynamic from "next/dynamic";

// Start fetching the chart code now, so it's ready before the first chart is needed.
if (typeof window !== "undefined") void import("./charts");

const Holder = ({ height }: { height: string }) => <div aria-hidden="true" className={`skeleton w-full rounded-2xl ${height}`} />;

export const TrendCard = dynamic(() => import("./charts").then((m) => m.TrendCard), {
  ssr: false,
  loading: () => <Holder height="h-[25rem]" />,
});
export const CategoryCard = dynamic(() => import("./charts").then((m) => m.CategoryCard), {
  ssr: false,
  loading: () => <Holder height="h-[25rem]" />,
});
export const OrdersByHourChart = dynamic(() => import("./charts").then((m) => m.OrdersByHourChart), {
  ssr: false,
  loading: () => <Holder height="h-64" />,
});
export const ForecastChart = dynamic(() => import("./charts").then((m) => m.ForecastChart), {
  ssr: false,
  loading: () => <Holder height="h-[27rem]" />,
});
export const RevenueProfitChart = dynamic(() => import("./charts").then((m) => m.RevenueProfitChart), {
  ssr: false,
  loading: () => <Holder height="h-80" />,
});
export const WaterfallChart = dynamic(() => import("./charts").then((m) => m.WaterfallChart), {
  ssr: false,
  loading: () => <Holder height="h-72" />,
});
