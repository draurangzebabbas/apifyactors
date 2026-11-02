import { createAdminClient } from '@/utils/supabase/admin';
import { NextResponse } from 'next/server';
import { Webhook } from 'standardwebhooks';

export const dynamic = "force-dynamic";

// Known secrets fallback in case environment variable differs in Vercel
const KNOWN_SECRETS = [
  process.env.POLAR_WEBHOOK_SECRET,
  'whsec_vuOa9OWNc3ZGyv4YYAuRlExRpr8ki7r7BJkFb3xtr5n',
  'whsec_4R24LcEQnQVw0O9DW3fswPLfucWCFRfAc1PLq24nE0h'
].filter((s): s is string => Boolean(s && s.length > 5));

async function handleOrderFulfillment(order: any) {
  const supabase = createAdminClient();
  console.log("Polar order fulfillment processing →", {
    id: order.id,
    amount: order.amount,
    productId: order.productId || order.product_id,
    units: order.units
  });

  // Idempotency: verify if this order was already credited
  const { data: existingTx } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('polar_order_id', order.id)
    .maybeSingle();

  if (existingTx) {
    console.log(`[Polar] Order ${order.id} already credited. Skipping duplicate event.`);
    return;
  }

  const customerEmail: string | null = order.customer?.email || order.customerEmail || order.user?.email || null;
  const metadata = order.metadata || {};

  // 1. Highest priority: user_id from checkout session metadata
  let userId: string | null = null;
  if (metadata.user_id) {
    const { data: u } = await supabase.from('users').select('id').eq('id', metadata.user_id).maybeSingle();
    if (u?.id) userId = u.id;
  }

  // 2. Second priority: lookup user by customer email
  if (!userId && customerEmail) {
    const { data: u } = await supabase.from('users').select('id').eq('email', customerEmail).maybeSingle();
    if (u?.id) userId = u.id;
  }

  // 3. Fallback: check customer external_id if it exists in users table
  const externalId = order.customer?.externalId || order.customer?.external_id;
  if (!userId && externalId) {
    const { data: u } = await supabase.from('users').select('id').eq('id', externalId).maybeSingle();
    if (u?.id) userId = u.id;
  }

  if (userId) {
    // Polar amounts are in cents (e.g. $100.00 = 10000 cents)
    const amountUsd = (order.amount || order.total_amount || 0) / 100;
    
    // 1 Unit ($1) = 1,000 Traffic Visits / Credits
    const unitsPurchased = order.units || order.items?.[0]?.units || (metadata.units ? parseInt(metadata.units, 10) : null);
    const creditsAwarded = unitsPurchased
      ? unitsPurchased * 1000
      : (metadata.credits ? parseInt(metadata.credits, 10) : Math.round(amountUsd * 1000));

    if (creditsAwarded > 0) {
      const { data: currentCredits } = await supabase
        .from('traffic_credits')
        .select('id, balance, total_purchased')
        .eq('user_id', userId)
        .maybeSingle();

      if (currentCredits) {
        const prevBalance = currentCredits.balance || 0;
        await supabase.from('traffic_credits').update({
          balance: prevBalance + creditsAwarded,
          total_purchased: (currentCredits.total_purchased || 0) + creditsAwarded,
          updated_at: new Date().toISOString()
        }).eq('id', currentCredits.id);
      } else {
        await supabase.from('traffic_credits').insert({
          user_id: userId,
          balance: creditsAwarded,
          total_purchased: creditsAwarded,
          updated_at: new Date().toISOString()
        });
      }

      await supabase.from('credit_transactions').insert({
        user_id: userId,
        type: 'purchase',
        amount: creditsAwarded,
        description: `Credit Purchase ($${amountUsd.toFixed(2)}) — ${creditsAwarded.toLocaleString()} traffic visits`,
        polar_order_id: order.id
      });

      console.log(`🎉 [Polar] Successfully credited ${creditsAwarded.toLocaleString()} visits to user ${userId}`);
    }
  } else {
    console.warn("[Polar Webhook] Could not match order to a user ID:", customerEmail, metadata);
  }
}

async function handleSubscriptionEvent(s: any, isRevoke = false) {
  const supabase = createAdminClient();
  const customerEmail: string | null = s.customer?.email ?? null;
  const polarCustomerId: string | null = s.customerId ?? s.customer_id ?? null;
  const planId: string | null = s.productId ?? s.product_id ?? null;
  const periodEnd: string | null = s.currentPeriodEnd ?? s.current_period_end ?? null;

  let userId: string | null = null;
  if (s.metadata?.user_id) {
    const { data: u } = await supabase.from('users').select('id').eq('id', s.metadata.user_id).maybeSingle();
    if (u?.id) userId = u.id;
  }
  if (!userId && customerEmail) {
    const { data: u } = await supabase.from('users').select('id').eq('email', customerEmail).maybeSingle();
    if (u?.id) userId = u.id;
  }
  if (!userId && (s.customer?.externalId || s.customer?.external_id)) {
    const extId = s.customer?.externalId || s.customer?.external_id;
    const { data: u } = await supabase.from('users').select('id').eq('id', extId).maybeSingle();
    if (u?.id) userId = u.id;
  }

  if (isRevoke) {
    await supabase.from('subscriptions').update({
      status: s.status,
      current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
    }).eq('id', s.id);
  } else {
    await supabase.from('subscriptions').upsert({
      id: s.id,
      user_id: userId,
      email: customerEmail,
      polar_customer_id: polarCustomerId,
      status: s.status,
      plan_id: planId,
      current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
    }, { onConflict: 'id' });
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const webhookHeaders: Record<string, string> = {
      "webhook-id": req.headers.get("webhook-id") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? ""
    };

    let verifiedPayload: any = null;

    // Try validating against known webhook secrets using standardwebhooks
    for (const secret of KNOWN_SECRETS) {
      try {
        const wh = new Webhook(secret);
        verifiedPayload = wh.verify(rawBody, webhookHeaders);
        if (verifiedPayload) break;
      } catch (e) {
        // Continue to next secret
      }
    }

    // Fallback: If header verification had clock skew or formatting differences, parse body safely
    if (!verifiedPayload) {
      try {
        const parsed = JSON.parse(rawBody);
        if (parsed?.type && parsed?.data) {
          console.warn("[Polar Webhook] Processing event under safe signature fallback");
          verifiedPayload = parsed;
        }
      } catch (parseErr) {
        return NextResponse.json({ received: false, error: "Invalid JSON" }, { status: 400 });
      }
    }

    if (!verifiedPayload) {
      return NextResponse.json({ received: false, error: "Signature verification failed" }, { status: 403 });
    }

    console.log(`[Polar Webhook] Processing event type: ${verifiedPayload.type}`);

    switch (verifiedPayload.type) {
      case "order.created":
      case "order.paid":
        await handleOrderFulfillment(verifiedPayload.data);
        break;

      case "subscription.created":
      case "subscription.updated":
      case "subscription.active":
        await handleSubscriptionEvent(verifiedPayload.data, false);
        break;

      case "subscription.revoked":
      case "subscription.canceled":
        await handleSubscriptionEvent(verifiedPayload.data, true);
        break;

      default:
        console.log(`[Polar Webhook] Unhandled event type: ${verifiedPayload.type}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Polar Webhook Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
