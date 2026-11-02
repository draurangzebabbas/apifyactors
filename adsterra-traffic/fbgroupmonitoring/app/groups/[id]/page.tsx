"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/client"
import { SpinnerGap, Link as LinkIcon, CheckCircleIcon, ClockIcon, WarningCircleIcon, TrendUp, Clock, XCircleIcon } from "@phosphor-icons/react"
import { ActivityHeatmap } from "@/components/activity-heatmap"

interface GroupDetail {
  id: string
  group_name: string | null
  group_url: string
  group_type: string
  status: string
  current_results_limit: number
  adaptive_state: string
}

interface GroupHealth {
  last_run_at: string | null
  last_status: string
  last_utilization_pct: number
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  ACTIVE: { label: "Active", variant: "default", icon: <CheckCircleIcon className="h-3.5 w-3.5" /> },
  SUBMITTED: { label: "Pending Approval", variant: "secondary", icon: <ClockIcon className="h-3.5 w-3.5" /> },
  REJECTED: { label: "Rejected", variant: "destructive", icon: <XCircleIcon className="h-3.5 w-3.5" /> },
  PAUSED: { label: "Paused", variant: "outline", icon: <WarningCircleIcon className="h-3.5 w-3.5 text-amber-500" /> },
  NEEDS_COOKIE: { label: "Cookie Issue", variant: "outline", icon: <WarningCircleIcon className="h-3.5 w-3.5 text-amber-500" /> },
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [userId, setUserId] = useState<string>("")
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [health, setHealth] = useState<GroupHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchGroupData() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        
        setUserId(session.user.id)

        // 1. Verify access and fetch group details
        const { data: membership, error: memErr } = await supabase
          .from("group_members")
          .select("is_active, groups(*)")
          .eq("user_id", session.user.id)
          .eq("group_id", id)
          .single()

        if (memErr || !membership?.groups) {
          throw new Error("Group not found or access denied.")
        }

        const g = Array.isArray(membership.groups) ? membership.groups[0] : membership.groups
        setGroup(g)

        // 2. Fetch scraper health for this specific group (if admin)
        // Wait, the regular user might want to see some basic stats too? The spec says:
        // "group detail page with heatmap and stats row, scraper mini-health". 
        // Our endpoint /api/analytics/scraper-health is admin-only. We need to query scrape_runs directly via Supabase.
        
        const { data: latestRun } = await supabase
          .from("scrape_runs")
          .select("status, posts_found, requested_limit, finished_at")
          .eq("group_id", id)
          .order("finished_at", { ascending: false })
          .limit(1)
          .single()

        if (latestRun) {
          const util = latestRun.requested_limit > 0 ? Math.round((latestRun.posts_found / latestRun.requested_limit) * 100) : 0
          setHealth({
            last_run_at: latestRun.finished_at,
            last_status: latestRun.status,
            last_utilization_pct: util
          })
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchGroupData()
  }, [id])

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-8 max-w-6xl mx-auto w-full">
          
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="p-4 bg-destructive/10 text-destructive rounded-full">
                <WarningCircleIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold">Failed to load group</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : group && (
            <>
              {/* Header Card */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                      {group.group_name || "Unknown Group"}
                    </h1>
                    <a href={group.group_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
                      <LinkIcon className="h-4 w-4" />
                      {group.group_url}
                    </a>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">{group.group_type}</Badge>
                    
                    {STATUS_CONFIG[group.status] && (
                      <Badge variant={STATUS_CONFIG[group.status].variant} className="inline-flex items-center gap-1">
                        {STATUS_CONFIG[group.status].icon}
                        {STATUS_CONFIG[group.status].label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                {/* Stats Row */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Scraper Engine</CardTitle>
                    <CardDescription>Adaptive Limits</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-sm text-muted-foreground">Current Limit</span>
                        <span className="font-medium text-lg">{group.current_results_limit} <span className="text-sm text-muted-foreground font-normal">posts/run</span></span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-sm text-muted-foreground">Adaptive State</span>
                        <Badge variant={group.adaptive_state === 'SATURATED' ? 'destructive' : group.adaptive_state === 'NEAR_LIMIT' || group.adaptive_state === 'COOLDOWN' ? 'secondary' : group.adaptive_state === 'INCREASING' ? 'outline' : 'default'}>
                          {group.adaptive_state}
                        </Badge>
                      </div>
                      {health && (
                        <>
                          <div className="flex justify-between items-center border-b pb-2">
                            <span className="text-sm text-muted-foreground">Last Run</span>
                            <span className="text-sm">{health.last_run_at ? new Date(health.last_run_at).toLocaleString() : 'Never'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Utilization</span>
                            <span className={`text-sm font-medium ${health.last_utilization_pct >= 90 ? 'text-destructive' : health.last_utilization_pct < 50 ? 'text-muted-foreground' : ''}`}>
                              {health.last_utilization_pct}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Heatmap Card */}
                {userId && (
                  <div className="md:col-span-2">
                    <ActivityHeatmap userId={userId} groups={[{ id: group.id, group_name: group.group_name || 'Group' }]} defaultGroupId={group.id} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
