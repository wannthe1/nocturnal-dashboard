"use client";

import { startTransition, useEffect } from "react";
import { refreshPages } from "./live-actions";

// Listens for changes to the team while the dashboard is open, so a new role or a
// removal applies straight away, without the person refreshing the page. Supabase
// only sends each person the changes they're allowed to see.
export function LiveUpdates({ userId, watchesTeam }: { userId: string; watchesTeam: boolean }) {
  useEffect(() => {
    let stopped = false;
    let stop = () => {};
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Changes that arrive together only need one refresh.
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => startTransition(() => void refreshPages().catch(() => {})), 150);
    };

    async function listen() {
      // Loaded here so it doesn't slow down opening the page.
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (stopped || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      if (stopped) return;

      let connectedBefore = false;
      const channel = supabase
        .channel(`team-access-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, (change) => {
          // Removals reach everyone with only the person's id, so check it's relevant.
          if (change.eventType === "DELETE" && change.old.user_id !== userId && !watchesTeam) return;
          refresh();
        })
        .subscribe((status) => {
          if (status !== "SUBSCRIBED") return;
          // Back online after sleep or a dropped connection: catch up on anything missed.
          if (connectedBefore) refresh();
          connectedBefore = true;
        });
      stop = () => void supabase.removeChannel(channel);
    }

    void listen().catch(() => {});
    return () => {
      stopped = true;
      clearTimeout(timer);
      stop();
    };
  }, [userId, watchesTeam]);

  return null;
}
