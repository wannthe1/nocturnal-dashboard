"use client";

// The CSV import screen: pick a file, match its columns, check the rows, import.
// The file is read in the browser; only valid, cleaned-up rows are sent to the server.

import Link from "next/link";
import Papa from "papaparse";
import { useMemo, useRef, useState } from "react";
import { DownloadIcon, UploadIcon } from "@/components/icons";
import { Panel } from "@/components/panel";
import { ProgressBar } from "@/components/progress-bar";
import { Segmented } from "@/components/segmented";
import { Select } from "@/components/select";
import { formatNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { labelFor, type MessageKey } from "@/lib/i18n/config";
import {
  DATE_FORMATS,
  FIELDS,
  MAX_CHUNK,
  autoMatch,
  detectDateFormat,
  toExpenseRow,
  toSaleRow,
  type DateFormat,
  type ExpenseRow,
  type ImportKind,
  type SaleRow,
} from "@/lib/import-shared";
import { deleteImport, finishImport, importRows, startImport } from "./actions";

type Branch = { id: string; name: string };
type Parsed = {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  token: string;
  // Rows whose number of columns doesn't match the header (by row index).
  shapeProblems: Map<number, MessageKey>;
};
type Status =
  | { phase: "idle" }
  | { phase: "reading"; progress: number; startedAt: number; fileName: string; size: number }
  | { phase: "importing"; progress: number; startedAt: number; saved: number; total: number }
  | { phase: "done"; message: string }
  | { phase: "error"; message: string };

const MAX_FILE_MB = 20;

export function ImportWizard({ branches }: { branches: Branch[] }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<ImportKind>("sales");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [dateFormat, setDateFormat] = useState<DateFormat>("dmy");
  const [defaultBranch, setDefaultBranch] = useState(branches[0]?.id ?? ""); // "" = shared (expenses)
  const [status, setStatus] = useState<Status>({ phase: "idle" });
  const fileInput = useRef<HTMLInputElement>(null);
  const kindName = kind === "sales" ? t("nav.sales") : t("nav.expenses");

  const branchIdsByName = useMemo(() => new Map(branches.map((b) => [b.name.trim().toLowerCase(), b.id])), [branches]);

  function guessSettings(k: ImportKind, headers: string[], rows: Record<string, string>[]) {
    const m = autoMatch(k, headers);
    setMapping(m);
    setDateFormat(detectDateFormat(m.date ? rows.slice(0, 500).map((r) => r[m.date] ?? "") : []));
  }

  function changeKind(k: ImportKind) {
    setKind(k);
    setDefaultBranch(branches[0]?.id ?? "");
    if (parsed) guessSettings(k, parsed.headers, parsed.rows);
  }

  function readFile(file: File) {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setStatus({ phase: "error", message: t("import.tooBig", { mb: MAX_FILE_MB }) });
      return;
    }
    // The file is read in pieces so the progress bar (and time left) can update.
    const startedAt = Date.now();
    const rows: Record<string, string>[] = [];
    const shapeProblems = new Map<number, MessageKey>();
    let headers: string[] = [];
    setParsed(null);
    setStatus({ phase: "reading", progress: 0, startedAt, fileName: file.name, size: file.size });

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      chunkSize: 256 * 1024,
      chunk: (result) => {
        if (!headers.length) headers = (result.meta.fields ?? []).filter(Boolean);
        const offset = rows.length;
        // Too many columns usually means a value with a comma that wasn't in quotes,
        // e.g. 1,204.10; those rows can't be read reliably, so they're skipped.
        for (const e of result.errors) {
          if (e.row === undefined) continue;
          if (e.code === "TooManyFields") shapeProblems.set(offset + e.row, "import.err.tooMany");
          else if (e.code === "TooFewFields") shapeProblems.set(offset + e.row, "import.err.tooFew");
        }
        for (const row of result.data) rows.push(row);
        setStatus({ phase: "reading", progress: result.meta.cursor / file.size, startedAt, fileName: file.name, size: file.size });
      },
      complete: () => {
        if (headers.length === 0 || rows.length === 0) {
          setStatus({ phase: "error", message: t("import.noRows") });
          return;
        }
        guessSettings(kind, headers, rows);
        // A short random code keeps generated order IDs unique to this upload.
        setParsed({ fileName: file.name, headers, rows, token: crypto.randomUUID().slice(0, 8), shapeProblems });
        setStatus({ phase: "idle" });
      },
      error: (err) => setStatus({ phase: "error", message: t("import.cantRead", { detail: err.message }) }),
    });
  }

  function startOver() {
    setParsed(null);
    setStatus({ phase: "idle" });
    if (fileInput.current) fileInput.current.value = "";
  }

  // Check every row whenever the file or the settings change.
  const check = useMemo(() => {
    if (!parsed) return null;
    const missing = FIELDS[kind].filter((f) => f.required && !mapping[f.key]).map((f) => labelFor(t, "import.field", f.key));
    if (missing.length) return { missing, valid: [], errors: [], warnings: [] };

    const opts = { mapping, dateFormat, defaultBranchId: defaultBranch || null, branchIdsByName, t };
    const valid: (SaleRow | ExpenseRow)[] = [];
    const errors: { line: number; message: string }[] = [];
    const warnings: { line: number; message: string }[] = [];
    parsed.rows.forEach((raw, i) => {
      const line = i + 2; // line 1 is the header
      const shapeProblem = parsed.shapeProblems.get(i);
      if (shapeProblem) {
        errors.push({ line, message: t(shapeProblem) });
        return;
      }
      const result = kind === "sales" ? toSaleRow(raw, opts, `${parsed.token}-${line}`) : toExpenseRow(raw, opts);
      if (result.row) valid.push(result.row);
      result.errors.forEach((message) => errors.push({ line, message }));
      result.warnings.forEach((message) => warnings.push({ line, message }));
    });
    return { missing: [], valid, errors, warnings };
  }, [parsed, kind, mapping, dateFormat, defaultBranch, branchIdsByName, t]);

  const errorRows = check ? new Set(check.errors.map((e) => e.line)).size : 0;

  async function runImport() {
    if (!parsed || !check || check.valid.length === 0) return;
    const startedAt = Date.now();
    const total = check.valid.length;
    setStatus({ phase: "importing", progress: 0, startedAt, saved: 0, total });
    let importId: string | null = null;
    try {
      const start = await startImport(kind, parsed.fileName);
      if (!start.ok) throw new Error(start.error);
      importId = start.id;

      let saved = 0;
      for (let i = 0; i < check.valid.length; i += MAX_CHUNK) {
        const chunk = check.valid.slice(i, i + MAX_CHUNK) as SaleRow[] | ExpenseRow[];
        const result = await importRows(importId, kind, chunk);
        if (!result.ok) throw new Error(result.error);
        saved += result.saved;
        setStatus({ phase: "importing", progress: saved / total, startedAt, saved, total });
      }

      const finish = await finishImport(importId, saved);
      if (!finish.ok) throw new Error(finish.error);
      setStatus({ phase: "done", message: t("import.done", { count: formatNumber(saved), name: parsed.fileName }) });
      setParsed(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch (err) {
      // All or nothing: remove anything this import already saved.
      if (importId) await deleteImport(importId);
      setStatus({ phase: "error", message: `${err instanceof Error ? err.message : t("import.failed")} ${t("import.nothingSaved")}` });
    }
  }

  const importing = status.phase === "importing" || status.phase === "reading";
  const columnOptions = [{ value: "", label: t("import.notInFile") }, ...(parsed?.headers ?? []).map((h) => ({ value: h, label: h }))];

  return (
    <div className="space-y-5">
      <Panel title={t("import.step1")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Segmented
            label={t("import.what")}
            value={kind}
            disabled={importing}
            onSelect={(k) => changeKind(k as ImportKind)}
            items={[{ key: "sales", label: t("nav.sales") }, { key: "expenses", label: t("nav.expenses") }]}
          />
          <a href={`/templates/${kind}-template.csv`} download className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline">
            <DownloadIcon className="h-4 w-4" />
            {t("import.template", { kind: kindName })}
          </a>
        </div>

        <label htmlFor="csv-file" className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-sunken px-4 py-9 text-center transition-colors hover:border-accent">
          {status.phase === "reading" ? (
            <ProgressBar label={t("import.reading", { name: status.fileName })} progress={status.progress} startedAt={status.startedAt} detail={`${((status.progress * status.size) / 1048576).toFixed(1)} / ${(status.size / 1048576).toFixed(1)} MB`} />
          ) : (
            <>
              <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-accent-text"><UploadIcon /></span>
              <span className="text-sm font-semibold text-ink">{parsed ? parsed.fileName : t("import.choose")}</span>
              <span className="mt-1 text-xs text-faint">
                {parsed ? t("import.fileInfo", { rows: formatNumber(parsed.rows.length), columns: parsed.headers.length }) : t("import.fileHint", { mb: MAX_FILE_MB })}
              </span>
            </>
          )}
        </label>
        <input ref={fileInput} id="csv-file" type="file" accept=".csv,text/csv" className="sr-only" disabled={importing} onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
      </Panel>

      {status.phase === "done" && (
        <div role="status" className="rise rounded-2xl bg-success/12 px-5 py-4 text-sm text-ink">
          {status.message}{" "}
          <Link href={kind === "sales" ? "/sales" : "/expenses"} className="font-semibold text-accent-text hover:underline">{t("import.view", { kind: kindName })}</Link>
          <p className="mt-1 text-xs text-muted">{t("import.wrongFile")}</p>
        </div>
      )}
      {status.phase === "error" && <div role="alert" className="rise rounded-2xl bg-danger/12 px-5 py-4 text-sm text-ink">{status.message}</div>}

      {parsed && check && (
        <>
          <Panel title={t("import.step2")} subtitle={t("import.step2Note")} className="rise relative z-10">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {FIELDS[kind].map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label htmlFor={`map-${field.key}`} className="block text-sm font-medium text-muted">
                    {labelFor(t, "import.field", field.key)} {field.required && <span className="text-danger" aria-label={t("import.required")}>*</span>}
                  </label>
                  <Select id={`map-${field.key}`} value={mapping[field.key] ?? ""} onChange={(v) => setMapping({ ...mapping, [field.key]: v })} disabled={importing} options={columnOptions} />
                  {field.hint && <p className="text-xs text-faint">{labelFor(t, "import.hint", field.key)}</p>}
                </div>
              ))}

              <div className="space-y-1.5">
                <label htmlFor="date-format" className="block text-sm font-medium text-muted">{t("import.dateFormat")}</label>
                <Select
                  id="date-format"
                  value={dateFormat}
                  onChange={(v) => setDateFormat(v as DateFormat)}
                  disabled={importing}
                  options={(Object.keys(DATE_FORMATS) as DateFormat[]).map((f) => ({ value: f, label: labelFor(t, "import.format", f) }))}
                />
                <p className="text-xs text-faint">{t("import.dateGuess")}</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="default-branch" className="block text-sm font-medium text-muted">{mapping.branch ? t("import.branchFallback") : t("import.branchInto")}</label>
                <Select
                  id="default-branch"
                  value={defaultBranch}
                  onChange={setDefaultBranch}
                  disabled={importing}
                  options={[...branches.map((b) => ({ value: b.id, label: b.name })), ...(kind === "expenses" ? [{ value: "", label: t("common.sharedAll") }] : [])]}
                />
              </div>
            </div>
          </Panel>

          <Panel title={t("import.step3")} className="rise">
            {check.missing.length > 0 ? (
              <p className="text-sm text-danger">{t("import.missing", { fields: check.missing.join(", ") })}</p>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Count label={t("import.count.rows")} value={parsed.rows.length} />
                  <Count label={t("import.count.ready")} value={check.valid.length} />
                  <Count label={t("import.count.errors")} value={errorRows} tone={errorRows ? "danger" : undefined} />
                  <Count label={t("import.count.warnings")} value={check.warnings.length} tone={check.warnings.length ? "warning" : undefined} />
                </dl>

                <MessageList title={t("import.errorsTitle")} items={check.errors} tone="danger" />
                <MessageList title={t("import.warningsTitle")} items={check.warnings} tone="warning" />

                {check.valid.length > 0 && <Preview kind={kind} rows={check.valid.slice(0, 5)} branches={branches} />}
              </>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button type="button" onClick={runImport} disabled={importing || check.valid.length === 0} className="btn btn-primary">
                {importing ? t("import.importing") : t("import.run", { count: formatNumber(check.valid.length) })}
                {!importing && errorRows > 0 && ` ${t("import.skip", { count: formatNumber(errorRows) })}`}
              </button>
              <button type="button" onClick={startOver} disabled={importing} className="btn btn-ghost">{t("import.startOver")}</button>
            </div>
            {status.phase === "importing" && (
              <div className="mt-5">
                <ProgressBar label={t("import.saving")} progress={status.progress} startedAt={status.startedAt} detail={t("import.savedOf", { saved: formatNumber(status.saved), total: formatNumber(status.total) })} />
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function Count({ label, value, tone }: { label: string; value: number; tone?: "danger" | "warning" }) {
  const color = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink";
  return (
    <div className="rounded-xl bg-sunken px-4 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`mt-1 text-xl font-semibold tabular-nums ${color}`}>{formatNumber(value)}</dd>
    </div>
  );
}

function MessageList({ title, items, tone }: { title: string; items: { line: number; message: string }[]; tone: "danger" | "warning" }) {
  const { t } = useI18n();
  if (items.length === 0) return null;
  const shown = items.slice(0, 8);
  return (
    <div className="mt-5">
      <h3 className={`text-sm font-semibold ${tone === "danger" ? "text-danger" : "text-warning"}`}>{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-muted">
        {shown.map((item, i) => (
          <li key={i}><span className="tabular-nums text-faint">{t("import.row", { line: item.line })}:</span> {item.message}</li>
        ))}
      </ul>
      {items.length > shown.length && <p className="mt-1 text-xs text-faint">{t("import.more", { count: formatNumber(items.length - shown.length) })}</p>}
    </div>
  );
}

function Preview({ kind, rows, branches }: { kind: ImportKind; rows: (SaleRow | ExpenseRow)[]; branches: Branch[] }) {
  const { t } = useI18n();
  const branchName = (id: string | null) => (id ? (branches.find((b) => b.id === id)?.name ?? "?") : t("common.shared"));
  const headings =
    kind === "sales"
      ? [t("import.col.datetime"), t("import.field.order_ref"), t("common.item"), t("common.category"), t("import.col.qty"), t("import.col.price"), t("import.field.channel"), t("import.field.payment_method"), t("common.branch")]
      : [t("common.date"), t("common.description"), t("common.category"), t("common.amount"), t("common.branch")];

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-ink">{t("import.preview")}</h3>
      <div className="relative -mx-2 mt-2 overflow-x-auto">
        <table className="data-table min-w-[640px] [&_td]:whitespace-nowrap">
          <thead><tr>{headings.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {kind === "sales"
              ? (rows as SaleRow[]).map((r, i) => (
                  <tr key={i}>
                    <td>{r.sold_at.slice(0, 16).replace("T", " ")}</td>
                    <td>{r.order_ref}</td>
                    <td className="strong">{r.item_name}</td>
                    <td>{r.category}</td>
                    <td className="tabular-nums">{r.quantity}</td>
                    <td className="tabular-nums">{r.unit_price.toFixed(2)}</td>
                    <td>{labelFor(t, "channel", r.channel)}</td>
                    <td>{labelFor(t, "payment", r.payment_method)}</td>
                    <td>{branchName(r.branch_id)}</td>
                  </tr>
                ))
              : (rows as ExpenseRow[]).map((r, i) => (
                  <tr key={i}>
                    <td>{r.spent_on}</td>
                    <td className="strong">{r.description}</td>
                    <td>{labelFor(t, "expenseCat", r.category)}</td>
                    <td className="tabular-nums">{r.amount.toFixed(2)}</td>
                    <td>{branchName(r.branch_id)}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
