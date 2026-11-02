const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rrogfuzzgvrwvywfagtz.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_SERVICE_ROLE_KEY'
);

async function findKeyWithQuota() {
  const { data: keys } = await supabase
    .from('api_keys')
    .select('id, key_name, key_value, usage_usd, limit_usd')
    .neq('status', 'Token Invalid');

  console.log(`Checking quota for ${keys?.length || 0} candidate keys...`);

  for (const k of (keys || [])) {
    try {
      const [uRes, lRes] = await Promise.all([
        fetch(`https://api.apify.com/v2/users/me/usage/monthly?token=${k.key_value}`),
        fetch(`https://api.apify.com/v2/users/me/limits?token=${k.key_value}`)
      ]);

      const uBody = await uRes.json().catch(() => ({}));
      const lBody = lRes.ok ? await lRes.json().catch(() => ({})) : {};

      const usage = Number(
        uBody?.data?.totalUsageCreditsUsdAfterVolumeDiscount ??
        lBody?.data?.current?.monthlyUsageUsd ??
        k.usage_usd ??
        0
      );
      const limit = Number(
        lBody?.data?.limits?.maxMonthlyUsageUsd ??
        k.limit_usd ??
        5.0
      );

      const remaining = limit - usage;
      const isAlive = remaining > 0.005 && uRes.ok;
      const health = limit > 0 ? Math.max(0, Math.min(100, Math.round((remaining / limit) * 100))) : 0;
      const status = isAlive ? 'Active' : 'Quota Exhausted';

      console.log(`Key [${k.key_name}]: Used $${usage.toFixed(3)} / $${limit.toFixed(3)} (Remaining: $${remaining.toFixed(3)}) -> ${status}`);

      await supabase.from('api_keys').update({
        status,
        health,
        usage_usd: usage,
        limit_usd: limit,
        ...(isAlive ? { fail_count: 0, cooldown_until: null } : {})
      }).eq('id', k.id);

      if (isAlive) {
        console.log(`🎉 READY KEY FOUND: ${k.key_name} (Remaining: $${remaining.toFixed(3)})`);
      }
    } catch (e) {
      console.warn(`Error checking key ${k.key_name}:`, e.message);
    }
  }
}

findKeyWithQuota();

