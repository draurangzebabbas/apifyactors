import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
                text: "Successfully connected! You will now receive keyword match notifications here."
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
