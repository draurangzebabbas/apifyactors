import { createAdminClient } from "@/utils/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const { subscription, userId } = await req.json()

    if (subscription === undefined || !userId) {
      return NextResponse.json({ error: "Missing subscription or userId" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase
      .from("users")
      .update({ push_subscription: subscription })
      .eq("id", userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
