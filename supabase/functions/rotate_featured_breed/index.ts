import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Content-Type": "application/json",
}

function sydDate(offsetDays = 0) {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const [year, month, day] = formatter.format(now).split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays))
  return date.toISOString().slice(0, 10)
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  )

  const today = sydDate(0)
  const tomorrow = sydDate(1)

  const { error: resetError } = await supabase
    .from("featured_breeds")
    .update({ is_active: false })
    .neq("feature_date", "")

  if (resetError) {
    return new Response(JSON.stringify({ error: resetError.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }

  const { data: todayRow, error: todayError } = await supabase
    .from("featured_breeds")
    .update({ is_active: true })
    .eq("feature_date", today)
    .select("breed_id, feature_date")
    .single()

  if (todayError) {
    return new Response(JSON.stringify({ error: todayError.message, today }), {
      status: 500,
      headers: corsHeaders,
    })
  }

  const { data: tomorrowRow } = await supabase
    .from("featured_breeds")
    .select("breed_id, feature_date")
    .eq("feature_date", tomorrow)
    .maybeSingle()

  return new Response(
    JSON.stringify({
      ok: true,
      active_featured_breed: todayRow,
      next_featured_breed: tomorrowRow,
    }),
    { headers: corsHeaders },
  )
})
