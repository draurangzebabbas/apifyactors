"use server"

import { createAdminClient } from "@/utils/supabase/admin"
import { createClient } from "@/utils/supabase/server"

export async function fetchAdminStats() {
  const supabase = createAdminClient()
  const userClient = await createClient()

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  const { data: adminCheck } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminCheck) {
    throw new Error("Unauthorized")
  }

  const [
    { count: usersCount },
    { count: campaignsCount },
    { data: activeCampaignsData },
    { data: visitsData },
    { data: keysData },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('traffic_campaigns').select('*', { count: 'exact', head: true }),
    supabase.from('traffic_campaigns').select('id').eq('status', 'running'),
    supabase.from('traffic_campaigns').select('visits_completed'),
    supabase.from('api_keys').select('id, status, usage_usd, limit_usd'),
  ])

  const keysArr = (keysData as any[]) || []
  const keysActive = keysArr.filter(k => k.status === 'ACTIVE' || k.status === 'Active').length
  const keysFailed = keysArr.filter(k => k.status === 'FAILED' || k.status === 'Token Invalid').length
  const keysRateLimited = keysArr.filter(k => k.status === 'RATE_LIMITED' || k.status === 'Quota Exhausted').length

  const totalDelivered = (visitsData || []).reduce((acc: number, r: any) => acc + (Number(r.visits_completed) || 0), 0)
  const totalApifySpend = keysArr.reduce((acc: number, k: any) => acc + (Number(k.usage_usd) || 0), 0)

  return {
    overview: {
      users: usersCount || 0,
      campaigns: campaignsCount || 0,
      activeCampaigns: activeCampaignsData?.length || 0,
      visitsDelivered: totalDelivered,
      keysTotal: keysArr.length,
      keysActive,
      keysFailed,
      keysRateLimited,
    },
    cost: {
      today: totalApifySpend * 0.1, // estimated
      week: totalApifySpend * 0.4,
      month: totalApifySpend * 0.8,
      allTime: totalApifySpend,
    }
  }
}

export async function fetchAdminCampaigns() {
  const supabase = createAdminClient()
  const userClient = await createClient()

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) throw new Error("Unauthorized")

  const { data: adminCheck } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminCheck) throw new Error("Unauthorized")

  const { data: campaigns, error: campErr } = await supabase
    .from('traffic_campaigns')
    .select('*, users(email, full_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (campErr) throw new Error(campErr.message)
  return campaigns || []
}
