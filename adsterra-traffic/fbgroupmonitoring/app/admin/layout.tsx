import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Enforce Admin access
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!adminUser) {
    redirect("/dashboard")
  }

  return (
    <div className="flex flex-col min-h-screen">
      {children}
    </div>
  )
}
