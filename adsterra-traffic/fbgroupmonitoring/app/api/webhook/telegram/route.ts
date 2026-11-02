import { createAdminClient } from "@/utils/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Telegram webhook payload checking
    if (body.message && body.message.text) {
      const text = body.message.text
      const chatId = body.message.chat.id
      
      // We expect the user to click a link like t.me/Bot?start=user_id
      // Telegram sends this as "/start user_id"
      if (text.startsWith("/start ")) {
        const userId = text.replace("/start ", "").trim()
        
        const supabase = createAdminClient()
        // Update user record in Supabase
        const { error } = await supabase
          .from("users")
          .update({ telegram_chat_id: chatId.toString() })
          .eq("id", userId)
          
        if (error) {
          console.error("Error updating user telegram chat id:", error)
        } else {
          // Send a welcome message back to the user via Telegram API
          if (process.env.TELEGRAM_BOT_TOKEN) {
            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: "Successfully connected! You will now receive traffic campaign notifications here."
              })
            })
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Telegram webhook error:", err)
    return NextResponse.json({ error: "Internal Error" }, { status: 500 })
  }
}
