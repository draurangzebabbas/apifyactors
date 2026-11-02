"use client"

import { useState, useEffect, useMemo } from "react"
import { AdminSidebar } from "@/components/admin-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/utils/supabase/client"
import {
  KeyIcon,
  PlusCircleIcon,
  TrashIcon,
  SpinnerGap,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  WarningCircleIcon,
  Heartbeat,
} from "@phosphor-icons/react"

interface ApiKey {
  id: string
  key_name: string | null
  key_value: string
  provider: string
  status: string
  fail_count: number
  created_at: string
  last_used?: string | null
  last_used_at?: string | null
  health?: number
  usage_usd?: number
  limit_usd?: number
}

interface KeySummary {
  active: number
  quotaExhausted: number
  tokenInvalid: number
  total: number
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  "Active": { label: "Active", variant: "default", icon: <CheckCircleIcon className="h-3.5 w-3.5 mr-1" /> },
  "Quota Exhausted": { label: "Quota Exhausted", variant: "secondary", icon: <ClockIcon className="h-3.5 w-3.5 mr-1" /> },
  "Token Invalid": { label: "Token Invalid", variant: "destructive", icon: <XCircleIcon className="h-3.5 w-3.5 mr-1" /> },
  ACTIVE: { label: "Active", variant: "default", icon: <CheckCircleIcon className="h-3.5 w-3.5 mr-1" /> },
  INACTIVE: { label: "Quota Exhausted", variant: "secondary", icon: <ClockIcon className="h-3.5 w-3.5 mr-1" /> },
  RATE_LIMITED: { label: "Quota Exhausted", variant: "secondary", icon: <ClockIcon className="h-3.5 w-3.5 mr-1" /> },
  INVALID: { label: "Token Invalid", variant: "destructive", icon: <XCircleIcon className="h-3.5 w-3.5 mr-1" /> },
  FAILED: { label: "Token Invalid", variant: "destructive", icon: <XCircleIcon className="h-3.5 w-3.5 mr-1" /> },
}

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [fetching, setFetching] = useState(true)
  const [keySummary, setKeySummary] = useState<KeySummary>({ active: 0, quotaExhausted: 0, tokenInvalid: 0, total: 0 })

  // Form State
  const [keyName, setKeyName] = useState("")
  const [keyValue, setKeyValue] = useState("")
  const [provider, setProvider] = useState("Apify")
  const [isAdding, setIsAdding] = useState(false)

  // Selection & Filter State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)

  // Messages
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

  const fetchKeys = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // READ: Direct Supabase query
      const { data: keysData, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      const keysArr = keysData || []
      setKeys(keysArr)
      setKeySummary({
        active: keysArr.filter((k: ApiKey) => k.status === 'Active' || k.status === 'ACTIVE').length,
        quotaExhausted: keysArr.filter((k: ApiKey) => k.status === 'Quota Exhausted' || k.status === 'INACTIVE' || k.status === 'RATE_LIMITED').length,
        tokenInvalid: keysArr.filter((k: ApiKey) => k.status === 'Token Invalid' || k.status === 'INVALID' || k.status === 'FAILED').length,
        total: keysArr.length,
      })

    } catch (err) {
      console.error("Failed to fetch keys", err)
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => { fetchKeys() }, [])

  // Smart Paste Handler — detects spreadsheet data and auto-submits
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>, field: 'name' | 'value') => {
    const pastedText = e.clipboardData.getData('text')

    // If it looks like a spreadsheet (tabs + newlines), bulk-add immediately
    if (pastedText.includes('\t') || (pastedText.includes('\n') && pastedText.trim() !== '')) {
      e.preventDefault()
      const rows = pastedText.split('\n').filter(r => r.trim() !== '')

      let names: string[] = []
      let values: string[] = []

      rows.forEach(row => {
        const cols = row.split('\t')
        if (cols.length >= 2) {
          names.push(cols[0].trim())
          values.push(cols[1].trim())
        } else {
          if (field === 'name') names.push(cols[0].trim())
          if (field === 'value') values.push(cols[0].trim())
        }
      })

      // If we have valid key values, auto-submit right now
      if (values.length > 0 && values[0] !== '') {
        setIsAdding(true)
        setError(null)
        setSuccess(null)
        try {
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) throw new Error('Not authenticated')

          const keysToInsert = values.map((val, idx) => ({
            key_name: names[idx] || `Key ${idx + 1}`,
            key_value: val,
            provider: provider
          }))

          const response = await fetch('/api/admin/keys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keys: keysToInsert }),
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || 'Failed to add keys')

          const { added, skippedNames, skippedValues } = data;
          let msg = `${added} of ${keysToInsert.length} key(s) added from paste.`;
          if (skippedNames > 0 || skippedValues > 0) {
            const skips = [];
            if (skippedNames > 0) skips.push(`${skippedNames} duplicate names`);
            if (skippedValues > 0) skips.push(`${skippedValues} duplicate keys`);
            msg += ` (${skips.join(' | ')} skipped)`;
          }

          setSuccess(`✓ ${msg}`)
          setKeyName('')
          setKeyValue('')
          fetchKeys()
        } catch (err: any) {
          setError(err.message || 'Failed to bulk-add keys.')
        } finally {
          setIsAdding(false)
        }
        return
      }

      // Otherwise just fill the fields
      setKeyName(names.join('\n'))
      setKeyValue(values.join('\n'))
      setSuccess('Pasted from spreadsheet — click Add Keys to save.')
      setTimeout(() => setSuccess(null), 4000)
    }
  }

  const handleAddKeys = async () => {
    if (!keyValue.trim()) return
    setIsAdding(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      const nameLines = keyName.split('\n').map(l => l.trim())
      const valueLines = keyValue.split('\n').map(l => l.trim()).filter(l => l !== '')

      const keysToInsert = valueLines.map((val, idx) => ({
        key_name: nameLines[idx] || `Key ${idx + 1}`,
        key_value: val,
        provider: provider
      }))

      const response = await fetch('/api/admin/keys', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: keysToInsert }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to add keys")

      const { added, skippedNames, skippedValues } = data;
      let msg = `${added} of ${keysToInsert.length} key(s) added.`;
      if (skippedNames > 0 || skippedValues > 0) {
        const skips = [];
        if (skippedNames > 0) skips.push(`${skippedNames} duplicate names`);
        if (skippedValues > 0) skips.push(`${skippedValues} duplicate keys`);
        msg += ` (${skips.join(' | ')} skipped)`;
      }

      setSuccess(msg)
      setKeyName("")
      setKeyValue("")
      fetchKeys()
    } catch (err: any) {
      setError(err.message || "An error occurred while adding keys.")
    } finally {
      setIsAdding(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} key(s)?`)) return
    
    setIsDeleting(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      const response = await fetch('/api/admin/keys', {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyIds: Array.from(selectedIds) }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to delete keys")

      setSuccess(`Deleted ${selectedIds.size} key(s).`)
      setSelectedIds(new Set())
      fetchKeys()
    } catch (err: any) {
      setError(err.message || "Failed to delete keys.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCheckHealth = async () => {
    if (selectedIds.size === 0) return
    
    setIsCheckingHealth(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Not authenticated")

      const response = await fetch('/api/admin/keys/health', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyIds: Array.from(selectedIds) }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to check health")

      setSuccess(`Checked health for ${selectedIds.size} key(s).`)
      fetchKeys()
    } catch (err: any) {
      setError(err.message || "Failed to check keys health.")
    } finally {
      setIsCheckingHealth(false)
    }
  }

  const filteredKeys = useMemo(() => {
    if (statusFilter === "ALL") return keys
    if (statusFilter === "Active") return keys.filter(k => k.status === 'Active' || k.status === 'ACTIVE')
    if (statusFilter === "Quota Exhausted") return keys.filter(k => k.status === 'Quota Exhausted' || k.status === 'INACTIVE' || k.status === 'RATE_LIMITED')
    if (statusFilter === "Token Invalid") return keys.filter(k => k.status === 'Token Invalid' || k.status === 'INVALID' || k.status === 'FAILED')
    return keys
  }, [keys, statusFilter])

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredKeys.map(k => k.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const selectAllByStatus = (statusToSelect: string) => {
    setStatusFilter(statusToSelect)
    let targetKeys: ApiKey[] = []
    if (statusToSelect === "ALL") targetKeys = keys
    else if (statusToSelect === "Active") targetKeys = keys.filter(k => k.status === 'Active' || k.status === 'ACTIVE')
    else if (statusToSelect === "Quota Exhausted") targetKeys = keys.filter(k => k.status === 'Quota Exhausted' || k.status === 'INACTIVE' || k.status === 'RATE_LIMITED')
    else if (statusToSelect === "Token Invalid") targetKeys = keys.filter(k => k.status === 'Token Invalid' || k.status === 'INVALID' || k.status === 'FAILED')
    
    setSelectedIds(new Set(targetKeys.map(k => k.id)))
  }

  const toggleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds)
    if (checked) newSet.add(id)
    else newSet.delete(id)
    setSelectedIds(newSet)
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AdminSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6 max-w-5xl mx-auto w-full">

          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Apify API Keys</h1>
            <p className="text-muted-foreground">Manage rotation, health, and fallbacks.</p>
          </div>

          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm border border-destructive/20 flex items-center gap-2">
              <XCircleIcon className="h-5 w-5 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md text-sm border border-green-500/20 flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 shrink-0" />
              {success}
            </div>
          )}

          {/* Add Key Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircleIcon className="h-5 w-5" />
                Bulk Add Keys
              </CardTitle>
              <CardDescription>
                Paste directly from a spreadsheet (like Google Sheets) to bulk-add multiple rows at once.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                
                <div className="md:col-span-4 space-y-2">
                  <Label>Key Name (e.g. Account Email)</Label>
                  <Input 
                    placeholder="my.email@gmail.com"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    onPaste={(e) => handlePaste(e, 'name')}
                  />
                </div>

                <div className="md:col-span-6 space-y-2">
                  <Label>Key Value</Label>
                  <Input 
                    placeholder="apify_api_..."
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                    onPaste={(e) => handlePaste(e, 'value')}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Provider</Label>
                  <Select value={provider} onValueChange={(val) => setProvider(val || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Apify">Apify</SelectItem>
                      {/* LLMs for future */}
                      <SelectItem value="OpenAI" disabled>OpenAI (Soon)</SelectItem>
                      <SelectItem value="Anthropic" disabled>Anthropic (Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-4">
              <Button 
                onClick={handleAddKeys}
                disabled={isAdding || !keyValue.trim()}
              >
                {isAdding ? <><SpinnerGap className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Add Keys"}
              </Button>
            </CardFooter>
          </Card>

          {/* Key Pool Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <KeyIcon className="h-5 w-5" />
                  Key Pool
                </CardTitle>
                <CardDescription>All keys currently in the rotation pool.</CardDescription>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Interactive Status Filter Tabs */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("ALL")}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                      statusFilter === "ALL"
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    All ({keySummary.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("Active")}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                      statusFilter === "Active"
                        ? "bg-emerald-600 text-white font-semibold shadow-sm"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200"
                    }`}
                  >
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                    Active ({keySummary.active})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("Quota Exhausted")}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                      statusFilter === "Quota Exhausted"
                        ? "bg-amber-600 text-white font-semibold shadow-sm"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200"
                    }`}
                  >
                    <ClockIcon className="h-3.5 w-3.5" />
                    Quota Exhausted ({keySummary.quotaExhausted})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("Token Invalid")}
                    className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                      statusFilter === "Token Invalid"
                        ? "bg-rose-600 text-white font-semibold shadow-sm"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200"
                    }`}
                  >
                    <XCircleIcon className="h-3.5 w-3.5" />
                    Token Invalid ({keySummary.tokenInvalid})
                  </button>
                </div>

                {keySummary.tokenInvalid > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    onClick={() => selectAllByStatus("Token Invalid")}
                  >
                    <XCircleIcon className="mr-1.5 h-3.5 w-3.5" />
                    Select All Invalid ({keySummary.tokenInvalid})
                  </Button>
                )}

                {selectedIds.size > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCheckHealth} disabled={isCheckingHealth}>
                      {isCheckingHealth ? <SpinnerGap className="mr-2 h-4 w-4 animate-spin" /> : <Heartbeat className="mr-2 h-4 w-4" />}
                      Check Health ({selectedIds.size})
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isDeleting}>
                      {isDeleting ? <SpinnerGap className="mr-2 h-4 w-4 animate-spin" /> : <TrashIcon className="mr-2 h-4 w-4" />}
                      Delete Selected ({selectedIds.size})
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {fetching ? (
                <div className="flex items-center justify-center py-8">
                  <SpinnerGap className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No keys configured.</div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="p-3 w-12 text-center">
                          <Checkbox 
                            checked={selectedIds.size === filteredKeys.length && filteredKeys.length > 0}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all"
                          />
                        </th>
                        <th className="p-3 font-medium">Name</th>
                        <th className="p-3 font-medium">Provider</th>
                        <th className="p-3 font-medium">Status</th>
                        <th className="p-3 font-medium min-w-[120px]">Health</th>
                        <th className="p-3 font-medium text-right">Last Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKeys.map(key => (
                        <tr key={key.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 text-center">
                            <Checkbox 
                              checked={selectedIds.has(key.id)}
                              onCheckedChange={(checked) => toggleSelect(key.id, !!checked)}
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-medium">{key.key_name || "Unnamed"}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={key.key_value}>
                              {key.key_value.substring(0, 15)}...
                            </div>
                          </td>
                          <td className="p-3">{key.provider}</td>
                          <td className="p-3">
                            <Badge variant={STATUS_CONFIG[key.status]?.variant || "outline"} className="inline-flex items-center gap-1 text-[10px]">
                              {STATUS_CONFIG[key.status]?.icon || <WarningCircleIcon className="h-3.5 w-3.5" />}
                              {STATUS_CONFIG[key.status]?.label || key.status || "Unknown"}
                            </Badge>
                            {key.fail_count > 0 && <span className="ml-2 text-xs text-muted-foreground">{key.fail_count} fails</span>}
                          </td>
                          <td className="p-3">
                            {key.health !== undefined && key.health !== null ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-full max-w-[80px] bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${key.health > 50 ? 'bg-emerald-500' : key.health > 15 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                      style={{ width: `${key.health}%` }} 
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground tabular-nums">{key.health}%</span>
                                </div>
                                {key.usage_usd !== undefined && key.limit_usd !== undefined && (
                                  <div className="text-[10px] text-muted-foreground tabular-nums font-semibold">
                                    (${Number(key.usage_usd).toFixed(3)} / ${Number(key.limit_usd).toFixed(3)})
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right tabular-nums text-xs">
                            {(key.last_used_at || key.last_used) ? new Date(key.last_used_at || key.last_used!).toLocaleDateString() : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
