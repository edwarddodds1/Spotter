import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

const db = supabase as any;

export type ReportReason =
  | "spam"
  | "nudity_or_sexual"
  | "hate_or_harassment"
  | "violence_or_dangerous"
  | "other";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam or misleading",
  nudity_or_sexual: "Nudity or sexual content",
  hate_or_harassment: "Hate or harassment",
  violence_or_dangerous: "Violence or dangerous content",
  other: "Something else",
};

type Result = { ok: true } | { ok: false; message: string };

/**
 * File a content report against a scan and/or a user. `reporter_id` is set
 * from the active session so the RLS insert policy (reporter_id = auth.uid())
 * is satisfied.
 */
export async function reportContent(input: {
  reason: ReportReason;
  scanId?: string | null;
  reportedUserId?: string | null;
  details?: string | null;
}): Promise<Result> {
  if (!isSupabaseConfigured) return { ok: false, message: "Reporting is unavailable right now." };
  const { data: auth } = await supabase.auth.getUser();
  const reporterId = auth?.user?.id;
  if (!reporterId) return { ok: false, message: "You need to be signed in to report." };

  const { error } = await db.from("content_reports").insert({
    reporter_id: reporterId,
    reported_user_id: input.reportedUserId ?? null,
    scan_id: input.scanId ?? null,
    reason: input.reason,
    details: input.details ?? null,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Block another user. Idempotent — a duplicate block is treated as success. */
export async function blockUser(blockedId: string): Promise<Result> {
  if (!isSupabaseConfigured) return { ok: false, message: "Blocking is unavailable right now." };
  const { data: auth } = await supabase.auth.getUser();
  const blockerId = auth?.user?.id;
  if (!blockerId) return { ok: false, message: "You need to be signed in to block." };
  if (blockerId === blockedId) return { ok: false, message: "You can't block yourself." };

  const { error } = await db
    .from("user_blocks")
    .upsert({ blocker_id: blockerId, blocked_id: blockedId }, { onConflict: "blocker_id,blocked_id" });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function unblockUser(blockedId: string): Promise<Result> {
  if (!isSupabaseConfigured) return { ok: false, message: "Unblocking is unavailable right now." };
  const { data: auth } = await supabase.auth.getUser();
  const blockerId = auth?.user?.id;
  if (!blockerId) return { ok: false, message: "You need to be signed in." };

  const { error } = await db
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

/** Returns the set of user ids the current user has blocked. */
export async function fetchBlockedUserIds(): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const { data: auth } = await supabase.auth.getUser();
  const blockerId = auth?.user?.id;
  if (!blockerId) return [];

  const { data, error } = await db
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", blockerId);
  if (error || !data) return [];
  return (data as { blocked_id: string }[]).map((row) => row.blocked_id);
}
