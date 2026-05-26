/**
 * Lightweight error reporter.
 *
 * - If `EXPO_PUBLIC_SENTRY_DSN` is set, sends events to Sentry's browser SDK
 *   via a tiny manual HTTP POST. This keeps install size small for the pilot
 *   and avoids pulling the native SDK.
 * - If no DSN is set, falls back to console output only (no-op in prod).
 *
 * For native we just `console.error`; replace with `@sentry/react-native` if
 * we ship a real native build.
 */
import { Platform } from "react-native";

import { getReleaseSha } from "@/lib/supabase/client";

type ReportContext = {
  level?: "error" | "warning" | "info";
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

let installed = false;
let warnedMissingDsn = false;

function getDsn(): string | undefined {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}

function parseDsn(dsn: string): { url: string; publicKey: string } | null {
  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\//, "");
    if (!projectId) return null;
    const url = `${parsed.protocol}//${parsed.host}/api/${projectId}/store/?sentry_key=${parsed.username}&sentry_version=7`;
    return { url, publicKey: parsed.username };
  } catch {
    return null;
  }
}

async function postSentryEvent(dsn: string, payload: Record<string, unknown>) {
  const target = parseDsn(dsn);
  if (!target) return;
  try {
    await fetch(target.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (err) {
    console.warn("[errorReporter] sentry post failed", err);
  }
}

export function reportError(error: unknown, context: ReportContext = {}): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const dsn = getDsn();
  if (!dsn) {
    if (!__DEV__) console.error("[error]", err.message, context);
    return;
  }
  const release = getReleaseSha();
  const event = {
    event_id: cryptoRandomHex(),
    timestamp: Math.floor(Date.now() / 1000),
    level: context.level ?? "error",
    platform: Platform.OS === "web" ? "javascript" : "node",
    release,
    tags: context.tags,
    extra: context.extra,
    exception: {
      values: [
        {
          type: err.name || "Error",
          value: err.message,
          stacktrace: err.stack
            ? { frames: err.stack.split("\n").slice(1).map((line) => ({ filename: line.trim() })) }
            : undefined,
        },
      ],
    },
  };
  void postSentryEvent(dsn, event);
}

export function installGlobalErrorReporter(): void {
  if (installed) return;
  installed = true;

  const dsn = getDsn();
  if (!dsn) {
    if (__DEV__ && !warnedMissingDsn) {
      console.info("[errorReporter] EXPO_PUBLIC_SENTRY_DSN not set — errors will only log to console.");
      warnedMissingDsn = true;
    }
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      reportError(event.error ?? new Error(event.message), { tags: { source: "window.onerror" } });
    });
    window.addEventListener("unhandledrejection", (event) => {
      reportError(event.reason ?? new Error("Unhandled rejection"), {
        tags: { source: "unhandledrejection" },
      });
    });
    return;
  }

  type ErrorUtilsLike = { setGlobalHandler?: (cb: (err: Error, isFatal: boolean) => void) => void };
  const errorUtils = (globalThis as unknown as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (errorUtils?.setGlobalHandler) {
    errorUtils.setGlobalHandler((err, isFatal) => {
      reportError(err, { tags: { source: "ErrorUtils", fatal: String(Boolean(isFatal)) } });
    });
  }
}

function cryptoRandomHex(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID().replace(/-/g, "");
    }
  } catch {
    /* fall through */
  }
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}
