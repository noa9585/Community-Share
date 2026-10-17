"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { refreshRealtimeTokenAction } from "@/lib/actions/realtime";

const DEBOUNCE_MS = 250;
const POLL_MS = 8000;

/** Seconds-since-epoch expiry of a JWT, read without verifying it. */
function tokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const exp = (JSON.parse(atob(payload)) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

/**
 * Keeps the open page live. It listens to Supabase Realtime for new chat
 * messages, new notifications and changes to requests and loans, and on any of
 * them asks the server to render the page again. It never reads or writes data
 * itself: the event is only a signal, and what the user then sees is fetched
 * by the server exactly as on a normal page load.
 *
 * Without a `config` (demo mode) it falls back to refreshing every few seconds.
 */
export function RealtimeRefresher({
  userId,
  config,
}: {
  userId: string;
  config: { url: string; anonKey: string; token: string } | null;
}) {
  const router = useRouter();
  const tokenRef = useRef(config?.token ?? "");
  const url = config?.url;
  const anonKey = config?.anonKey;
  const token = config?.token;

  // Every server render hands down the current token.
  useEffect(() => {
    if (token) tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    if (url && anonKey) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [url, anonKey, router]);

  useEffect(() => {
    if (!url || !anonKey) return;

    const client = createClient(url, anonKey, {
      accessToken: async () => tokenRef.current,
    });

    let stopped = false;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => router.refresh(), DEBOUNCE_MS);
    };

    // If the live connection cannot be opened, the page still stays current
    // by asking the server every few seconds until the connection recovers.
    let poll: ReturnType<typeof setInterval> | undefined;
    const startPolling = () => {
      poll ??= setInterval(() => {
        if (document.visibilityState === "visible") router.refresh();
      }, POLL_MS);
    };
    const stopPolling = () => {
      clearInterval(poll);
      poll = undefined;
    };

    const channel = client
      .channel(`member-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        refresh,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "borrow_requests" }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "loans" }, refresh);

    // The user's token must be in place before joining: a channel joined
    // without it is treated as an anonymous visitor, and Row Level Security
    // then (correctly) lets no event through.
    void client.realtime.setAuth(tokenRef.current).then(() => {
      if (stopped) return;
      channel.subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          stopPolling();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[community-share] realtime unavailable, polling instead", status, error?.message);
          startPolling();
        }
      });
    });

    // Access tokens live for about an hour. Shortly before this one expires,
    // fetch the next one so a tab left open keeps receiving events.
    let renewal: ReturnType<typeof setTimeout> | undefined;
    const scheduleRenewal = () => {
      const expiry = tokenExpiry(tokenRef.current);
      const delay = expiry ? Math.max(expiry * 1000 - Date.now() - 60_000, 15_000) : 10 * 60_000;
      renewal = setTimeout(async () => {
        const next = await refreshRealtimeTokenAction().catch(() => null);
        if (stopped || !next) return;
        tokenRef.current = next;
        await client.realtime.setAuth(next);
        scheduleRenewal();
      }, delay);
    };
    scheduleRenewal();

    return () => {
      stopped = true;
      clearTimeout(debounce);
      clearTimeout(renewal);
      stopPolling();
      void client.removeChannel(channel);
    };
  }, [url, anonKey, userId, router]);

  return null;
}
