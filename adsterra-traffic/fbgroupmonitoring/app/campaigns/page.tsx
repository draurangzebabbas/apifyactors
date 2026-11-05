"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { CampaignStatusBadge } from "@/components/campaign-status-badge"
import {
  GlobeIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  XCircleIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  ArrowsClockwiseIcon
} from "@phosphor-icons/react"

interface Campaign {
  id: string
  name: string
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled"
  start_urls: { url: string }[]
  total_visits: number
  visits_completed: number
  duration_hours: number
  traffic_source: string
  delivery_mode?: string
  traffic_curve?: string
  daily_shape?: string
  target_timezone?: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  running: { label: "Running", variant: "default", icon: <PlayIcon className="h-3 w-3" /> },
  completed: { label: "Completed", variant: "secondary", icon: <CheckCircleIcon className="h-3 w-3 text-emerald-500" /> },
  paused: { label: "Paused", variant: "outline", icon: <PauseIcon className="h-3 w-3 text-amber-500" /> },
  cancelled: { label: "Cancelled", variant: "destructive", icon: <XCircleIcon className="h-3 w-3" /> },
  failed: { label: "Failed", variant: "destructive", icon: <WarningCircleIcon className="h-3 w-3" /> },
  pending: { label: "Pending", variant: "outline", icon: <ClockIcon className="h-3 w-3" /> }
}

export default function CampaignsListPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

  const fetchCampaigns = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${backendUrl}/api/campaigns`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (e) {
      console.error("Failed to load campaigns", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
    const interval = setInterval(fetchCampaigns, 10000)
    return () => clearInterval(interval)
  }, [backendUrl])

  const handleAction = async (campaignId: string, action: "pause" | "resume" | "cancel") => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(`${backendUrl}/api/campaigns/${campaignId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Failed to ${action} campaign`)

      toast.success(data.message || `Campaign ${action}d`)
      fetchCampaigns()
    } catch (err: any) {
      toast.error(err.message || `Action failed`)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 space-y-6 p-6 max-w-6xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Traffic Campaigns</h1>
              <p className="text-sm text-muted-foreground">
                Monitor and manage all your active and past website traffic orders.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchCampaigns}>
                <ArrowsClockwiseIcon className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <Link href="/campaigns/new">
                <Button size="sm" className="gap-1.5">
                  <PlusIcon className="w-4 h-4" /> New Campaign
                </Button>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <Card className="text-center py-12 border-dashed">
              <CardContent className="space-y-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <GlobeIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">No traffic campaigns yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Create your first campaign to start driving organic search and referral traffic to your site.
                  </p>
                </div>
                <Link href="/campaigns/new">
                  <Button className="gap-1.5">
                    <PlusIcon className="w-4 h-4" /> Create First Campaign
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {campaigns.map(c => {
                const statusInfo = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending
                const progressPct = c.total_visits > 0
                  ? Math.min(100, Math.round(((c.visits_completed || 0) / c.total_visits) * 100))
                  : 0

                return (
                  <Card key={c.id} className="hover:border-primary/40 transition">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Title and URLs */}
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base truncate">{c.name}</h3>
                            <CampaignStatusBadge status={c.status} className="text-xs" />
                            <Badge variant="outline" className="text-xs">
                              {c.traffic_source === "serp_google" ? "Google SERP" : "Simulated Referral"}
                            </Badge>
                            {c.delivery_mode === "recurring" && (
                              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                🔁 Recurring
                              </Badge>
                            )}
                            {c.traffic_curve === "ramp_up" && (
                              <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/30">
                                🌱 SEO Ramp-Up
                              </Badge>
                            )}
                            {c.daily_shape === "business_hours" && (
                              <Badge variant="outline" className="text-xs text-blue-500 border-blue-500/30">
                                🏢 Business Hours
                              </Badge>
                            )}
                            {c.daily_shape === "evening_peak" && (
                              <Badge variant="outline" className="text-xs text-indigo-500 border-indigo-500/30">
                                🌙 Evening Peak
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground truncate">
                            {c.start_urls?.[0]?.url}
                            {c.start_urls?.length > 1 && ` (+${c.start_urls.length - 1} more)`}
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1 pt-1 max-w-md">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">
                                {(c.visits_completed || 0).toLocaleString()} / {c.total_visits.toLocaleString()} visits ({progressPct}%)
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {c.status === "running" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAction(c.id, "pause")}
                              className="text-xs gap-1"
                            >
                              <PauseIcon className="w-3.5 h-3.5" /> Pause
                            </Button>
                          )}
                          {c.status === "paused" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAction(c.id, "resume")}
                              className="text-xs gap-1"
                            >
                              <PlayIcon className="w-3.5 h-3.5" /> Resume
                            </Button>
                          )}
                          {(c.status === "running" || c.status === "paused") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAction(c.id, "cancel")}
                              className="text-xs text-destructive hover:bg-destructive/10"
                            >
                              Cancel
                            </Button>
                          )}
                          <Link href={`/campaigns/${c.id}`}>
                            <Button size="sm" variant="secondary" className="text-xs gap-1">
                              View Batches <ArrowRightIcon className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

