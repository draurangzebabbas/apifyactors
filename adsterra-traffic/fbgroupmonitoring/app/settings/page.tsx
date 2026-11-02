"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { GearSixIcon } from "@phosphor-icons/react"
import { NotificationSettings } from "@/components/notification-settings"

export default function SettingsPage() {
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
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-8 max-w-4xl mx-auto w-full">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <GearSixIcon className="h-8 w-8 text-muted-foreground" />
              Settings
            </h1>
            <p className="text-muted-foreground">
              Manage your account preferences and notification settings.
            </p>
          </div>

          <NotificationSettings />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
