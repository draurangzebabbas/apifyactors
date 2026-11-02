import webpush from "web-push"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privKey = process.env.VAPID_PRIVATE_KEY

    if (!pubKey || !privKey) {
      return NextResponse.json({ error: "VAPID keys not configured" }, { status: 503 })
    }

    webpush.setVapidDetails(
      "mailto:support@trafficflow.io",
      pubKey,
      privKey
    )

    const { subscription, payload } = await req.json()
    
    if (!subscription) {
      return NextResponse.json({ error: "No subscription provided" }, { status: 400 })
    }

    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
