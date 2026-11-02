import { CustomerPortal } from "@polar-sh/supabase";
import { createClient } from "@/utils/supabase/server";

import { NextResponse } from "next/server";

const polarPortalHandler = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN as string,
  getCustomerId: async (req) => {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return "";

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('polar_customer_id')
        .eq('user_id', user.id)
        .not('polar_customer_id', 'is', null)
        .limit(1)
        .maybeSingle();

      return sub?.polar_customer_id || "";
    } catch (e) {
      console.error("Error resolving customer ID for portal:", e);
      return "";
    }
  },
  returnUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
});

export const GET = async (req: Request) => {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', req.url));

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('polar_customer_id')
      .eq('user_id', user.id)
      .not('polar_customer_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (!sub || !sub.polar_customer_id) {
      // Redirect to a specific page that asks them to subscribe
      return NextResponse.redirect(new URL('/dashboard/billing', req.url));
    }

    return polarPortalHandler(req);
  } catch (e) {
    console.error("Error in portal GET:", e);
    return NextResponse.redirect(new URL('/dashboard?error=portal_error', req.url));
  }
};