"use client";

import { useActionState, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Field } from "@/components/form-field";
import { LogoMark } from "@/components/logo";
import { Panel } from "@/components/panel";
import { Select } from "@/components/select";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { labelFor } from "@/lib/i18n/config";
import { ROLES, type Role } from "@/lib/roles";
import type { Invite, Member } from "@/lib/team";
import { cancelInvite, changeRole, createInvite, removeMember, type InviteState } from "./actions";

export function TeamManager({
  members,
  invites,
  canManage,
  currentUserId,
  ownerEmail,
}: {
  members: Member[];
  invites: Invite[];
  canManage: boolean;
  currentUserId: string;
  ownerEmail: string | null; // only passed to the owner; others never see it
}) {
  const { t, locale } = useI18n();
  const [, startTransition] = useTransition();
  const [removing, setRemoving] = useState<Member | null>(null);
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvite, {});
  const [copied, setCopied] = useState(false);
  const roleOptions = ROLES.map((r) => ({ value: r, label: labelFor(t, "role", r) }));

  async function copy() {
    if (!state.link) return;
    await navigator.clipboard.writeText(state.link);
    setCopied(true);
  }

  return (
    <div className="rise space-y-8">
      <Panel title={t("team.members")} subtitle={t("team.count", { count: members.length + 1 })}>
        <ul className="divide-y divide-line">
          <li className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-obsidian text-moon"><LogoMark className="h-[72%] w-auto" /></span>
              <p className="truncate text-sm font-medium text-ink">{ownerEmail ?? t("role.owner")}{ownerEmail && <span className="ms-2 text-faint">{t("team.you")}</span>}</p>
            </div>
            <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">{t("role.owner")}</span>
          </li>
          {members.map((member) => {
            const self = member.user_id === currentUserId;
            return (
              <li key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <p className="min-w-0 truncate text-sm font-medium text-ink">{member.email}{self && <span className="ms-2 text-faint">{t("team.you")}</span>}</p>
                {canManage && !self ? (
                  <div className="flex items-center gap-2">
                    <Select label={t("team.role")} className="w-36" triggerClassName="field !py-1.5" value={member.role} options={roleOptions} onChange={(r) => startTransition(() => changeRole(member.user_id, r))} />
                    <button type="button" onClick={() => setRemoving(member)} className="btn btn-danger !py-1.5">{t("team.remove")}</button>
                  </div>
                ) : (
                  <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">{labelFor(t, "role", member.role)}</span>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      {canManage && (
        <>
          <Panel title={t("team.invite")} subtitle={t("team.inviteNote")}>
            <form action={action} onSubmit={() => setCopied(false)} className="flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-60">
                <Field label={t("team.role")} htmlFor="invite-role">
                  <Select id="invite-role" name="role" defaultValue="sales" options={roleOptions} />
                </Field>
              </div>
              <button type="submit" disabled={pending} className="btn btn-primary">{pending ? t("team.creating") : t("team.create")}</button>
            </form>
            {state.error && <p role="alert" className="mt-3 text-sm text-danger">{state.error}</p>}
            {state.link && (
              <div className="mt-4 rounded-2xl bg-sunken p-4">
                <p className="text-sm font-medium text-ink">{t("team.linkReady")}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 break-all text-xs text-muted">{state.link}</code>
                  <button type="button" onClick={copy} className="btn btn-outline !py-1.5">{copied ? t("team.copied") : t("team.copy")}</button>
                </div>
              </div>
            )}
          </Panel>

          {invites.length > 0 && (
            <Panel title={t("team.pending")}>
              <ul className="divide-y divide-line">
                {invites.map((invite) => (
                  <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <p className="text-sm text-ink">
                      {labelFor(t, "role", invite.role)}
                      <span className="ms-2 text-faint">{t("team.expires", { date: formatDate(invite.expires_at.slice(0, 10), true, locale) })}</span>
                    </p>
                    <form action={cancelInvite.bind(null, invite.id)}>
                      <button type="submit" className="btn btn-ghost !py-1.5">{t("team.revoke")}</button>
                    </form>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}

      <ConfirmDialog
        open={removing !== null}
        title={t("team.remove")}
        body={removing ? t("team.removeQuestion", { name: removing.email }) : ""}
        confirmLabel={t("team.remove")}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const target = removing;
          setRemoving(null);
          if (target) startTransition(() => removeMember(target.user_id));
        }}
      />
    </div>
  );
}

export type { Role };
