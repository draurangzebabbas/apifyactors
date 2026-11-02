"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  SquaresFourIcon,
  GlobeIcon,
  PlusCircleIcon,
  CreditCardIcon,
  GearSixIcon,
  FileTextIcon,
  ShieldCheckIcon
} from "@phosphor-icons/react"
import { createClient } from "@/utils/supabase/client"
import { LogoIcon } from "@/components/logo"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState({
    name: "User",
    email: "user@example.com",
    avatar: "",
  })
  const [isAdminUser, setIsAdminUser] = React.useState(false)

  React.useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser({
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || "User",
          email: session.user.email || "",
          avatar: session.user.user_metadata?.avatar_url || "",
        })

        // Check admin status
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', session.user.id)
          .single()

        setIsAdminUser(!!adminData)
      }
    }
    fetchUser()
  }, [])

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <SquaresFourIcon />,
    },
    {
      title: "New Campaign",
      url: "/campaigns/new",
      icon: <PlusCircleIcon />,
    },
    {
      title: "All Campaigns",
      url: "/campaigns",
      icon: <GlobeIcon />,
    },
    {
      title: "Credits & Billing",
      url: "/billing",
      icon: <CreditCardIcon />,
    },
    ...(isAdminUser ? [
      {
        title: "Admin Panel",
        url: "/admin",
        icon: <ShieldCheckIcon />,
      }
    ] : [])
  ]

  const navSecondary = [
    {
      title: "Settings",
      url: "/settings",
      icon: <GearSixIcon />,
    },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="/dashboard" />}
            >
              <LogoIcon />
              <span className="text-base font-semibold">TrafficFlow</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
