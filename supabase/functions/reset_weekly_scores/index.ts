import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const headers = {
  "Content-Type": "application/json",
}

function currentWeekStartAest() {
  const now = new Date()
  const local = new Date(
    now.toLocaleString("en-US", {
      timeZone: "Australia/Sydney",
    }),
  )
  const day = local.getDay()
  const diff = (day + 6) % 7
  local.setDate(local.getDate() - diff)
  local.setHours(0, 0, 0, 0)
  return local.toISOString().slice(0, 10)
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  )

  const weekStart = currentWeekStartAest()
  const { data: users, error: userError } = await supabase.from("users").select("id")

  if (userError) {
    return new Response(JSON.stringify({ error: userError.message }), {
      status: 500,
      headers,
    })
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("league_members")
    .select("league_id,user_id")

  if (membershipError) {
    return new Response(JSON.stringify({ error: membershipError.message }), {
      status: 500,
      headers,
    })
  }

  const globalRows = (users ?? []).map((user) => ({
    user_id: user.id,
    league_id: null,
    points: 0,
    week_start: weekStart,
  }))

  const leagueRows = (memberships ?? []).map((membership) => ({
    user_id: membership.user_id,
    league_id: membership.league_id,
    points: 0,
    week_start: weekStart,
  }))

  const { error: globalError } = await supabase
    .from("weekly_scores")
    .upsert(globalRows, { onConflict: "user_id,league_scope_id,week_start", ignoreDuplicates: true, defaultToNull: true })

  if (globalError) {
    return new Response(JSON.stringify({ error: globalError.message }), {
      status: 500,
      headers,
    })
  }

  const { error: leagueError } = await supabase
    .from("weekly_scores")
    .upsert(leagueRows, { onConflict: "user_id,league_scope_id,week_start", ignoreDuplicates: true, defaultToNull: true })

  if (leagueError) {
    return new Response(JSON.stringify({ error: leagueError.message }), {
      status: 500,
      headers,
    })
  }

  return new Response(
    JSON.stringify({
      ok: true,
      week_start: weekStart,
      users_seeded: globalRows.length,
      league_members_seeded: leagueRows.length,
    }),
    { headers },
  )
})
