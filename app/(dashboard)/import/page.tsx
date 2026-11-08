import type { Metadata } from "next";
import { Suspense } from "react";
import { Panel } from "@/components/panel";
import { ImportSkeleton } from "@/components/skeletons";
import { requireAccess } from "@/lib/auth";
import { importKinds } from "@/lib/roles";
import { getI18n } from "@/lib/i18n/server";
import { getBranches } from "@/lib/sales";
import { LIVE_DATA } from "@/lib/live-data";
import { createClient } from "@/lib/supabase/server";
import { cacheLife } from "next/cache";
import { ImportHistory, type ImportRecord } from "./import-history";
import { ImportWizard } from "./import-wizard";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.import") };
}

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<ImportSkeleton />}>
        <ImportContent />
      </Suspense>
    </div>
  );
}

async function getImports() {
  "use cache: private";
  cacheLife(LIVE_DATA);
  const supabase = await createClient();
  const { data } = await supabase
    .from("imports")
    .select("id, kind, file_name, row_count, created_at")
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<ImportRecord[]>();
  return data;
}

async function ImportContent() {
  const [{ t }, { role }, branches, imports] = await Promise.all([getI18n(), requireAccess("import"), getBranches(), getImports()]);

  return (
    <div className="rise space-y-8">
      <p className="max-w-2xl text-sm leading-relaxed text-muted">{t("import.intro")}</p>
      {branches.length === 0 ? (
        <Panel title={t("import.noBranchTitle")}>
          <p className="text-sm text-muted">{t("import.noBranchBody")}</p>
        </Panel>
      ) : (
        <ImportWizard branches={branches} kinds={importKinds(role)} />
      )}
      <Panel title={t("import.history")} subtitle={t("import.historyNote")}>
        <ImportHistory imports={imports ?? []} />
      </Panel>
    </div>
  );
}
