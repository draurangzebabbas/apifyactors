"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Bell, SlackLogo, TelegramLogo, Question, X } from "@phosphor-icons/react"

// ─── Slack Setup Guide Popover ───────────────────────────────────────────────
function SlackGuide() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Slack setup guide"
      >
        <Question className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute left-6 top-0 z-50 w-80 rounded-none border border-border bg-popover shadow-xl p-4 text-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-foreground">How to get a Slack Webhook URL</p>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ol className="space-y-2 text-muted-foreground list-none">
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
              <span>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">api.slack.com/apps</a> → Create New App → From scratch</span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
              <span>Name it and pick any workspace.</span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
              <span>Click <strong>Incoming Webhooks</strong> → toggle it <strong>ON</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">4</span>
              <span>Click <strong>Add New Webhook to Workspace</strong> → choose the channel</span>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">5</span>
              <span>Copy the URL and paste it below</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  )
}

export function NotificationSettings() {
  const [slackUrl, setSlackUrl] = useState("")
  const [savedSlackUrl, setSavedSlackUrl] = useState("")
  const [pushEnabled, setPushEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  
  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data } = await supabase
        .from("users")
        .select("slack_webhook_url, telegram_chat_id, push_subscription")
        .eq("id", user.id)
        .single()
        
      if (data) {
        setSlackUrl(data.slack_webhook_url || "")
        setSavedSlackUrl(data.slack_webhook_url || "")
        setPushEnabled(!!data.push_subscription)
      }
      setLoading(false)
    }
    loadSettings()
  }, [supabase])

  async function saveSlack() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("users")
      .update({ slack_webhook_url: slackUrl })
      .eq("id", user.id)

    if (error) {
      toast.error("Failed to save Slack webhook")
    } else {
      toast.success("Slack webhook saved!")
      setSavedSlackUrl(slackUrl)
    }
    setSaving(false)
  }

  async function deleteSlack() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("users")
      .update({ slack_webhook_url: null })
      .eq("id", user.id)

    if (error) {
      toast.error("Failed to delete Slack webhook")
    } else {
      toast.success("Slack webhook deleted!")
      setSlackUrl("")
      setSavedSlackUrl("")
    }
    setSaving(false)
  }

  async function enablePush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast.error("Push notifications are not supported in your browser.")
        return false
      }

      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        toast.error("Permission denied for push notifications.")
        return false
      }

      const registration = await navigator.serviceWorker.register("/sw.js")
      await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const response = await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          userId: user.id
        })
      })

      if (response.ok) {
        toast.success("Push notifications enabled!")
        return true
      } else {
        toast.error("Failed to enable push notifications.")
        return false
      }
    } catch (error: any) {
      toast.error(error.message)
      return false
    }
  }

  async function disablePush() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const response = await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: null,
          userId: user.id
        })
      })

      if (response.ok) {
        toast.success("Push notifications disabled")
        return true
      } else {
        toast.error("Failed to disable push notifications")
        return false
      }
    } catch (error: any) {
      toast.error(error.message)
      return false
    }
  }

  async function handlePushToggle(checked: boolean) {
    if (checked) {
      const success = await enablePush()
      if (success) setPushEnabled(true)
    } else {
      const success = await disablePush()
      if (success) setPushEnabled(false)
    }
  }

  if (loading) return <div className="text-muted-foreground animate-pulse mt-8">Loading settings...</div>

  return (
    <div className="space-y-6 mt-8">
      {/* Web Push */}
      <div className="flex flex-col gap-3 p-6 border rounded-none bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Web Push Notifications</h2>
          </div>
          <Switch checked={pushEnabled} onCheckedChange={handlePushToggle} />
        </div>
        <p className="text-muted-foreground text-sm">
          Get notified instantly on this device even when the app is closed.
        </p>
      </div>

      {/* Slack */}
      <div className="flex flex-col gap-3 p-6 border rounded-none bg-card">
        <div className="flex items-center gap-2">
          <SlackLogo className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Slack Notifications</h2>
          <SlackGuide />
        </div>
        <p className="text-muted-foreground text-sm">
          Send keyword matches directly to your personal Slack channel.
        </p>
        
        {savedSlackUrl ? (
          <div className="flex items-center justify-between mt-2 p-3 border rounded-none bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Webhook Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSavedSlackUrl("")}>Edit</Button>
              <Button variant="destructive" size="sm" onClick={deleteSlack} disabled={saving}>Delete</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 mt-2">
            <Input 
              placeholder="https://hooks.slack.com/services/..." 
              value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
            />
            <Button onClick={saveSlack} disabled={saving || !slackUrl}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Telegram */}
      <div className="flex flex-col gap-3 p-6 border rounded-none bg-card">
        <div className="flex items-center gap-2">
          <TelegramLogo className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Telegram Notifications</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Instantly receive notifications in Telegram. 
        </p>
        <Button onClick={() => window.open("https://t.me/YOUR_BOT_USERNAME", "_blank")} className="w-fit mt-2" variant="outline">
          Connect Telegram
        </Button>
      </div>
    </div>
  )
}
