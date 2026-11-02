import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// We use the service role key to securely write to the user's record
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { subscription, userId } = await req.json()
    
    if (subscription === undefined || !userId) {
      return NextResponse.json({ error: "Missing subscription or userId" }, { status: 400 })
    }

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
