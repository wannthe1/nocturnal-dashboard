"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FileIcon } from "@/components/icons";
import { formatDateTime, formatNumber } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { deleteImport } from "./actions";

export type ImportRecord = { id: string; kind: string; file_name: string; row_count: number; created_at: string };

// The list of past imports. "Undo" removes the row from the list immediately;
// the server deletes it in the background, and if that fails the page refresh
// puts the row back.
export function ImportHistory({ imports }: { imports: ImportRecord[] }) {
  const { t, locale } = useI18n();
  const [shown, removeShown] = useOptimistic(imports, (list, id: string) => list.filter((i) => i.id !== id));
  const [, startTransition] = useTransition();
  const [asking, setAsking] = useState<ImportRecord | null>(null);

  function undo(imp: ImportRecord) {
    setAsking(null);
    startTransition(async () => {
      removeShown(imp.id);
      await deleteImport(imp.id);
    });
  }

  return (
    <>
      {shown.length === 0 ? (
        <p className="text-sm text-faint">{t("import.nothing")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((imp) => (
            <li key={imp.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text"><FileIcon /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{imp.file_name}</p>
                  <p className="text-xs text-faint">
                    {imp.kind === "sales" ? t("nav.sales") : t("nav.expenses")} · {t("import.rows", { count: formatNumber(imp.row_count) })} · {formatDateTime(imp.created_at, locale)} UTC
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setAsking(imp)} className="btn btn-danger">{t("import.undo")}</button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={asking !== null}
        title={t("import.undo")}
        body={asking ? t("import.undoQuestion", { name: asking.file_name, count: formatNumber(asking.row_count) }) : ""}
        confirmLabel={t("import.undo")}
        onCancel={() => setAsking(null)}
        onConfirm={() => asking && undo(asking)}
      />
    </>
  );
}
