"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * RealtimeTracker subscribes to Supabase Realtime postgres_changes on the `tickets` table.
 * Whenever an attendee is checked in or a walk-up sale is made from any device,
 * it immediately triggers Next.js server component re-fetching (`router.refresh()`).
 */
export default function RealtimeTracker() {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("organizer-dashboard-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        () => {
          routerRef.current.refresh();
        },
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn("[RealtimeTracker] status:", status, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
