import { Webhooks } from '@polar-sh/supabase';
import { createAdminClient } from '@/utils/supabase/admin';

export const dynamic = "force-dynamic";

export const POST = Webhooks({
  webhookSecret: (process.env.POLAR_WEBHOOK_SECRET || 'whsec_placeholder') as string,
  onPayload: async (payload: any) => {
    console.log("Polar webhook payload received:", payload.type);
  },

  // Handled when user purchases unit-pricing or one-time traffic credit pack
  onOrderCreated: async (payload: any) => {
    try {
      const supabase = createAdminClient();
      const order = payload.data;
      console.log("Polar onOrderCreated →", { id: order.id, amount: order.amount, productId: order.productId || order.product_id });

      const customerEmail: string | null = order.customer?.email || order.customerEmail || null;
      const metadata = order.metadata || {};
      let userId: string | null = order.customer?.externalId || order.customer?.external_id || metadata.user_id || null;

      if (!userId && customerEmail) {
        const { data: userRow } = await supabase.from('users').select('id').eq('email', customerEmail).single();
        userId = userRow?.id || null;
      }

      if (userId) {
        // Calculate units/credits:
        // Polar amounts are in cents (e.g. $100.00 = 10000 cents)
        const amountUsd = (order.amount || order.total_amount || 0) / 100;
        
        // 1 Unit ($1) = 1,000 Traffic Visits / Credits
        // Also checks if unit count is explicitly in items or metadata
        const unitsPurchased = order.units || order.items?.[0]?.units;
        const creditsAwarded = unitsPurchased
          ? unitsPurchased * 1000
          : (metadata.credits ? parseInt(metadata.credits, 10) : Math.round(amountUsd * 1000));

        if (creditsAwarded > 0) {
          const { data: currentCredits } = await supabase
            .from('traffic_credits')
            .select('balance, total_purchased')
            .eq('user_id', userId)
            .single();

          const prevBalance = currentCredits?.balance || 0;
          await supabase.from('traffic_credits').upsert({
            user_id: userId,
            balance: prevBalance + creditsAwarded,
            total_purchased: (currentCredits?.total_purchased || 0) + creditsAwarded,
            updated_at: new Date().toISOString()
          });

          await supabase.from('credit_transactions').insert({
            user_id: userId,
            type: 'purchase',
            amount: creditsAwarded,
            description: `Polar payment ($${amountUsd.toFixed(2)}) — ${creditsAwarded.toLocaleString()} traffic visits`,
            polar_order_id: order.id
          });

          console.log(`🎉 [Polar] Credited ${creditsAwarded.toLocaleString()} visits to user ${userId}`);
        }
      } else {
        console.warn("[Polar Webhook] Could not match order to a user ID:", customerEmail);
      }
    } catch (e) {
      console.error("Exception in onOrderCreated:", e);
    }
  },

  onSubscriptionCreated: async (payload: any) => {
    try {
      const supabase = createAdminClient();
      const s = payload.data;

      const userId: string | null = s.customer?.externalId ?? s.customer?.external_id ?? null;
      const customerEmail: string | null = s.customer?.email ?? null;
      const polarCustomerId: string | null = s.customerId ?? s.customer_id ?? null;
      const planId: string | null = s.productId ?? s.product_id ?? null;
      const periodEnd: string | null = s.currentPeriodEnd ?? s.current_period_end ?? null;

      console.log("onSubscriptionCreated →", { id: s.id, userId, planId, polarCustomerId, status: s.status });

      const { error } = await supabase.from('subscriptions').upsert({
        id: s.id,
        user_id: userId,
        email: customerEmail,
        polar_customer_id: polarCustomerId,
        status: s.status,
        plan_id: planId,
        current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
      }, { onConflict: 'id' });

      if (error) {
        console.error("Supabase upsert error in onSubscriptionCreated:", JSON.stringify(error));
      } else {
        console.log("✅ Subscription inserted:", s.id);
      }
    } catch (e) {
      console.error("Exception in onSubscriptionCreated:", e);
    }
  },

  onSubscriptionUpdated: async (payload: any) => {
    try {
      const supabase = createAdminClient();
      const s = payload.data;

      const userId: string | null = s.customer?.externalId ?? s.customer?.external_id ?? null;
      const customerEmail: string | null = s.customer?.email ?? null;
      const polarCustomerId: string | null = s.customerId ?? s.customer_id ?? null;
      const planId: string | null = s.productId ?? s.product_id ?? null;
      const periodEnd: string | null = s.currentPeriodEnd ?? s.current_period_end ?? null;

      console.log("onSubscriptionUpdated →", { id: s.id, userId, planId, status: s.status });

      const { error } = await supabase.from('subscriptions').upsert({
        id: s.id,
        user_id: userId,
        email: customerEmail,
        polar_customer_id: polarCustomerId,
        status: s.status,
        plan_id: planId,
        current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
      }, { onConflict: 'id' });

      if (error) {
        console.error("Supabase upsert error in onSubscriptionUpdated:", JSON.stringify(error));
      } else {
        console.log("✅ Subscription updated:", s.id);
      }
    } catch (e) {
      console.error("Exception in onSubscriptionUpdated:", e);
    }
  },

  onSubscriptionRevoked: async (payload: any) => {
    try {
      const supabase = createAdminClient();
      const s = payload.data;
      const periodEnd: string | null = s.currentPeriodEnd ?? s.current_period_end ?? null;

      console.log("onSubscriptionRevoked →", { id: s.id, status: s.status });

      const { error } = await supabase.from('subscriptions').update({
        status: s.status,
        current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
      }).eq('id', s.id);

      if (error) {
        console.error("Supabase update error in onSubscriptionRevoked:", JSON.stringify(error));
      } else {
        console.log("✅ Subscription revoked:", s.id);
      }
    } catch (e) {
      console.error("Exception in onSubscriptionRevoked:", e);
    }
  }
});
