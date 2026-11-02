import { Polar } from "@polar-sh/sdk";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const POLAR_UNIT_PRODUCT_ID = process.env.POLAR_UNIT_PRODUCT_ID || "61f8dcb9-7b29-4877-9e85-38f4721ac085";

export const GET = async (req: Request) => {
  try {
    const token = process.env.POLAR_ACCESS_TOKEN;
    if (!token || token === "polar_placeholder" || token.length < 10) {
      return NextResponse.json({
        error: "Polar Configuration Error",
        message: "POLAR_ACCESS_TOKEN is missing or not configured in environment variables.",
        hint: "Please generate an Access Token in your Polar dashboard and add POLAR_ACCESS_TOKEN to your Vercel Project Settings."
      }, { status: 500 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const url = new URL(req.url);
    const productId = url.searchParams.get("products") || url.searchParams.get("productId") || POLAR_UNIT_PRODUCT_ID;
    const unitsParam = url.searchParams.get("units");
    const units = unitsParam ? parseInt(unitsParam, 10) : 100;

    // Dynamically resolve base URL from incoming request headers
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "trafficflowdraurangzebabbas.vercel.app";
    const origin = `${proto}://${host}`;

    const successUrl = process.env.POLAR_SUCCESS_URL || `${origin}/billing?status=success&checkout_id={CHECKOUT_ID}`;
    const returnUrl = process.env.NEXT_PUBLIC_APP_URL || `${origin}/billing`;

    const serverMode: "sandbox" | "production" = 
      process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production";

    const polar = new Polar({
      accessToken: token,
      server: serverMode
    });

    const metadata: Record<string, string | number> = {
      units,
      credits: units * 1000
    };
    if (user?.id) {
      metadata.user_id = user.id;
    }

    const session = await polar.checkouts.create({
      products: [productId],
      successUrl,
      returnUrl,
      externalCustomerId: user?.id,
      customerEmail: user?.email || undefined,
      metadata
    });

    if (session?.url) {
      return NextResponse.redirect(session.url, 303);
    }

    return NextResponse.json({ error: "No checkout URL returned by Polar" }, { status: 500 });
  } catch (err: any) {
    console.error("Polar Checkout Creation Error:", err);
    return NextResponse.json({
      error: "Polar Checkout Failed",
      message: err.message || "Failed to create checkout session with Polar",
      details: err.detail || err.body || String(err),
      hint: "Make sure POLAR_ACCESS_TOKEN is valid and active in your Polar dashboard."
    }, { status: 400 });
  }
};
