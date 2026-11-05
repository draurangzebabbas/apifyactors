"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CampaignStatusBadge } from "@/components/campaign-status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { fetchAdminStats, fetchAdminCampaigns } from "./actions"
import { toast } from "sonner"
import {
  UsersIcon,
  GlobeIcon,
  KeyIcon,
  CurrencyDollarIcon,
  PlayIcon,
  ArrowsClockwiseIcon,
  ArrowRightIcon,
  ShieldCheckIcon
} from "@phosphor-icons/react"

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [statsData, campData] = await Promise.all([
        fetchAdminStats(),
        fetchAdminCampaigns()
      ])
      setStats(statsData)
      setCampaigns(campData || [])
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || "Failed to load admin data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin System Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Platform-wide traffic operations, Apify key pool health, and user campaign volume.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <ArrowsClockwiseIcon className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <Link href="/admin/keys">
                <Button size="sm" className="gap-1.5">
                  <KeyIcon className="w-4 h-4" /> Manage API Keys
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Registered Users</span>
                  <UsersIcon className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold mt-2">
                  {stats?.overview?.users ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Total customer accounts</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Active Campaigns</span>
                  <PlayIcon className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold mt-2">
                  {stats?.overview?.activeCampaigns ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Out of {stats?.overview?.campaigns ?? 0} total created
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Delivered Visits</span>
                  <GlobeIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold mt-2">
                  {(stats?.overview?.visitsDelivered ?? 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Platform lifetime visits</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Apify Key Pool</span>
                  <KeyIcon className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold mt-2">
                  {stats?.overview?.keysActive ?? 0} / {stats?.overview?.keysTotal ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Active ({stats?.overview?.keysRateLimited ?? 0} cooled down)
                </div>
              </CardContent>
            </Card>
          </div>

          {/* All Platform Campaigns Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">All User Traffic Campaigns</CardTitle>
                <CardDescription>Live traffic orders across the entire platform.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading platform campaigns...</div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No campaigns created yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map(c => {
                      const pct = c.total_visits > 0
                        ? Math.min(100, Math.round(((c.visits_completed || 0) / c.total_visits) * 100))
                        : 0

                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {c.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {c.users?.email || "Unknown user"}
                          </TableCell>
                          <TableCell>
                            <CampaignStatusBadge status={c.status} className="text-xs" />
                          </TableCell>
                          <TableCell className="text-xs">
                            {c.traffic_source === "serp_google" ? "Google SERP" : "Referral"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {(c.visits_completed || 0).toLocaleString()} / {c.total_visits.toLocaleString()} ({pct}%)
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link href={`/campaigns/${c.id}`}>
                              <Button size="sm" variant="ghost" className="h-7 text-xs">
                                View <ArrowRightIcon className="w-3 h-3 ml-1" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
