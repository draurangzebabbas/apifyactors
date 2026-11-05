import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function verifyAdmin() {
  const supabase = createAdminClient();
  const userClient = await createClient();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return null;

  const { data: adminCheck } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return adminCheck ? user : null;
}

export async function POST(req: Request) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { keyIds } = await req.json();
    if (!keyIds || !Array.isArray(keyIds)) {
      return NextResponse.json({ error: "keyIds array required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: keys, error } = await supabase.from("api_keys").select("*").in("id", keyIds);
    if (error) throw new Error(error.message);

    const results = await Promise.all(
      (keys || []).map(async (key: any) => {
        try {
          const [userRes, lRes, uRes] = await Promise.all([
            fetch(`https://api.apify.com/v2/users/me?token=${key.key_value}`),
            fetch(`https://api.apify.com/v2/users/me/limits?token=${key.key_value}`),
            fetch(`https://api.apify.com/v2/users/me/usage/monthly?token=${key.key_value}`)
          ]);

          if (userRes.status === 401) {
            const updated = {
              status: "FAILED",
              health: 0,
              last_checked_at: new Date().toISOString()
            };
            await supabase.from("api_keys").update(updated).eq("id", key.id);
            return { id: key.id, ...updated };
          }

          const userData = userRes.ok ? await userRes.json().catch(() => ({})) : {};
          const lBody = lRes.ok ? await lRes.json().catch(() => ({})) : {};
          const uBody = uRes.ok ? await uRes.json().catch(() => ({})) : {};

          const actualEmail = userData?.data?.email || userData?.data?.username || key.key_name;
          const usage_usd = Number(
            uBody?.data?.totalUsageCreditsUsdAfterVolumeDiscount ??
            lBody?.data?.current?.monthlyUsageUsd ??
            key.usage_usd ??
            0
          );
          const limit_usd = Number(
            lBody?.data?.limits?.maxMonthlyUsageUsd ??
            key.limit_usd ??
            5.0
          );

          const actorsEnabled = userData?.data?.effectivePlatformFeatures?.ACTORS?.isEnabled !== false;
          const hardLimitExceeded = userData?.data?.effectivePlatformFeatures?.ACTORS?.disabledReasonType === "MONTHLY_TOTAL_USAGE_HARD_LIMIT_EXCEEDED";

          let status = "ACTIVE";
          let health = 100;

          if (!actorsEnabled || hardLimitExceeded || usage_usd >= limit_usd || uRes.status === 429) {
            status = "RATE_LIMITED";
            health = 0;
          } else if (limit_usd > 0) {
            const pct = (usage_usd / limit_usd) * 100;
            health = Math.max(0, Math.round(100 - pct));
          }

          const updated = {
            key_name: actualEmail,
            status,
            health,
            usage_usd,
            limit_usd,
            last_checked_at: new Date().toISOString()
          };

          await supabase.from("api_keys").update(updated).eq("id", key.id);
          return { id: key.id, ...updated };
        } catch (e: any) {
          return { id: key.id, status: "ERROR", error: e.message };
        }
      })
    );

    return NextResponse.json({ success: true, updatedKeys: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

