import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * delete-account
 * ----------------
 * Permanently deletes the calling user's account and all associated data.
 * Required by App Store Review Guideline 5.1.1(v): any app that supports
 * account creation must let users initiate account deletion from within the
 * app.
 *
 * Flow:
 *  1. Verify the caller's JWT and resolve their user id (verify_jwt is also on
 *     at the platform level — this is defence in depth).
 *  2. Best-effort wipe of their Storage objects (scans + avatars).
 *  3. Delete their `public.users` row. Every owned table cascades from this
 *     (scans, friendships, notifications, badges, league_members, leagues,
 *     weekly_scores, content_reports, user_blocks); dog_profiles.owner_id and
 *     notifications.actor_user_id are SET NULL by their FKs.
 *  4. Delete the Supabase Auth user via the admin API.
 *
 * `public.users` has no FK to `auth.users`, so step 3 must run explicitly —
 * deleting only the auth user would orphan the profile + content.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRole || !anonKey) {
    return json(500, { error: "Server is missing Supabase environment configuration." });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+.+/i.test(authHeader)) {
    return json(401, { error: "Missing Authorization bearer token." });
  }

  // 1. Identify the caller from their JWT.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: "Invalid or expired session." });
  }
  const userId = userData.user.id;

  const admin = createClient(supabaseUrl, serviceRole);

  // 2. Best-effort storage cleanup. Failure here must not block account removal.
  for (const bucket of ["scans", "avatars"]) {
    try {
      const { data: objects } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
      if (objects && objects.length > 0) {
        const paths = objects.map((o) => `${userId}/${o.name}`);
        await admin.storage.from(bucket).remove(paths);
      }
    } catch (_err) {
      // Ignore — orphaned objects are harmless and can be swept later.
    }
  }

  // 3. Delete the profile row; cascades to all owned content.
  const { error: profileErr } = await admin.from("users").delete().eq("id", userId);
  if (profileErr) {
    return json(500, { error: `Failed to delete profile data: ${profileErr.message}` });
  }

  // 4. Delete the auth identity.
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) {
    return json(500, { error: `Failed to delete account: ${authErr.message}` });
  }

  return json(200, { ok: true });
});
