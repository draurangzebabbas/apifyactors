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
  const [trafficSource, setTrafficSource] = useState<string>("referrer")
  const [referrerPreset, setReferrerPreset] = useState("preset_search")
  const [deviceType, setDeviceType] = useState("random")
  const [scrollBehavior, setScrollBehavior] = useState("human-random")
  
  // SERP Options
  const [serpQuery, setSerpQuery] = useState("")
  const [serpFallbackToDirect, setSerpFallbackToDirect] = useState(true)
  const [proxyUrlsText, setProxyUrlsText] = useState("")

  // Delivery Curve, Mode & Shape
  const [deliveryMode, setDeliveryMode] = useState<string>("one_time") // "one_time" | "recurring"
  const [trafficCurve, setTrafficCurve] = useState<string>("steady")   // "steady" | "ramp_up"
  const [dailyShape, setDailyShape] = useState<string>("uniform_24h")  // "uniform_24h" | "business_hours" | "evening_peak" | "global_mix"
  const [targetTimezone, setTargetTimezone] = useState<string>("America/New_York")
  const [humanizeJitter, setHumanizeJitter] = useState<boolean>(true)
  const [activePreset, setActivePreset] = useState<string | null>(null) // tracks selected quick-setup preset

  // Structured Proxy Vault state
  interface StoredProxy {
    id: string
    name: string
    host: string
    port: number
    username: string
    password: string
    connectionType: string
    url: string
  }
  const [savedProxies, setSavedProxies] = useState<StoredProxy[]>([])
  const [selectedProxyIds, setSelectedProxyIds] = useState<string[]>([])
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [showAddProxy, setShowAddProxy] = useState(false)
  const [proxyName, setProxyName] = useState("")
  const [proxyHost, setProxyHost] = useState("")
  const [proxyPort, setProxyPort] = useState("7777")
  const [proxyUser, setProxyUser] = useState("")
  const [proxyPass, setProxyPass] = useState("")
  const [proxyConnType, setProxyConnType] = useState("http")

  // Load saved proxies from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tf_user_proxies")
      if (raw) {
        const parsed: StoredProxy[] = JSON.parse(raw)
        setSavedProxies(parsed)
        if (parsed.length > 0) {
          setSelectedProxyIds([parsed[0].id])
        }
      }
    } catch (e) {
      console.warn("Failed to read proxies from storage", e)
    }
  }, [])

  // Sync selected proxies to proxyUrlsText
  useEffect(() => {
    if (savedProxies.length > 0) {
      const activeUrls = savedProxies
        .filter(p => selectedProxyIds.includes(p.id))
        .map(p => p.url)
      setProxyUrlsText(activeUrls.join("\n"))
    } else {
      setProxyUrlsText("")
    }
  }, [selectedProxyIds, savedProxies])

  const handleSaveProxy = (e: React.FormEvent) => {
    e.preventDefault()
    if (!proxyHost.trim()) {
      toast.error("Host is required (e.g. pr.oxylabs.io)")
      return
    }
    if (!proxyUser.trim() || !proxyPass.trim()) {
      toast.error("Username and Password are required")
      return
    }
    const cleanPort = parseInt(proxyPort, 10) || 7777

    // Auto-normalize sticky session duration to 1 minute silently (sesstime-1)
    // Long session times (e.g. sesstime-10, sesstime-30) cause Google to detect repeated searches
    // from the same IP within a short window and trigger aggressive CAPTCHA blocks.
    let cleanUser = proxyUser.trim()
    if (/sesstime-\d+/i.test(cleanUser)) {
      cleanUser = cleanUser.replace(/sesstime-\d+/gi, "sesstime-1")
    }

    const constructedUrl = `${proxyConnType}://${cleanUser}:${proxyPass.trim()}@${proxyHost.trim()}:${cleanPort}`

    const newProxy: StoredProxy = {
      id: "proxy_" + Date.now(),
      name: proxyName.trim() || `Proxy ${savedProxies.length + 1} (${proxyHost.trim()})`,
      host: proxyHost.trim(),
      port: cleanPort,
      username: cleanUser,
      password: proxyPass.trim(),
      connectionType: proxyConnType,
      url: constructedUrl
    }

    const updated = [...savedProxies, newProxy]
    setSavedProxies(updated)
    setSelectedProxyIds(prev => [...prev, newProxy.id])
    localStorage.setItem("tf_user_proxies", JSON.stringify(updated))
    toast.success(`Proxy "${newProxy.name}" saved!`)

    // Reset form
    setProxyName("")
    setProxyHost("")
    setProxyPort("7777")
    setProxyUser("")
    setProxyPass("")
    setShowAddProxy(false)
  }

  const handleDeleteProxy = (id: string) => {
    const updated = savedProxies.filter(p => p.id !== id)
    setSavedProxies(updated)
    setSelectedProxyIds(prev => prev.filter(pId => pId !== id))
    localStorage.setItem("tf_user_proxies", JSON.stringify(updated))
    toast.success("Proxy removed from your saved vault")
  }

  const toggleSelectProxy = (id: string) => {
    setSelectedProxyIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    )
  }
  
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
        serp_fallback_to_direct: serpFallbackToDirect,
        user_proxy_urls: proxyList,
        dwell_time_min_seconds: dwellMin,
        dwell_time_max_seconds: dwellMax,
        enable_internal_navigation: enableInternal,
        max_internal_pages: maxInternalPages,
        delivery_mode: deliveryMode,
        traffic_curve: trafficCurve,
        daily_shape: dailyShape,
        target_timezone: targetTimezone,
        humanize_jitter: humanizeJitter,
        recurring_interval_hours: durationHours
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
                    <div className="flex items-center gap-1.5">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowBulkAdd(v => !v)} className="text-xs h-7 gap-1">
                        <PlusIcon className="w-3.5 h-3.5" /> Add Bulk
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={addUrlRow} className="text-xs h-7 gap-1">
                        <PlusIcon className="w-3.5 h-3.5" /> Add Another URL
                      </Button>
                    </div>
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
                  {showBulkAdd && (
                    <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                      <Label className="text-xs font-medium">Paste URLs — one per line</Label>
                      <Textarea
                        placeholder={"https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3"}
                        rows={5}
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                        className="font-mono text-xs"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setShowBulkAdd(false); setBulkText("") }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const parsed = bulkText
                              .split('\n')
                              .map(u => u.trim())
                              .filter(u => /^https?:\/\//i.test(u))
                            if (parsed.length > 0) {
                              setUrls(prev => [...prev.filter(u => u !== "https://"), ...parsed])
                              toast.success(`Added ${parsed.length} URL${parsed.length !== 1 ? "s" : ""}`)
                            } else {
                              toast.error("No valid URLs found. Each line must start with http:// or https://")
                            }
                            setShowBulkAdd(false)
                            setBulkText("")
                          }}
                        >
                          Add {bulkText.split('\n').filter(u => /^https?:\/\//i.test(u.trim())).length || ""} URLs
                        </Button>
                      </div>
                    </div>
                  )}
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
                      step={1}
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

                {/* Presets Quick Selector */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                    <span>Quick Setup Templates</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Click any preset to auto-configure</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* SEO Warm-Up */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryMode("one_time")
                        setTrafficCurve("ramp_up")
                        setDailyShape("business_hours")
                        setHumanizeJitter(true)
                        setDurationHours(24)
                        setTotalVisits(500)
                        setTrafficSource("serp_google")
                        setActivePreset("seo_warmup")
                      }}
                      className={`p-2.5 text-left rounded-lg border transition cursor-pointer text-xs space-y-1 ${
                        activePreset === "seo_warmup"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted/50 border-border"
                      }`}
                    >
                      <div className="font-semibold flex items-center justify-between">
                        <span>SEO Warm-Up</span>
                        <Badge variant="outline" className={`text-[9px] h-4 ${activePreset === "seo_warmup" ? "border-primary-foreground/40 text-primary-foreground" : ""}`}>Recommended</Badge>
                      </div>
                      <p className={`text-[11px] line-clamp-2 ${activePreset === "seo_warmup" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        Gradual ramp-up during US business hours. Perfect for fresh domains &amp; zero spike risks.
                      </p>
                    </button>

                    {/* Steady Daily Flow */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryMode("recurring")
                        setTrafficCurve("steady")
                        setDailyShape("uniform_24h")
                        setHumanizeJitter(true)
                        setDurationHours(24)
                        setTotalVisits(1000)
                        setActivePreset("steady_daily")
                      }}
                      className={`p-2.5 text-left rounded-lg border transition cursor-pointer text-xs space-y-1 ${
                        activePreset === "steady_daily"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted/50 border-border"
                      }`}
                    >
                      <div className="font-semibold flex items-center justify-between">
                        <span>Steady Daily Flow</span>
                        <Badge variant="secondary" className={`text-[9px] h-4 ${activePreset === "steady_daily" ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30" : ""}`}>Auto-Renew</Badge>
                      </div>
                      <p className={`text-[11px] line-clamp-2 ${activePreset === "steady_daily" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        Even 24/7 delivery renewing daily with organic jitter. Maintains high baseline analytics rank.
                      </p>
                    </button>

                    {/* Evening Peak Rush */}
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryMode("one_time")
                        setTrafficCurve("steady")
                        setDailyShape("evening_peak")
                        setHumanizeJitter(true)
                        setDurationHours(12)
                        setTotalVisits(300)
                        setActivePreset("evening_peak")
                      }}
                      className={`p-2.5 text-left rounded-lg border transition cursor-pointer text-xs space-y-1 ${
                        activePreset === "evening_peak"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted/50 border-border"
                      }`}
                    >
                      <div className="font-semibold flex items-center justify-between">
                        <span>Evening Peak Rush</span>
                        <Badge variant="outline" className={`text-[9px] h-4 ${activePreset === "evening_peak" ? "border-primary-foreground/40 text-primary-foreground" : ""}`}>High Intent</Badge>
                      </div>
                      <p className={`text-[11px] line-clamp-2 ${activePreset === "evening_peak" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        Concentrates visits heavily in target evening hours (6pm-11pm) simulating post-work browsing.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Advanced Traffic Curve, Mode & Daily Shape */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border/50">
                  <div className="space-y-2">
                    <Label className="flex items-center justify-between">
                      <span>Delivery Strategy / Mode</span>
                    </Label>
                    <Select value={deliveryMode} onValueChange={(val) => setDeliveryMode(val || "one_time")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-full">
                        <SelectItem value="one_time">One-Time Package (Deliver &amp; Finish)</SelectItem>
                        <SelectItem value="recurring">Continuous / Recurring (Auto-renews until stopped)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {deliveryMode === "recurring" 
                        ? `Auto-renews ${totalVisits.toLocaleString()} visits every ${durationHours} hours as long as your wallet balance allows.` 
                        : "Completes automatically once target visits are delivered."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Growth Trajectory (Campaign Level)</Label>
                    <Select value={trafficCurve} onValueChange={(val) => setTrafficCurve(val || "steady")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-full">
                        <SelectItem value="steady">Steady &amp; Uniform (Flat pace across cycle)</SelectItem>
                        <SelectItem value="ramp_up">Gradual Ramp-Up (Starts at 40%, reaches 160% peak)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {trafficCurve === "ramp_up"
                        ? "Safely introduces visits slowly, then scales up. For recurring campaigns, cycle 2+ maintains steady peak."
                        : "Visits are distributed evenly across the full duration."}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Daily Traffic Shape (Time of Day)</Label>
                    <Select value={dailyShape} onValueChange={(val) => setDailyShape(val || "uniform_24h")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-full">
                        <SelectItem value="uniform_24h">24/7 Uniform (Constant spread throughout)</SelectItem>
                        <SelectItem value="business_hours">Business Hours Peak (9 AM - 6 PM high, night quiet)</SelectItem>
                        <SelectItem value="evening_peak">Evening Peak (6 PM - 11 PM high, leisure browsing)</SelectItem>
                        <SelectItem value="global_mix">Global Mix (Worldwide wave pattern)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {dailyShape === "business_hours" && "Concentrates traffic during daytime working hours in your selected timezone."}
                      {dailyShape === "evening_peak" && "High traffic during evening relaxation and shopping hours."}
                      {dailyShape === "global_mix" && "Natural wave distribution ideal for international global audiences."}
                      {dailyShape === "uniform_24h" && "Spreads visits evenly across every hour of the day."}
                    </p>
                  </div>

                  {(dailyShape === "business_hours" || dailyShape === "evening_peak") ? (
                    <div className="space-y-2">
                      <Label>Target Audience Timezone</Label>
                      <Select value={targetTimezone} onValueChange={(val) => setTargetTimezone(val || "America/New_York")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-full">
                          <SelectItem value="America/New_York">US Eastern Time (New York / EDT)</SelectItem>
                          <SelectItem value="America/Chicago">US Central Time (Chicago / CDT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">US Pacific Time (Los Angeles / PDT)</SelectItem>
                          <SelectItem value="Europe/London">UK &amp; Ireland (London / GMT)</SelectItem>
                          <SelectItem value="Europe/Berlin">Central Europe (Berlin, Paris / CET)</SelectItem>
                          <SelectItem value="Asia/Dubai">Gulf &amp; Middle East (Dubai / GST)</SelectItem>
                          <SelectItem value="Asia/Karachi">Pakistan Standard Time (PKT)</SelectItem>
                          <SelectItem value="Asia/Kolkata">India Standard Time (IST)</SelectItem>
                          <SelectItem value="Asia/Singapore">Singapore / Hong Kong (SGT)</SelectItem>
                          <SelectItem value="Australia/Sydney">Australia (Sydney / AEST)</SelectItem>
                          <SelectItem value="UTC">Coordinated Universal Time (UTC)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Peak hours will align with your visitors&apos; local clock in this region.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="opacity-60">Target Audience Timezone</Label>
                      <div className="h-9 rounded-md border border-dashed px-3 flex items-center text-xs text-muted-foreground bg-muted/20">
                        Active 24/7 worldwide — timezone adjustment not required
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Applicable when choosing Business Hours or Evening Peak shapes.
                      </p>
                    </div>
                  )}
                </div>

                {/* Humanized Jitter Switch */}
                <div className="flex items-center justify-between p-3.5 bg-muted/40 border rounded-lg">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      <span>Humanized Organic Jitter</span>
                      <Badge variant="outline" className="text-[10px] h-4 text-emerald-500 border-emerald-500/30">Recommended</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Adds natural &plusmn;15% random variation to batch sizes and &plusmn;2 to 5 min timing jitter so analytics graphs look indistinguishable from real humans.
                    </div>
                  </div>
                  <Switch
                    checked={humanizeJitter}
                    onCheckedChange={setHumanizeJitter}
                  />
                </div>

                {/* Batching & Scheduling Summary Pill */}
                <div className="bg-muted/60 border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Batch Distribution &amp; Cost Estimation
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {deliveryMode === "recurring" ? `Renews every ${durationHours}h` : "Single Cycle"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Total Batches</div>
                      <div className="font-semibold text-foreground">{numBatches} batches (max 100/ea)</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Average Pace</div>
                      <div className="font-semibold text-foreground">~{visitsPerHour} visits / hr</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">{deliveryMode === "recurring" ? "Cost Per Cycle" : "Total Cost"}</div>
                      <div className="font-semibold text-primary">{visitsCost.toLocaleString()} credits</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Balance After First Cycle</div>
                      <div className={`font-semibold ${hasEnoughCredits ? "text-emerald-600" : "text-destructive"}`}>
                        {(balance - visitsCost).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Visual Batch Schedule Preview Pill */}
                  <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-foreground">Schedule Timeline Preview:</span>
                      <span>{numBatches} scheduled runs over {durationHours}h</span>
                    </div>
                    <div className="flex items-center gap-1 overflow-x-auto py-1">
                      {Array.from({ length: Math.min(numBatches, 12) }).map((_, i) => {
                        let barHeight = "h-4"
                        if (trafficCurve === "ramp_up") {
                          const p = i / Math.max(1, Math.min(numBatches, 12) - 1)
                          barHeight = p < 0.3 ? "h-2" : p < 0.7 ? "h-3.5" : "h-5"
                        } else if (dailyShape === "business_hours") {
                          barHeight = (i % 3 === 1) ? "h-5" : (i % 3 === 0) ? "h-3" : "h-2"
                        }
                        return (
                          <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                            <div className={`w-5 rounded-xs bg-primary/70 transition-all ${barHeight}`} />
                            <span className="text-[9px] opacity-70">#{i + 1}</span>
                          </div>
                        )
                      })}
                      {numBatches > 12 && (
                        <span className="text-[10px] pl-1 text-muted-foreground">+{numBatches - 12} more</span>
                      )}
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
                  <Select value={trafficSource} onValueChange={(val) => setTrafficSource(val || "referrer")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-full">
                      <SelectItem value="referrer">
                        Simulated Referral (Search Engines &amp; Social Referrers)
                      </SelectItem>
                      <SelectItem value="serp_google">
                        Google Search (SERP) — Real Keyword Search &amp; Organic Click
                      </SelectItem>
                      <SelectItem value="direct">
                        Direct Navigation (Type URL in browser)
                      </SelectItem>
                      <SelectItem value="backlink">
                        Backlink Traffic (Navigate to Source Page &amp; Click Link)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {trafficSource === "referrer" && (
                  <div className="space-y-2">
                    <Label>Referrer Profile</Label>
                    <Select value={referrerPreset} onValueChange={(val) => setReferrerPreset(val || "preset_search")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-full">
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
                  <div className="space-y-5 border rounded-lg p-4 bg-muted/40">
                    <div className="space-y-2">
                      <Label htmlFor="serp-query">Custom Search Query (Optional)</Label>
                      <Input
                        id="serp-query"
                        placeholder="e.g. site:dailydogguide.com/page or custom keywords (leaves blank for auto-detected query)"
                        value={serpQuery}
                        onChange={e => setSerpQuery(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        If omitted, the actor automatically queries your target domain cleanly on Google.
                      </p>
                    </div>

                    {/* Fallback to Direct Referrer Switch */}
                    <div className="flex items-center justify-between p-3 bg-background/60 border rounded-lg">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold flex items-center gap-1.5">
                          <span>Organic Referrer Fallback</span>
                          <Badge variant="outline" className="text-[9px] h-4 text-emerald-500 border-emerald-500/30">
                            Recommended
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          If Google triggers a CAPTCHA or your page isn&apos;t ranked in the top 20, automatically visit with a Google referrer header so no paid visits are wasted.
                        </p>
                      </div>
                      <Switch
                        checked={serpFallbackToDirect}
                        onCheckedChange={setSerpFallbackToDirect}
                      />
                    </div>

                    {/* Proxy Vault / Selector */}
                    <div className="space-y-3 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-semibold flex items-center gap-1.5">
                            <ShieldCheckIcon className="w-4 h-4 text-primary" />
                            Residential Proxy Vault <span className="text-destructive">*</span>
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Google SERP requires clean residential IPs. Add and manage your proxies easily below.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddProxy(!showAddProxy)}
                          className="text-xs h-8 gap-1.5"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                          {showAddProxy ? "Hide Form" : "Add Proxy"}
                        </Button>
                      </div>

                      {/* Add Proxy Form (Clean dedicated fields) */}
                      {showAddProxy && (
                        <div className="bg-background border rounded-lg p-4 space-y-3 mt-2 shadow-xs">
                          <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                            Add New Residential Proxy
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs">Friendly Label / Name</Label>
                              <Input
                                placeholder="e.g. Oxylabs US Residential 1"
                                value={proxyName}
                                onChange={e => setProxyName(e.target.value)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Proxy Host / IP <span className="text-destructive">*</span></Label>
                              <Input
                                placeholder="pr.oxylabs.io"
                                value={proxyHost}
                                onChange={e => setProxyHost(e.target.value)}
                                className="h-8 text-xs font-mono"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Port <span className="text-destructive">*</span></Label>
                              <Input
                                type="number"
                                placeholder="7777"
                                value={proxyPort}
                                onChange={e => setProxyPort(e.target.value)}
                                className="h-8 text-xs font-mono"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Username <span className="text-destructive">*</span></Label>
                              <Input
                                placeholder="customer-resi_user..."
                                value={proxyUser}
                                onChange={e => setProxyUser(e.target.value)}
                                className="h-8 text-xs font-mono"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Password <span className="text-destructive">*</span></Label>
                              <Input
                                type="password"
                                placeholder="••••••••"
                                value={proxyPass}
                                onChange={e => setProxyPass(e.target.value)}
                                className="h-8 text-xs font-mono"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowAddProxy(false)}
                              className="text-xs h-7"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSaveProxy}
                              className="text-xs h-7"
                            >
                              Save to Vault
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Saved Proxies List */}
                      {savedProxies.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">Select proxies to use for this campaign:</div>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto">
                            {savedProxies.map(p => {
                              const isChecked = selectedProxyIds.includes(p.id)
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => toggleSelectProxy(p.id)}
                                  className={`flex items-center justify-between p-2.5 rounded-md border text-xs cursor-pointer transition ${
                                    isChecked
                                      ? "bg-primary/10 border-primary/40 text-foreground"
                                      : "bg-background hover:bg-muted/50 text-muted-foreground"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 truncate">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="rounded border-input text-primary"
                                    />
                                    <div className="truncate">
                                      <span className="font-semibold text-foreground">{p.name}</span>
                                      <span className="ml-2 font-mono text-[11px] opacity-70 truncate">
                                        {p.host}:{p.port} ({p.username.slice(0, 18)}...)
                                      </span>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteProxy(p.id)
                                    }}
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                  >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-md text-center">
                          No saved proxies yet. Click &quot;Add Proxy&quot; to save your Oxylabs, Smartproxy, or BrightData credentials.
                        </div>
                      )}

                      {/* Active Proxies Count Badge & Status */}
                      <div className="flex items-center justify-between p-2.5 rounded-md bg-background/80 border text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">Selected Proxies for Campaign:</span>
                          <Badge variant={selectedProxyIds.length > 0 ? "default" : "destructive"} className="text-[11px] h-5">
                            {selectedProxyIds.length} Active
                          </Badge>
                        </div>
                        {selectedProxyIds.length === 0 && (
                          <span className="text-[11px] text-destructive font-medium">
                            Please select at least one proxy above
                          </span>
                        )}
                        {selectedProxyIds.length > 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            Rotated automatically per visit session
                          </span>
                        )}
                      </div>
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
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-full">
                        <SelectItem value="random">Random Mix (Desktop &amp; Mobile)</SelectItem>
                        <SelectItem value="desktop-random">Random Desktop (Chrome, Firefox, Safari, Edge)</SelectItem>
                        <SelectItem value="mobile-random">Random Mobile (Android &amp; iOS)</SelectItem>
                        <SelectItem value="desktop-chrome">Desktop Chrome (Windows / macOS)</SelectItem>
                        <SelectItem value="desktop-firefox">Desktop Firefox</SelectItem>
                        <SelectItem value="mobile-android">Mobile Android (Galaxy / Pixel)</SelectItem>
                        <SelectItem value="mobile-ios">Mobile Apple iOS (iPhone)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Scroll Behavior</Label>
                    <Select value={scrollBehavior} onValueChange={(val) => setScrollBehavior(val || "human-random")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="min-w-[var(--radix-select-trigger-width)] w-full">
                        <SelectItem value="human-random">Human-Random (Natural scroll &amp; pauses)</SelectItem>
                        <SelectItem value="slow-linear">Slow Linear Scroll</SelectItem>
                        <SelectItem value="none">No Scrolling (Idle)</SelectItem>
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

