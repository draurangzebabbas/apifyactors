"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CampaignStatusBadge } from "@/components/campaign-status-badge"
import { createClient } from "@/utils/supabase/client"
import {
  GlobeIcon,
  PlusIcon,
  CoinsIcon,
  PlayIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  ChartLineUpIcon
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

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Read credits directly from Supabase
      const { data: credData } = await supabase
        .from('traffic_credits')
        .select('balance')
        .eq('user_id', session.user.id)
        .maybeSingle()

      setBalance(credData?.balance ?? 0)

      // Read campaigns directly from Supabase
      const { data: campData } = await supabase
        .from('traffic_campaigns')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (campData) {
        setCampaigns(campData)
      }
    } catch (e) {
      console.error("Dashboard fetch error", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const activeCampaigns = campaigns.filter(c => c.status === "running")
  const completedCampaigns = campaigns.filter(c => c.status === "completed")
  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.visits_completed || 0), 0)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 space-y-6 p-6 max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Overview Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                High-intent website traffic automation, Google SERP navigation, and credit metrics.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <ArrowsClockwiseIcon className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <Link href="/campaigns/new">
                <Button size="sm" className="gap-1.5">
                  <PlusIcon className="w-4 h-4" /> New Campaign
                </Button>
              </Link>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Active Campaigns</span>
                  <PlayIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold mt-2">{activeCampaigns.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Currently running</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Total Delivered</span>
                  <ChartLineUpIcon className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold mt-2">{totalDelivered.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Website visits executed</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Credits Balance</span>
                  <CoinsIcon className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold mt-2">
                  {loading ? "..." : balance.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  <Link href="/billing" className="text-primary hover:underline">Top up credits &rarr;</Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Completed</span>
                  <CheckCircleIcon className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-2xl font-bold mt-2">{completedCampaigns.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Finished campaigns</div>
              </CardContent>
            </Card>
          </div>

          {/* Active / Recent Campaigns */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Recent Campaigns</h2>
              <Link href="/campaigns" className="text-xs text-primary hover:underline">
                View all campaigns &rarr;
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading dashboard...</div>
            ) : campaigns.length === 0 ? (
              <Card className="text-center py-12 border-dashed">
                <CardContent className="space-y-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                    <GlobeIcon className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-base">No traffic orders yet</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Start driving organic search clicks and high-intent traffic to your URLs in minutes.
                    </p>
                  </div>
                  <Link href="/campaigns/new">
                    <Button size="sm" className="gap-1">
                      <PlusIcon className="w-4 h-4" /> Start Your First Campaign
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {campaigns.slice(0, 5).map(c => {
                  const progressPct = c.total_visits > 0
                    ? Math.min(100, Math.round(((c.visits_completed || 0) / c.total_visits) * 100))
                    : 0

                  return (
                    <Card key={c.id} className="hover:border-primary/40 transition">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm truncate">{c.name}</span>
                            <CampaignStatusBadge status={c.status} className="text-[10px]" />
                            {c.delivery_mode === "recurring" && (
                              <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                🔁 Recurring
                              </Badge>
                            )}
                            {c.traffic_curve === "ramp_up" && (
                              <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                                🌱 SEO Ramp-Up
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {c.start_urls?.[0]?.url}
                          </div>
                          <div className="flex items-center gap-2 pt-1 max-w-xs">
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progressPct}%` }} />
                            </div>
                            <span className="text-[11px] text-muted-foreground shrink-0">{progressPct}%</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link href={`/campaigns/${c.id}`}>
                            <Button size="sm" variant="outline" className="text-xs gap-1">
                              Details <ArrowRightIcon className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
