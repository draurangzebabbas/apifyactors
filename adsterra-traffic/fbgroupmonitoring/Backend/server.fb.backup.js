const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { ApifyClient } = require('apify-client');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const webpush = require('web-push');


// ΓöÇΓöÇ Startup clock diagnostics ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// If this offset is non-zero, the server's local clock Γëá UTC, which causes
// relative-time strings like "1 hour ago" to be anchored to the wrong time.
console.log(`[Server] ΓÅ░ Server startup UTC time: ${new Date().toISOString()} | Local offset: ${-(new Date().getTimezoneOffset())/60}h`);
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@fbmonitor.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  console.log('[WebPush] Γ£à VAPID keys loaded successfully.');
} else {
  console.warn('[WebPush] ΓÜá∩╕Å VAPID keys missing in environment! Web push notifications will fail.');
}

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

app.use(express.json());




// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼
// Supabase Admin Client (service role ├óΓé¼ΓÇ¥ bypasses RLS)
// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[FATAL] Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼
// Cookie Encryption Utilities (AES-256-CBC)
// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼
const COOKIE_KEY = process.env.COOKIE_ENCRYPTION_KEY;
if (!COOKIE_KEY || Buffer.from(COOKIE_KEY, 'hex').length !== 32) {
  console.error('[FATAL] COOKIE_ENCRYPTION_KEY must be a 64-char hex string (32 bytes).');
  console.error('  Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

function encryptCookie(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(COOKIE_KEY, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptCookie(ciphertext) {
  try {
    if (!ciphertext || typeof ciphertext !== 'string') return '';
    if (!ciphertext.includes(':')) return ciphertext;
    const [ivHex, encHex] = ciphertext.split(':');
    if (!ivHex || !encHex) return ciphertext;
    const iv = Buffer.from(ivHex, 'hex');
    if (iv.length !== 16) return ciphertext;
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(COOKIE_KEY, 'hex'), iv);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.warn('[Cookie] Decryption fallback to raw value:', err.message);
    return ciphertext;
  }
}

// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼
// KeyManager ├óΓé¼ΓÇ¥ Apify API Key Rotation
// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼
async function checkApifyKeyHealth(key) {
  try {
    // Fetch BOTH endpoints in parallel — we always want real numbers regardless of status
    const [uRes, lRes] = await Promise.all([
      fetch(`https://api.apify.com/v2/users/me/usage/monthly?token=${key.key_value}`),
      fetch(`https://api.apify.com/v2/users/me/limits?token=${key.key_value}`)
    ]);

    // Parse bodies best-effort
    const uBody = await uRes.json().catch(() => ({}));
    const lBody = lRes.ok ? await lRes.json().catch(() => ({})) : {};

    // Extract real numbers (or fall back to existing DB values / sensible defaults)
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

    // ── 401 Unauthorized → genuinely bad token string ──────────────────────
    if (uRes.status === 401) {
      console.log(`❌ [KeyManager] Key ${key.key_name || key.id} is Token Invalid (401 Unauthorized). usage=$${usage_usd.toFixed(3)} / $${limit_usd.toFixed(3)}`);
      const updateData = { status: 'Token Invalid', health: 0, usage_usd, limit_usd };
      const { error: dbErr } = await supabase.from('api_keys').update(updateData).eq('id', key.id);
      if (dbErr) console.error(`❌ [KeyManager] DB update error for key ${key.key_name || key.id}:`, dbErr.message);
      return { ...key, ...updateData };
    }

    // ── Other non-OK responses (402 / 429 / etc.) ────────────────────────────
    if (!uRes.ok) {
      const errMsg = uBody?.error?.message || uRes.statusText || '';
      console.log(`⚠️ [KeyManager] Key ${key.key_name || key.id} HTTP ${uRes.status}: ${errMsg}. usage=$${usage_usd.toFixed(3)} / $${limit_usd.toFixed(3)}`);

      const isAuthError = /token is not valid|user was not found|invalid token/i.test(errMsg);
      const isQuota    = uRes.status === 429 || uRes.status === 402 || /quota|monthly|limit|exceed/i.test(errMsg);

      const status = isAuthError ? 'Token Invalid' : (isQuota ? 'Quota Exhausted' : (key.status || 'Active'));
      const health = (isAuthError || isQuota) ? 0 : (key.health ?? 50);

      const updateData = { status, health, usage_usd, limit_usd };
      const { error: dbErr } = await supabase.from('api_keys').update(updateData).eq('id', key.id);
      if (dbErr) console.error(`❌ [KeyManager] DB update error for key ${key.key_name || key.id}:`, dbErr.message);
      return { ...key, ...updateData };
    }

    // ── Successful response ──────────────────────────────────────────────────
    const remainingUsd = limit_usd - usage_usd;
    let health = 100;
    if (limit_usd > 0) {
      health = Math.max(0, Math.min(100, Math.round((remainingUsd / limit_usd) * 100)));
    }

    let status = 'Active';
    if (usage_usd >= limit_usd || remainingUsd <= 0.005) {
      status = 'Quota Exhausted';
      health = 0;
      console.log(`❌ [KeyManager] Key ${key.key_name || key.id}: Quota Exhausted — $${usage_usd.toFixed(3)} / $${limit_usd.toFixed(3)}`);
    } else {
      console.log(`✅ [KeyManager] Key ${key.key_name || key.id}: Active — $${usage_usd.toFixed(3)} / $${limit_usd.toFixed(3)} remaining $${remainingUsd.toFixed(3)}`);
    }

    const updateData = {
      status,
      health,
      usage_usd,
      limit_usd,
      ...(status === 'Active' ? { cooldown_until: null, fail_count: 0 } : {})
    };

    const { error: dbErr } = await supabase.from('api_keys').update(updateData).eq('id', key.id);
    if (dbErr) console.error(`❌ [KeyManager] DB update error for key ${key.key_name || key.id}:`, dbErr.message);
    return { ...key, ...updateData };

  } catch (err) {
    console.log(`⚠️ [KeyManager] Key ${key.key_name || key.id} health check network error: ${err.message}`);
    // Network/timeout errors — do NOT change status or numbers
    return { ...key };
  }
}


class KeyManager {
  constructor() {
    this.keys = [];
    this.currentIndex = 0;
    this.MIN_ACTIVE_THRESHOLD = 1;
  }

  async init() {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .neq('status', 'Token Invalid')
      .neq('status', 'INVALID')
      .order('last_used_at', { ascending: true, nullsFirst: true });

    if (error) throw new Error(`KeyManager init failed: ${error.message}`);
    this.keys = data || [];
    console.log(`[KeyManager] Loaded ${this.keys.length} keys from database.`);
  }

  getAvailableKeys() {
    return this.keys.filter(k => k.status === 'Active' || k.status === 'ACTIVE');
  }

  async getNextKey() {
    const active = await this.getActiveKeys();
    if (!active || active.length === 0) {
      console.warn('⚠️ [KeyManager] No active keys available.');
      return null;
    }

    return active[0];
  }

  async testKeyHealth(key) {
    const updated = await checkApifyKeyHealth(key);
    if (updated.status === 'Token Invalid') {
      this.keys = this.keys.filter(k => k.id !== key.id);
      return false;
    }
    const isAlive = updated.status === 'Active' || updated.status === 'ACTIVE';
    const index = this.keys.findIndex(k => k.id === key.id);
    if (index !== -1) {
      this.keys[index] = { ...this.keys[index], ...updated };
    }
    return isAlive;
  }

  async getActiveKeys() {
    let active = this.keys.filter(k => k.status === 'Active' || k.status === 'ACTIVE');

    // Proactive Health Check: if fewer than 5 active keys, re-check ALL candidate keys
    // (both current active keys and Quota Exhausted keys to ensure fresh usage_usd / limit_usd numbers
    // are saved in the DB, see if any keys recovered, or if active keys actually hit quota limits)
    if (active.length < 5) {
      const candidateKeys = this.keys.filter(k =>
        k.status !== 'Token Invalid' &&
        k.status !== 'INVALID'
      );

      if (candidateKeys.length > 0) {
        console.log(`🚨 [KeyManager] Active keys < 5 (${active.length}). Proactive health check on ${candidateKeys.length} candidate key(s)...`);

        const recoveredKeys = [];
        await Promise.all(candidateKeys.map(async (key) => {
          const isAlive = await this.testKeyHealth(key);
          const updatedKey = this.keys.find(k => k.id === key.id);
          if (isAlive && updatedKey && (updatedKey.status === 'Active' || updatedKey.status === 'ACTIVE')) {
            console.log(`🎉 [KeyManager] Key "${updatedKey.key_name || updatedKey.id}" is Active ($${Number(updatedKey.usage_usd || 0).toFixed(3)} / $${Number(updatedKey.limit_usd || 5).toFixed(3)})!`);
            recoveredKeys.push(updatedKey);
          }
        }));

        active = recoveredKeys;
      }
    }

    if (active.length === 0) {
      console.warn('🚨 [KeyManager] No active keys available for automation.');
      return [];
    }

    // LRU: sort by last_used_at ascending (least-recently-used first)
    active.sort((a, b) => {
      if (!a.last_used_at) return -1;
      if (!b.last_used_at) return 1;
      return new Date(a.last_used_at) - new Date(b.last_used_at);
    });

    return active;
  }


  async markSuccess(keyId) {
    const now = new Date().toISOString();
    await supabase.from('api_keys').update({
      last_used_at: now,
      fail_count: 0,
    }).eq('id', keyId);
    const memKey = this.keys.find(k => k.id === keyId);
    if (memKey) {
      memKey.last_used_at = now;
      memKey.fail_count = 0;
    }
  }

  async markFailure(keyId, httpStatus, errorMsg = '') {
    const isQuotaError = httpStatus === 429 || httpStatus === 402 || /monthly usage|hard limit|quota|usage limit|plan limit|exceed/i.test(errorMsg);
    const isAuthError = !isQuotaError && (httpStatus === 401 || /token is not valid|user was not found|invalid token/i.test(errorMsg));
    const newStatus = isAuthError ? 'Token Invalid' : 'Quota Exhausted';

    const key = this.keys.find(k => k.id === keyId);
    const newFailCount = (key ? key.fail_count : 0) + 1;

    // Immediately persist failure status in DB
    await supabase.from('api_keys').update({
      status: newStatus,
      fail_count: newFailCount,
      ...(isQuotaError ? { health: 0 } : {})
    }).eq('id', keyId);

    if (isAuthError) {
      // Token Invalid: immediately eject from in-memory pool — automation must never touch this key again
      this.keys = this.keys.filter(k => k.id !== keyId);
      console.warn(`❌ [KeyManager] Key ${key ? key.key_name : keyId} marked Token Invalid (fail #${newFailCount}) — ejected from automation pool.`);
    } else {
      // Quota Exhausted: keep in memory with updated status so proactive health checks can revive it next month
      if (key) {
        key.status = newStatus;
        key.fail_count = newFailCount;
        key.health = 0;
      }
      console.warn(`❌ [KeyManager] Key ${key ? key.key_name : keyId} marked ${newStatus} (fail #${newFailCount}) — skipped by automation until quota resets.`);

      // Also refresh usage_usd & limit_usd in DB so UI quota bar immediately shows updated values
      if (key) {
        checkApifyKeyHealth(key).catch(err => {
          console.warn(`⚠️ [KeyManager] Failed to refresh quota after failure for ${key.key_name || keyId}:`, err.message);
        });
      }
    }
  }
}


// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼
// CookiePoolManager ├óΓé¼ΓÇ¥ Per-group Facebook Cookie Rotation
// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼
class CookiePoolManager {
  /**
   * Returns the least-recently-used ACTIVE cookie for a group.
   * Joins group_members with user_cookies.
   */
  async getNextCookie(groupId) {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        cookie_id,
        user_cookies!inner (id, cookie_value, status, fail_count, last_used_at, last_failed_at)
      `)
      .eq('group_id', groupId)
      .eq('is_active', true)
      .eq('user_cookies.status', 'ACTIVE')
      .order('user_cookies(last_used_at)', { ascending: true, nullsFirst: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`[CookiePool] Error fetching cookie for group ${groupId}:`, error);
      return null;
    }
    return data && data.user_cookies ? Array.isArray(data.user_cookies) ? data.user_cookies[0] : data.user_cookies : null;
  }

  async markSuccess(cookieId) {
    await supabase.from('user_cookies').update({
      last_used_at: new Date().toISOString(),
      fail_count: 0,
    }).eq('id', cookieId);
  }

  async markFailed(cookieId) {
    const { data: cookie } = await supabase
      .from('user_cookies').select('fail_count').eq('id', cookieId).maybeSingle();
    const newFailCount = (cookie?.fail_count || 0) + 1;

    await supabase.from('user_cookies').update({
      status: 'FAILED',
      fail_count: newFailCount,
      last_failed_at: new Date().toISOString(),
    }).eq('id', cookieId);

    console.warn(`[CookiePool] Cookie ${cookieId} marked FAILED (fail #${newFailCount})`);
  }

  async checkGroupHealth(groupId) {
    const { count, error } = await supabase
      .from('group_members')
      .select('cookie_id, user_cookies!inner(id, status)', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('is_active', true)
      .eq('user_cookies.status', 'ACTIVE');
      
    if (error) {
      console.error(`[CookiePool] checkGroupHealth error for ${groupId}:`, error.message);
      return;
    }

    if (count === 0) {
      await supabase.from('groups').update({ status: 'NEEDS_COOKIE' }).eq('id', groupId);
      console.warn(`[CookiePool] Group ${groupId} has no active cookies ├óΓÇáΓÇÖ NEEDS_COOKIE`);
    }
  }
}

const keyManager = new KeyManager();
const cookiePool = new CookiePoolManager();

// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼
// Scraping Worker
// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼
async function scrapeGroup(group, apiKey, retryCount = 0) {
  const startedAt = new Date().toISOString();
  let cookieRecord = null;
  let scrapeStatus = 'FAILED';
  let postsFound = 0;
  let errorMsg = null;
  let requestedLimit = Math.min(Math.max(group.current_results_limit || 15, 10), 50);
  let runCostUsd = 0; // will be set after Apify run completes
  let result = { posts: [], runLog: null, groupNameUpdate: null, requestedLimit };

  try {
    let cookieString = null;

    if (group.group_type === 'private') {
      cookieRecord = await cookiePool.getNextCookie(group.id);
      if (!cookieRecord) {
        console.warn(`├ó┼í┬á├»┬╕┬Å [Scraper] No cookie available for private group ${group.id}, skipping.`);
        result.runLog = {
          group_id: group.id, cookie_id: null,
          status: 'NO_COOKIES', started_at: startedAt, finished_at: new Date().toISOString(),
          posts_found: 0, new_posts_count: 0, requested_limit: requestedLimit,
          near_limit: false, limit_hit: false, error_msg: null, cost_usd: 0
        };
        return result;
      }
      cookieString = decryptCookie(cookieRecord.cookie_value);
    }

    // Call Apify actor
    const client = new ApifyClient({ token: apiKey.key_value });
    const input = {
      startUrls: [{ url: group.group_url }],
      maxPosts: requestedLimit,
      resultsLimit: requestedLimit,
      logLevel: 'WARNING' // Silence Apify info logs
    };
    if (cookieString) {
      try { input.cookies = JSON.parse(cookieString); } catch { input.cookies = cookieString; }
    }

    const run = await client.actor('swerve/fb-group-scraper').call(input, { maxItems: requestedLimit });
    await keyManager.markSuccess(apiKey.id);

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Calculate total cost (Platform compute/storage usage + Pay-Per-Event charges)
    let ppeCost = 0;
    try {
      const actorEvents = run.pricingInfo?.pricingPerEvent?.actorChargeEvents;
      if (actorEvents) {
        const startPrice = actorEvents['apify-actor-start']?.eventPriceUsd ?? 0.00005;
        const itemPrice = actorEvents['apify-default-dataset-item']?.eventPriceUsd ?? 0.0035;
        ppeCost = startPrice + (items.length * itemPrice);
      } else {
        ppeCost = 0.00005 + (items.length * 0.0035);
      }
    } catch {
      ppeCost = 0.00005 + (items.length * 0.0035);
    }

    runCostUsd = (run.usageTotalUsd ?? 0) + ppeCost;
    console.log(`[Scraper] Group ${group.id}: Apify total run cost $${runCostUsd.toFixed(6)} (Compute: $${(run.usageTotalUsd ?? 0).toFixed(6)}, PPE: $${ppeCost.toFixed(6)}, Scraped Items: ${items.length}, key: ${apiKey.key_name || apiKey.id})`);

    // Collect posts for bulk upsert
    // extractPostId: tries numeric ID first, then parses URL, then normalizes URL as last resort
    const extractPostId = (item) => {
      if (item.postId) return String(item.postId);
      if (item.id && String(item.id).match(/^\d+$/)) return String(item.id);
      const url = item.url || item.postUrl || '';
      const match = url.match(/\/(?:posts|permalink)[\/?](\d{10,})/);
      if (match) return match[1];
      if (url) {
        try { return new URL(url).pathname.replace(/\/$/, ''); } catch { return url; }
      }
      return null;
    };

    const parsePostedAt = (rawTime) => {
      // ΓöÇΓöÇ Diagnostic: log what Apify is actually returning as the time field ΓöÇΓöÇ
      // Check server logs to see if rawTime is undefined/null (missing field)
      // or a relative string like "1 hour ago" vs an absolute ISO timestamp.
      if (process.env.LOG_POST_TIMES === 'true') {
        console.log(`[parsePostedAt] rawTime type=${typeof rawTime}, value=${JSON.stringify(rawTime)}`);
      }

      // Use UTC-anchored Date.now() ΓÇö always UTC regardless of server timezone
      const nowUtcMs = Date.now(); // Date.now() is always UTC milliseconds

      if (!rawTime) {
        // rawTime is missing: we have no information about when this post was made.
        // Return null so the DB can use its scraped_at default instead of a fake "now".
        return null;
      }
      
      if (typeof rawTime === 'number' || (typeof rawTime === 'string' && /^\d+$/.test(rawTime.trim()))) {
        const num = typeof rawTime === 'number' ? rawTime : parseInt(rawTime.trim(), 10);
        const ms = num < 1e11 ? num * 1000 : num;
        const d = new Date(ms);
        if (!isNaN(d.getTime())) {
          // Clamp future timestamps to now (server clock skew guard)
          return d.getTime() > nowUtcMs + 60000 ? new Date(nowUtcMs).toISOString() : d.toISOString();
        }
        return null; // unknown numeric ΓÇö let DB use scraped_at
      }

      if (typeof rawTime === 'string') {
        const str = rawTime.trim();

        // Try parsing ISO / SQL absolute datetime strings first
        let parseStr = str;
        if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(str)) {
          // If no timezone suffix, assume UTC (append Z)
          if (!/[Z+-]\d{2}/i.test(str)) {
            parseStr = str.replace(' ', 'T') + 'Z';
          } else {
            parseStr = str.replace(' ', 'T');
          }
        }
        let d = new Date(parseStr);
        if (!isNaN(d.getTime())) {
          return d.getTime() > nowUtcMs + 60000 ? new Date(nowUtcMs).toISOString() : d.toISOString();
        }

        // Clean trailing symbols, bullets like "┬╖", "≤░ƒá", non-alphanumeric noise
        const lower = str.toLowerCase().replace(/[\u2022\u00b7\u00ad\uDB40\uDC00-\uFFFF]/g, '').trim();

        if (lower.includes('just now') || lower.includes('moment')) {
          return new Date(nowUtcMs).toISOString();
        }

        const minMatch = lower.match(/(\d+)\s*(?:m|min|mins|minute|minutes)/i);
        if (minMatch) {
          return new Date(nowUtcMs - parseInt(minMatch[1], 10) * 60 * 1000).toISOString();
        }

        const hrMatch = lower.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)/i);
        if (hrMatch) {
          return new Date(nowUtcMs - parseInt(hrMatch[1], 10) * 3600 * 1000).toISOString();
        }

        const dayMatch = lower.match(/(\d+)\s*(?:d|day|days)/i);
        if (dayMatch) {
          return new Date(nowUtcMs - parseInt(dayMatch[1], 10) * 86400 * 1000).toISOString();
        }

        const wkMatch = lower.match(/(\d+)\s*(?:w|wk|wks|week|weeks)/i);
        if (wkMatch) {
          return new Date(nowUtcMs - parseInt(wkMatch[1], 10) * 7 * 86400 * 1000).toISOString();
        }

        if (lower.includes('yesterday')) {
          return new Date(nowUtcMs - 86400 * 1000).toISOString();
        }
      }

      return null; // totally unrecognised ΓÇö let DB use scraped_at default
    };

    if (items.length > 0) {
      result.posts = items
        .map(item => {
          const resolvedId = extractPostId(item);
          if (!resolvedId) return null;
          return {
            group_id: group.id,
            post_id: resolvedId,
            author: item.authorName || item.author || item.user?.name || null,
            content: item.text || item.content || null,
            post_url: item.url || item.postUrl || null,
            posted_at: parsePostedAt(
              item.time || item.timeText || item.dateText || item.timestamp || item.created_time || item.createdTime || item.postedAt || item.posted_at || item.publishTime || item.publish_time || item.date || item.created_at || item.createdAt || item.post_time || item.postTime
            ),
            likes_count: item.likesCount || 0,
            comments_count: item.commentsCount || 0,
            media_urls: Array.isArray(item.images) && item.images.length > 0
              ? item.images
              : (item.imageUrl ? [item.imageUrl] : []),
          };
        })
        .filter(Boolean);

      // Sort posts by posted_at DESC (newest first) as specified in ActorDetails.md
      result.posts.sort((a, b) => {
        if (!a.posted_at) return 1;
        if (!b.posted_at) return -1;
        return new Date(b.posted_at).getTime() - new Date(a.posted_at).getTime();
      });

      postsFound = result.posts.length;
      const skipped = items.length - postsFound;
      if (skipped > 0) console.warn(`├ó┼í┬á├»┬╕┬Å [Scraper] Skipped ${skipped} truly unidentifiable posts (no ID or URL) from group ${group.id}.`);
    }


    // Collect group name update
    if (items[0]?.groupName) {
      result.groupNameUpdate = { id: group.id, group_name: items[0].groupName };
    }

    if (cookieRecord) await cookiePool.markSuccess(cookieRecord.id);
    scrapeStatus = 'SUCCESS';
    console.log(`├ó┼ôΓÇª [Scraper] Group ${group.id}: ${postsFound} posts scraped successfully with key ${apiKey.key_name || apiKey.id}.`);

  } catch (err) {
    errorMsg = err.message;
    console.error(`├ó┬¥┼Æ [Scraper] Group ${group.id} failed using key ${apiKey.key_name || apiKey.id}:`, err.message);

    // Check if it's an Apify key error
    if (err.message?.includes('429') || err.statusCode === 429) {
      await keyManager.markFailure(apiKey.id, 429, err.message);
      if (retryCount < 2) {
        const nextKeys = await keyManager.getActiveKeys();
        const availableKey = nextKeys.find(k => k.id !== apiKey.id);
        if (availableKey) {
          console.log(`🔄 [Scraper] Retrying group ${group.id} with failover key: ${availableKey.key_name || availableKey.id} (Retry ${retryCount + 1})...`);
          return scrapeGroup(group, availableKey, retryCount + 1);
        }
      }
    } else if (
      err.message?.includes('User was not found') ||
      err.message?.includes('authentication token is not valid') ||
      err.statusCode === 401
    ) {
      // Genuinely invalid authentication token
      await keyManager.markFailure(apiKey.id, 401, err.message);
      if (retryCount < 2) {
        const nextKeys = await keyManager.getActiveKeys();
        const availableKey = nextKeys.find(k => k.id !== apiKey.id);
        if (availableKey) {
          console.log(`[Scraper] Retrying group ${group.id} with failover key (Retry ${retryCount + 1})...`);
          return scrapeGroup(group, availableKey, retryCount + 1);
        }
      }
    } else if (
      err.statusCode === 402 || err.statusCode === 403 ||
      err.message?.includes('402') || err.message?.includes('403') ||
      err.message?.includes('exceed your remaining usage') ||
      err.message?.includes('hard limit') ||
      err.message?.includes('quota')
    ) {
      // Quota / Monthly limit exceeded — mark as Quota Exhausted, NOT Token Invalid!
      await keyManager.markFailure(apiKey.id, 429, err.message);
      if (retryCount < 2) {
        const nextKeys = await keyManager.getActiveKeys();
        const availableKey = nextKeys.find(k => k.id !== apiKey.id);
        if (availableKey) {
          console.log(`[Scraper] Retrying group ${group.id} with failover key (Retry ${retryCount + 1})...`);
          return scrapeGroup(group, availableKey, retryCount + 1);
        }
      }
    }

    // Check if it's a cookie/auth error (private groups)
    if (cookieRecord && (err.message?.includes('login') || err.message?.includes('auth') || err.message?.includes('cookie'))) {
      await cookiePool.markFailed(cookieRecord.id);
      await cookiePool.checkGroupHealth(group.id);

      // Retry with next cookie (pass retryCount+1 to prevent infinite recursion)
      const nextCookie = await cookiePool.getNextCookie(group.id);
      if (nextCookie && retryCount < 2) {
        console.log(`≡ƒöä [Scraper] Retrying private group ${group.id} with backup cookie (Retry ${retryCount + 1})...`);
        return scrapeGroup(group, apiKey, retryCount + 1);
      }
    }
  } finally {
    if (scrapeStatus !== 'NO_COOKIES') {
      const returnedCount = postsFound;
      const utilization = requestedLimit > 0 ? returnedCount / requestedLimit : 0;
      const nearLimit = utilization >= 0.90;
      const limitHit = returnedCount >= requestedLimit;

      result.runLog = {
        group_id: group.id,
        cookie_id: cookieRecord?.id || null,
        status: scrapeStatus,
        posts_found: returnedCount,
        new_posts_count: 0, // will be updated later
        requested_limit: requestedLimit,
        near_limit: nearLimit,
        limit_hit: limitHit,
        error_msg: errorMsg,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        cost_usd: runCostUsd,
      };
    }
  }
  
  return result;
}

async function runAdaptiveEngine(groupId, lastRequestedLimit) {
  try {
    const { data: runs, error } = await supabase
      .from('scrape_runs')
      .select('new_posts_count, requested_limit, posts_found')
      .eq('group_id', groupId)
      .eq('status', 'SUCCESS')
      .order('started_at', { ascending: false })
      .limit(6);

    if (error || !runs || runs.length < 2) return;

    const latestRun = runs[0];
    const avgNewPosts = runs.reduce((acc, run) => acc + (run.new_posts_count || 0), 0) / runs.length;

    let currentLimit = lastRequestedLimit || 15;
    let newLimit = currentLimit;

    // Intelligent cost-optimized limit adaptation based on genuine NEW posts
    if (latestRun.new_posts_count >= currentLimit * 0.8) {
      // If latest cycle discovered new posts near the limit, scale up to avoid missing posts
      newLimit = Math.min(currentLimit + 10, 50); // Hard ceiling of 50 to optimize budget
    } else if (avgNewPosts <= 2 && runs.length >= 3) {
      // If only 0-2 new posts arrive per 5-minute cycle, drop limit to save credits on duplicate old posts
      newLimit = Math.max(currentLimit - 5, 10); // Floor of 10
    } else if (avgNewPosts >= 8) {
      // High volume group
      newLimit = Math.min(currentLimit + 5, 50);
    }

    if (newLimit !== currentLimit) {
      await supabase.from('groups').update({ current_results_limit: newLimit }).eq('id', groupId);
      console.log(`ΓÜí [Adaptive Engine] Group ${groupId} limit optimized: ${currentLimit} -> ${newLimit} (Avg new: ${avgNewPosts.toFixed(1)}, Latest: ${latestRun.new_posts_count})`);
    }
  } catch (err) {
    console.error(`[Adaptive Engine] Error for group ${groupId}:`, err);
  }
}

function matchesWordBoundary(text, keyword) {
  if (!text || !keyword) return false;
  const trimmed = String(keyword).trim();
  if (!trimmed) return false;
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(text);
}

async function runScrapingWorker() {
  console.log('\n===== [Worker] Scraping cycle started =====');
  
  await keyManager.init();

  const activeKeys = await keyManager.getActiveKeys();
  if (activeKeys.length === 0) {
    console.warn('├ó┼í┬á├»┬╕  [Worker] No active Apify keys available. Skipping cycle.');
    return;
  }

  const { data: groups, error } = await supabase
    .from('groups')
    .select('*')
    .eq('status', 'ACTIVE');

  if (error) { console.error('├ó ┼Æ [Worker] Failed to fetch groups:', error); return; }
  if (!groups || groups.length === 0) { console.log('├░┼╕ΓÇÖ┬ñ [Worker] No active groups to scrape. Sleeping.'); return; }

  const currentHour = new Date().getUTCHours();
  const currentMinute = new Date().getUTCMinutes();
  const is15MinMark = (currentMinute % 15 === 0);

  // Filter groups using Smart Off-Peak Scheduler based on historical heatmap data
  const eligibleGroups = [];
  for (const group of groups) {
    let isOffPeak = false;
    try {
      const { data: hourStats } = await supabase
        .from('hourly_post_stats')
        .select('post_count')
        .eq('group_id', group.id)
        .eq('hour', currentHour);

      if (hourStats && hourStats.length >= 5) {
        const avgPosts = hourStats.reduce((a, b) => a + (b.post_count || 0), 0) / hourStats.length;
        if (avgPosts < 0.3) {
          isOffPeak = true;
        }
      }
    } catch {
      isOffPeak = false;
    }

    if (isOffPeak && !is15MinMark) {
      console.log(`≡ƒîÖ [Smart Scheduler] Group ${group.id} in off-peak hour (${currentHour}:00 UTC, activity ~0). Next scrape in ${15 - (currentMinute % 15)}m to save credits.`);
      continue;
    }

    eligibleGroups.push(group);
  }

  if (eligibleGroups.length === 0) {
    console.log('≡ƒîÖ [Worker] All active groups currently in off-peak intervals. Sleeping.');
    return;
  }

  console.log(`≡ƒîÉ [Worker] Scraping ${eligibleGroups.length}/${groups.length} groups in parallel using ${activeKeys.length} active keys...`);
  
  // Assign keys round-robin and create promises
  const groupPromises = eligibleGroups.map((group, index) => {
    const assignedKey = activeKeys[index % activeKeys.length];
    return scrapeGroup(group, assignedKey);
  });

  const settledResults = await Promise.allSettled(groupPromises);

  const allPosts = [];
  const allLogs = [];
  
  // Collect results and batch group name updates
  const nameUpdatePromises = [];
  for (const outcome of settledResults) {
    if (outcome.status === 'fulfilled' && outcome.value) {
      if (outcome.value.posts?.length > 0) allPosts.push(...outcome.value.posts);
      if (outcome.value.runLog) allLogs.push(outcome.value.runLog);
      if (outcome.value.groupNameUpdate) {
        nameUpdatePromises.push(
          supabase.from('groups')
            .update({ group_name: outcome.value.groupNameUpdate.group_name })
            .eq('id', outcome.value.groupNameUpdate.id)
        );
      }
    }
  }
  // Run all group name updates in parallel
  if (nameUpdatePromises.length > 0) await Promise.all(nameUpdatePromises);

  // Bulk Insert Posts
  if (allPosts.length > 0) {
    const incomingPostIds = allPosts.map(p => p.post_id);
    const { data: existingPosts } = await supabase
      .from('facebook_posts')
      .select('post_id')
      .in('post_id', incomingPostIds);

    const existingIds = new Set((existingPosts || []).map(p => p.post_id));
    
    // Build per-group new post counts
    const groupNewCounts = {};
    for (const post of allPosts) {
      if (!existingIds.has(post.post_id)) {
        groupNewCounts[post.group_id] = (groupNewCounts[post.group_id] || 0) + 1;
      }
    }

    // Enrich each log with accurate new_posts_count
    for (const log of allLogs) {
      log.new_posts_count = groupNewCounts[log.group_id] || 0;
    }

    console.log(`[Worker] Upserting ${allPosts.length} posts to Supabase...`);
    const { error: postError, count: upsertedCount } = await supabase.from('facebook_posts')
      .upsert(allPosts, { onConflict: 'post_id', ignoreDuplicates: true });
    if (postError) {
      console.error(`[Worker] UPSERT FAILED for ${allPosts.length} posts:`, postError.message);
    } else {
      const newTotal = Object.values(groupNewCounts).reduce((a, b) => a + b, 0);
      console.log(`[Worker] Posts upserted OK: ${allPosts.length} processed, ${newTotal} genuinely new.`);
    }

    // ΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇö
    // Keyword Matching Logic
    // ΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇöΓÇö
    try {
      const newPostIds = allPosts
        .filter(p => !existingIds.has(p.post_id))
        .map(p => p.post_id);

      if (newPostIds.length > 0) {
        const { data: dbPosts, error: fetchPostsError } = await supabase
          .from('facebook_posts')
          .select('id, post_id, group_id, content, author, post_url')
          .in('post_id', newPostIds);

      if (!fetchPostsError && dbPosts && dbPosts.length > 0) {
        // Scoped fetch: only get members and keywords relevant to the groups scraped this cycle
        const scrapedGroupIds = [...new Set(dbPosts.map(p => p.group_id))];

        const { data: activeMembers, error: membersError } = await supabase
          .from('group_members')
          .select('user_id, group_id')
          .eq('is_active', true)
          .in('group_id', scrapedGroupIds);

        if (membersError || !activeMembers || activeMembers.length === 0) {
          console.log('≡ƒÿ┤ [Worker] No active members for scraped groups. Skipping keyword matching.');
        } else {
          const monitoringUserIds = [...new Set(activeMembers.map(m => m.user_id))];

          const { data: relevantKeywords, error: fetchKwError } = await supabase
            .from('user_keywords')
            .select('*')
            .in('user_id', monitoringUserIds);

          const matchesToInsert = [];

          for (const post of dbPosts) {
            const monitoringUsers = activeMembers.filter(m => m.group_id === post.group_id).map(m => m.user_id);
            if (monitoringUsers.length === 0) continue;


            for (const uid of monitoringUsers) {
              const userKeywords = (!fetchKwError && relevantKeywords) ? relevantKeywords.filter(kw => kw.user_id === uid) : [];

              // If user has NO keywords configured, link them to the post natively
              if (userKeywords.length === 0) {
                matchesToInsert.push({
                  user_id: uid,
                  post_id: post.id,
                  keyword_id: null
                });
                continue;
              }

              // Evaluate rules for this user with strict word-boundary matching
              for (const kw of userKeywords) {
                // Group-level filter: if rule specifies target groups, only match posts from those groups
                if (kw.group_ids && Array.isArray(kw.group_ids) && kw.group_ids.length > 0) {
                  if (!kw.group_ids.includes(post.group_id)) {
                    continue;
                  }
                }

                let isMatch = true;

                if (kw.must_include && kw.must_include.length > 0) {
                  for (const word of kw.must_include) {
                    if (!matchesWordBoundary(post.content, word)) { isMatch = false; break; }
                  }
                }
                if (!isMatch) continue;

                if (kw.any_of && kw.any_of.length > 0) {
                  const hasAny = kw.any_of.some(word => matchesWordBoundary(post.content, word));
                  if (!hasAny) isMatch = false;
                }
                if (!isMatch) continue;

                if (kw.must_exclude && kw.must_exclude.length > 0) {
                  for (const word of kw.must_exclude) {
                    if (matchesWordBoundary(post.content, word)) { isMatch = false; break; }
                  }
                }

                if (isMatch) {
                  matchesToInsert.push({
                    user_id: uid,
                    post_id: post.id,
                    keyword_id: kw.id
                  });
                }
              }
            }
          }

          if (matchesToInsert.length > 0) {
            const { error: matchError } = await supabase
              .from('user_post_matches')
              .upsert(matchesToInsert, { onConflict: 'user_id,post_id,keyword_id', ignoreDuplicates: true });
            if (matchError) {
              console.error(`[Worker] MATCH UPSERT FAILED for ${matchesToInsert.length} records:`, matchError.message);
            } else {
              console.log(`[Worker] Matches upserted OK: ${matchesToInsert.length} records linked to users.`);
              
              // ─── Trigger Notifications Immediately upon Match Upsert ───
              const uniqueUserIds = [...new Set(matchesToInsert.map(m => m.user_id))];
              const { data: usersToNotify } = await supabase
                .from('users')
                .select('id, push_subscription, slack_webhook_url, telegram_chat_id')
                .in('id', uniqueUserIds);
              
              if (usersToNotify && usersToNotify.length > 0) {
                for (const user of usersToNotify) {
                  const userMatches = matchesToInsert.filter(m => m.user_id === user.id);
                  const numMatches = userMatches.length;
                  const message = `Found ${numMatches} new keyword match${numMatches > 1 ? 'es' : ''} in your tracked groups.`;
                  
                  // Web Push
                  if (user.push_subscription) {
                    try {
                      let sub = user.push_subscription;
                      if (typeof sub === 'string') sub = JSON.parse(sub);
                      await webpush.sendNotification(sub, JSON.stringify({
                        title: "New Match Found!",
                        body: message,
                        url: "/dashboard"
                      }));
                    } catch (e) {
                      console.error(`[Worker] Failed to send push to ${user.id}:`, e.message);
                      if (e.statusCode === 410 || e.statusCode === 404) {
                        console.log(`[Worker] Subscription for user ${user.id} has expired or is invalid. Removing from DB...`);
                        await supabase.from('users').update({ push_subscription: null }).eq('id', user.id);
                      }
                    }
                  }

                  // Slack
                  if (user.slack_webhook_url) {
                    try {
                      const slackRes = await fetch(user.slack_webhook_url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          text: `🚨 *FB Monitor Alert*\n${message}\n<${process.env.FRONTEND_URL || 'https://fbmonitor.draurangzebabbas.com'}/dashboard|View Dashboard>`
                        })
                      });
                      if (!slackRes.ok) {
                        const errText = await slackRes.text().catch(() => '');
                        console.error(`[Worker] Failed to send Slack to ${user.id}: HTTP ${slackRes.status} ${errText}`);
                      }
                    } catch (e) {
                      console.error(`[Worker] Failed to send Slack to ${user.id}:`, e.message);
                    }
                  }

                  // Telegram
                  if (user.telegram_chat_id && process.env.TELEGRAM_BOT_TOKEN) {
                    try {
                      const tgRes = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          chat_id: user.telegram_chat_id,
                          text: `🚨 *FB Monitor Alert*\n${message}\n\n[Open Dashboard](${process.env.FRONTEND_URL || 'https://fbmonitor.draurangzebabbas.com'}/dashboard)`,
                          parse_mode: 'Markdown'
                        })
                      });
                      if (!tgRes.ok) {
                        const errText = await tgRes.text().catch(() => '');
                        console.error(`[Worker] Failed to send Telegram to ${user.id}: HTTP ${tgRes.status} ${errText}`);
                      }
                    } catch (e) {
                      console.error(`[Worker] Failed to send Telegram to ${user.id}:`, e.message);
                    }
                  }
                }
              }

              // --- Auto-Comment Logic (Multi-Account Support & Seconds Jitter) ---
              const processedCommentKeys = new Set();
              for (const match of matchesToInsert) {
                if (!match.keyword_id) continue;

                // Prevent processing the exact same rule on the same post twice in a single scrape cycle
                const commentDedupeKey = `${match.user_id}_${match.post_id}`;
                if (processedCommentKeys.has(commentDedupeKey)) continue;

                const kw = relevantKeywords.find(k => k.id === match.keyword_id);
                if (kw && kw.auto_comment_enabled && kw.comment_pool_id) {
                  processedCommentKeys.add(commentDedupeKey);
                  const dbPost = dbPosts.find(p => p.id === match.post_id);
                  if (!dbPost) continue;

                  // 1. Fetch available comments from the comment pool
                  const { data: items } = await supabase.from('comment_pool_items').select('content').eq('pool_id', kw.comment_pool_id);
                  if (!items || items.length === 0) {
                    console.warn(`[Worker] Auto-comment skipped for user ${match.user_id}: Comment Pool ${kw.comment_pool_id} has no comments.`);
                    await supabase.from('auto_comment_logs').insert({
                      user_id: match.user_id,
                      post_id: dbPost.post_id,
                      keyword_id: kw.id,
                      comment_text: 'No comments configured',
                      status: 'FAILED',
                      error_message: 'The selected Comment Pool is empty. Please add comments to your pool in Keywords settings.'
                    });
                    continue;
                  }

                  // 2. Fetch configured target cookies for this rule (supports multi-cookie array or fallback)
                  let targetCookieIds = [];
                  if (kw.cookie_ids && Array.isArray(kw.cookie_ids) && kw.cookie_ids.length > 0) {
                    targetCookieIds = kw.cookie_ids;
                  } else if (kw.cookie_id) {
                    targetCookieIds = [kw.cookie_id];
                  }

                  let activeCookiesToUse = [];
                  if (targetCookieIds.length > 0) {
                    const { data: matchedCookies } = await supabase
                      .from('user_cookies')
                      .select('id, cookie_value, cookie_name, status')
                      .in('id', targetCookieIds)
                      .eq('user_id', match.user_id);
                    activeCookiesToUse = (matchedCookies || []).filter(c => c.status === 'ACTIVE');
                  }

                  // If none of the selected accounts are active, fallback to least-recently used active cookie
                  if (activeCookiesToUse.length === 0) {
                    const { data: fallbackCookie } = await supabase
                      .from('user_cookies')
                      .select('id, cookie_value, cookie_name, status')
                      .eq('user_id', match.user_id)
                      .eq('status', 'ACTIVE')
                      .order('last_used_at', { ascending: true, nullsFirst: true })
                      .limit(1)
                      .maybeSingle();
                    if (fallbackCookie) activeCookiesToUse = [fallbackCookie];
                  }

                  if (activeCookiesToUse.length === 0) {
                    console.warn(`[Worker] Auto-comment skipped for user ${match.user_id}: No active Facebook session cookie in Cookie Vault.`);
                    await supabase.from('auto_comment_logs').insert({
                      user_id: match.user_id,
                      post_id: dbPost.post_id,
                      keyword_id: kw.id,
                      comment_text: 'No active cookies in vault',
                      status: 'FAILED',
                      error_message: 'No active Facebook session cookie in your Cookie Vault. Please add or update your cookies in Cookie Vault.'
                    });
                    continue;
                  }

                  const APIFY_COMMENT_ACTOR_ID = 'yi9p4ERsMCqSzyZFG';

                  // 3. Post comment for each active account with seconds jitter
                  for (let cIdx = 0; cIdx < activeCookiesToUse.length; cIdx++) {
                    const userCookie = activeCookiesToUse[cIdx];

                    // Check if this specific cookie already successfully commented on this post
                    const { data: alreadyCommented } = await supabase
                      .from('auto_comment_logs')
                      .select('id')
                      .eq('user_id', match.user_id)
                      .eq('post_id', dbPost.post_id)
                      .eq('cookie_id', userCookie.id)
                      .eq('status', 'SUCCESS')
                      .maybeSingle();

                    if (alreadyCommented) {
                      console.log(`[Worker] Cookie "${userCookie.cookie_name}" already successfully commented on post ${dbPost.post_id}. Skipping duplicate.`);
                      continue;
                    }

                    // Spin syntax & {{author}} substitution (different unique text per account)
                    const rawItem = items[Math.floor(Math.random() * items.length)].content;
                    let resolvedComment = rawItem.replace(/\{([^{}]+)\}/g, (_, choices) => {
                      const options = choices.split('|');
                      return options[Math.floor(Math.random() * options.length)].trim();
                    });
                    const authorName = dbPost.author ? dbPost.author.trim() : 'there';
                    resolvedComment = resolvedComment.replace(/\{\{author\}\}/gi, authorName);

                    let apiKey = null;
                    let runCostUsd = 0;
                    try {
                      apiKey = await keyManager.getNextKey();
                      if (!apiKey) {
                        throw new Error('No active Apify API key available to execute auto-comment actor.');
                      }

                      const decryptedCookie = decryptCookie(userCookie.cookie_value);
                      let parsedCookies;
                      try {
                        parsedCookies = JSON.parse(decryptedCookie);
                      } catch {
                        parsedCookies = decryptedCookie;
                      }

                      const apifyClient = new ApifyClient({ token: apiKey.key_value });
                      console.log(`[Worker] Running Apify Comment Actor (${APIFY_COMMENT_ACTOR_ID}) [Account ${cIdx + 1}/${activeCookiesToUse.length}: "${userCookie.cookie_name}"] for post ${dbPost.post_id}...`);

                      let run = null;
                      try {
                        run = await apifyClient.actor(APIFY_COMMENT_ACTOR_ID).call({
                          postUrl: dbPost.post_url || `https://www.facebook.com/${dbPost.post_id}`,
                          commentText: resolvedComment,
                          cookies: parsedCookies
                        }, { waitSecs: 180 });

                        if (run) {
                          runCostUsd = Number(run.usageTotalUsd ?? (run.stats?.computeUnits ? run.stats.computeUnits * 0.2 : 0) ?? 0);
                          console.log(`[Worker] Comment actor finished with cost $${runCostUsd.toFixed(6)} (status: ${run.status})`);
                        }
                      } catch (callErr) {
                        throw callErr;
                      }

                      let actorError = null;
                      if (run?.defaultKeyValueStoreId) {
                        try {
                          const output = await apifyClient.keyValueStore(run.defaultKeyValueStoreId).getRecord('OUTPUT');
                          if (output && output.value && output.value.success === false) {
                            actorError = output.value.error || output.value.message;
                          }
                        } catch (e) {}
                      }

                      if (!actorError && run?.defaultDatasetId) {
                        try {
                          const datasetItems = await apifyClient.dataset(run.defaultDatasetId).listItems({ limit: 1 });
                          if (datasetItems && datasetItems.items && datasetItems.items.length > 0) {
                            const firstItem = datasetItems.items[0];
                            if (firstItem.success === false) {
                              actorError = firstItem.error || firstItem.message;
                            }
                          }
                        } catch (e) {}
                      }

                      if (run.status !== 'SUCCEEDED' || actorError) {
                        const finalErrorMsg = actorError || run.statusMessage || `Apify Comment Actor run ended with status: ${run.status}`;
                        throw new Error(finalErrorMsg);
                      }

                      await keyManager.markSuccess(apiKey.id);
                      await supabase.from('user_cookies').update({ last_used_at: new Date().toISOString() }).eq('id', userCookie.id);

                      await supabase.from('auto_comment_logs').insert({
                        user_id: match.user_id,
                        post_id: dbPost.post_id,
                        keyword_id: kw.id,
                        cookie_id: userCookie.id,
                        comment_text: resolvedComment,
                        status: 'SUCCESS',
                        cost_usd: runCostUsd
                      });
                      console.log(`[Worker] Auto-comment SUCCESS for user ${match.user_id} (${userCookie.cookie_name}) on post ${dbPost.post_id} (cost: $${runCostUsd.toFixed(4)})`);
                    } catch (err) {
                      console.error(`[Worker] Auto-comment FAILED for user ${match.user_id} (${userCookie.cookie_name}) on post ${dbPost.post_id}:`, err.message);

                      const isQuotaError = /monthly usage|hard limit|quota|usage limit|plan limit|exceed/i.test(err.message) || err.statusCode === 429 || err.statusCode === 402;
                      const isAuthError = !isQuotaError && (/token is not valid|user was not found|invalid token/i.test(err.message) || err.statusCode === 401);

                      if (apiKey?.id) {
                        if (isQuotaError) {
                          console.warn(`[Worker] Apify key "${apiKey.key_name}" hit quota/monthly limit. Marking as Quota Exhausted.`);
                          await keyManager.markFailure(apiKey.id, 429, err.message);
                        } else if (isAuthError) {
                          console.warn(`[Worker] Apify key "${apiKey.key_name}" authentication failed. Marking as Token Invalid.`);
                          await keyManager.markFailure(apiKey.id, 401, err.message);
                        }
                      }

                      const isSessionError = /session|cookie|login|checkpoint|recover/i.test(err.message);
                      if (isSessionError && userCookie?.id) {
                        console.warn(`[Worker] Auto-comment detected expired cookie for user ${match.user_id}. Marking cookie ${userCookie.id} as FAILED.`);
                        await supabase.from('user_cookies').update({
                          status: 'FAILED',
                          last_failed_at: new Date().toISOString()
                        }).eq('id', userCookie.id);
                      }

                      await supabase.from('auto_comment_logs').insert({
                        user_id: match.user_id,
                        post_id: dbPost.post_id,
                        keyword_id: kw.id,
                        cookie_id: userCookie.id,
                        user_page_id: kw.user_page_id || null,
                        comment_text: resolvedComment || 'Failed',
                        status: 'FAILED',
                        error_message: err.message,
                        cost_usd: runCostUsd || 0
                      });
                    }

                    // Jitter delay between accounts on the same post (in seconds)
                    if (cIdx < activeCookiesToUse.length - 1) {
                      const baseJitter = kw.comment_delay_seconds && kw.comment_delay_seconds > 0 ? kw.comment_delay_seconds : 5;
                      const randomJitter = baseJitter + Math.floor(Math.random() * 4); // base + 0..3s
                      console.log(`[Worker] Waiting ${randomJitter}s jitter delay before next account comment on post ${dbPost.post_id}...`);
                      await new Promise(r => setTimeout(r, randomJitter * 1000));
                    }
                  }
                }
              }
            }
          } else {
            console.log('[Worker] No keyword matches found this cycle.');
          }
        }
      }
    } else {
      console.log('[Worker] No new posts to match this cycle.');
    }
  } catch (err) {
      console.error('Γ¥î [Worker] Error during keyword matching:', err);
    }
  }

  // Bulk Insert Logs
  if (allLogs.length > 0) {
    const { error: logError } = await supabase.from('scrape_runs').insert(allLogs);
    if (logError) {
      console.error('Γ¥î [Worker] Bulk log insert failed:', logError);
    } else {
      // Run adaptive engine per group
      const successfulGroups = allLogs
        .filter(log => log.status === 'SUCCESS')
        .map(log => ({ group_id: log.group_id, limit: log.requested_limit }));

      await Promise.allSettled(
        successfulGroups.map(({ group_id, limit }) => runAdaptiveEngine(group_id, limit))
      );
    }
  }

  console.log('===== [Worker] Cycle complete =====\n');
}

// Schedule: every 5 minutes
cron.schedule('*/5 * * * *', runScrapingWorker);

// Schedule: Daily data cleanup & historical archiving at 03:00 UTC (retains 3 days of raw logs/posts)
cron.schedule('0 3 * * *', async () => {
  console.log('≡ƒº╣ [Maintenance] Running daily cleanup & historical archiving (3-day threshold)...');
  try {
    const { data, error } = await supabase.rpc('cleanup_and_archive_old_data', { days_threshold: 3 });
    if (error) {
      console.error('Γ¥î [Maintenance] Cleanup failed:', error.message);
    } else {
      console.log('Γ£à [Maintenance] Cleanup completed successfully:', data);
    }
  } catch (err) {
    console.error('Γ¥î [Maintenance] Cleanup error:', err.message);
  }
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// HEALTH & HEARTBEAT ENDPOINTS
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// API ENDPOINTS & AUTH MIDDLEWARE
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Middleware to verify Supabase JWT token from Authorization header.
 * Attaches the verified user object to req.user.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    const token = authHeader.split(' ')[1];
    
    // We use the admin client to getUser, which validates the JWT via Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Middleware Error]', err);
    res.status(500).json({ error: 'Internal Server Error during authentication' });
  }
}

/**
 * POST /api/groups
 * Submit a new group to track.
 * If the group URL already exists, just adds the user as a new member
 * and (for private groups) links their selected cookie.
 */
app.post('/api/groups', requireAuth, async (req, res) => {
  try {
    const { url, privacy, cookieId } = req.body;
    const userId = req.user.id;

    if (!url || !privacy) {
      return res.status(400).json({ error: 'url and privacy are required.' });
    }
    if (privacy === 'private' && !cookieId) {
      return res.status(400).json({ error: 'A selected cookie is required for private groups.' });
    }

    // Normalize URL
    const normalizedUrl = url.trim().replace(/\/$/, '');

    // ΓöÇΓöÇ Plan limit check ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    const BASIC_PLAN_ID = process.env.POLAR_BASIC_PLAN_ID || 'ff8a9b62-b8f7-4183-b76c-6a4aad2f2ed7';
    const PRO_PLAN_ID = process.env.POLAR_PRO_PLAN_ID || '1d3d8ccd-aa6c-4b3b-8e06-97bd859f5e10';
    const SCALE_PLAN_ID = process.env.POLAR_SCALE_PLAN_ID || '0e40861a-2b68-4eb0-8c6b-ac22660c84c7';
    const PLAN_LIMITS = { basic: 1, pro: 5, scale: 15 };

    // Fetch active subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan_id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const planId = sub?.plan_id ?? null;
    let tier = 'none';
    if (planId === BASIC_PLAN_ID) tier = 'basic';
    else if (planId === PRO_PLAN_ID) tier = 'pro';
    else if (planId === SCALE_PLAN_ID) tier = 'scale';
    const groupLimit = PLAN_LIMITS[tier] || 0;

    // Count existing active groups
    const { count: activeGroupCount } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if ((activeGroupCount || 0) >= groupLimit) {
      const upgradeMsg = tier === 'none'
        ? 'No active subscription. Upgrade your plan to start monitoring groups.'
        : tier === 'basic'
        ? 'Basic plan allows 1 group. Upgrade to Pro (5 groups) or Scale (15 groups).'
        : tier === 'pro'
        ? 'Pro plan allows 5 groups. Upgrade to Scale for up to 15 groups.'
        : 'You have reached the maximum of 15 groups on the Scale plan.';
      return res.status(403).json({ error: upgradeMsg, code: 'PLAN_LIMIT_REACHED' });
    }
    // ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

    // 1. Upsert group (deduplicate by URL)
    // New groups get SUBMITTED; existing groups keep their current status (ignoreDuplicates=true skips overwrite)
    const { data: upsertedGroup, error: groupError } = await supabase
      .from('groups')
      .upsert({ group_url: normalizedUrl, group_type: privacy, status: 'SUBMITTED' }, { onConflict: 'group_url', ignoreDuplicates: true })
      .select()
      .maybeSingle();

    if (groupError) throw new Error(groupError.message);

    // If group already existed, ignoreDuplicates=true returns null ΓÇö fetch it
    let group = upsertedGroup;
    if (!group) {
      const { data: existing, error: fetchErr } = await supabase
        .from('groups').select('*').eq('group_url', normalizedUrl).single();
      if (fetchErr) throw new Error(fetchErr.message);
      group = existing;
    }

    // Auto-reject: if this group was previously rejected, instantly reject this new submission too
    if (group.status === 'REJECTED') {
      return res.status(403).json({ 
        error: 'This group has been reviewed and rejected by admins. It cannot be tracked.',
        code: 'GROUP_REJECTED'
      });
    }

    // Auto-reactivate if it was PAUSED (user re-adding a previously abandoned group)
    if (group.status === 'PAUSED') {
      const { data: reactivatedGroup, error: updateErr } = await supabase
        .from('groups')
        .update({ status: 'ACTIVE' })
        .eq('id', group.id)
        .select()
        .single();
      if (!updateErr && reactivatedGroup) {
        group = reactivatedGroup;
      }
    }

    // 2. Upsert group_members (link cookie if private)
    const { error: memberError } = await supabase
      .from('group_members')
      .upsert({ 
        group_id: group.id, 
        user_id: userId, 
        is_active: true,
        cookie_id: privacy === 'private' ? cookieId : null
      }, { onConflict: 'group_id,user_id' });

    if (memberError) throw new Error(memberError.message);

    res.json({ success: true, group });
  } catch (err) {
    console.error('[POST /api/groups]', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * GET /api/groups
 * Returns all groups the user is actively tracking.
 */
app.get('/api/groups', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        joined_at,
        cookie_id,
        groups (
          id, group_url, group_name, group_type, status, created_at
        ),
        user_cookies (status)
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw new Error(error.message);

    // Map to include cookie status logic if needed by frontend
    const groups = (data || []).map(row => {
      const g = Array.isArray(row.groups) ? row.groups[0] : row.groups;
      const c = Array.isArray(row.user_cookies) ? row.user_cookies[0] : row.user_cookies;
      // If group is active but the user's attached cookie is failed, signal frontend
      if (g && g.status === 'ACTIVE' && c && c.status === 'FAILED') {
         g.status = 'NEEDS_COOKIE'; // virtual override for user UI
      }
      return g;
    }).filter(g => g !== null);

    res.json({ groups });
  } catch (err) {
    console.error('[GET /api/groups]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/groups/:groupId
 * User stops tracking a group. Sets group_members.is_active = false.
 */
app.delete('/api/groups/:groupId', requireAuth, async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const { error } = await supabase
      .from('group_members')
      .update({ is_active: false })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    // Check if this was the last active member
    const { count } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('is_active', true);
      
    if (count === 0) {
      // Auto-pause the group so scraper skips it
      await supabase.from('groups').update({ status: 'PAUSED' }).eq('id', groupId);
    }

    res.json({ success: true, message: 'Stopped tracking group.' });
  } catch (err) {
    console.error('[DELETE /api/groups/:groupId]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/settings/cookies
 * Returns all user_cookies for the current user.
 */
app.get('/api/settings/cookies', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user cookies
    const { data: cookies, error } = await supabase
      .from('user_cookies')
      .select('id, cookie_name, status, fail_count, last_used_at, last_failed_at, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Fetch usage counts (how many active groups use each cookie)
    const { data: usageData } = await supabase
      .from('group_members')
      .select('cookie_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('cookie_id', 'is', null);

    const usageCount = {};
    if (usageData) {
      for (const row of usageData) {
        usageCount[row.cookie_id] = (usageCount[row.cookie_id] || 0) + 1;
      }
    }

    const result = (cookies || []).map(c => ({
      ...c,
      usage_count: usageCount[c.id] || 0
    }));

    res.json({ cookies: result });
  } catch (err) {
    console.error('[GET /api/settings/cookies]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/settings/cookies
 * Add a new cookie to the vault.
 */
app.post('/api/settings/cookies', requireAuth, async (req, res) => {
  try {
    const { cookieName, cookieValue } = req.body;
    const userId = req.user.id;
    
    if (!cookieName || !cookieValue) {
      return res.status(400).json({ error: 'cookieName and cookieValue are required.' });
    }

    const encrypted = encryptCookie(cookieValue);

    const { data, error } = await supabase
      .from('user_cookies')
      .insert({
        user_id: userId,
        cookie_name: cookieName,
        cookie_value: encrypted,
        status: 'ACTIVE'
      })
      .select('id, cookie_name, status')
      .single();

    if (error) throw new Error(error.message);

    res.json({ success: true, cookie: data });
  } catch (err) {
    console.error('[POST /api/settings/cookies]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/settings/cookies/:cookieId
 * Update an existing cookie in the vault.
 */
app.put('/api/settings/cookies/:cookieId', requireAuth, async (req, res) => {
  try {
    const { cookieId } = req.params;
    const { cookieValue } = req.body;
    const userId = req.user.id;

    if (!cookieValue) {
      return res.status(400).json({ error: 'cookieValue is required.' });
    }

    const { data: existing, error: findError } = await supabase
      .from('user_cookies').select('id').eq('id', cookieId).eq('user_id', userId).maybeSingle();

    if (findError || !existing) {
      return res.status(404).json({ error: 'Cookie not found or not owned by this user.' });
    }

    const encrypted = encryptCookie(cookieValue);

    await supabase.from('user_cookies').update({
      cookie_value: encrypted,
      status: 'ACTIVE',
      fail_count: 0,
      last_failed_at: null,
    }).eq('id', cookieId);

    // Any groups that were failing because of this cookie will automatically be retryable now.
    // However, if the group status itself was NEEDS_COOKIE, we should reactivate it.
    // Let's find groups this cookie is attached to, and set them back to ACTIVE.
    const { data: groups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('cookie_id', cookieId)
      .eq('is_active', true);
      
    if (groups && groups.length > 0) {
      const groupIds = groups.map(g => g.group_id);
      await supabase.from('groups').update({ status: 'ACTIVE' }).in('id', groupIds);
    }

    res.json({ success: true, message: 'Cookie updated and reactivated.' });
  } catch (err) {
    console.error('[PUT /api/settings/cookies/:cookieId]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/settings/cookies/:cookieId
 * Remove a cookie from the vault.
 */
app.delete('/api/settings/cookies/:cookieId', requireAuth, async (req, res) => {
  try {
    const { cookieId } = req.params;
    const userId = req.user.id;

    const { data: existing, error: findError } = await supabase
      .from('user_cookies').select('id').eq('id', cookieId).eq('user_id', userId).maybeSingle();

    if (findError || !existing) {
      return res.status(404).json({ error: 'Cookie not found or not owned by this user.' });
    }

    // 1. Find all groups this cookie was attached to
    const { data: affectedGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('cookie_id', cookieId);

    // 2. Delete the cookie (ON DELETE SET NULL will handle group_members.cookie_id)
    await supabase.from('user_cookies').delete().eq('id', cookieId);

    // 3. Check health for those affected groups
    if (affectedGroups && affectedGroups.length > 0) {
      const affectedGroupIds = [...new Set(affectedGroups.map(g => g.group_id))];
      await Promise.all(affectedGroupIds.map(gid => cookiePool.checkGroupHealth(gid)));
    }

    res.json({ success: true, message: 'Cookie removed from vault.' });
  } catch (err) {
    console.error('[DELETE /api/settings/cookies/:cookieId]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼
// ADMIN API ENDPOINTS
// ├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼├óΓÇ¥Γé¼

// Middleware-like function to check admin status with simple in-memory caching
const adminCache = new Map();
const ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function isAdmin(userId) {
  if (!userId) return false;
  
  const cached = adminCache.get(userId);
  if (cached && cached.expiry > Date.now()) {
    return cached.isAdmin;
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
    
  const isUserAdmin = !error && !!data;
  
  adminCache.set(userId, {
    isAdmin: isUserAdmin,
    expiry: Date.now() + ADMIN_CACHE_TTL
  });
  
  return isUserAdmin;
}

/**
 * GET /api/admin/keys
 * Returns all Apify keys.
 */
app.get('/api/admin/keys', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Unauthorized' });

    const { data, error } = await supabase.from('api_keys').select('*').order('last_used_at', { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    res.json({ keys: data || [] });
  } catch (err) {
    console.error('[GET /api/admin/keys]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/keys
 * Add new API key(s). Supports bulk insertion.
 * Expects { keys: [{ key_name, key_value, provider }] }
 */
app.post('/api/admin/keys', requireAuth, async (req, res) => {
  try {
    const { keys } = req.body;
    const userId = req.user.id;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Unauthorized' });
    
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'An array of keys is required' });
    }

    // Deduplication logic
    const { data: existingKeys, error: fetchError } = await supabase.from('api_keys').select('key_name, key_value');
    if (fetchError) throw new Error(fetchError.message);

    const existingNames = new Set(existingKeys.map(k => k.key_name));
    const existingValues = new Set(existingKeys.map(k => k.key_value));

    let skippedNames = 0;
    let skippedValues = 0;
    const keysToInsert = [];

    for (const k of keys) {
      if (existingValues.has(k.key_value)) {
        skippedValues++;
      } else if (existingNames.has(k.key_name)) {
        skippedNames++;
      } else {
        keysToInsert.push({
          ...k,
          status: 'ACTIVE',
          health: 100,
          usage_usd: 0,
          limit_usd: 5
        });
        existingNames.add(k.key_name);
        existingValues.add(k.key_value);
      }
    }

    if (keysToInsert.length > 0) {
      const { error: insertError } = await supabase.from('api_keys').insert(keysToInsert);
      if (insertError) throw new Error(insertError.message);
    }

    res.json({ 
      success: true, 
      added: keysToInsert.length, 
      skippedNames, 
      skippedValues 
    });
  } catch (err) {
    console.error('[POST /api/admin/keys]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/admin/keys
 * Bulk delete API keys.
 * Expects { keyIds: [uuid1, uuid2, ...] }
 */
app.delete('/api/admin/keys', requireAuth, async (req, res) => {
  try {
    const { keyIds } = req.body;
    const userId = req.user.id;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Unauthorized' });
    if (!keyIds || !Array.isArray(keyIds)) return res.status(400).json({ error: 'keyIds array required' });

    const { error } = await supabase.from('api_keys').delete().in('id', keyIds);
    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/keys]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/keys/health
 * Check the health of provided keys.
 * Expects { keyIds: [uuid1, uuid2, ...] }
 */
app.post('/api/admin/keys/health', requireAuth, async (req, res) => {
  try {
    const { keyIds } = req.body;
    const userId = req.user.id;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Unauthorized' });
    if (!keyIds || !Array.isArray(keyIds)) return res.status(400).json({ error: 'keyIds array required' });

    // Fetch the keys
    const { data: keys, error } = await supabase.from('api_keys').select('*').in('id', keyIds);
    if (error) throw new Error(error.message);

    const updatePromises = keys.map(async (key) => {
      // Always run health check for ALL Apify keys regardless of current status.
      // checkApifyKeyHealth will correctly classify: Token Invalid (401) vs Quota Exhausted
      // vs Active — AND writes real usage_usd / limit_usd numbers to the DB in all cases.
      if (key.provider !== 'Apify') return key;
      return await checkApifyKeyHealth(key);
    });

    const updatedKeys = await Promise.all(updatePromises);
    res.json({ success: true, keys: updatedKeys });
  } catch (err) {
    console.error('[POST /api/admin/keys/health]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/stats
 * High-level metrics for dashboard
 */
app.get('/api/admin/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Unauthorized' });

    const { data: usersData } = await supabase.auth.admin.listUsers();
    const { count: groupsCount } = await supabase.from('groups').select('*', { count: 'exact', head: true });
    const { count: postsCount } = await supabase.from('facebook_posts').select('*', { count: 'exact', head: true });
    const { data: keysData } = await supabase.from('api_keys').select('id, status');

    const keysArr = keysData || [];
    const keysActive = keysArr.filter(k => k.status === 'ACTIVE').length;
    const keysFailed = keysArr.filter(k => k.status === 'FAILED').length;
    const keysRateLimited = keysArr.filter(k => k.status === 'RATE_LIMITED').length;

    // Fetch platform costs
    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayStr = startOfToday.toISOString().split('T')[0];
    const weekStr = startOfWeek.toISOString().split('T')[0];
    const monthStr = startOfMonth.toISOString().split('T')[0];

    const [
      { data: todayData },
      { data: weekData },
      { data: monthData },
      { data: allTimeData },
      { data: weekSummData },
      { data: monthSummData },
      { data: allSummData },
      { data: todayComments },
      { data: weekComments },
      { data: monthComments },
      { data: allComments },
      { data: weekCommentSumm },
      { data: monthCommentSumm },
      { data: allCommentSumm },
    ] = await Promise.all([
      supabase.from('scrape_runs').select('cost_usd').gte('started_at', startOfToday.toISOString()),
      supabase.from('scrape_runs').select('cost_usd').gte('started_at', startOfWeek.toISOString()),
      supabase.from('scrape_runs').select('cost_usd').gte('started_at', startOfMonth.toISOString()),
      supabase.from('scrape_runs').select('cost_usd'),
      supabase.from('daily_scrape_cost_summary').select('total_cost_usd').gte('date', weekStr),
      supabase.from('daily_scrape_cost_summary').select('total_cost_usd').gte('date', monthStr),
      supabase.from('daily_scrape_cost_summary').select('total_cost_usd'),
      supabase.from('auto_comment_logs').select('cost_usd').gte('created_at', startOfToday.toISOString()),
      supabase.from('auto_comment_logs').select('cost_usd').gte('created_at', startOfWeek.toISOString()),
      supabase.from('auto_comment_logs').select('cost_usd').gte('created_at', startOfMonth.toISOString()),
      supabase.from('auto_comment_logs').select('cost_usd'),
      supabase.from('daily_comment_cost_summary').select('total_cost_usd').gte('date', weekStr),
      supabase.from('daily_comment_cost_summary').select('total_cost_usd').gte('date', monthStr),
      supabase.from('daily_comment_cost_summary').select('total_cost_usd'),
    ]);

    const sum = (rows, key = 'cost_usd') => (rows || []).reduce((acc, r) => acc + (Number(r[key]) || 0), 0);

    res.json({
      stats: {
        users: usersData?.users?.length || 0,
        groups: groupsCount || 0,
        posts: postsCount || 0,
        keysTotal: keysArr.length,
        keysActive,
        keysFailed,
        keysRateLimited,
        cost: {
          today: sum(todayData) + sum(todayComments),
          week: sum(weekData) + sum(weekSummData, 'total_cost_usd') + sum(weekComments) + sum(weekCommentSumm, 'total_cost_usd'),
          month: sum(monthData) + sum(monthSummData, 'total_cost_usd') + sum(monthComments) + sum(monthCommentSumm, 'total_cost_usd'),
          allTime: sum(allTimeData) + sum(allSummData, 'total_cost_usd') + sum(allComments) + sum(allCommentSumm, 'total_cost_usd')
        }
      }
    });
  } catch (err) {
    console.error('[GET /api/admin/stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/users
 * Returns all users with group/cookie stats.
 */
app.get('/api/admin/users', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Unauthorized' });

    const { data: users, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) throw new Error(usersErr.message);

    const { data: memberships, error: memErr } = await supabase.from('group_members').select('user_id, is_active');
    if (memErr) throw new Error(memErr.message);

    const { data: cookies, error: cookErr } = await supabase.from('user_cookies').select('user_id, status');
    if (cookErr) throw new Error(cookErr.message);

    const userStats = users.users.map(u => {
      const userMemberships = memberships.filter(m => m.user_id === u.id);
      const userCookies = cookies.filter(c => c.user_id === u.id);
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        total_groups: userMemberships.length,
        active_groups: userMemberships.filter(m => m.is_active).length,
        total_cookies: userCookies.length,
        active_cookies: userCookies.filter(c => c.status === 'ACTIVE').length
      };
    });

    res.json({ users: userStats });
  } catch (err) {
    console.error('[GET /api/admin/users]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/groups
 * Returns all groups in the system with their cookie counts.
 */
app.get('/api/admin/groups', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Unauthorized' });

    const { data: groups, error: groupsErr } = await supabase.from('groups').select('*').order('created_at', { ascending: false });
    if (groupsErr) throw new Error(groupsErr.message);

    // Get all active trackers (any user actively monitoring the group)
    const { data: allMembers, error: allMemErr } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('is_active', true);
    if (allMemErr) console.warn('[Admin Groups] Could not fetch tracker counts:', allMemErr.message);

    // Get memberships that have an active cookie (private group health)
    const { data: memberships, error: memErr } = await supabase
      .from('group_members')
      .select('group_id, user_cookies!inner(status)')
      .eq('is_active', true)
      .eq('user_cookies.status', 'ACTIVE');
      
    if (memErr) console.warn('[Admin Groups] Could not fetch cookie counts:', memErr.message);

    const groupStats = groups.map(g => {
      const trackerCount = (allMembers || []).filter(m => m.group_id === g.id).length;
      const activeCookies = (memberships || []).filter(m => m.group_id === g.id).length;
      return {
        ...g,
        tracker_count: trackerCount,
        active_cookies: activeCookies
      };
    });

    res.json({ groups: groupStats });
  } catch (err) {
    console.error('[GET /api/admin/groups]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/groups/bulk/status
 * Updates the status of multiple groups simultaneously.
 */
app.put('/api/admin/groups/bulk/status', requireAuth, async (req, res) => {
  try {
    const { status, groupIds } = req.body;
    const userId = req.user.id;
    
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Unauthorized' });
    if (!status) return res.status(400).json({ error: 'Status is required' });
    if (!groupIds || !Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({ error: 'An array of groupIds is required' });
    }

    const { error } = await supabase.from('groups').update({ status }).in('id', groupIds);
    if (error) throw new Error(error.message);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/admin/groups/bulk/status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/groups/:id/status
 * Updates the status of a group (e.g. SUBMITTED -> ACTIVE or REJECTED)
 */
app.put('/api/admin/groups/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    const userId = req.user.id;
    
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Unauthorized' });
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const { error } = await supabase.from('groups').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
    
    res.json({ success: true });
  } catch (err) {
    console.error('[PUT /api/admin/groups/:id/status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/admin/groups/:id
 * Admin removes a group entirely from the system.
 */
app.delete('/api/admin/groups/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Unauthorized' });

    // Delete the group itself (group_members and facebook_posts cascade delete automatically)
    const { error } = await supabase.from('groups').delete().eq('id', id);
    if (error) throw new Error(error.message);

    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/admin/groups/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/cleanup-posts
 * Deletes facebook_posts older than 7 days to keep DB storage lean.
 * Heatmap data is safe: hourly_post_stats is NOT affected.
 * Call this endpoint daily via cron or a scheduled task.
 */
app.post('/api/admin/cleanup-posts', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Unauthorized' });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const { count, error } = await supabase
      .from('facebook_posts')
      .delete({ count: 'exact' })
      .lt('scraped_at', cutoff.toISOString());

    if (error) throw new Error(error.message);

    console.log(`[Cleanup] Deleted ${count} posts older than 7 days.`);
    res.json({ success: true, deletedCount: count });
  } catch (err) {
    console.error('[POST /api/admin/cleanup-posts]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// ANALYTICS & ADAPTIVE ENGINE ENDPOINTS
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * GET /api/analytics/heatmap
 * Returns post counts grouped by day of week and hour of day.
 */
app.get('/api/analytics/heatmap', requireAuth, async (req, res) => {
  try {
    const { groupId, days = 7, tz = 'UTC' } = req.query;
    const userId = req.user.id;
    
    // Server-side SQL approach using Supabase RPC or direct query.
    // For MVP, we fetch relevant posts and group in JS to handle timezone and logic easily.
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - parseInt(days));

    // Get groups user has access to
    const userIsAdmin = await isAdmin(userId);
    let allowedGroupIds = [];
    let isGlobalAdminView = false;

    if (!userIsAdmin) {
      const { data: members, error: memErr } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('is_active', true);
        
      if (memErr) throw new Error(memErr.message);
      allowedGroupIds = members.map(m => m.group_id);

      if (groupId && groupId !== 'all') {
        if (!allowedGroupIds.includes(groupId)) return res.status(403).json({ error: 'Unauthorized for this group' });
        allowedGroupIds = [groupId];
      }
    } else {
      if (groupId && groupId !== 'all') {
        allowedGroupIds = [groupId];
      } else {
        isGlobalAdminView = true;
      }
    }

    if (!isGlobalAdminView && allowedGroupIds.length === 0) {
      return res.json({ grid: Array(7).fill(Array(24).fill(0)), totalEvents: 0, peakWindow: null, quietestStretch: null, maxValue: 0 });
    }

    let statsQuery = supabase
      .from('hourly_post_stats')
      .select('date, hour, post_count')
      .gte('date', sinceDate.toISOString().split('T')[0]);
      
    if (!isGlobalAdminView) {
      statsQuery = statsQuery.in('group_id', allowedGroupIds);
    }

    const { data: stats, error: statsErr } = await statsQuery;

    if (statsErr) throw new Error(statsErr.message);

    // Initialize 7x24 grid (0=Sun, 6=Sat)
    const grid = Array.from({ length: 7 }, () => Array(24).fill(0));
    let totalEvents = 0;
    
    for (const stat of stats) {
      if (!stat.date) continue;
      const d = new Date(stat.date);
      const dow = d.getUTCDay();
      const hour = stat.hour;
      if (grid[dow] && grid[dow][hour] !== undefined) {
        grid[dow][hour] += stat.post_count;
        totalEvents += stat.post_count;
      }
    }

    let maxValue = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        if (grid[d][h] > maxValue) maxValue = grid[d][h];
      }
    }

    // Calculate Peak Window (highest 4 consecutive hours across all days)
    let maxBlock = -1;
    let peakDay = 0;
    let peakStart = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h <= 20; h++) {
        const sum = grid[d][h] + grid[d][h+1] + grid[d][h+2] + grid[d][h+3];
        if (sum > maxBlock) {
          maxBlock = sum;
          peakDay = d;
          peakStart = h;
        }
      }
    }
    const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakWindow = maxBlock > 0 
      ? { day: daysArr[peakDay], startHour: peakStart, endHour: peakStart + 4, count: maxBlock } 
      : null;

    // Calculate Quietest Stretch (lowest 8-hour block on weekends vs weekdays)
    // Simple version: find the lowest 8h block across the week
    let minBlock = Infinity;
    let quietDay = 0;
    let quietStart = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h <= 16; h++) {
        let sum = 0;
        for (let i = 0; i < 8; i++) sum += grid[d][h+i];
        if (sum < minBlock) {
          minBlock = sum;
          quietDay = d;
          quietStart = h;
        }
      }
    }
    const isWeekend = quietDay === 0 || quietDay === 6;
    const quietDesc = `${isWeekend ? 'Weekends' : daysArr[quietDay]} between ${String(quietStart).padStart(2,'0')}:00 and ${String(quietStart+8).padStart(2,'0')}:00`;
    const quietestStretch = minBlock < Infinity ? { description: quietDesc, count: minBlock } : null;

    res.json({ grid, totalEvents, peakWindow, quietestStretch, maxValue });
  } catch (err) {
    console.error('[GET /api/analytics/heatmap]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/dashboard-stats
 * Returns top-level KPIs for the user's dashboard.
 */
app.get('/api/analytics/dashboard-stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data: members } = await supabase
      .from('group_members')
      .select('group_id, groups(id, status)')
      .eq('user_id', userId)
      .eq('is_active', true);

    let activeCount = 0;
    let pausedCount = 0;
    let rejectedCount = 0;
    (members || []).forEach(m => {
      const g = Array.isArray(m.groups) ? m.groups[0] : m.groups;
      const s = (g?.status || '').toUpperCase();
      if (s === 'ACTIVE') activeCount++;
      else if (s === 'PAUSED') pausedCount++;
      else if (s === 'REJECTED') rejectedCount++;
      else pausedCount++;
    });

    const activeMonitors = activeCount;
    const groupIds = (members || []).map(m => m.group_id);

    if (groupIds.length === 0) {
      return res.json({
        totalPosts: 0,
        postsToday: 0,
        postsThisWeek: 0,
        activeMonitors: 0,
        activeCount: 0,
        pausedCount: 0,
        rejectedCount: 0
      });
    }

    // Total Posts - count directly from facebook_posts filtered by user's groups
    // (same source as admin panel so numbers are consistent)
    const { count: totalPosts } = await supabase
      .from('facebook_posts')
      .select('*', { count: 'exact', head: true })
      .in('group_id', groupIds);

    // Posts Today (last 24h)
    const today = new Date();
    today.setDate(today.getDate() - 1);
    const { count: postsToday } = await supabase
      .from('facebook_posts')
      .select('*', { count: 'exact', head: true })
      .in('group_id', groupIds)
      .gte('posted_at', today.toISOString());

    // Posts This Week (last 7 days)
    const week = new Date();
    week.setDate(week.getDate() - 7);
    const { count: postsThisWeek } = await supabase
      .from('facebook_posts')
      .select('*', { count: 'exact', head: true })
      .in('group_id', groupIds)
      .gte('posted_at', week.toISOString());

    res.json({ 
      totalPosts: totalPosts || 0, 
      postsToday: postsToday || 0, 
      postsThisWeek: postsThisWeek || 0, 
      activeMonitors,
      activeCount,
      pausedCount,
      rejectedCount
    });
  } catch (err) {
    console.error('[GET /api/analytics/dashboard-stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/analytics/scraper-health
 * Returns real-time observability of the adaptive engine for admins.
 */
app.get('/api/analytics/scraper-health', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    if (!(await isAdmin(userId))) return res.status(403).json({ error: 'Unauthorized' });

    const { data: groups, error: groupsErr } = await supabase
      .from('groups')
      .select('id, group_name, current_results_limit, adaptive_state')
      .eq('status', 'ACTIVE');
      
    if (groupsErr) throw new Error(groupsErr.message);

    const groupIds = groups.map(g => g.id);
    
    // Fetch latest run for each active group
    const { data: latestRuns, error: runsErr } = await supabase
      .from('scrape_runs')
      .select('group_id, status, posts_found, requested_limit, finished_at')
      .in('group_id', groupIds)
      .order('finished_at', { ascending: false });

    if (runsErr) throw new Error(runsErr.message);

    // Deduplicate to get only the most recent run per group
    const recentRunMap = {};
    for (const run of (latestRuns || [])) {
      if (!recentRunMap[run.group_id]) {
        recentRunMap[run.group_id] = run;
      }
    }

    const healthData = groups.map(g => {
      const run = recentRunMap[g.id];
      let lastUtil = 0;
      if (run && run.requested_limit > 0) {
        lastUtil = Math.round((run.posts_found / run.requested_limit) * 100);
      }
      
      return {
        id: g.id,
        group_name: g.group_name,
        current_results_limit: g.current_results_limit,
        adaptive_state: g.adaptive_state,
        last_run_at: run ? run.finished_at : null,
        last_status: run ? run.status : 'UNKNOWN',
        last_utilization_pct: lastUtil
      };
    });

    res.json({ health: healthData });
  } catch (err) {
    console.error('[GET /api/analytics/scraper-health]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
app.listen(port, () => {
  console.log(`[Server] Backend running at http://localhost:${port}`);
  console.log('[Server] Scraping worker scheduled every 5 minutes.');
});

