"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"

export async function fetchUserUsageCost() {
  const userClient = await createClient()
  const adminClient = createAdminClient() // Used for scrape_runs to bypass RLS

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    throw new Error("Unauthorized")
  }

  // Get all groups this user actively tracks (using normal client is fine since it's their own groups)
  const { data: memberships } = await userClient
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const trackedGroupIds = (memberships || []).map((m: any) => m.group_id).filter(Boolean)
  if (trackedGroupIds.length === 0) {
    return { today: 0, week: 0, month: 0, allTime: 0 }
  }

  const now = new Date()
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const todayStr = startOfToday.toISOString().split('T')[0]
  const weekStr = startOfWeek.toISOString().split('T')[0]
  const monthStr = startOfMonth.toISOString().split('T')[0]

  // Use admin client to query raw scrape_runs, daily_scrape_cost_summary, live auto_comment_logs, and daily_comment_cost_summary
  const [
    todayScrape, weekScrape, monthScrape, allRunsScrape,
    weekSumm, monthSumm, allSumm,
    todayComments, weekComments, monthComments, allComments,
    weekCommentSumm, monthCommentSumm, allCommentSumm
  ] = await Promise.all([
    trackedGroupIds.length > 0
      ? adminClient.from('scrape_runs').select('cost_usd').in('group_id', trackedGroupIds).gte('started_at', startOfToday.toISOString())
      : Promise.resolve({ data: [] as { cost_usd: number }[] }),
    trackedGroupIds.length > 0
      ? adminClient.from('scrape_runs').select('cost_usd').in('group_id', trackedGroupIds).gte('started_at', startOfWeek.toISOString())
      : Promise.resolve({ data: [] as { cost_usd: number }[] }),
    trackedGroupIds.length > 0
      ? adminClient.from('scrape_runs').select('cost_usd').in('group_id', trackedGroupIds).gte('started_at', startOfMonth.toISOString())
      : Promise.resolve({ data: [] as { cost_usd: number }[] }),
    trackedGroupIds.length > 0
      ? adminClient.from('scrape_runs').select('cost_usd').in('group_id', trackedGroupIds)
      : Promise.resolve({ data: [] as { cost_usd: number }[] }),
    trackedGroupIds.length > 0
      ? adminClient.from('daily_scrape_cost_summary').select('total_cost_usd').in('group_id', trackedGroupIds).gte('date', weekStr)
      : Promise.resolve({ data: [] as { total_cost_usd: number }[] }),
    trackedGroupIds.length > 0
      ? adminClient.from('daily_scrape_cost_summary').select('total_cost_usd').in('group_id', trackedGroupIds).gte('date', monthStr)
      : Promise.resolve({ data: [] as { total_cost_usd: number }[] }),
    trackedGroupIds.length > 0
      ? adminClient.from('daily_scrape_cost_summary').select('total_cost_usd').in('group_id', trackedGroupIds)
      : Promise.resolve({ data: [] as { total_cost_usd: number }[] }),
    // Live comment logs (< 3 days)
    adminClient.from('auto_comment_logs').select('cost_usd').eq('user_id', user.id).gte('created_at', startOfToday.toISOString()),
    adminClient.from('auto_comment_logs').select('cost_usd').eq('user_id', user.id).gte('created_at', startOfWeek.toISOString()),
    adminClient.from('auto_comment_logs').select('cost_usd').eq('user_id', user.id).gte('created_at', startOfMonth.toISOString()),
    adminClient.from('auto_comment_logs').select('cost_usd').eq('user_id', user.id),
    // Archived comment summaries (> 3 days)
    adminClient.from('daily_comment_cost_summary').select('total_cost_usd').eq('user_id', user.id).gte('date', weekStr),
    adminClient.from('daily_comment_cost_summary').select('total_cost_usd').eq('user_id', user.id).gte('date', monthStr),
    adminClient.from('daily_comment_cost_summary').select('total_cost_usd').eq('user_id', user.id),
  ])

  const sumRuns = (rows: any[] | null) => (rows || []).reduce((acc: number, r: any) => acc + (Number(r.cost_usd) || 0), 0)
  const sumSummaries = (rows: any[] | null) => (rows || []).reduce((acc: number, r: any) => acc + (Number(r.total_cost_usd) || 0), 0)

  return {
    today: sumRuns(todayScrape.data) + sumRuns(todayComments.data),
    week: sumRuns(weekScrape.data) + sumSummaries(weekSumm.data) + sumRuns(weekComments.data) + sumSummaries(weekCommentSumm.data),
    month: sumRuns(monthScrape.data) + sumSummaries(monthSumm.data) + sumRuns(monthComments.data) + sumSummaries(monthCommentSumm.data),
    allTime: sumRuns(allRunsScrape.data) + sumSummaries(allSumm.data) + sumRuns(allComments.data) + sumSummaries(allCommentSumm.data),
  }
}
