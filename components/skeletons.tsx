"use client";

// Placeholder shapes shown while a page loads. Every card has a fixed height that
// matches the real card, so nothing jumps when the data arrives.

import { useI18n } from "@/lib/i18n/client";

function Bone({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

// Screen readers hear "Loading…" once instead of reading out the shapes.
function Loading({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-live="polite" className="space-y-8">
      <span className="sr-only">{t("common.loading")}</span>
      {children}
    </div>
  );
}

const Card = ({ className, children }: { className: string; children: React.ReactNode }) => (
  <div className={`card overflow-hidden p-5 sm:p-6 ${className}`}>{children}</div>
);

function Stats({ spark = true }: { spark?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`card overflow-hidden p-5 ${spark ? "h-48" : "h-[8.8rem]"}`}>
          <Bone className="h-4 w-24" />
          <Bone className="mt-1.5 h-3 w-32" />
          <Bone className="mt-3 h-8 w-32" />
          {spark && <Bone className="mt-5 h-10 w-full" />}
        </div>
      ))}
    </div>
  );
}

function Chart({ height = "h-72", className = "h-[25rem]" }: { height?: string; className?: string }) {
  return (
    <Card className={className}>
      <Bone className="h-5 w-52" />
      <Bone className="mt-2 h-3 w-36" />
      <Bone className={`mt-6 w-full ${height}`} />
    </Card>
  );
}

function List({ rows = 5, className = "h-[25rem]" }: { rows?: number; className?: string }) {
  return (
    <Card className={className}>
      <Bone className="h-5 w-52" />
      <div className="mt-6 space-y-5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i}>
            <div className="flex justify-between gap-4">
              <Bone className="h-4 w-1/3" />
              <Bone className="h-4 w-20" />
            </div>
            <Bone className="mt-2 h-2 w-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

function Table({ rows = 8, height }: { rows?: number; height?: string }) {
  return (
    <div className="card overflow-hidden p-5 sm:p-6" style={{ height: height ?? `${6 + rows * 3.2}rem` }}>
      <Bone className="h-5 w-36" />
      <div className="mt-6 space-y-7">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Bone className="h-4 flex-[3]" />
            <Bone className="h-4 flex-[2]" />
            <Bone className="h-4 flex-1" />
            <Bone className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Filters() {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2.5">
        <Bone className="h-10 w-72 rounded-full" />
        <Bone className="h-10 w-80 rounded-full" />
        <Bone className="h-10 w-44 rounded-full" />
      </div>
      <Bone className="h-4 w-96 max-w-full" />
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <Loading>
      <Bone className="h-[9.8rem] w-full rounded-[1.5rem]" />
      <Filters />
      <Stats />
      <div className="grid gap-5 lg:grid-cols-3">
        <Chart className="h-[25rem] lg:col-span-2" />
        <div className="space-y-5">
          <List rows={2} className="h-[13.2rem]" />
          <List rows={1} className="h-36" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2"><Table rows={6} height="27rem" /></div>
        <List rows={3} className="h-[27rem]" />
      </div>
    </Loading>
  );
}

export function SalesSkeleton() {
  return (
    <Loading>
      <Filters />
      <Stats />
      <Chart />
      <div className="grid gap-5 lg:grid-cols-2">
        <List className="h-[22.5rem]" />
        <List className="h-[22.5rem]" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Chart height="h-64" className="h-[23.2rem]" />
        <List rows={3} className="h-[23.2rem]" />
      </div>
      <Table rows={6} height="33rem" />
    </Loading>
  );
}

export function ExpensesSkeleton() {
  return (
    <Loading>
      <Filters />
      <Stats />
      <div className="grid gap-5 lg:grid-cols-2">
        <List rows={6} />
        <List rows={4} />
      </div>
      <Table />
    </Loading>
  );
}

export function InventorySkeleton() {
  return (
    <Loading>
      <Stats spark={false} />
      <Bone className="h-10 w-full rounded-full" />
      <Table rows={10} />
    </Loading>
  );
}

export function ReportSkeleton() {
  return (
    <Loading>
      <Filters />
      <Stats />
      <div className="grid gap-5 lg:grid-cols-2">
        <Chart className="h-[27rem]" />
        <Chart className="h-[27rem]" />
      </div>
      <Table rows={13} />
      <div className="grid gap-5 lg:grid-cols-2">
        <List rows={6} className="h-[32.6rem]" />
        <List rows={6} className="h-[32.6rem]" />
      </div>
    </Loading>
  );
}

export function ForecastSkeleton() {
  return (
    <Loading>
      <div className="space-y-2.5">
        <Bone className="h-10 w-full max-w-2xl rounded-full" />
        <Bone className="h-4 w-96 max-w-full" />
      </div>
      <Stats spark={false} />
      <Chart className="h-[27rem]" />
      <div className="grid gap-5 lg:grid-cols-2">
        <List rows={7} className="h-[32rem]" />
        <List rows={3} className="h-[32rem]" />
      </div>
    </Loading>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <Loading>
      <Bone className="h-4 w-44" />
      <div className="card overflow-hidden p-5 sm:p-6" style={{ height: `${10 + Math.ceil(fields / 2) * 5.5}rem` }}>
        <Bone className="h-5 w-32" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {Array.from({ length: fields }, (_, i) => (
            <div key={i}>
              <Bone className="h-4 w-24" />
              <Bone className="mt-2 h-11 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </Loading>
  );
}

export function ImportSkeleton() {
  return (
    <Loading>
      <Card className="h-[20rem]">
        <Bone className="h-5 w-32" />
        <Bone className="mt-5 h-10 w-56 rounded-full" />
        <Bone className="mt-5 h-32 w-full rounded-2xl" />
      </Card>
      <Table rows={3} />
    </Loading>
  );
}
