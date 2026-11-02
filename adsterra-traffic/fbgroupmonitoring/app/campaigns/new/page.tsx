"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
  GlobeIcon,
  PlusIcon,
  TrashIcon,
  CoinsIcon,
  LightningIcon,
  ShieldCheckIcon,
  InfoIcon,
  ClockIcon,
  ArrowsClockwiseIcon
} from "@phosphor-icons/react"
import Link from "next/link"

export default function NewCampaignPage() {
  const router = useRouter()
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

  // Form State
  const [name, setName] = useState("")
  const [urls, setUrls] = useState<string[]>(["https://"])
  const [totalVisits, setTotalVisits] = useState(100)
  const [durationHours, setDurationHours] = useState(1)
  const [trafficSource, setTrafficSource] = useState<string>("simulated_referral")
  const [referrerPreset, setReferrerPreset] = useState("preset_search")
  const [deviceType, setDeviceType] = useState("random")
  const [scrollBehavior, setScrollBehavior] = useState("human-random")
  
  // SERP Options
  const [serpQuery, setSerpQuery] = useState("")
  const [proxyUrlsText, setProxyUrlsText] = useState("")
  
  // Engagement
  const [dwellMin, setDwellMin] = useState(15)
  const [dwellMax, setDwellMax] = useState(45)
  const [enableInternal, setEnableInternal] = useState(true)
  const [maxInternalPages, setMaxInternalPages] = useState(2)

  // Fetch balance directly from Supabase
  useEffect(() => {
    async function loadBalance() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data: credData } = await supabase
          .from('traffic_credits')
          .select('balance')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (credData?.balance !== undefined) {
          setBalance(credData.balance)
        }
      } catch (e) {
        console.error("Failed to load credits", e)
      }
    }
    loadBalance()
  }, [])

  // Helpers
  const addUrlRow = () => setUrls([...urls, "https://"])
  const updateUrl = (idx: number, val: string) => {
    const next = [...urls]
    next[idx] = val
    setUrls(next)
  }
  const removeUrl = (idx: number) => {
    if (urls.length <= 1) return
    setUrls(urls.filter((_, i) => i !== idx))
  }

  // Calculations
  const visitsCost = totalVisits
  const numBatches = Math.ceil(totalVisits / 100)
  const visitsPerHour = Math.round(totalVisits / durationHours)
  const hasEnoughCredits = balance !== null && balance >= visitsCost

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("Please enter a campaign name")
      return
    }

    const validUrls = urls.map(u => u.trim()).filter(u => u && /^https?:\/\//i.test(u))
    if (validUrls.length === 0) {
      toast.error("Please provide at least one valid HTTP/HTTPS URL")
      return
    }

    const proxyList = proxyUrlsText
      .split("\n")
      .map(p => p.trim())
      .filter(p => p.length > 0)

    if (trafficSource === "serp_google" && proxyList.length === 0) {
      toast.error("Google SERP mode requires at least one residential proxy URL")
      return
    }

    if (!hasEnoughCredits) {
      toast.error("Insufficient credit balance. Please top up your credits.")
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error("Not authenticated")
        return
      }

      const payload = {
        name: name.trim(),
        start_urls: validUrls.map(u => ({ url: u })),
        total_visits: totalVisits,
        duration_hours: durationHours,
        traffic_source: trafficSource,
        referrer_source: referrerPreset,
        device_type: deviceType,
        scroll_behavior: scrollBehavior,
        serp_custom_query: serpQuery.trim(),
        serp_fallback_to_direct: true,
        user_proxy_urls: proxyList,
        dwell_time_min_seconds: dwellMin,
        dwell_time_max_seconds: dwellMax,
        enable_internal_navigation: enableInternal,
        max_internal_pages: maxInternalPages
      }

      const res = await fetch(`${backendUrl}/api/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to create campaign")
      }

      toast.success(`Campaign "${data.campaign.name}" created! ${numBatches} batches scheduled.`)
      router.push(`/campaigns/${data.campaign.id}`)
    } catch (err: any) {
      toast.error(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <div className="flex-1 space-y-6 p-6 max-w-5xl mx-auto w-full">
          {/* Header & Balance */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create Traffic Campaign</h1>
              <p className="text-sm text-muted-foreground">
                Deploy real browser visits, organic search clicks, or high-intent referrals to your website.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg text-sm font-semibold">
                <CoinsIcon className="w-4 h-4" />
                <span>{balance.toLocaleString()} Credits Available</span>
              </div>
              <Link href="/billing">
                <Button size="sm" variant="outline">
                  Buy Credits
                </Button>
              </Link>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Campaign Basics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GlobeIcon className="w-5 h-5 text-primary" />
                  1. Target Information
                </CardTitle>
                <CardDescription>
                  Define the campaign label and the destination web pages you want to send traffic to.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="camp-name">Campaign Name</Label>
                  <Input
                    id="camp-name"
                    placeholder="e.g. Daily Dog Guide - Puppy Schedule Organic Boost"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Target URLs ({urls.length})</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addUrlRow} className="text-xs h-7 gap-1">
                      <PlusIcon className="w-3.5 h-3.5" /> Add Another URL
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {urls.map((u, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          placeholder="https://example.com/page-to-visit"
                          value={u}
                          onChange={e => updateUrl(idx, e.target.value)}
                          required
                        />
                        {urls.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeUrl(idx)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Visits will be distributed round-robin evenly across all provided target URLs.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Volume & Duration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-primary" />
                  2. Traffic Volume & Delivery Schedule
                </CardTitle>
                <CardDescription>
                  Choose how many visits to deliver and over how many hours to spread them.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visits">Total Visits Target</Label>
                    <Input
                      id="visits"
                      type="number"
                      min={10}
                      step={50}
                      value={totalVisits}
                      onChange={e => setTotalVisits(Math.max(10, parseInt(e.target.value, 10) || 10))}
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[100, 250, 500, 1000, 2500, 5000].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setTotalVisits(v)}
                          className={`text-xs px-2.5 py-1 rounded-md border transition ${
                            totalVisits === v ? "bg-primary text-primary-foreground border-primary" : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {v.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Delivery Duration (Hours)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      max={168}
                      value={durationHours}
                      onChange={e => setDurationHours(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    />
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[1, 3, 6, 12, 24, 48].map(h => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setDurationHours(h)}
                          className={`text-xs px-2.5 py-1 rounded-md border transition ${
                            durationHours === h ? "bg-primary text-primary-foreground border-primary" : "bg-muted hover:bg-muted/80"
                          }`}
                        >
                          {h}h
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Batching & Scheduling Summary Pill */}
                <div className="bg-muted/60 border rounded-lg p-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Automated Batch Distribution
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Total Batches</div>
                      <div className="font-semibold text-foreground">{numBatches} batches (max 100/batch)</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Delivery Rate</div>
                      <div className="font-semibold text-foreground">~{visitsPerHour} visits / hr</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Credit Cost</div>
                      <div className="font-semibold text-primary">{visitsCost.toLocaleString()} credits</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Balance After</div>
                      <div className={`font-semibold ${hasEnoughCredits ? "text-emerald-600" : "text-destructive"}`}>
                        {(balance - visitsCost).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Traffic Source & Channels */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LightningIcon className="w-5 h-5 text-primary" />
                  3. Traffic Source & Routing
                </CardTitle>
                <CardDescription>
                  Configure where visitors appear to arrive from (Google search, referrals, or direct).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Traffic Channel</Label>
                  <Select value={trafficSource} onValueChange={(val) => setTrafficSource(val || "simulated_referral")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simulated_referral">
                        Simulated Referral (Search Engines & Social Referrers)
                      </SelectItem>
                      <SelectItem value="serp_google">
                        Google Search (SERP) — Real Keyword Search & Organic Click
                      </SelectItem>
                      <SelectItem value="direct">
                        Direct Navigation (Type URL in browser)
                      </SelectItem>
                      <SelectItem value="social">
                        Social Networks (X, Facebook, Reddit, Pinterest)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {trafficSource === "simulated_referral" && (
                  <div className="space-y-2">
                    <Label>Referrer Profile</Label>
                    <Select value={referrerPreset} onValueChange={(val) => setReferrerPreset(val || "preset_search")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preset_search">
                          Search Engines (Google, Bing, Yahoo, DuckDuckGo)
                        </SelectItem>
                        <SelectItem value="preset_social">
                          Social Networks (X, Facebook, Reddit, LinkedIn)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {trafficSource === "serp_google" && (
                  <div className="space-y-4 border rounded-lg p-4 bg-muted/40">
                    <div className="space-y-2">
                      <Label htmlFor="serp-query">Custom Search Query (Optional)</Label>
                      <Input
                        id="serp-query"
                        placeholder="e.g. site:https://dailydogguide.com/puppy-training-schedule/ (leaves blank for auto-detected query)"
                        value={serpQuery}
                        onChange={e => setSerpQuery(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        If omitted, the actor generates exact <code>site:https://...</code> targeted searches.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="proxy-urls">
                        Your Residential Proxies <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="proxy-urls"
                        rows={3}
                        placeholder="http://customer-resi_user:password@pr.oxylabs.io:7777&#10;http://customer-resi_user2:password@pr.oxylabs.io:7777"
                        value={proxyUrlsText}
                        onChange={e => setProxyUrlsText(e.target.value)}
                        required
                      />
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        ⚠️ Google BotGuard blocks Datacenter IPs. Please paste your residential proxy credentials (one per line). Protocol must be <code>http://</code>.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4. Device & Engagement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-primary" />
                  4. Visitor Devices & Engagement
                </CardTitle>
                <CardDescription>
                  Tune human dwell times and internal page exploration to maximize analytics retention.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Device Type</Label>
                    <Select value={deviceType} onValueChange={(val) => setDeviceType(val || "random")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="random">Random Mix (Desktop & Mobile)</SelectItem>
                        <SelectItem value="desktop">Desktop Only (Chrome, Firefox, Safari)</SelectItem>
                        <SelectItem value="mobile">Mobile Only (iOS Safari, Android Chrome)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Scroll Behavior</Label>
                    <Select value={scrollBehavior} onValueChange={(val) => setScrollBehavior(val || "human-random")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="human-random">Human-Random (Natural speed variation)</SelectItem>
                        <SelectItem value="linear">Linear Smooth Scrolling</SelectItem>
                        <SelectItem value="quick-scan">Quick Scan (Fast skim)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label>Dwell Time Min (Seconds)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={300}
                      value={dwellMin}
                      onChange={e => setDwellMin(parseInt(e.target.value, 10) || 15)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dwell Time Max (Seconds)</Label>
                    <Input
                      type="number"
                      min={dwellMin}
                      max={600}
                      value={dwellMax}
                      onChange={e => setDwellMax(parseInt(e.target.value, 10) || 45)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Internal Page Navigation</Label>
                    <p className="text-xs text-muted-foreground">
                      Visitors will click internal links on your website to reduce bounce rate.
                    </p>
                  </div>
                  <Switch
                    checked={enableInternal}
                    onCheckedChange={setEnableInternal}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-6">
                <div>
                  {!hasEnoughCredits && balance !== null && (
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ You need {visitsCost - balance} more credits to launch this campaign.
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading || !hasEnoughCredits}
                  className="w-full sm:w-auto min-w-[200px]"
                >
                  {loading ? (
                    <>
                      <ArrowsClockwiseIcon className="w-4 h-4 mr-2 animate-spin" />
                      Scheduling Batches...
                    </>
                  ) : (
                    `Launch Campaign (${visitsCost.toLocaleString()} Credits)`
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

