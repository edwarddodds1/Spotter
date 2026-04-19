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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}))
  const lat = Number(body.lat)
  const lng = Number(body.lng)
  const radiusKm = Number(body.radiusKm ?? 10)
  const limit = Number(body.limit ?? 50)

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return new Response(JSON.stringify({ error: "lat and lng are required numbers." }), {
      status: 400,
      headers,
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  )

  const weekStart = currentWeekStartAest()

  const [{ data: scores, error: scoreError }, { data: scans, error: scanError }] = await Promise.all([
    supabase
      .from("weekly_scores")
      .select("user_id,points,week_start")
      .is("league_id", null)
      .eq("week_start", weekStart),
    supabase
      .from("scans")
      .select("user_id,location_lat,location_lng,scanned_at")
      .not("location_lat", "is", null)
      .not("location_lng", "is", null)
      .order("scanned_at", { ascending: false }),
  ])

  if (scoreError || scanError) {
    return new Response(JSON.stringify({ error: scoreError?.message ?? scanError?.message }), {
      status: 500,
      headers,
    })
  }

  const latestScanByUser = new Map<string, { location_lat: number; location_lng: number }>()
  for (const scan of scans ?? []) {
    if (!latestScanByUser.has(scan.user_id)) {
      latestScanByUser.set(scan.user_id, {
        location_lat: scan.location_lat,
        location_lng: scan.location_lng,
      })
    }
  }

  const ranked = (scores ?? [])
    .map((score) => {
      const latest = latestScanByUser.get(score.user_id)
      if (!latest) return null
      const distanceKm = haversineKm(lat, lng, latest.location_lat, latest.location_lng)
      return {
        user_id: score.user_id,
        points: score.points,
        distance_km: Number(distanceKm.toFixed(2)),
      }
    })
    .filter((entry): entry is { user_id: string; points: number; distance_km: number } => Boolean(entry))
    .filter((entry) => entry.distance_km <= radiusKm)
    .sort((a, b) => (b.points === a.points ? a.distance_km - b.distance_km : b.points - a.points))
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  const userIds = ranked.map((entry) => entry.user_id)
  const { data: users } = userIds.length
    ? await supabase.from("users").select("id,username,avatar_url").in("id", userIds)
    : { data: [] }

  return new Response(
    JSON.stringify({
      ok: true,
      week_start: weekStart,
      radius_km: radiusKm,
      leaderboard: ranked.map((entry) => ({
        ...entry,
        user: users?.find((user) => user.id === entry.user_id) ?? null,
      })),
    }),
    { headers },
  )
})
