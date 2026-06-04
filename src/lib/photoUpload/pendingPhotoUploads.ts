import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const STORAGE_KEY = "spotter.pending-photo-uploads.v1";

/**
 * Per-entry size guard. Photos larger than ~4MB raw won't fit comfortably in
 * the persisted queue (base64 inflates by ~33%, and localStorage caps around
 * 5–10MB *total* per origin on web). We drop the queue entry — the user can
 * always re-shoot — rather than corrupt the queue with a half-written blob.
 */
const MAX_BYTES_PER_ENTRY = 4 * 1024 * 1024;
const MAX_QUEUE_ENTRIES = 8;
const MAX_ATTEMPTS = 6;

export type PendingPhotoUpload = {
  scanId: string;
  userId: string;
  /** Image bytes encoded as base64. NOT a data: URL prefix. */
  base64: string;
  mimeType: string;
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
};

type Listener = () => void;

let cache: PendingPhotoUpload[] | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let readyPromise: Promise<void> | null = null;
const listeners = new Set<Listener>();

/**
 * Convert an `ArrayBuffer` to a base64 string in a way that works on both web
 * (no Buffer) and native (no `btoa` reliable for binary). We process in 32KB
 * chunks so `String.fromCharCode(...largeArray)` doesn't overflow the JS
 * argument list on very large photos.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)),
    );
  }
  if (typeof btoa === "function") return btoa(binary);
  // Native fallback — globalThis.btoa is polyfilled on most RN versions but
  // not all, so we do it manually.
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  for (; i + 2 < binary.length; i += 3) {
    const a = binary.charCodeAt(i);
    const b = binary.charCodeAt(i + 1);
    const c = binary.charCodeAt(i + 2);
    result +=
      ALPHA[a >> 2] +
      ALPHA[((a & 3) << 4) | (b >> 4)] +
      ALPHA[((b & 15) << 2) | (c >> 6)] +
      ALPHA[c & 63];
  }
  if (i < binary.length) {
    const a = binary.charCodeAt(i);
    const b = i + 1 < binary.length ? binary.charCodeAt(i + 1) : 0;
    result += ALPHA[a >> 2];
    result += ALPHA[((a & 3) << 4) | (b >> 4)];
    result += i + 1 < binary.length ? ALPHA[(b & 15) << 2] : "=";
    result += "=";
  }
  return result;
}

/** Convert a base64 string back into an `ArrayBuffer` for upload. */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup: Record<string, number> = {};
  for (let i = 0; i < ALPHA.length; i += 1) lookup[ALPHA[i]!] = i;
  const cleaned = base64.replace(/=+$/, "");
  const bytes = new Uint8Array((cleaned.length * 3) >> 2);
  let outIdx = 0;
  for (let i = 0; i + 3 < cleaned.length; i += 4) {
    const a = lookup[cleaned[i]!] ?? 0;
    const b = lookup[cleaned[i + 1]!] ?? 0;
    const c = lookup[cleaned[i + 2]!] ?? 0;
    const d = lookup[cleaned[i + 3]!] ?? 0;
    bytes[outIdx++] = (a << 2) | (b >> 4);
    bytes[outIdx++] = ((b & 15) << 4) | (c >> 2);
    bytes[outIdx++] = ((c & 3) << 6) | d;
  }
  return bytes.buffer;
}

async function readRaw(): Promise<PendingPhotoUpload[]> {
  try {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as PendingPhotoUpload[];
    }
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingPhotoUpload[];
  } catch (err) {
    console.warn("[pendingPhotoUploads] read failed; resetting queue:", err);
    try {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* noop */
    }
    return [];
  }
}

async function flushRaw(): Promise<void> {
  if (!cache) return;
  try {
    const serialized = JSON.stringify(cache);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, serialized);
      } catch (err) {
        // Likely QuotaExceededError. Drop the oldest entry and try again once.
        if (cache.length > 0) {
          console.warn("[pendingPhotoUploads] write quota hit; dropping oldest entry");
          cache.shift();
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
          } catch (innerErr) {
            console.warn("[pendingPhotoUploads] write retry failed:", innerErr);
          }
        } else {
          console.warn("[pendingPhotoUploads] write failed:", err);
        }
      }
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.warn("[pendingPhotoUploads] flushRaw failed:", err);
  }
}

function scheduleFlush() {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    void flushRaw();
  }, 250);
}

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (err) {
      console.warn("[pendingPhotoUploads] listener threw:", err);
    }
  }
}

/** One-time async load of the persisted queue into memory. */
export async function loadPendingPhotoUploads(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    cache = await readRaw();
    notifyListeners();
  })();
  return readyPromise;
}

/** Snapshot of pending uploads (loaded from disk on first call). */
export function listPendingPhotoUploads(): PendingPhotoUpload[] {
  if (!cache) return [];
  return [...cache];
}

/** Returns the pending entry for a given scan, or null. */
export function getPendingPhotoUpload(scanId: string): PendingPhotoUpload | null {
  if (!cache) return null;
  return cache.find((entry) => entry.scanId === scanId) ?? null;
}

/** Returns true if any entry is queued for the given scan. */
export function isPendingPhotoUpload(scanId: string): boolean {
  return getPendingPhotoUpload(scanId) !== null;
}

/** Subscribe to queue mutations (use for re-rendering pending status UI). */
export function subscribePendingPhotoUploads(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Enqueue an upload for retry. Replaces any prior entry for the same scan.
 *
 * Accepts pre-fetched bytes (caller is responsible for fetch-from-URI), so we
 * can persist the data BEFORE a `blob:` URL has a chance to expire after a
 * page reload.
 */
export async function enqueuePendingPhotoUpload(input: {
  scanId: string;
  userId: string;
  bytes: ArrayBuffer;
  mimeType: string;
}): Promise<void> {
  await loadPendingPhotoUploads();
  if (!cache) cache = [];

  if (input.bytes.byteLength > MAX_BYTES_PER_ENTRY) {
    console.warn(
      "[pendingPhotoUploads] photo too large to queue; will not retry across sessions",
      input.scanId,
      input.bytes.byteLength,
    );
    return;
  }

  const base64 = arrayBufferToBase64(input.bytes);
  const entry: PendingPhotoUpload = {
    scanId: input.scanId,
    userId: input.userId,
    base64,
    mimeType: input.mimeType || "image/jpeg",
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  cache = cache.filter((e) => e.scanId !== input.scanId);
  cache.push(entry);
  while (cache.length > MAX_QUEUE_ENTRIES) cache.shift();
  scheduleFlush();
  notifyListeners();
}

/** Mark an attempt as failed without removing the entry. */
export async function markPendingUploadAttempt(
  scanId: string,
  error: string,
): Promise<void> {
  await loadPendingPhotoUploads();
  if (!cache) return;
  let dropped = false;
  cache = cache.map((entry) => {
    if (entry.scanId !== scanId) return entry;
    const attempts = entry.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      dropped = true;
      return entry;
    }
    return {
      ...entry,
      attempts,
      lastAttemptAt: new Date().toISOString(),
      lastError: error,
    };
  });
  if (dropped) {
    cache = cache.filter((entry) => entry.scanId !== scanId);
    console.warn(
      "[pendingPhotoUploads] dropped entry after max attempts",
      scanId,
      error,
    );
  }
  scheduleFlush();
  notifyListeners();
}

/** Remove an entry (call after a successful upload). */
export async function dequeuePendingPhotoUpload(scanId: string): Promise<void> {
  await loadPendingPhotoUploads();
  if (!cache) return;
  const next = cache.filter((entry) => entry.scanId !== scanId);
  if (next.length === cache.length) return;
  cache = next;
  scheduleFlush();
  notifyListeners();
}

/** Drop every pending entry. Used by the error-boundary reset flow. */
export async function clearAllPendingPhotoUploads(): Promise<void> {
  cache = [];
  scheduleFlush();
  notifyListeners();
}
