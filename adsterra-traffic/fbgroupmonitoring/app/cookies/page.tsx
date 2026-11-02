"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
  SpinnerGap,
  WarningCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowClockwiseIcon,
  TrashIcon,
  PlusCircleIcon,
  CookieIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react"

type CookieStatus = "ACTIVE" | "FAILED" | "EXPIRED"

interface CookieRow {
  id: string
  cookie_name: string
  status: CookieStatus
  fail_count: number
  usage_count: number
  last_used_at: string | null
  last_failed_at: string | null
  updated_at: string
}

const STATUS_CONFIG: Record<CookieStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; description: string }> = {
  ACTIVE: {
    label: "Active",
    variant: "default",
    icon: <CheckCircleIcon className="h-3.5 w-3.5" />,
    description: "Your cookie is working properly.",
  },
  FAILED: {
    label: "Failed",
    variant: "destructive",
    icon: <XCircleIcon className="h-3.5 w-3.5" />,
    description: "Your cookie failed or expired. Please update it.",
  },
  EXPIRED: {
    label: "Expired",
    variant: "outline",
    icon: <ClockIcon className="h-3.5 w-3.5 text-amber-500" />,
    description: "Your Facebook session has expired. Please update your cookie.",
  },
}

export default function CookieSettingsPage() {
  const [cookies, setCookies] = useState<CookieRow[]>([])
  const [fetching, setFetching] = useState(true)
  
  // Add state
  const [isAdding, setIsAdding] = useState(false)
  const [newCookieName, setNewCookieName] = useState("")
  const [newCookieValue, setNewCookieValue] = useState("")
  const [addingError, setAddingError] = useState<string | null>(null)

  // Update state
  const [updateOpen, setUpdateOpen] = useState<string | null>(null)
  const [updateCookieValue, setUpdateCookieValue] = useState("")
  const [updating, setUpdating] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

  const fetchCookies = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const userId = session.user.id

      // READ: Direct Supabase query
      const { data: cookieRows } = await supabase
        .from('user_cookies')
        .select('id, cookie_name, status, fail_count, last_used_at, last_failed_at, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Compute usage count from group_members
      const { data: usageRows } = await supabase
        .from('group_members')
        .select('cookie_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .not('cookie_id', 'is', null)

      const usageCount: Record<string, number> = {}
      for (const row of usageRows || []) {
        if (row.cookie_id) usageCount[row.cookie_id] = (usageCount[row.cookie_id] || 0) + 1
      }

      setCookies((cookieRows || []).map((c: any) => ({ ...c, usage_count: usageCount[c.id] || 0 })))
    } catch (err) {
      console.error("Failed to fetch cookies", err)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => { fetchCookies() }, [fetchCookies])

  const handleAddCookie = async () => {
    if (!newCookieName.trim() || !newCookieValue.trim()) return
    setIsAdding(true)
    setAddingError(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated.")

      const response = await fetch(`${backendUrl}/api/settings/cookies`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          cookieName: newCookieName.trim(),
          cookieValue: newCookieValue.trim() 
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to add cookie.")

      setGlobalSuccess("New cookie added successfully to your vault!")
      setNewCookieName("")
      setNewCookieValue("")
      setIsAdding(false)
      fetchCookies()
    } catch (err: any) {
      setAddingError(err.message || "Failed to add cookie.")
      setIsAdding(false)
    }
  }

  const handleUpdateCookie = async (cookieId: string) => {
    if (!updateCookieValue.trim()) return
    setUpdating(cookieId)
    setGlobalError(null)
    setGlobalSuccess(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated.")

      const response = await fetch(`${backendUrl}/api/settings/cookies/${cookieId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ cookieValue: updateCookieValue.trim() }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to update cookie.")

      setGlobalSuccess("Cookie updated successfully! Connected groups will resume tracking.")
      setUpdateOpen(null)
      setUpdateCookieValue("")
      fetchCookies()
    } catch (err: any) {
      setGlobalError(err.message || "Failed to update cookie.")
    } finally {
      setUpdating(null)
    }
  }

  const handleRemoveCookie = async (cookieId: string) => {
    setRemoving(cookieId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`${backendUrl}/api/settings/cookies/${cookieId}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        }
      })

      const data = await response.json().catch(() => ({ error: "Unknown error" }))
      if (response.ok) {
        setCookies(prev => prev.filter(c => c.id !== cookieId))
        toast.success("Cookie removed from vault")
      } else {
        throw new Error(data.error || "Failed to remove cookie")
      }
    } catch (err: any) {
      console.error("Failed to remove cookie", err)
      toast.error(err.message || "Failed to remove cookie")
    } finally {
      setRemoving(null)
    }
  }

  const failedCount = cookies.filter(c => c.status === "FAILED" || c.status === "EXPIRED").length

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
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6 max-w-4xl mx-auto w-full">

          {/* Page Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Cookie Vault</h1>
            <p className="text-muted-foreground">
              Manage your Facebook accounts. Add cookies here once, and attach them to any private groups you track.
            </p>
          </div>

          {/* Security Note */}
          <div className="flex items-start gap-3 p-4 bg-secondary/50 border rounded-lg text-sm text-muted-foreground">
            <ShieldCheckIcon className="h-5 w-5 shrink-0 text-primary mt-0.5" />
            <p>
              Your cookies are <strong className="text-foreground">encrypted with AES-256</strong> before being stored.
              Raw cookie values are never exposed — they are only decrypted on the server at scrape time.
            </p>
          </div>

          {/* Tool Recommendation */}
          <div className="flex items-start gap-3 p-4 bg-primary/5 border-primary/20 border rounded-lg text-sm text-muted-foreground">
            <CookieIcon className="h-5 w-5 shrink-0 text-primary mt-0.5" />
            <p>
              <strong className="text-foreground">Need help getting your cookies?</strong> We recommend using the <a href="https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Cookie Editor</a> Chrome extension to easily export your Facebook session cookies as JSON.
            </p>
          </div>

          {/* Failed Cookie Alert Banner */}
          {failedCount > 0 && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm font-medium">
              <WarningCircleIcon className="h-5 w-5 shrink-0" />
              {failedCount === 1
                ? "1 of your Facebook accounts has an expired cookie. Groups using it may stop being tracked until you update it."
                : `${failedCount} of your Facebook accounts have expired cookies. Groups using them may stop being tracked until you update them.`}
            </div>
          )}

          {/* Global messages */}
          {globalSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md text-sm border border-green-500/20">
              <CheckCircleIcon className="h-4 w-4 shrink-0" />
              {globalSuccess}
            </div>
          )}
          {globalError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm border border-destructive/20">
              <XCircleIcon className="h-4 w-4 shrink-0" />
              {globalError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Add Cookie Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircleIcon className="h-5 w-5" />
                  Add New Account
                </CardTitle>
                <CardDescription>
                  Save a new Facebook session to your vault.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cookieName">Account Name</Label>
                  <Input
                    id="cookieName"
                    placeholder="e.g. John Doe Profile"
                    value={newCookieName}
                    onChange={(e) => setNewCookieName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cookieValue">Session Cookies (JSON array)</Label>
                  <Textarea
                    id="cookieValue"
                    placeholder='[{"name": "c_user", "value": "..."}, {"name": "xs", "value": "..."}]'
                    value={newCookieValue}
                    onChange={(e) => setNewCookieValue(e.target.value)}
                    className="min-h-[120px] font-mono text-xs"
                  />
                </div>
                {addingError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <XCircleIcon className="h-3.5 w-3.5" /> {addingError}
                  </p>
                )}
                <Button 
                  className="w-full"
                  onClick={handleAddCookie}
                  disabled={!newCookieName.trim() || !newCookieValue.trim() || isAdding}
                >
                  {isAdding ? <><SpinnerGap className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Add to Vault"}
                </Button>
              </CardContent>
            </Card>

            {/* Cookie List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CookieIcon className="h-5 w-5" />
                  Your Vault
                </CardTitle>
                <CardDescription>
                  Accounts you can attach to private groups.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fetching ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                    <SpinnerGap className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Loading cookies...</span>
                  </div>
                ) : cookies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                    <CookieIcon className="h-10 w-10 opacity-20" />
                    <p className="text-sm text-center">Your vault is empty. Add a cookie to track private groups.</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {cookies.map((cookie) => {
                      const statusCfg = STATUS_CONFIG[cookie.status] ?? STATUS_CONFIG.ACTIVE
                      const isProblematic = cookie.status === "FAILED" || cookie.status === "EXPIRED"
                      const isExpanded = updateOpen === cookie.id

                      return (
                        <div key={cookie.id} className="py-4 space-y-3">
                          {/* Row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm truncate">{cookie.cookie_name}</p>
                                <Badge variant={statusCfg.variant} className="flex items-center gap-1 text-[10px] h-5 px-1.5 py-0">
                                  {statusCfg.icon}
                                  {statusCfg.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Attached to <strong className="text-foreground">{cookie.usage_count}</strong> group(s)
                              </p>
                              {isProblematic && (
                                <p className="text-xs text-destructive mt-1">{statusCfg.description}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isProblematic && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-8 px-2"
                                  onClick={() => {
                                    setUpdateOpen(isExpanded ? null : cookie.id)
                                    setUpdateCookieValue("")
                                  }}
                                >
                                  <ArrowClockwiseIcon className="h-3.5 w-3.5" />
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveCookie(cookie.id)}
                                disabled={removing === cookie.id}
                                title="Delete from Vault"
                              >
                                {removing === cookie.id
                                  ? <SpinnerGap className="h-4 w-4 animate-spin" />
                                  : <TrashIcon className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Update Form */}
                          {isExpanded && (
                            <div className="space-y-3 p-3 bg-secondary/30 rounded-lg border">
                              <Label htmlFor={`cookie-input-${cookie.id}`} className="text-xs font-medium">
                                Paste new session cookies (JSON)
                              </Label>
                              <Textarea
                                id={`cookie-input-${cookie.id}`}
                                placeholder='[{"name": "c_user", "value": "..."}, {"name": "xs", "value": "..."}]'
                                value={updateCookieValue}
                                onChange={(e) => setUpdateCookieValue(e.target.value)}
                                className="min-h-[80px] font-mono text-xs"
                              />
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateCookie(cookie.id)}
                                  disabled={!updateCookieValue.trim() || updating === cookie.id}
                                >
                                  {updating === cookie.id ? (
                                    <><SpinnerGap className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</>
                                  ) : (
                                    "Save Update"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setUpdateOpen(null); setUpdateCookieValue("") }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
