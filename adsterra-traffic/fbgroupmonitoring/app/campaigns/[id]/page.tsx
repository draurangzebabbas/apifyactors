"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
  GlobeIcon,
  PlayIcon,
  PauseIcon,
  XCircleIcon,
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  ArrowsClockwiseIcon,
  ArrowSquareOutIcon
} from "@phosphor-icons/react"

interface Batch {
  id: string
  batch_number: number
  status: "pending" | "running" | "completed" | "failed" | "skipped"
  apify_run_id: string | null
  visits_target: number
  visits_completed: number
  scheduled_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
}

interface Campaign {
  id: string
  name: string
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled"
  start_urls: { url: string }[]
  total_visits: number
  visits_completed: number
  duration_hours: number
  visits_per_batch: number
  traffic_source: string
  delivery_mode?: string
  traffic_curve?: string
  daily_shape?: string
  target_timezone?: string
  humanize_jitter?: boolean
  recurring_interval_hours?: number
  device_type: string
  dwell_time_min_seconds: number
  dwell_time_max_seconds: number
  created_at: string
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

  const fetchCampaign = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${backendUrl}/api/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCampaign(data.campaign)
        setBatches(data.batches || [])
      } else {
        toast.error("Failed to load campaign")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaign()

    // Smart polling: only poll while active batches or campaign is running
    // Polling interval is relaxed to 15s to save browser & server resources.
    // If campaign is finished/paused/cancelled, no interval runs at all.
    const interval = setInterval(() => {
      setCampaign(current => {
        if (current && (current.status === "running" || current.status === "pending")) {
          fetchCampaign()
        }
        return current
      })
    }, 15000)

    return () => clearInterval(interval)
  }, [campaignId, backendUrl])

  const handleAction = async (action: "pause" | "resume" | "cancel") => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${backendUrl}/api/campaigns/${campaignId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${action}`)

      toast.success(data.message || `Campaign ${action}d`)
      fetchCampaign()
    } catch (err: any) {
      toast.error(err.message || "Action failed")
    }
  }

  if (loading && !campaign) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="p-8 text-center text-muted-foreground">Loading campaign details...</div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (!campaign) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="p-8 text-center space-y-4">
            <h2 className="text-xl font-bold">Campaign Not Found</h2>
            <Link href="/campaigns">
              <Button variant="outline">
                <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back to Campaigns
              </Button>
            </Link>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const progressPct = campaign.total_visits > 0
    ? Math.min(100, Math.round(((campaign.visits_completed || 0) / campaign.total_visits) * 100))
    : 0

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 space-y-6 p-6 max-w-6xl mx-auto w-full">
          {/* Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-3">
              <Link href="/campaigns">
                <Button variant="ghost" size="icon">
                  <ArrowLeftIcon className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight">{campaign.name}</h1>
                  <Badge variant={campaign.status === "running" ? "default" : "secondary"}>
                    {campaign.status}
                  </Badge>
                  {campaign.delivery_mode === "recurring" && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                      🔁 Recurring
                    </Badge>
                  )}
                  {campaign.traffic_curve === "ramp_up" && (
                    <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                      🌱 SEO Ramp-Up
                    </Badge>
                  )}
                  {campaign.daily_shape === "business_hours" && (
                    <Badge variant="outline" className="text-xs text-blue-500 border-blue-500/30">
                      🏢 Business Hours
                    </Badge>
                  )}
                  {campaign.daily_shape === "evening_peak" && (
                    <Badge variant="outline" className="text-xs text-indigo-500 border-indigo-500/30">
                      🌙 Evening Peak
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(campaign.created_at).toLocaleString()} • Duration: {campaign.duration_hours}h
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchCampaign}>
                <ArrowsClockwiseIcon className="w-4 h-4 mr-1" /> Refresh
              </Button>
              {campaign.status === "running" && (
                <Button variant="outline" size="sm" onClick={() => handleAction("pause")}>
                  <PauseIcon className="w-4 h-4 mr-1" /> Pause
                </Button>
              )}
              {campaign.status === "paused" && (
                <Button variant="outline" size="sm" onClick={() => handleAction("resume")}>
                  <PlayIcon className="w-4 h-4 mr-1" /> Resume
                </Button>
              )}
              {(campaign.status === "running" || campaign.status === "paused") && (
                <Button variant="destructive" size="sm" onClick={() => handleAction("cancel")}>
                  <XCircleIcon className="w-4 h-4 mr-1" /> Cancel Campaign
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar Header Card */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <span>Overall Delivery Progress</span>
                    <span className="text-primary font-bold">{progressPct}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(campaign.visits_completed || 0).toLocaleString()} of {campaign.total_visits.toLocaleString()} visits successfully delivered
                    {campaign.delivery_mode === "recurring" && " (Current Cycle)"}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground sm:text-right">
                  {campaign.delivery_mode === "recurring" ? (
                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                      🔁 Auto-renews every {campaign.recurring_interval_hours || campaign.duration_hours}h
                    </span>
                  ) : (
                    <span>Single-cycle target completion</span>
                  )}
                </div>
              </div>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Total Target</div>
                <div className="text-2xl font-bold mt-1">{campaign.total_visits.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Visits requested</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Completed</div>
                <div className="text-2xl font-bold text-primary mt-1">
                  {(campaign.visits_completed || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{progressPct}% completed</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Total Batches</div>
                <div className="text-2xl font-bold mt-1">{batches.length}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {batches.filter(b => b.status === "completed").length} finished
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Traffic Channel</div>
                <div className="text-lg font-bold mt-1 capitalize">
                  {campaign.traffic_source === "serp_google" ? "Google SERP" : campaign.traffic_source === "direct" ? "Direct" : campaign.traffic_source === "backlink" ? "Backlink" : "Referral"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {campaign.dwell_time_min_seconds}s - {campaign.dwell_time_max_seconds}s dwell
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Target URLs */}
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Target URLs ({campaign.start_urls?.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm font-mono pb-4">
              {campaign.start_urls?.map((u, i) => (
                <div key={i} className="text-muted-foreground truncate hover:text-foreground">
                  • <a href={u.url} target="_blank" rel="noreferrer" className="underline">{u.url}</a>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Batch Timeline Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery Batches & Schedule</CardTitle>
              <CardDescription>
                Each batch safely delivers visits across rotating residential networks and browser profiles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Target Visits</TableHead>
                    <TableHead>Delivered</TableHead>
                    <TableHead>Scheduled Time</TableHead>
                    <TableHead>Execution Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-semibold">Batch #{b.batch_number}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            b.status === "completed"
                              ? "secondary"
                              : b.status === "running"
                              ? "default"
                              : b.status === "failed"
                              ? "destructive"
                              : "outline"
                          }
                          className="capitalize"
                        >
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{b.visits_target}</TableCell>
                      <TableCell className="font-medium">{b.visits_completed || 0}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(b.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        {b.apify_run_id ? (
                          <span className="font-mono text-xs text-muted-foreground">
                            {b.apify_run_id.slice(0, 10)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

