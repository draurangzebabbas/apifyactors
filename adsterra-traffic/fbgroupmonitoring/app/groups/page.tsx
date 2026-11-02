"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import {
  SpinnerGap,
  UsersThreeIcon,
  WarningCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrashIcon,
  GearSixIcon,
  PlusCircleIcon,
  CookieIcon,
} from "@phosphor-icons/react"

type GroupStatus = "SUBMITTED" | "ACTIVE" | "REJECTED" | "NEEDS_COOKIE"

interface TrackedGroup {
  id: string
  group_url: string
  group_name: string | null
  group_type: "public" | "private"
  status: GroupStatus
  created_at: string
}

interface VaultCookie {
  id: string
  cookie_name: string
  status: string
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  ACTIVE: { label: "Active", variant: "default", icon: <CheckCircleIcon className="h-3.5 w-3.5" /> },
  SUBMITTED: { label: "Pending Approval", variant: "secondary", icon: <ClockIcon className="h-3.5 w-3.5" /> },
  REJECTED: { label: "Rejected", variant: "destructive", icon: <XCircleIcon className="h-3.5 w-3.5" /> },
  PAUSED: { label: "Paused", variant: "outline", icon: <WarningCircleIcon className="h-3.5 w-3.5 text-amber-500" /> },
  NEEDS_COOKIE: { label: "Cookie Expired", variant: "outline", icon: <WarningCircleIcon className="h-3.5 w-3.5 text-amber-500" /> },
}

export default function GroupsPage() {
  const [url, setUrl] = useState("")
  const [privacy, setPrivacy] = useState("public")
  const [selectedCookieId, setSelectedCookieId] = useState("")
  const [vaultCookies, setVaultCookies] = useState<VaultCookie[]>([])
  const [loading, setLoading] = useState(false)
  const [stopping, setStopping] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [groups, setGroups] = useState<TrackedGroup[]>([])
  const [fetching, setFetching] = useState(true)
  const [limit, setLimit] = useState<number>(10)
  const [page, setPage] = useState<number>(1)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

  const fetchGroupsAndCookies = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const userId = session.user.id

      // READ: Fetch user's groups directly from Supabase
      const { data: memberRows } = await supabase
        .from('group_members')
        .select(`
          group_id,
          cookie_id,
          groups ( id, group_url, group_name, group_type, status, created_at ),
          user_cookies ( status )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)

      const mappedGroups = (memberRows || []).map((row: any) => {
        const g = Array.isArray(row.groups) ? row.groups[0] : row.groups
        const c = Array.isArray(row.user_cookies) ? row.user_cookies[0] : row.user_cookies
        if (g && g.status === 'ACTIVE' && c && c.status === 'FAILED') {
          g.status = 'NEEDS_COOKIE'
        }
        return g
      }).filter(Boolean)
      setGroups(mappedGroups)

      // READ: Fetch user's cookies directly from Supabase
      const { data: cookieRows } = await supabase
        .from('user_cookies')
        .select('id, cookie_name, status, fail_count, last_used_at, last_failed_at, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      setVaultCookies(cookieRows || [])
    } catch (err: any) {
      console.error("Failed to fetch data", err)
      toast.error(err.message || "Failed to load your tracked groups.")
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => { fetchGroupsAndCookies() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("You must be logged in to track groups.")
      if (privacy === "private" && !selectedCookieId) {
        throw new Error("You must select an active Facebook account from your vault for private groups.")
      }

      const response = await fetch(`${backendUrl}/api/groups`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          url, 
          privacy, 
          cookieId: privacy === "private" ? selectedCookieId : null
        }),
      })

      const data = await response.json()

      // ── Plan limit hit — show upgrade toast ──────────────────────
      if (!response.ok && data.code === "PLAN_LIMIT_REACHED") {
        toast.error("Group limit reached", {
          description: data.error,
          duration: 8000,
          action: {
            label: "Upgrade Plan →",
            onClick: () => {
              window.location.href = "/#pricing"
            },
          },
        })
        return
      }
      // ─────────────────────────────────────────────────────────────

      if (!response.ok) throw new Error(data.error || "Failed to submit group")

      setSuccess("Group submitted! It will be reviewed and activated shortly.")
      setUrl("")
      setPrivacy("public")
      setSelectedCookieId("")
      fetchGroupsAndCookies()
    } catch (err: any) {
      const msg = err.message || "An unexpected error occurred."
      setError(msg)
      toast.error("Failed to submit group", { description: msg })
    } finally {
      setLoading(false)
    }
  }

  const handleStopTracking = async (groupId: string) => {
    if (!window.confirm("Are you sure you want to stop tracking this group? All its data will remain, but new posts will not be monitored.")) {
      return;
    }
    
    setStopping(groupId)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`${backendUrl}/api/groups/${groupId}`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        setGroups(prev => prev.filter(g => g.id !== groupId))
        toast.success("Stopped tracking group.")
      } else {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to stop tracking")
      }
    } catch (err: any) {
      console.error("Failed to stop tracking", err)
      toast.error(err.message || "Failed to stop tracking group.")
    } finally {
      setStopping(null)
    }
  }

  const hasCookieIssues = groups.some(g => g.status === "NEEDS_COOKIE")

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
            <h1 className="text-3xl font-bold tracking-tight">Facebook Group Tracking</h1>
            <p className="text-muted-foreground">Monitor public and private Facebook groups for new posts.</p>
          </div>

          {/* Cookie Issue Banner */}
          {hasCookieIssues && (
            <div className="flex items-center justify-between gap-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 dark:text-amber-400">
              <div className="flex items-center gap-2 text-sm font-medium">
                <WarningCircleIcon className="h-5 w-5 shrink-0" />
                One or more of your Facebook accounts have expired cookies. Update them in your vault to resume tracking.
              </div>
              <Link href="/cookies" className={buttonVariants({ size: "sm", variant: "outline", className: "shrink-0 border-amber-500/50 text-amber-600 hover:bg-amber-500/10" })}>
                <GearSixIcon className="h-4 w-4 mr-1" />
                Cookie Vault
              </Link>
            </div>
          )}

          {/* Add Group Form */}
          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircleIcon className="h-5 w-5" />
                  Add New Group
                </CardTitle>
                <CardDescription>
                  Submit a Facebook Group URL to start tracking. Private groups require you to select an account from your Cookie Vault.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Facebook Group URL</Label>
                  <Input
                    id="url"
                    placeholder="https://www.facebook.com/groups/123456789/"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="privacy">Group Type</Label>
                  <Select value={privacy} onValueChange={(val) => setPrivacy(val || "public")}>
                    <SelectTrigger id="privacy">
                      <SelectValue placeholder="Select group type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {privacy === "private" && (
                  <div className="space-y-2 pt-2 border-t mt-4">
                    <Label htmlFor="cookieSelect">Attach Facebook Account (Cookie Vault)</Label>
                    {vaultCookies.length === 0 ? (
                      <div className="flex flex-col gap-3 p-4 bg-secondary/30 rounded-md border text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <CookieIcon className="h-5 w-5" /> You haven&apos;t added any Facebook accounts to your vault yet.
                        </p>
                        <Button render={<Link href="/cookies" />} variant="outline" size="sm" className="w-fit">
                          Go to Cookie Vault
                        </Button>
                      </div>
                    ) : (
                      <Select value={selectedCookieId} onValueChange={(val) => setSelectedCookieId(val || "")}>
                        <SelectTrigger id="cookieSelect">
                          <SelectValue placeholder="Select an account from your vault..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vaultCookies.map((c) => (
                            <SelectItem 
                              key={c.id} 
                              value={c.id}
                              disabled={c.status === 'FAILED'}
                            >
                              {c.cookie_name} {c.status === 'FAILED' ? '(Expired)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm border border-destructive/20 flex items-center gap-2 mt-4">
                    <XCircleIcon className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-3 bg-primary/10 text-primary rounded-md text-sm border border-primary/20 flex items-center gap-2 mt-4">
                    <CheckCircleIcon className="h-4 w-4 shrink-0" />
                    {success}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit" 
                  disabled={loading || !url || (privacy === "private" && !selectedCookieId)}
                >
                  {loading ? (
                    <><SpinnerGap className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                  ) : (
                    "Submit Group"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Tracked Groups List */}
          <Card>
            <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <UsersThreeIcon className="h-5 w-5" />
                  Your Tracked Groups
                </CardTitle>
                <CardDescription>
                  Groups you are currently monitoring. Stop tracking at any time.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {fetching ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                  <SpinnerGap className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading groups...</span>
                </div>
              ) : groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <UsersThreeIcon className="h-10 w-10 opacity-30" />
                  <p className="text-sm">You are not tracking any groups yet.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {groups.slice((page - 1) * limit, page * limit).map((group) => {
                    const statusCfg = STATUS_CONFIG[group.status] ?? STATUS_CONFIG.SUBMITTED
                    return (
                      <div key={group.id} className="flex items-center justify-between gap-4 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <UsersThreeIcon className="h-8 w-8 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">
                              {group.group_name ? (
                                <a href={group.group_url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                                  {group.group_name}
                                </a>
                              ) : (
                                <a href={group.group_url} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                                  {group.group_url}
                                </a>
                              )}
                            </p>
                            {group.group_name && (
                              <p className="text-xs text-muted-foreground truncate">{group.group_url}</p>
                            )}
                            <p className="text-xs text-muted-foreground capitalize mt-0.5">
                              {group.group_type} group
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={statusCfg.variant} className="flex items-center gap-1 text-xs">
                            {statusCfg.icon}
                            {statusCfg.label}
                          </Badge>

                          {group.status === "NEEDS_COOKIE" && (
                            <Button render={<Link href="/cookies" />} size="sm" variant="secondary" className="text-xs h-8">
                                <GearSixIcon className="h-3.5 w-3.5 mr-1" />
                                Update Cookie
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                            onClick={() => handleStopTracking(group.id)}
                            disabled={stopping === group.id}
                            title="Stop tracking this group"
                          >
                            {stopping === group.id
                              ? <SpinnerGap className="h-4 w-4 animate-spin" />
                              : <TrashIcon className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between py-4 mt-4 border-t border-border">
                    <div className="text-sm text-muted-foreground">
                      Showing {Math.min((page - 1) * limit + 1, groups.length || 0)} to {Math.min(page * limit, groups.length || 0)} of {groups.length || 0} groups
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Rows per page:</span>
                        <Select
                          value={limit.toString()}
                          onValueChange={(val) => {
                            setLimit(Number(val));
                            setPage(1);
                          }}
                        >
                          <SelectTrigger className="h-8 w-[70px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Prev
                        </Button>
                        <span className="text-sm px-2 text-muted-foreground">
                          Page {page} of {Math.ceil(groups.length / limit) || 1}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(p => p + 1)}
                          disabled={page >= Math.ceil(groups.length / limit)}
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.ceil(groups.length / limit) || 1)}
                          disabled={page >= Math.ceil(groups.length / limit)}
                        >
                          Last
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

