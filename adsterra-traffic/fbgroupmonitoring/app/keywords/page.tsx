"use client"

import { useState, useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/utils/supabase/client"
import { Trash, Plus, SpinnerGap, FileTextIcon, ChatCircleTextIcon, PlusCircleIcon, CaretDown, CaretUp, TrashIcon, Question, PencilSimple, CookieIcon, UsersThreeIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

interface KeywordRule {
  id: string
  rule_name: string
  must_include: string[]
  any_of: string[]
  must_exclude: string[]
  auto_comment_enabled?: boolean
  cookie_id?: string
  cookie_ids?: string[]
  group_ids?: string[]
  comment_delay_seconds?: number
  user_page_id?: string
  comment_pool_id?: string
}

interface TrackedGroupInfo {
  id: string
  group_name: string | null
  group_type: "public" | "private"
}

interface CookieAccount {
  id: string
  cookie_name: string
  status: string
}

interface CommentPool {
  id: string
  name: string
  items?: CommentPoolItem[]
}

interface CommentPoolItem {
  id: string
  pool_id: string
  content: string
}

const MAX_POOL_ITEMS = 10

// Helper popup component for syntax guide
function SyntaxGuidePopup() {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        className="ml-1 text-muted-foreground hover:text-primary transition-colors"
        onClick={() => setOpen(v => !v)}
        aria-label="Syntax Guide"
      >
        <Question className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute z-50 left-6 top-0 w-80 rounded-lg border bg-popover text-popover-foreground shadow-xl p-4 text-sm space-y-3">
          <button
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >✕</button>
          <p className="font-semibold text-base">Comment Syntax Guide</p>

          <div className="space-y-1">
            <p className="font-medium text-muted-foreground uppercase text-xs tracking-wide">Variables</p>
            <code className="block bg-muted px-2 py-1 rounded text-xs">{"{{author}}"}</code>
            <p className="text-xs text-muted-foreground">Replaced with the Facebook post author's name.</p>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-muted-foreground uppercase text-xs tracking-wide">Spin Syntax (Variants)</p>
            <code className="block bg-muted px-2 py-1 rounded text-xs">{"{Hi|Hello|Hey} {{author}}!"}</code>
            <p className="text-xs text-muted-foreground">
              Wrap alternatives in <strong>{"{}"}</strong> separated by <strong>|</strong>. One variant is randomly picked each time the comment is posted.
            </p>
            <p className="text-xs text-muted-foreground">
              You can have <strong>multiple spin groups</strong> in one comment — each resolves independently.
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-medium text-muted-foreground uppercase text-xs tracking-wide">Example</p>
            <code className="block bg-muted px-2 py-1 rounded text-xs whitespace-pre-wrap">{"{Hi|Hello|Hey} {{author}}, {we offer|check out our} services!"}</code>
            <p className="text-xs text-muted-foreground">
              Could produce: <em>"Hello John, we offer services!"</em>
            </p>
          </div>

          <div className="border-t pt-2">
            <p className="text-xs text-muted-foreground">
              Each pool can hold up to <strong>{MAX_POOL_ITEMS} comments</strong>. One is chosen at random for each match.
            </p>
          </div>
        </div>
      )}
    </span>
  )
}

export default function KeywordsPage() {
  const [rules, setRules] = useState<KeywordRule[]>([])
  const [cookieAccounts, setCookieAccounts] = useState<CookieAccount[]>([])
  const [commentPools, setCommentPools] = useState<CommentPool[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // Keyword form state
  const [ruleName, setRuleName] = useState("")
  const [mustIncludeInput, setMustIncludeInput] = useState("")
  const [mustIncludeList, setMustIncludeList] = useState<string[]>([])
  const [anyOfInput, setAnyOfInput] = useState("")
  const [anyOfList, setAnyOfList] = useState<string[]>([])
  const [mustExcludeInput, setMustExcludeInput] = useState("")
  const [mustExcludeList, setMustExcludeList] = useState<string[]>([])

  // Target groups state
  const [userGroups, setUserGroups] = useState<TrackedGroupInfo[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [targetGroupMode, setTargetGroupMode] = useState<"all" | "custom">("all")

  // Auto-comment state
  const [autoCommentEnabled, setAutoCommentEnabled] = useState(false)
  const [selectedCookieId, setSelectedCookieId] = useState("")
  const [selectedCookieIds, setSelectedCookieIds] = useState<string[]>([])
  const [selectedPoolId, setSelectedPoolId] = useState("")
  const [commentDelaySeconds, setCommentDelaySeconds] = useState<number>(5)
  const [saving, setSaving] = useState(false)

  // Comment pool UI state
  const [newPoolName, setNewPoolName] = useState("")
  const [creatingPool, setCreatingPool] = useState(false)
  const [expandedPool, setExpandedPool] = useState<string | null>(null)
  const [newItemContent, setNewItemContent] = useState<Record<string, string>>({})
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUserId(session.user.id)
        await Promise.all([
          fetchRules(session.user.id),
          fetchCookieAccounts(session.user.id),
          fetchPools(session.user.id),
          fetchUserGroups(session.user.id)
        ])
      }
      setLoading(false)
    }
    loadData()
  }, [])

  async function fetchUserGroups(uid: string) {
    const { data } = await supabase
      .from("group_members")
      .select("group_id, groups(id, group_name, group_type)")
      .eq("user_id", uid)
      .eq("is_active", true)

    if (data) {
      const list = data.map((m: any) => m.groups).filter(Boolean) as TrackedGroupInfo[]
      setUserGroups(list)
    }
  }

  async function fetchRules(uid: string) {
    const { data, error } = await supabase
      .from("user_keywords")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
    if (!error && data) setRules(data)
  }

  async function fetchCookieAccounts(uid: string) {
    const { data, error } = await supabase
      .from("user_cookies")
      .select("id, cookie_name, status")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
    if (!error && data) setCookieAccounts(data)
  }

  async function fetchPools(uid: string) {
    const { data: poolsData, error: poolsError } = await supabase
      .from("comment_pools")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
    if (poolsError) return

    const { data: itemsData } = await supabase
      .from("comment_pool_items")
      .select("*")
      .in("pool_id", (poolsData || []).map(p => p.id))

    const poolsWithItems = (poolsData || []).map(pool => ({
      ...pool,
      items: (itemsData || []).filter(item => item.pool_id === pool.id)
    }))
    setCommentPools(poolsWithItems)
  }

  // ── Keyword handlers ──────────────────────────────────────────────────────
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

  const handleAddKeyword = (
    input: string,
    setInput: (val: string) => void,
    list: string[],
    setList: (val: string[]) => void
  ) => {
    if (!input.trim()) return
    if (!list.includes(input.trim().toLowerCase())) {
      setList([...list, input.trim().toLowerCase()])
    }
    setInput("")
  }

  const handleRemoveKeyword = (
    keyword: string,
    list: string[],
    setList: (val: string[]) => void
  ) => {
    setList(list.filter(k => k !== keyword))
  }

  const handleEditRule = (rule: KeywordRule) => {
    setEditingRuleId(rule.id)
    setRuleName(rule.rule_name || "")
    setMustIncludeList(rule.must_include || [])
    setAnyOfList(rule.any_of || [])
    setMustExcludeList(rule.must_exclude || [])
    setAutoCommentEnabled(!!rule.auto_comment_enabled)

    const cIds = (rule.cookie_ids && Array.isArray(rule.cookie_ids) && rule.cookie_ids.length > 0)
      ? rule.cookie_ids
      : (rule.cookie_id ? [rule.cookie_id] : [])
    setSelectedCookieIds(cIds)
    setSelectedCookieId(cIds[0] || "")

    if (rule.group_ids && Array.isArray(rule.group_ids) && rule.group_ids.length > 0) {
      setTargetGroupMode("custom")
      setSelectedGroupIds(rule.group_ids)
    } else {
      setTargetGroupMode("all")
      setSelectedGroupIds([])
    }

    setCommentDelaySeconds(rule.comment_delay_seconds || 5)
    setSelectedPoolId(rule.comment_pool_id || "")
    window.scrollTo({ top: 0, behavior: "smooth" })
    toast.info(`Editing rule "${rule.rule_name}"`)
  }

  const handleCancelEdit = () => {
    setEditingRuleId(null)
    setRuleName("")
    setMustIncludeList([])
    setAnyOfList([])
    setMustExcludeList([])
    setAutoCommentEnabled(false)
    setSelectedCookieId("")
    setSelectedCookieIds([])
    setTargetGroupMode("all")
    setSelectedGroupIds([])
    setCommentDelaySeconds(5)
    setSelectedPoolId("")
  }

  async function handleSaveRule() {
    if (!userId) return
    if (!ruleName.trim()) { toast.error("Please provide a name for this rule"); return }
    if (mustIncludeList.length === 0 && anyOfList.length === 0 && mustExcludeList.length === 0) {
      toast.error("Please add at least one keyword to any of the conditions"); return
    }
    if (targetGroupMode === "custom" && selectedGroupIds.length === 0) {
      toast.error("Please select at least one group for 'Specific Groups' or switch to 'All Tracked Groups'");
      return
    }
    if (autoCommentEnabled) {
      if (selectedCookieIds.length === 0 && !selectedCookieId) {
        toast.error("Please select at least one Account from your Cookie Vault for auto-commenting");
        return
      }
      if (!selectedPoolId) {
        toast.error("Please select a Comment Pool for auto-commenting");
        return
      }
    }

    try {
      setSaving(true)
      const finalCookieIds = selectedCookieIds.length > 0 ? selectedCookieIds : (selectedCookieId ? [selectedCookieId] : [])
      const payload: any = {
        user_id: userId,
        rule_name: ruleName.trim(),
        must_include: mustIncludeList,
        any_of: anyOfList,
        must_exclude: mustExcludeList,
        auto_comment_enabled: autoCommentEnabled,
        group_ids: targetGroupMode === "custom" ? selectedGroupIds : [],
      }
      if (autoCommentEnabled) {
        payload.cookie_ids = finalCookieIds
        payload.cookie_id = finalCookieIds[0] || null
        payload.comment_pool_id = selectedPoolId
        payload.comment_delay_seconds = commentDelaySeconds || 5
      } else {
        payload.cookie_ids = []
        payload.cookie_id = null
        payload.comment_pool_id = null
        payload.comment_delay_seconds = 5
      }

      if (editingRuleId) {
        const { data, error } = await supabase
          .from("user_keywords")
          .update(payload)
          .eq("id", editingRuleId)
          .select()
          .single()
        if (error) throw error

        setRules(rules.map(r => r.id === editingRuleId ? data : r))
        toast.success("Keyword rule updated!")
        handleCancelEdit()
      } else {
        const { data, error } = await supabase.from("user_keywords").insert(payload).select().single()
        if (error) throw error

        toast.success("Keyword rule saved!")
        setRules([data, ...rules])
        handleCancelEdit()
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save rule")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRule(id: string) {
    if (!confirm("Are you sure you want to delete this rule?")) return
    try {
      const { error } = await supabase.from("user_keywords").delete().eq("id", id)
      if (error) throw error
      setRules(rules.filter(r => r.id !== id))
      if (editingRuleId === id) handleCancelEdit()
      toast.success("Rule deleted")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete rule")
    }
  }

  // ── Comment Pool handlers ─────────────────────────────────────────────────
  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPoolName.trim() || !userId) return
    setCreatingPool(true)
    try {
      const { data, error } = await supabase
        .from("comment_pools")
        .insert({ user_id: userId, name: newPoolName.trim() })
        .select()
        .single()
      if (error) throw error
      const newPool = { ...data, items: [] }
      setCommentPools([newPool, ...commentPools])
      setNewPoolName("")
      setExpandedPool(data.id)
      toast.success("Comment pool created!")
    } catch (err: any) {
      toast.error(err.message || "Failed to create pool")
    } finally {
      setCreatingPool(false)
    }
  }

  const handleDeletePool = async (poolId: string) => {
    if (!window.confirm("Delete this pool and all its comments?")) return
    try {
      const { error } = await supabase.from("comment_pools").delete().eq("id", poolId)
      if (error) throw error
      setCommentPools(commentPools.filter(p => p.id !== poolId))
      toast.success("Pool deleted")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete pool")
    }
  }

  const handleAddItem = async (poolId: string) => {
    const content = newItemContent[poolId] || ""
    if (!content.trim()) return
    const pool = commentPools.find(p => p.id === poolId)
    if (pool && (pool.items?.length || 0) >= MAX_POOL_ITEMS) {
      toast.error(`Maximum ${MAX_POOL_ITEMS} comments per pool reached.`)
      return
    }
    setAddingItemTo(poolId)
    try {
      const { data, error } = await supabase
        .from("comment_pool_items")
        .insert({ pool_id: poolId, content: content.trim() })
        .select()
        .single()
      if (error) throw error
      setCommentPools(commentPools.map(p =>
        p.id === poolId ? { ...p, items: [...(p.items || []), data] } : p
      ))
      setNewItemContent(prev => ({ ...prev, [poolId]: "" }))
      toast.success("Comment added!")
    } catch (err: any) {
      toast.error(err.message || "Failed to add comment")
    } finally {
      setAddingItemTo(null)
    }
  }

  const handleDeleteItem = async (poolId: string, itemId: string) => {
    try {
      const { error } = await supabase.from("comment_pool_items").delete().eq("id", itemId)
      if (error) throw error
      setCommentPools(commentPools.map(p =>
        p.id === poolId ? { ...p, items: (p.items || []).filter(i => i.id !== itemId) } : p
      ))
      toast.success("Comment removed")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete comment")
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 lg:p-8">
          <div className="mx-auto max-w-5xl space-y-10">

            {/* ── Keywords Section ────────────────────────────────────────── */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Keywords & Comments</h1>
              <p className="text-muted-foreground mt-2">
                Define keyword rules to filter monitored posts, and manage comment pools for auto-replies.
              </p>
            </div>

            <div className="space-y-8">
              {/* Add / Edit Rule Form (Top Full Width Card) */}
              <Card className={`transition-all ${editingRuleId ? "border-primary ring-2 ring-primary/20 shadow-md" : "border-indigo-100 dark:border-indigo-900/50 shadow-sm"}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {editingRuleId ? (
                          <>
                            <PencilSimple className="h-5 w-5 text-primary" />
                            Edit Rule
                          </>
                        ) : (
                          "Create New Rule"
                        )}
                      </CardTitle>
                      <CardDescription>
                        {editingRuleId
                          ? "Modify keyword matching criteria, Facebook page, or comment pool for this rule"
                          : "Setup keyword matching logic and automated comment response settings"}
                      </CardDescription>
                    </div>
                    {editingRuleId && (
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Rule Name</Label>
                    <Input
                      placeholder="e.g. Real Estate Deals"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Must Include */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                        Must Include (AND)
                      </Label>
                      <p className="text-xs text-muted-foreground">Post must contain ALL of these.</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Keyword..."
                          value={mustIncludeInput}
                          onChange={(e) => setMustIncludeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); handleAddKeyword(mustIncludeInput, setMustIncludeInput, mustIncludeList, setMustIncludeList) }
                          }}
                        />
                        <Button variant="secondary" size="icon" onClick={() => handleAddKeyword(mustIncludeInput, setMustIncludeInput, mustIncludeList, setMustIncludeList)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {mustIncludeList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {mustIncludeList.map(kw => (
                            <Badge key={kw} variant="secondary" className="gap-1 bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20">
                              {kw} <button onClick={() => handleRemoveKeyword(kw, mustIncludeList, setMustIncludeList)}><Trash className="h-3 w-3" /></button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Any Of */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        Any Of (OR)
                      </Label>
                      <p className="text-xs text-muted-foreground">Post must contain AT LEAST ONE of these.</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Keyword..."
                          value={anyOfInput}
                          onChange={(e) => setAnyOfInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); handleAddKeyword(anyOfInput, setAnyOfInput, anyOfList, setAnyOfList) }
                          }}
                        />
                        <Button variant="secondary" size="icon" onClick={() => handleAddKeyword(anyOfInput, setAnyOfInput, anyOfList, setAnyOfList)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {anyOfList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {anyOfList.map(kw => (
                            <Badge key={kw} variant="secondary" className="gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20">
                              {kw} <button onClick={() => handleRemoveKeyword(kw, anyOfList, setAnyOfList)}><Trash className="h-3 w-3" /></button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Must Exclude */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                        Must Exclude (NOT)
                      </Label>
                      <p className="text-xs text-muted-foreground">Post must NOT contain ANY of these.</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Keyword..."
                          value={mustExcludeInput}
                          onChange={(e) => setMustExcludeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); handleAddKeyword(mustExcludeInput, setMustExcludeInput, mustExcludeList, setMustExcludeList) }
                          }}
                        />
                        <Button variant="secondary" size="icon" onClick={() => handleAddKeyword(mustExcludeInput, setMustExcludeInput, mustExcludeList, setMustExcludeList)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {mustExcludeList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {mustExcludeList.map(kw => (
                            <Badge key={kw} variant="secondary" className="gap-1 bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20">
                              {kw} <button onClick={() => handleRemoveKeyword(kw, mustExcludeList, setMustExcludeList)}><Trash className="h-3 w-3" /></button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Target Groups Section */}
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <Label className="text-base font-semibold">Target Groups</Label>
                      <p className="text-xs text-muted-foreground">Select which groups this keyword rule will monitor</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setTargetGroupMode("all")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                          targetGroupMode === "all"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        All Tracked Groups
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetGroupMode("custom")}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                          targetGroupMode === "custom"
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-muted/40 hover:bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        Specific Groups ({selectedGroupIds.length})
                      </button>
                    </div>

                    {targetGroupMode === "custom" && (
                      <div className="space-y-2 bg-muted/20 p-3.5 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">
                            Select groups to apply this rule to:
                          </span>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] px-2"
                              onClick={() => setSelectedGroupIds(userGroups.map(g => g.id))}
                            >
                              Select All
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] px-2 text-muted-foreground"
                              onClick={() => setSelectedGroupIds([])}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>

                        {userGroups.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-2">
                            No tracked groups found. Add groups in the Groups page.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {userGroups.map(grp => {
                              const isChecked = selectedGroupIds.includes(grp.id);
                              return (
                                <div
                                  key={grp.id}
                                  onClick={() => {
                                    if (isChecked) {
                                      setSelectedGroupIds(selectedGroupIds.filter(id => id !== grp.id));
                                    } else {
                                      setSelectedGroupIds([...selectedGroupIds, grp.id]);
                                    }
                                  }}
                                  className={`flex items-center justify-between p-2.5 rounded-md border text-xs cursor-pointer transition-all ${
                                    isChecked
                                      ? "bg-primary/10 border-primary text-foreground font-medium"
                                      : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"
                                  }`}
                                >
                                  <span className="truncate pr-2">{grp.group_name || "Unnamed Group"}</span>
                                  <Badge variant={grp.group_type === "private" ? "secondary" : "outline"} className="text-[10px] uppercase shrink-0">
                                    {grp.group_type}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          Note: For private groups, accounts commenting must be accepted members of that group.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Auto-Comment Section */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base font-semibold">Auto-Comment</Label>
                        <p className="text-xs text-muted-foreground">Automatically post comments from your Cookie Vault accounts on matching posts</p>
                      </div>
                      <Switch
                        checked={autoCommentEnabled}
                        onCheckedChange={setAutoCommentEnabled}
                      />
                    </div>

                    {autoCommentEnabled && (
                      <div className="space-y-4 bg-muted/30 p-4 rounded-lg border">
                        {/* Select Accounts (Cookie Vault) */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-semibold">Select Account(s) to Comment</Label>
                              <p className="text-[11px] text-muted-foreground">
                                Select one or multiple accounts to comment on the same post
                              </p>
                            </div>
                            {cookieAccounts.length > 0 && (
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px] px-2"
                                  onClick={() => setSelectedCookieIds(cookieAccounts.map(c => c.id))}
                                >
                                  Select All ({cookieAccounts.length})
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[11px] px-2 text-muted-foreground"
                                  onClick={() => setSelectedCookieIds([])}
                                >
                                  Clear
                                </Button>
                              </div>
                            )}
                          </div>

                          {cookieAccounts.length === 0 ? (
                            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                              No cookies in vault. Add an account session in <a href="/cookies" className="underline font-bold">Cookie Vault</a>.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                              {cookieAccounts.map(acc => {
                                const isSelected = selectedCookieIds.includes(acc.id) || (!selectedCookieIds.length && selectedCookieId === acc.id);
                                const isActive = acc.status === "ACTIVE";
                                return (
                                  <div
                                    key={acc.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        const next = selectedCookieIds.filter(id => id !== acc.id);
                                        setSelectedCookieIds(next);
                                        setSelectedCookieId(next[0] || "");
                                      } else {
                                        const next = [...selectedCookieIds, acc.id];
                                        setSelectedCookieIds(next);
                                        setSelectedCookieId(next[0] || "");
                                      }
                                    }}
                                    className={`flex items-center justify-between p-2.5 rounded-md border text-xs cursor-pointer transition-all ${
                                      isSelected
                                        ? "bg-primary/10 border-primary text-foreground font-semibold shadow-xs"
                                        : "bg-background border-border text-muted-foreground hover:border-muted-foreground/40"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <CookieIcon className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} weight={isSelected ? "fill" : "regular"} />
                                      <span className="truncate">{acc.cookie_name}</span>
                                    </div>
                                    <Badge variant={isActive ? "default" : "destructive"} className="text-[10px] shrink-0">
                                      {acc.status}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {selectedCookieIds.length > 1 && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ Multi-Account active: All {selectedCookieIds.length} accounts will comment on matching posts with jitter delay.
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Select Comment Pool</Label>
                            <Select value={selectedPoolId} onValueChange={(val) => setSelectedPoolId(val || "")}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a pool...">
                                  {commentPools.find(p => p.id === selectedPoolId)?.name}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {commentPools.length === 0 ? (
                                  <SelectItem value="none" disabled>No pools — create one below</SelectItem>
                                ) : (
                                  commentPools.map(pool => (
                                    <SelectItem key={pool.id} value={pool.id}>{pool.name}</SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs font-semibold">Delay Between Accounts (Seconds)</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={2}
                                max={60}
                                value={commentDelaySeconds}
                                onChange={(e) => setCommentDelaySeconds(Math.max(2, Math.min(60, parseInt(e.target.value) || 5)))}
                                className="w-24 text-xs font-mono"
                              />
                              <span className="text-xs text-muted-foreground">seconds jitter (5-15s recommended)</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/10 border-t pt-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleSaveRule}
                      disabled={saving || !ruleName.trim() || (mustIncludeList.length === 0 && anyOfList.length === 0 && mustExcludeList.length === 0)}
                    >
                      {saving && <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />}
                      {editingRuleId ? "Update Rule" : "Save Rule"}
                    </Button>
                    {editingRuleId && (
                      <Button variant="ghost" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                    )}
                  </div>
                  {editingRuleId && (
                    <span className="text-xs text-muted-foreground italic">
                      Editing rule: <strong className="text-foreground">{ruleName}</strong>
                    </span>
                  )}
                </CardFooter>
              </Card>

              {/* Active Rules List */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">Active Rules</h2>

                {loading ? (
                  <div className="flex justify-center p-8">
                    <SpinnerGap className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : rules.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <FileTextIcon className="h-12 w-12 mb-4 opacity-20" />
                      <p>You haven't created any keyword rules yet.</p>
                      <p className="text-sm">Create your first rule above to start filtering posts.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {rules.map(rule => {
                      const matchedCookie = cookieAccounts.find(c => c.id === rule.cookie_id)
                      const matchedPool = commentPools.find(p => p.id === rule.comment_pool_id)
                      const isCurrentlyEditing = editingRuleId === rule.id
                      return (
                        <Card key={rule.id} className={`transition-all ${isCurrentlyEditing ? "border-primary ring-2 ring-primary/20 shadow-md" : ""}`}>
                          <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                            <div>
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">{rule.rule_name}</CardTitle>
                                {isCurrentlyEditing && (
                                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                    Editing
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEditRule(rule)}
                              >
                                <PencilSimple className="h-4 w-4" />
                                <span className="text-xs font-medium">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteRule(rule.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Rich Auto-Comment Card */}
                            {rule.auto_comment_enabled && (
                              <div className="p-3.5 rounded-lg border bg-gradient-to-r from-muted/40 to-muted/20 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                      Auto-Comment Active
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  {/* Cookie Account Card */}
                                  <div className="flex items-center gap-3 p-2.5 rounded-md bg-background border shadow-xs">
                                    <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center overflow-hidden shrink-0 border border-amber-500/20 text-amber-600">
                                      <CookieIcon className="h-5 w-5" weight="fill" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-muted-foreground font-medium">Commenting Account(s)</p>
                                      <div className="flex flex-wrap gap-1 mt-0.5 items-center">
                                        {(() => {
                                          const cIds = (rule.cookie_ids && rule.cookie_ids.length > 0) ? rule.cookie_ids : (rule.cookie_id ? [rule.cookie_id] : []);
                                          const matched = cookieAccounts.filter(c => cIds.includes(c.id));
                                          if (matched.length === 0) {
                                            return <span className="text-xs font-semibold text-foreground">Active Vault Account</span>;
                                          }
                                          return matched.map(m => (
                                            <Badge key={m.id} variant="secondary" className="text-[10px] font-semibold py-0">
                                              {m.cookie_name}
                                            </Badge>
                                          ));
                                        })()}
                                        {rule.comment_delay_seconds ? (
                                          <span className="text-[10px] text-muted-foreground">({rule.comment_delay_seconds}s delay)</span>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Comment Pool Card */}
                                  <div className="flex items-center gap-3 p-2.5 rounded-md bg-background border shadow-xs">
                                    <div className="h-9 w-9 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center overflow-hidden shrink-0 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400">
                                      <ChatCircleTextIcon className="h-5 w-5" weight="fill" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-muted-foreground font-medium">Comment Pool</p>
                                      <p className="text-sm font-semibold truncate text-foreground">
                                        {matchedPool?.name || "No pool selected"}
                                      </p>
                                      {matchedPool && (
                                        <p className="text-[11px] text-muted-foreground">
                                          {matchedPool.items?.length || 0} variations available
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Target Groups Display */}
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-muted-foreground uppercase">Target Groups</span>
                              <div>
                                {rule.group_ids && rule.group_ids.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {rule.group_ids.map(gid => {
                                      const grp = userGroups.find(g => g.id === gid);
                                      return (
                                        <Badge key={gid} variant="outline" className="text-[11px] gap-1 bg-muted/30">
                                          <UsersThreeIcon className="w-3.5 h-3.5 text-muted-foreground" />
                                          {grp ? grp.group_name : "Group"}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-[11px] text-muted-foreground bg-muted/20">
                                    All Tracked Groups
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {rule.must_include && rule.must_include.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase">Must Include</span>
                                <div className="flex flex-wrap gap-1">
                                  {rule.must_include.map(kw => (
                                    <Badge key={kw} variant="outline" className="bg-green-500/5 border-green-200 dark:border-green-900">{kw}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {rule.any_of && rule.any_of.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Any Of</span>
                                <div className="flex flex-wrap gap-1">
                                  {rule.any_of.map(kw => (
                                    <Badge key={kw} variant="outline" className="bg-blue-500/5 border-blue-200 dark:border-blue-900">{kw}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {rule.must_exclude && rule.must_exclude.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">Must Exclude</span>
                                <div className="flex flex-wrap gap-1">
                                  {rule.must_exclude.map(kw => (
                                    <Badge key={kw} variant="outline" className="bg-red-500/5 border-red-200 dark:border-red-900">{kw}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Comment Pools Section ────────────────────────────────────── */}
            <div className="border-t pt-8 space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <ChatCircleTextIcon className="h-6 w-6 text-primary" />
                  Comment Pools
                </h2>
                <p className="text-muted-foreground mt-1">
                  Create sets of comments to rotate through when auto-replying to matched posts.
                </p>
              </div>

              {/* Create pool */}
              <Card>
                <form onSubmit={handleCreatePool}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PlusCircleIcon className="h-5 w-5" />
                      Create New Pool
                    </CardTitle>
                    <CardDescription>Group your comments by topic, service, or target audience.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="poolName">Pool Name</Label>
                      <Input
                        id="poolName"
                        placeholder="e.g., Web Developer Pitch"
                        value={newPoolName}
                        onChange={(e) => setNewPoolName(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={creatingPool || !newPoolName}>
                      {creatingPool ? <SpinnerGap className="mr-2 h-4 w-4 animate-spin" /> : "Create Pool"}
                    </Button>
                  </CardContent>
                </form>
              </Card>

              {/* Pools list */}
              <div className="space-y-4">
                {commentPools.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                      <ChatCircleTextIcon className="h-10 w-10 opacity-30" />
                      <p className="text-sm">You haven't created any comment pools yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  commentPools.map((pool) => {
                    const itemCount = pool.items?.length || 0
                    const atLimit = itemCount >= MAX_POOL_ITEMS
                    return (
                      <Card key={pool.id} className="overflow-hidden">
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setExpandedPool(expandedPool === pool.id ? null : pool.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-md text-primary">
                              <ChatCircleTextIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{pool.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {itemCount}/{MAX_POOL_ITEMS} comment{itemCount !== 1 ? 's' : ''}
                                {atLimit && <span className="ml-2 text-amber-500 font-medium">(limit reached)</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                              onClick={(e) => { e.stopPropagation(); handleDeletePool(pool.id) }}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                            {expandedPool === pool.id ? <CaretUp /> : <CaretDown />}
                          </div>
                        </div>

                        {expandedPool === pool.id && (
                          <div className="border-t bg-muted/20 p-4 space-y-4">
                            {pool.items && pool.items.length > 0 ? (
                              <div className="space-y-3">
                                {pool.items.map(item => (
                                  <div key={item.id} className="flex gap-3 items-start bg-background p-3 rounded-md border">
                                    <p className="text-sm flex-1 whitespace-pre-wrap">{item.content}</p>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-muted-foreground hover:text-destructive h-6 w-6 p-0 shrink-0"
                                      onClick={() => handleDeleteItem(pool.id, item.id)}
                                    >
                                      <TrashIcon className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic text-center py-2">No comments added yet.</p>
                            )}

                            <div className="pt-2 border-t mt-4 space-y-2">
                              <Label className="flex items-center gap-1">
                                Add new comment
                                <SyntaxGuidePopup />
                              </Label>
                              <div className="flex gap-2 items-start">
                                <Textarea
                                  placeholder={`Type a comment...\nUse {{author}} for the poster's name.\nUse {Hi|Hello|Hey} for spin variants.`}
                                  value={newItemContent[pool.id] || ""}
                                  onChange={(e) => setNewItemContent(prev => ({ ...prev, [pool.id]: e.target.value }))}
                                  className="resize-y min-h-[80px]"
                                  disabled={atLimit}
                                />
                                <Button
                                  className="shrink-0"
                                  disabled={addingItemTo === pool.id || !(newItemContent[pool.id] || "").trim() || atLimit}
                                  onClick={() => handleAddItem(pool.id)}
                                >
                                  {addingItemTo === pool.id ? <SpinnerGap className="h-4 w-4 animate-spin" /> : "Add"}
                                </Button>
                              </div>
                              {atLimit && (
                                <p className="text-xs text-amber-500">Maximum {MAX_POOL_ITEMS} comments per pool reached. Delete one to add more.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    )
                  })
                )}
              </div>
            </div>

          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
