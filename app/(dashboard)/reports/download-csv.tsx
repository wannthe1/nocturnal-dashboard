"use client";

import { DownloadIcon } from "@/components/icons";
import { useI18n } from "@/lib/i18n/client";

// Builds a CSV file in the browser from the report's rows and downloads it.
export function DownloadCsvButton({ fileName, header, rows }: { fileName: string; header: string[]; rows: (string | number)[][] }) {
  const { t } = useI18n();

  function download() {
    // Quote every value so commas or quotes inside names can't break the file.
    const quote = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((r) => r.map(quote).join(",")).join("\r\n");
    // The invisible first character tells Excel the file is UTF-8 (needed for Thai, Burmese and Chinese).
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={download} className="btn btn-outline">
      <DownloadIcon className="h-4 w-4" />
      {t("reports.download")}
    </button>
  );
}
