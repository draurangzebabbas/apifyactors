require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { ApifyClient } = require('apify-client');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 4000;
// Apify Traffic Actor ID (hardcoded: deliberate_offspring/apifyactors)
// Do NOT read from process.env to prevent stale/incorrect environment variables from breaking runs.
const ACTOR_ID = 'wmJ51jY3JE7K6cO9u';

// Middleware
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  // Vercel production & preview deployments
  'https://trafficflowdraurangzebabbas.vercel.app',
  // Allow any *.vercel.app preview URL for this project
];
if (process.env.FRONTEND_URL) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no origin) and Vercel preview deploys
    if (!origin) return callback(null, true);
    if (
      ALLOWED_ORIGINS.includes(origin) ||
      /^https:\/\/trafficflow[a-z0-9\-]*\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Backend environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth Middlewares
// ─────────────────────────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[requireAuth]', err.message);
    res.status(500).json({ error: 'Internal auth error' });
  }
}

async function isAdmin(userId) {
  if (!userId) return false;
  const { data } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .single();
  return !!data;
}

async function requireAdmin(req, res, next) {
  const admin = await isAdmin(req.user?.id);
  if (!admin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// KeyManager — Apify API Key Rotation & Health Tracking
// ─────────────────────────────────────────────────────────────────────────────
async function checkApifyKeyHealth(key) {
  try {
    const [userRes, lRes, uRes] = await Promise.all([
      fetch(`https://api.apify.com/v2/users/me?token=${key.key_value}`),
      fetch(`https://api.apify.com/v2/users/me/limits?token=${key.key_value}`),
      fetch(`https://api.apify.com/v2/users/me/usage/monthly?token=${key.key_value}`)
    ]);

    if (userRes.status === 401) {
      const updateData = { status: 'FAILED', health: 0, last_checked_at: new Date().toISOString() };
      await supabase.from('api_keys').update(updateData).eq('id', key.id);
      return { ...key, ...updateData };
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
    const hardLimitExceeded = userData?.data?.effectivePlatformFeatures?.ACTORS?.disabledReasonType === 'MONTHLY_TOTAL_USAGE_HARD_LIMIT_EXCEEDED';

    let status = 'ACTIVE';
    let health = 100;

    if (!actorsEnabled || hardLimitExceeded || usage_usd >= limit_usd || uRes.status === 429) {
      status = 'RATE_LIMITED';
      health = 0;
    } else if (limit_usd > 0) {
      const remainingUsd = limit_usd - usage_usd;
      health = Math.max(0, Math.min(100, Math.round((remainingUsd / limit_usd) * 100)));
    }

    const updateData = {
      key_name: actualEmail,
      status,
      health,
      usage_usd,
      limit_usd,
      last_checked_at: new Date().toISOString(),
      ...(status === 'ACTIVE' ? { cooldown_until: null, fail_count: 0 } : {})
    };

    await supabase.from('api_keys').update(updateData).eq('id', key.id);
    return { ...key, ...updateData };
  } catch (err) {
    console.warn(`[KeyManager] Key ${key.key_name || key.id} health check error:`, err.message);
    return { ...key };
  }
}

class KeyManager {
  constructor() {
    this.keys = [];
  }

  async init() {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .neq('status', 'FAILED')
      .neq('status', 'Token Invalid')
      .order('last_used_at', { ascending: true, nullsFirst: true });

    if (error) {
      console.error(`[KeyManager] Init failed:`, error.message);
      return;
    }
    this.keys = data || [];
    console.log(`[KeyManager] Loaded ${this.keys.length} candidate keys from database.`);
  }

  async getNextKey() {
    let active = this.keys.filter(k => k.status === 'ACTIVE' || k.status === 'Active');

    if (active.length < 3) {
      const candidates = this.keys.filter(k => k.status !== 'FAILED' && k.status !== 'Token Invalid');
      if (candidates.length > 0) {
        console.log(`[KeyManager] Active keys < 3 (${active.length}). Re-checking candidate keys...`);
        const checked = [];
        for (const k of candidates) {
          const updated = await checkApifyKeyHealth(k);
          const idx = this.keys.findIndex(x => x.id === k.id);
          if (idx !== -1) this.keys[idx] = { ...this.keys[idx], ...updated };
          if (updated.status === 'ACTIVE' || updated.status === 'Active') {
            checked.push(this.keys[idx]);
          }
        }
        active = checked;
      }
    }

    if (active.length === 0) {
      console.warn('⚠️ [KeyManager] No active keys available in pool.');
      return null;
    }

    // Sort by last_used_at ascending (LRU)
    active.sort((a, b) => {
      if (!a.last_used_at) return -1;
      if (!b.last_used_at) return 1;
      return new Date(a.last_used_at) - new Date(b.last_used_at);
    });

    return active[0];
  }

  async markSuccess(keyId) {
    const now = new Date().toISOString();
    await supabase.from('api_keys').update({
      last_used_at: now,
      fail_count: 0
    }).eq('id', keyId);

    const memKey = this.keys.find(k => k.id === keyId);
    if (memKey) {
      memKey.last_used_at = now;
      memKey.fail_count = 0;
    }
  }

  async markFailure(keyId, httpStatus = 500, errorMsg = '') {
    const isQuota = httpStatus === 429 || httpStatus === 402 || /quota|monthly|limit|exceed/i.test(errorMsg);
    const isAuth = !isQuota && (httpStatus === 401 || /token is not valid|invalid token/i.test(errorMsg));
    const newStatus = isAuth ? 'FAILED' : (isQuota ? 'RATE_LIMITED' : 'ACTIVE');

    const key = this.keys.find(k => k.id === keyId);
    const newFailCount = (key ? key.fail_count : 0) + 1;

    await supabase.from('api_keys').update({
      status: newStatus,
      fail_count: newFailCount,
      ...(isQuota || isAuth ? { health: 0 } : {})
    }).eq('id', keyId);

    if (isAuth) {
      this.keys = this.keys.filter(k => k.id !== keyId);
    } else if (key) {
      key.status = newStatus;
      key.fail_count = newFailCount;
      if (isQuota) key.health = 0;
    }
  }
}

const keyManager = new KeyManager();

// ─────────────────────────────────────────────────────────────────────────────
// Push Notifications Helper
// ─────────────────────────────────────────────────────────────────────────────
async function sendUserPushNotification(userId, title, body, url = '/campaigns') {
  try {
    const pubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privKey = process.env.VAPID_PRIVATE_KEY;
    if (!pubKey || !privKey) {
      console.log('ℹ️ [Push] VAPID keys not configured in backend environment; skipping push notification.');
      return;
    }

    const { data: userRec, error } = await supabase
      .from('users')
      .select('push_subscription')
      .eq('id', userId)
      .single();

    if (error || !userRec || !userRec.push_subscription) {
      return;
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:support@trafficflow.io',
      pubKey,
      privKey
    );

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192x192.png',
      data: { url }
    });

    await webpush.sendNotification(userRec.push_subscription, payload);
    console.log(`🔔 [Push] Successfully sent push notification to user ${userId}: "${title}"`);
  } catch (err) {
    console.warn(`⚠️ [Push] Error sending push notification to user ${userId}:`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Traffic Batch Execution Worker
// ─────────────────────────────────────────────────────────────────────────────
let isWorkerRunning = false;

async function runTrafficBatchWorker() {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  try {
    // ── Phase 1: Monitor running batches ─────────────────────────────────────
    const { data: runningBatches, error: runErr } = await supabase
      .from('traffic_batches')
      .select('*, traffic_campaigns!inner(*)')
      .eq('status', 'running')
      .not('apify_run_id', 'is', null);

    if (!runErr && runningBatches && runningBatches.length > 0) {
      for (const batch of runningBatches) {
        try {
          // Look up key to check run
          let keyObj = keyManager.keys.find(k => k.id === batch.apify_key_id);
          if (!keyObj) {
            const { data: keyData } = await supabase.from('api_keys').select('*').eq('id', batch.apify_key_id).single();
            keyObj = keyData;
          }

          if (!keyObj) continue;

          const client = new ApifyClient({ token: keyObj.key_value });
          const run = await client.run(batch.apify_run_id).get();

          if (!run) continue;

          const isTerminal = ['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED'].includes(run.status);
          if (!isTerminal) continue;

          console.log(`[Worker] Batch #${batch.batch_number} (run ${batch.apify_run_id} via ${keyObj.key_name || keyObj.id}) finished with status: ${run.status}`);

          // Extract actual delivered visits and deep failure diagnostics from KV store and dataset
          let completedVisits = 0;
          let failedSessions = 0;
          let failureBreakdown = {};
          let failureDescriptions = {};
          let serpPureClicks = 0;
          let fallbackDirect = 0;
          let captchaAvoided = 0;
          let notRankedCount = 0;
          let lastErrorMessage = run.statusMessage || null;

          // 1. Try reading RUN_SUMMARY and OUTPUT from Apify Key-Value Store
          try {
            const kvStoreId = run.defaultKeyValueStoreId;
            if (kvStoreId) {
              const [summaryRes, outputRes] = await Promise.all([
                fetch(`https://api.apify.com/v2/key-value-stores/${kvStoreId}/records/RUN_SUMMARY?token=${keyObj.key_value}`).catch(() => null),
                fetch(`https://api.apify.com/v2/key-value-stores/${kvStoreId}/records/OUTPUT?token=${keyObj.key_value}`).catch(() => null)
              ]);

              const summaryData = summaryRes && summaryRes.ok ? await summaryRes.json().catch(() => null) : null;
              const outputData = outputRes && outputRes.ok ? await outputRes.json().catch(() => null) : null;
              const rep = summaryData || outputData;

              if (rep && typeof rep === 'object') {
                if (typeof rep.successfulVisitsDelivered === 'number') {
                  completedVisits = rep.successfulVisitsDelivered;
                } else if (typeof rep.successfulSessions === 'number') {
                  completedVisits = rep.successfulSessions;
                }
                failedSessions = rep.failedSessions || 0;
                failureBreakdown = rep.failureBreakdown || {};
                failureDescriptions = rep.failureDescriptions || {};
              }
            }
          } catch (kvErr) {
            console.warn(`[Worker] Could not read KV store for run ${batch.apify_run_id}:`, kvErr.message);
          }

          // 2. Query default dataset items to verify success count and categorize navigation paths & errors
          if (run.defaultDatasetId) {
            try {
              const datasetRes = await client.dataset(run.defaultDatasetId).listItems({ limit: 500 });
              if (datasetRes && Array.isArray(datasetRes.items)) {
                let verifiedSuccess = 0;
                for (const it of datasetRes.items) {
                  if (it.status === 'SUCCESS') {
                    verifiedSuccess++;
                    const pathStr = Array.isArray(it.navigationPath) ? it.navigationPath.join(' ') : '';
                    if (/Fallback: google_captcha_detected/i.test(pathStr)) {
                      fallbackDirect++;
                      captchaAvoided++;
                    } else if (/Fallback: target_not_found_in_serp/i.test(pathStr)) {
                      fallbackDirect++;
                      notRankedCount++;
                    } else if (/Fallback/i.test(pathStr)) {
                      fallbackDirect++;
                    } else {
                      serpPureClicks++;
                    }
                  } else if (it.status === 'FAILED') {
                    const eType = it.errorType || 'unknown';
                    failureBreakdown[eType] = (failureBreakdown[eType] || 0) + 1;
                    if (!lastErrorMessage && it.errorMessage) {
                      lastErrorMessage = it.errorMessage;
                    }
                  }
                }
                if (completedVisits === 0 && verifiedSuccess > 0) {
                  completedVisits = verifiedSuccess;
                }
              }
            } catch (dErr) {
              console.warn(`[Worker] Could not query dataset breakdown for batch #${batch.batch_number}:`, dErr.message);
            }
          }

          // If run was SUCCEEDED and had no failures recorded, default completed to target
          if (run.status === 'SUCCEEDED' && completedVisits === 0 && failedSessions === 0 && Object.keys(failureBreakdown).length === 0) {
            completedVisits = batch.visits_target;
          }

          const batchStatus = completedVisits >= batch.visits_target ? 'completed' : (completedVisits > 0 ? 'completed' : 'failed');
          const batchError = completedVisits === 0
            ? (lastErrorMessage || run.statusMessage || `Batch delivered 0/${batch.visits_target} visits (${run.status})`)
            : null;

          console.log(`[Worker] Batch #${batch.batch_number} result: status="${batchStatus}", delivered=${completedVisits}/${batch.visits_target}`);

          // Update batch record
          await supabase.from('traffic_batches').update({
            status: batchStatus,
            completed_at: new Date().toISOString(),
            visits_completed: completedVisits,
            error_message: batchError,
            run_output: {
              runId: run.id,
              runStatus: run.status,
              exitCode: run.exitCode,
              stats: run.stats,
              serpPureClicks,
              fallbackDirect,
              captchaAvoided,
              notRankedCount,
              failedSessions,
              failureBreakdown,
              failureDescriptions,
              lastError: lastErrorMessage
            }
          }).eq('id', batch.id);

          // Update campaign progress
          const currentCampDelivered = batch.traffic_campaigns.visits_completed || 0;
          const newVisitsCompleted = currentCampDelivered + completedVisits;
          const remainingForCampaign = batch.traffic_campaigns.total_visits - newVisitsCompleted;
          const isFinished = remainingForCampaign <= 0;

          // Check if this is a strict Google SERP campaign with fallback disabled
          const isStrictSerp = batch.traffic_campaigns.traffic_source === 'serp_google' && batch.traffic_campaigns.serp_fallback_to_direct === false;

          if (isStrictSerp && completedVisits === 0) {
            // Strict Google SERP with 0 visits delivered (e.g. bad proxy, CAPTCHAs, or target URLs not in Google top 20).
            // Do NOT retry in an infinite loop! Stop the campaign and mark it failed.
            // (No automated refund because headless browser compute was consumed executing user proxy/queries).
            console.warn(`🛑 [Worker] Campaign "${batch.traffic_campaigns.name}" is strict Google SERP (no fallback) and delivered 0 visits. Marking campaign as failed.`);

            await supabase.from('traffic_campaigns').update({
              visits_completed: newVisitsCompleted,
              status: 'failed',
              completed_at: new Date().toISOString()
            }).eq('id', batch.campaign_id);

            await sendUserPushNotification(
              batch.traffic_campaigns.user_id,
              '❌ SERP Campaign Could Not Deliver',
              `Your Google SERP campaign "${batch.traffic_campaigns.name}" could not find your URLs in Google top 20 or encountered CAPTCHAs with your proxy. Enable "Fallback to direct" for 100% guaranteed delivery.`,
              `/campaigns/${batch.campaign_id}`
            );
          } else {
            // Query existing batches to check for consecutive failure ceiling
            const { data: allBatches } = await supabase
              .from('traffic_batches')
              .select('status, visits_completed')
              .eq('campaign_id', batch.campaign_id);

            const failedBatchesCount = (allBatches || []).filter(
              b => b.status === 'failed' || (b.visits_completed === 0 && b.status !== 'pending' && b.status !== 'running')
            ).length;

            if (failedBatchesCount >= 3 && newVisitsCompleted === 0) {
              // Reached 3 failed attempts with 0 visits delivered (e.g. dead target website, invalid URLs, or broken proxy).
              // Mark campaign as failed and halt rescheduling.
              console.warn(`🛑 [Worker] Campaign "${batch.traffic_campaigns.name}" reached 3 consecutive batch failures with 0 visits. Marking campaign as failed.`);

              await supabase.from('traffic_campaigns').update({
                visits_completed: newVisitsCompleted,
                status: 'failed',
                completed_at: new Date().toISOString()
              }).eq('id', batch.campaign_id);

              await sendUserPushNotification(
                batch.traffic_campaigns.user_id,
                '❌ Campaign Delivery Failed',
                `Your campaign "${batch.traffic_campaigns.name}" could not deliver visits after 3 attempts. Please verify your target URLs and proxy settings.`,
                `/campaigns/${batch.campaign_id}`
              );
            } else {
              await supabase.from('traffic_campaigns').update({
                visits_completed: newVisitsCompleted,
                ...(isFinished ? { status: 'completed', completed_at: new Date().toISOString() } : {})
              }).eq('id', batch.campaign_id);

              // If the completed batch had any missed/unmet visits, reallocate them!
              const unmetInBatch = batch.visits_target - completedVisits;

              if (unmetInBatch > 0 && !isFinished && batch.traffic_campaigns.status === 'running') {
                // Try to absorb the missed visits into an upcoming pending batch (up to 100 max visits per batch)
                const { data: upcomingBatches } = await supabase
                  .from('traffic_batches')
                  .select('id, batch_number, visits_target')
                  .eq('campaign_id', batch.campaign_id)
                  .eq('status', 'pending')
                  .order('batch_number', { ascending: true });

                let absorbed = false;
                if (upcomingBatches && upcomingBatches.length > 0) {
                  for (const ub of upcomingBatches) {
                    if ((ub.visits_target || 0) + unmetInBatch <= 100) {
                      await supabase
                        .from('traffic_batches')
                        .update({ visits_target: ub.visits_target + unmetInBatch })
                        .eq('id', ub.id);

                      console.log(`🔁 [Worker] Batch #${batch.batch_number} missed ${unmetInBatch} visits. Absorbed into upcoming Batch #${ub.batch_number} (new target: ${ub.visits_target + unmetInBatch}).`);
                      absorbed = true;
                      break;
                    }
                  }
                }

                // If no upcoming batch could absorb it (or no pending batches remain), create a catch-up batch
                if (!absorbed) {
                  const { data: maxBatch } = await supabase
                    .from('traffic_batches')
                    .select('batch_number')
                    .eq('campaign_id', batch.campaign_id)
                    .order('batch_number', { ascending: false })
                    .limit(1)
                    .single();

                  const nextBatchNum = (maxBatch?.batch_number || batch.batch_number) + 1;
                  const retryScheduledAt = new Date(Date.now() + 60000).toISOString();
                  const catchupTarget = Math.min(100, unmetInBatch);

                  await supabase.from('traffic_batches').insert({
                    campaign_id: batch.campaign_id,
                    batch_number: nextBatchNum,
                    status: 'pending',
                    visits_target: catchupTarget,
                    scheduled_at: retryScheduledAt
                  });

                  console.log(`🔁 [Worker] Batch #${batch.batch_number} missed ${unmetInBatch} visits. Created catch-up Batch #${nextBatchNum} (${catchupTarget} visits).`);
                }
              }
            }
          }

          if (isFinished) {
            const camp = batch.traffic_campaigns;
            if (camp.delivery_mode === 'recurring') {
              console.log(`🔄 [Worker] Recurring campaign "${camp.name}" cycle completed. Checking credits for renewal...`);
              const renewalVisits = camp.total_visits;
              const renewalMultiplier = camp.traffic_source === 'serp_google' ? 2 : 1;
              const renewalCost = renewalVisits * renewalMultiplier;

              const { data: userCreds } = await supabase
                .from('traffic_credits')
                .select('balance, total_used')
                .eq('user_id', camp.user_id)
                .single();

                if (userCreds && userCreds.balance >= renewalCost) {
                  await supabase.from('traffic_credits').update({
                    balance: userCreds.balance - renewalCost,
                    total_used: (userCreds.total_used || 0) + renewalCost,
                    updated_at: new Date().toISOString()
                  }).eq('user_id', camp.user_id);

                  await supabase.from('credit_transactions').insert({
                    user_id: camp.user_id,
                    type: 'debit',
                    amount: -renewalCost,
                    description: `Recurring Traffic Renewal: ${camp.name} (${renewalVisits} visits @ ${renewalMultiplier} cr/ea)`
                  });

                  const renewDuration = camp.recurring_interval_hours || camp.duration_hours || 24;
                  const renewBatches = Math.ceil(renewalVisits / 100);
                  const renewIntervalMs = (renewDuration * 3600 * 1000) / renewBatches;
                  const renewStartTime = Date.now();

                  const { data: lastBatch } = await supabase
                    .from('traffic_batches')
                    .select('batch_number')
                    .eq('campaign_id', camp.id)
                    .order('batch_number', { ascending: false })
                    .limit(1)
                    .single();

                  const startBatchNum = (lastBatch?.batch_number || 0) + 1;
                  const newBatchRows = [];
                  let alloc = 0;

                  for (let b = 0; b < renewBatches; b++) {
                    const isLast = (b === renewBatches - 1);
                    let bSize = isLast ? (renewalVisits - alloc) : Math.floor(renewalVisits / renewBatches);

                    if (camp.humanize_jitter && !isLast && bSize > 10) {
                      const jitterPercent = (Math.random() * 0.20) - 0.10;
                      bSize = Math.max(5, Math.min(100, Math.round(bSize * (1 + jitterPercent))));
                    }
                    alloc += bSize;

                    let batchTime = renewStartTime + (b * renewIntervalMs);
                    if (camp.humanize_jitter && b > 0) {
                      batchTime += (Math.random() * 300000) - 150000;
                    }

                    newBatchRows.push({
                      campaign_id: camp.id,
                      batch_number: startBatchNum + b,
                      status: 'pending',
                      visits_target: bSize,
                      scheduled_at: new Date(batchTime).toISOString()
                    });
                  }

                  await supabase.from('traffic_batches').insert(newBatchRows);
                  await supabase.from('traffic_campaigns').update({
                    status: 'running',
                    visits_completed: 0,
                    traffic_curve: 'steady',
                    updated_at: new Date().toISOString()
                  }).eq('id', camp.id);

                  console.log(`✅ [Worker] Recurring campaign "${camp.name}" successfully renewed for ${renewalVisits} visits (${renewBatches} batches).`);
                } else {
                  console.warn(`⚠️ [Worker] Recurring campaign "${camp.name}" paused due to insufficient credits.`);
                  await supabase.from('traffic_campaigns').update({
                    status: 'paused',
                    updated_at: new Date().toISOString()
                  }).eq('id', camp.id);

                  await sendUserPushNotification(
                    camp.user_id,
                    '⚠️ Recurring Campaign Paused',
                    `Your recurring campaign "${camp.name}" has completed its cycle but was paused due to low balance. Top up credits to resume automatically!`,
                    `/campaigns/${camp.id}`
                  );
                }
              } else {
                console.log(`🎉 [Worker] Campaign "${batch.traffic_campaigns.name}" completed in full (${newVisitsCompleted}/${batch.traffic_campaigns.total_visits} visits).`);
                await sendUserPushNotification(
                  batch.traffic_campaigns.user_id,
                  '🎉 Campaign Completed!',
                  `Your traffic campaign "${batch.traffic_campaigns.name}" has completed! Delivered all ${batch.traffic_campaigns.total_visits.toLocaleString()} visits.`,
                  `/campaigns/${batch.campaign_id}`
                );
              }
            }

            // Handle key success or rate-limit failure
            if (['FAILED', 'TIMED-OUT', 'ABORTED'].includes(run.status)) {
              const isQuota = /quota|monthly|limit|exceed|rate limit|disabled/i.test(run.statusMessage || lastErrorMessage || '');
              await keyManager.markFailure(batch.apify_key_id, isQuota ? 429 : 500, run.statusMessage || lastErrorMessage || run.status);
            } else {
              await keyManager.markSuccess(batch.apify_key_id);
            }
          } catch (bErr) {
            console.error(`[Worker] Error checking run ${batch.apify_run_id}:`, bErr.message);
          }
        }
    }

      // ── Phase 2: Launch pending batches ──────────────────────────────────────
      const nowIso = new Date().toISOString();
      const { data: pendingBatches, error: pendErr } = await supabase
        .from('traffic_batches')
        .select('*, traffic_campaigns!inner(*)')
        .eq('status', 'pending')
        .lte('scheduled_at', nowIso)
        .eq('traffic_campaigns.status', 'running')
        .order('scheduled_at', { ascending: true })
        .limit(5);

      if (!pendErr && pendingBatches && pendingBatches.length > 0) {
        // Guard against concurrent execution on the SAME campaign:
        // If a campaign already has an active 'running' batch, wait for it to finish first.
        const activeCampaignIds = new Set(
          (runningBatches || []).map(b => b.campaign_id)
        );

        for (const batch of pendingBatches) {
          if (activeCampaignIds.has(batch.campaign_id)) {
            continue; // Wait until current active batch finishes cleanly
          }
          activeCampaignIds.add(batch.campaign_id); // Lock this campaign for this worker tick
          const campaign = batch.traffic_campaigns;
          const key = await keyManager.getNextKey();

          if (!key) {
            console.warn('⚠️ [Worker] No active Apify key available to launch batch. Skipping cycle.');
            break;
          }

          console.log(`🚀 [Worker] Launching Batch #${batch.batch_number} for campaign "${campaign.name}" (${batch.visits_target} visits) using key "${key.key_name || key.id}"...`);

          // Build Actor input according to adsterra-traffic actor spec
          // trafficSource enum: 'referrer' | 'serp_google' | 'backlink' | 'direct'
          const trafficSrc = campaign.traffic_source || 'referrer';

          // Proxy config: use user-supplied proxies for SERP mode, otherwise Apify residential
          let proxyConfig = null;
          if (trafficSrc === 'serp_google' && Array.isArray(campaign.user_proxy_urls) && campaign.user_proxy_urls.length > 0) {
            // Normalize proxy URLs to 1-minute sessions (sesstime-1) silently to prevent Google CAPTCHA cascades
            const normalizedProxies = campaign.user_proxy_urls.map(pUrl => {
              if (typeof pUrl === 'string' && /sesstime-\d+/i.test(pUrl)) {
                return pUrl.replace(/sesstime-\d+/gi, 'sesstime-1');
              }
              return pUrl;
            });
            proxyConfig = { useApifyProxy: false, proxyUrls: normalizedProxies };
          } else {
            proxyConfig = { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] };
          }

          // Device type mapping fallback to ensure valid actor enum
          const validDeviceEnums = [
            'random', 'desktop-random', 'mobile-random',
            'desktop-chrome', 'desktop-firefox', 'desktop-safari', 'desktop-edge',
            'mobile-android', 'mobile-ios'
          ];
          let deviceTypeResolved = campaign.device_type || 'random';
          if (deviceTypeResolved === 'desktop') deviceTypeResolved = 'desktop-random';
          if (deviceTypeResolved === 'mobile') deviceTypeResolved = 'mobile-random';
          if (!validDeviceEnums.includes(deviceTypeResolved)) deviceTypeResolved = 'random';

          // Scroll behavior mapping fallback
          let scrollBehaviorResolved = campaign.scroll_behavior || 'human-random';
          if (scrollBehaviorResolved === 'linear') scrollBehaviorResolved = 'slow-linear';
          if (!['human-random', 'slow-linear', 'none'].includes(scrollBehaviorResolved)) {
            scrollBehaviorResolved = 'human-random';
          }

          // Clean & build target items for actor:
          // When in SERP mode, auto-generate clean per-URL search queries without protocols (e.g. site:domain.com/path)
          // or respect the user-supplied custom query so Google matches indexed results smoothly.
          const formattedStartUrls = Array.isArray(campaign.start_urls)
            ? campaign.start_urls.map(item => {
              const urlStr = typeof item === 'string' ? item : item.url;
              if (!urlStr) return item;

              if (trafficSrc === 'serp_google') {
                let serpQuery = (campaign.serp_custom_query || '').trim();
                if (!serpQuery) {
                  const cleanDomainPath = urlStr.replace(/^https?:\/\//i, '');
                  serpQuery = `site:${cleanDomainPath}`;
                }
                return { url: urlStr, serpQuery };
              }

              return typeof item === 'string' ? { url: item } : item;
            })
            : [];

          const actorInput = {
            // Target URLs — actor expects requestListSources format [{url: "...", serpQuery?: "..."}]
            startUrls: formattedStartUrls,
            // Traffic control
            totalVisits: batch.visits_target,       // actor field name is totalVisits
            maxConcurrentSessions: 5,               // 5 concurrent browsers for smooth, prompt throughput
            // Traffic source & referrer
            trafficSource: trafficSrc,              // enum: referrer|serp_google|backlink|direct
            referrerSource: campaign.referrer_source || 'preset_search',
            // Device & behavior
            deviceType: deviceTypeResolved,
            scrollBehavior: scrollBehaviorResolved,
            dwellTimeMinSeconds: campaign.dwell_time_min_seconds || 15,
            dwellTimeMaxSeconds: campaign.dwell_time_max_seconds || 45,
            enableInternalNavigation: campaign.enable_internal_navigation ?? true,
            maxInternalPages: campaign.max_internal_pages || 2,
            // SERP settings
            serpCustomQuery: campaign.serp_custom_query || '',
            serpMaxRetries: campaign.serp_max_retries || 3,
            serpMaxRetries: 1,
            serpFallbackToDirect: campaign.serp_fallback_to_direct ?? false,
            // Proxy
            proxyConfiguration: proxyConfig,
            // Diagnostics & Logging (disabled for production speed and resource conservation)
            captureScreenshots: false,
            captureConsoleErrors: false,
            captureNetworkFailures: false
          };

          try {
            const client = new ApifyClient({ token: key.key_value });
            // Start the Actor with explicit run options:
            // - timeout: 0 (No timeout limit on Apify; run continues until all visits complete)
            // - memory: 4096 (4 GB RAM for optimal headless Playwright performance)
            const run = await client.actor(ACTOR_ID).start(actorInput, {
              timeout: 0,
              memory: 4096
            });

            await supabase.from('traffic_batches').update({
              status: 'running',
              started_at: new Date().toISOString(),
              apify_run_id: run.id,
              apify_key_id: key.id
            }).eq('id', batch.id);

            if (!campaign.started_at) {
              await supabase.from('traffic_campaigns').update({
                started_at: new Date().toISOString()
              }).eq('id', campaign.id);
            }

            console.log(`[Worker] Batch #${batch.batch_number} started successfully. Apify Run ID: ${run.id} | Key: ${key.key_name || key.id}`);
          } catch (launchErr) {
            console.error(`❌ [Worker] Failed to launch batch #${batch.batch_number}:`, launchErr.message);
            const httpStatus = launchErr.statusCode || 500;
            await keyManager.markFailure(key.id, httpStatus, launchErr.message);
          }
        }
      }

      // ── Phase 3: Watchdog for orphaned / stalled campaigns ───────────────────
      // Detect any campaign marked 'running' that has 0 pending and 0 running batches
      // while visits_completed < total_visits, and auto-generate the next batch!
      try {
        const { data: runningCampaigns } = await supabase
          .from('traffic_campaigns')
          .select('*')
          .eq('status', 'running');

        for (const camp of runningCampaigns || []) {
          // Skip strict Google SERP campaigns where fallback is disabled and visits delivered is 0 to avoid burning Apify credits
          if (camp.traffic_source === 'serp_google' && camp.serp_fallback_to_direct === false && (camp.visits_completed === 0 || camp.status === 'failed')) {
            continue;
          }

          const needed = camp.total_visits - (camp.visits_completed || 0);
          if (needed > 0) {
            const { count: liveBatchesCount } = await supabase
              .from('traffic_batches')
              .select('id', { count: 'exact', head: true })
              .eq('campaign_id', camp.id)
              .in('status', ['running', 'pending']);

            if (!liveBatchesCount || liveBatchesCount === 0) {
              const { data: maxBatch } = await supabase
                .from('traffic_batches')
                .select('batch_number')
                .eq('campaign_id', camp.id)
                .order('batch_number', { ascending: false })
                .limit(1)
                .single();

              const nextBatchNum = (maxBatch?.batch_number || 0) + 1;
              const batchSize = Math.min(needed, camp.visits_per_batch || 100);

              console.log(`🛡️ [Watchdog] Detected stalled campaign "${camp.name}" (${camp.visits_completed || 0}/${camp.total_visits} visits, 0 active batches). Auto-scheduling Batch #${nextBatchNum} (${batchSize} visits) immediately.`);
              await supabase.from('traffic_batches').insert({
                campaign_id: camp.id,
                batch_number: nextBatchNum,
                status: 'pending',
                visits_target: batchSize,
                scheduled_at: new Date().toISOString()
              });
            }
          }
        }
      } catch (watchdogErr) {
        console.warn('[Watchdog] Error in stalled campaign check:', watchdogErr.message);
      }
    } catch (err) {
      console.error('❌ [Worker] General loop error:', err.message);
    } finally {
      isWorkerRunning = false;
    }
  }

// Run batch worker every 10 seconds for precise batch execution and run monitoring
cron.schedule('*/10 * * * * *', () => {
    runTrafficBatchWorker();
  });

  // Periodic Key Health Re-check every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Running hourly Apify keys health refresh...');
    const { data: allKeys } = await supabase.from('api_keys').select('*');
    if (allKeys) {
      for (const k of allKeys) {
        await checkApifyKeyHealth(k);
      }
      await keyManager.init();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Health & Heartbeat Routes (Keep-Alive from Supabase pg_cron)
  // ─────────────────────────────────────────────────────────────────────────────
  let heartbeatCount = 0;
  const handleHeartbeat = (req, res) => {
    heartbeatCount++;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const nowStr = new Date().toLocaleTimeString('en-US', { hour12: true });

    console.log(`💓 [Heartbeat #${heartbeatCount}] Keep-alive ping received from ${userAgent} (${clientIp}) at ${nowStr} — Render stays awake!`);

    // Ensure worker evaluates any pending batches on ping
    setImmediate(() => runTrafficBatchWorker());

    res.json({
      status: 'ok',
      service: 'traffic-backend',
      heartbeatCount,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
  };

  app.get('/health', handleHeartbeat);
  app.get('/api/health', handleHeartbeat);
  app.get('/heartbeat', handleHeartbeat);
  app.get('/api/heartbeat', handleHeartbeat);

  // ─────────────────────────────────────────────────────────────────────────────
  // User Credits API
  // ─────────────────────────────────────────────────────────────────────────────
  app.get('/api/credits', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      let { data: credits, error } = await supabase
        .from('traffic_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Auto-initialize if row didn't exist
        const { data: newRow } = await supabase
          .from('traffic_credits')
          .insert({ user_id: userId, balance: 0 })
          .select()
          .single();
        credits = newRow;
      }

      const { data: transactions } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      res.json({
        balance: credits?.balance || 0,
        total_purchased: credits?.total_purchased || 0,
        total_used: credits?.total_used || 0,
        transactions: transactions || []
      });
    } catch (err) {
      console.error('[GET /api/credits]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Traffic Campaigns API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * POST /api/campaigns
   * Create a new campaign, debit credits, and schedule batch chunking (max 100 visits/batch)
   */
  app.post('/api/campaigns', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        name,
        start_urls,
        total_visits = 100,
        duration_hours = 1,
        traffic_source = 'referrer',
        referrer_source = 'preset_search',
        device_type = 'random',
        scroll_behavior = 'human-random',
        serp_custom_query = '',
        serp_max_retries = 3,
        serp_fallback_to_direct = false,
        user_proxy_urls = [],
        dwell_time_min_seconds = 15,
        dwell_time_max_seconds = 45,
        enable_internal_navigation = true,
        max_internal_pages = 2,
        delivery_mode = 'one_time', // 'one_time' | 'recurring'
        traffic_curve = 'steady',   // 'steady' | 'ramp_up'
        daily_shape = 'uniform_24h', // 'uniform_24h' | 'business_hours' | 'evening_peak' | 'global_mix'
        target_timezone = 'UTC',
        humanize_jitter = true,     // natural organic variance (±15%)
        recurring_interval_hours = 24
      } = req.body;

      // Validation
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Campaign name is required' });
      }
      if (!Array.isArray(start_urls) || start_urls.length === 0) {
        return res.status(400).json({ error: 'At least one target URL is required' });
      }
      for (const item of start_urls) {
        if (!item.url || !/^https?:\/\//i.test(item.url)) {
          return res.status(400).json({ error: `Invalid URL: ${item.url}. Must start with http:// or https://` });
        }
      }

      const visits = Math.max(10, parseInt(total_visits, 10) || 100);
      const duration = Math.max(1, parseInt(duration_hours, 10) || 1);

      // If SERP google, require residential proxy
      if (traffic_source === 'serp_google') {
        if (!Array.isArray(user_proxy_urls) || user_proxy_urls.length === 0) {
          return res.status(400).json({
            error: 'Google SERP traffic requires your own Residential Proxies to avoid Google BotGuard blocks. Please provide at least one proxy URL in the proxy configuration.'
          });
        }
      }

      // Rate calculation: Google SERP requires real residential browser searches, charged at 2 credits / visit. Other channels are 1 credit / visit.
      const creditMultiplier = traffic_source === 'serp_google' ? 2 : 1;
      const creditsRequired = visits * creditMultiplier;

      // Check user credits
      const { data: creditRow, error: credErr } = await supabase
        .from('traffic_credits')
        .select('balance, total_used')
        .eq('user_id', userId)
        .single();

      const currentBalance = creditRow?.balance || 0;
      if (currentBalance < creditsRequired) {
        return res.status(402).json({
          error: `Insufficient credits. Required: ${creditsRequired}, Available: ${currentBalance}. Please top up your credits first.`,
          required: creditsRequired,
          balance: currentBalance
        });
      }

      // Deduct credits immediately
      const { error: deductErr } = await supabase
        .from('traffic_credits')
        .update({
          balance: currentBalance - creditsRequired,
          total_used: (creditRow?.total_used || 0) + creditsRequired,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (deductErr) throw new Error(`Credit debit failed: ${deductErr.message}`);

      // Log transaction
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        type: 'debit',
        amount: -creditsRequired,
        description: `Traffic Campaign: ${name} (${visits} visits over ${duration}h)`
      });

      // Chunk visits into batches (Max 100 visits per batch)
      const MAX_VISITS_PER_BATCH = 100;
      const numBatches = Math.ceil(visits / MAX_VISITS_PER_BATCH);
      const baseVisitsPerBatch = Math.floor(visits / numBatches);
      const intervalMs = (duration * 3600 * 1000) / numBatches;

      // Insert Campaign
      // Step 1: Create campaign record directly with all columns
      const { data: campaign, error: campErr } = await supabase
        .from('traffic_campaigns')
        .insert({
          user_id: userId,
          name,
          status: 'running',
          start_urls,
          total_visits: visits,
          duration_hours: duration,
          visits_per_batch: baseVisitsPerBatch,
          traffic_source,
          referrer_source,
          device_type,
          scroll_behavior,
          serp_custom_query,
          serp_max_retries,
          serp_fallback_to_direct,
          user_proxy_urls,
          dwell_time_min_seconds,
          dwell_time_max_seconds,
          enable_internal_navigation,
          max_internal_pages,
          credits_cost: creditsRequired,
          delivery_mode,
          traffic_curve,
          daily_shape,
          target_timezone,
          humanize_jitter: !!humanize_jitter,
          recurring_interval_hours: parseInt(recurring_interval_hours, 10) || duration,
          scheduled_start_at: new Date().toISOString()
        })
        .select()
        .single();

      if (campErr) throw new Error(`Campaign creation failed: ${campErr.message}`);

      // Helper function to calculate hour in target timezone
      function getHourInTimezone(date, timeZone) {
        try {
          const str = date.toLocaleTimeString('en-US', { timeZone, hour12: false, hour: 'numeric' });
          return parseInt(str, 10);
        } catch (e) {
          return date.getUTCHours();
        }
      }

      // Schedule Batches using Selected Curve, Daily Shape & Organic Jitter
      const batchRows = [];
      const startTime = Date.now();

      // 1. Calculate base weights based on macro growth curve (steady vs ramp_up)
      // and micro time-of-day shape (business_hours, evening_peak, uniform_24h, global_mix)
      const weights = [];
      for (let i = 0; i < numBatches; i++) {
        if (numBatches === 1) {
          weights.push(1);
          break;
        }
        const progress = i / (numBatches - 1); // 0.0 to 1.0 (macro trajectory)

        // Macro growth component
        let macroWeight = 1.0;
        if (traffic_curve === 'ramp_up') {
          // Linear ramp up from 0.4x to 1.6x average
          macroWeight = 0.4 + (1.2 * progress);
        }

        // Micro daily shape component (based on expected time of execution in target timezone)
        let microWeight = 1.0;
        const expectedBatchDate = new Date(startTime + (i * intervalMs));
        const localHour = getHourInTimezone(expectedBatchDate, target_timezone || 'UTC');

        if (daily_shape === 'business_hours') {
          // High 9am-6pm (09 to 18), tapering down at morning/evening, quiet at late night (01 to 06)
          if (localHour >= 9 && localHour <= 18) {
            microWeight = 1.6;
          } else if ((localHour >= 7 && localHour < 9) || (localHour > 18 && localHour <= 21)) {
            microWeight = 0.9;
          } else {
            microWeight = 0.3; // Quiet nighttime hours
          }
        } else if (daily_shape === 'evening_peak') {
          // Peaks 6pm-11pm (18 to 23), moderate daytime, quiet late night
          if (localHour >= 18 && localHour <= 23) {
            microWeight = 1.8;
          } else if (localHour >= 11 && localHour < 18) {
            microWeight = 0.9;
          } else {
            microWeight = 0.3;
          }
        } else if (daily_shape === 'global_mix') {
          // Worldwide audience, slight natural undulating wave across 24h
          microWeight = 0.8 + (0.4 * Math.sin((localHour / 24) * 2 * Math.PI));
        }

        weights.push(macroWeight * microWeight);
      }

      const totalWeight = weights.reduce((sum, w) => sum + w, 0);

      // 2. Distribute visits proportionally into time intervals
      let allocatedVisits = 0;
      const intervalAllocations = [];
      for (let i = 0; i < numBatches; i++) {
        if (i === numBatches - 1) {
          intervalAllocations.push(Math.max(5, visits - allocatedVisits));
        } else {
          let size = Math.round((weights[i] / totalWeight) * visits);

          // Apply ±15% natural organic jitter if enabled
          if (humanize_jitter && size > 10) {
            const jitterPercent = (Math.random() * 0.30) - 0.15; // -15% to +15%
            size = Math.round(size * (1 + jitterPercent));
          }

          size = Math.max(5, size);
          if (allocatedVisits + size >= visits) {
            size = Math.max(5, visits - allocatedVisits - 5);
          }

          allocatedVisits += size;
          intervalAllocations.push(size);
        }
      }

      // 3. Guarantee STRICT CAP: No Apify call will EVER exceed MAX_VISITS_PER_BATCH (100).
      // If an interval allocation exceeds 100 (e.g. 260 visits), split it into multiple distinct Apify batch calls (100, 100, 60).
      let batchIndex = 1;
      for (let i = 0; i < intervalAllocations.length; i++) {
        let intervalRemaining = intervalAllocations[i];
        const baseScheduledTime = startTime + (i * intervalMs);
        let subOffset = 0;

        while (intervalRemaining > 0) {
          const subBatchSize = Math.min(MAX_VISITS_PER_BATCH, intervalRemaining);
          intervalRemaining -= subBatchSize;

          let batchScheduledTime = baseScheduledTime + subOffset;
          if (humanize_jitter && (i > 0 || subOffset > 0)) {
            const timingJitterMs = (Math.random() * 240000) - 120000; // ±2 minutes
            batchScheduledTime = Math.max(startTime + 30000, batchScheduledTime + timingJitterMs);
          }

          batchRows.push({
            campaign_id: campaign.id,
            batch_number: batchIndex++,
            status: 'pending',
            visits_target: subBatchSize,
            scheduled_at: new Date(batchScheduledTime).toISOString()
          });

          // Space out sub-batches slightly (e.g. 3-5 mins) if split
          subOffset += 240000;
        }
      }

      const { data: insertedBatches, error: batchErr } = await supabase
        .from('traffic_batches')
        .insert(batchRows)
        .select();

      if (batchErr) {
        console.error(`Error inserting batches for campaign ${campaign.id}:`, batchErr.message);
      }

      // Trigger worker right away for batch #1
      setImmediate(() => runTrafficBatchWorker());

      res.status(201).json({
        success: true,
        campaign,
        batches: insertedBatches || [],
        creditsDeducted: creditsRequired,
        remainingBalance: currentBalance - creditsRequired
      });
    } catch (err) {
      console.error('[POST /api/campaigns]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/campaigns
   * List all campaigns for authenticated user
   */
  app.get('/api/campaigns', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { data: campaigns, error } = await supabase
        .from('traffic_campaigns')
        .select('*, traffic_batches(count)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      res.json({ campaigns: campaigns || [] });
    } catch (err) {
      console.error('[GET /api/campaigns]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/campaigns/:id
   * Get campaign details and its batches
   */
  app.get('/api/campaigns/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const { data: campaign, error: cErr } = await supabase
        .from('traffic_campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (cErr || !campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      const { data: batches } = await supabase
        .from('traffic_batches')
        .select('*')
        .eq('campaign_id', id)
        .order('batch_number', { ascending: true });

      res.json({ campaign, batches: batches || [] });
    } catch (err) {
      console.error('[GET /api/campaigns/:id]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/campaigns/:id/pause
   */
  app.post('/api/campaigns/:id/pause', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('traffic_campaigns')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      res.json({ success: true, campaign: data });
    } catch (err) {
      console.error('[POST /api/campaigns/:id/pause]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/campaigns/:id/resume
   */
  app.post('/api/campaigns/:id/resume', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('traffic_campaigns')
        .update({ status: 'running', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      setImmediate(() => runTrafficBatchWorker());
      res.json({ success: true, campaign: data });
    } catch (err) {
      console.error('[POST /api/campaigns/:id/resume]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/campaigns/:id/cancel
   * Cancels campaign, skips pending batches, and refunds unused credits
   */
  app.post('/api/campaigns/:id/cancel', requireAuth, async (req, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const { data: campaign, error: cErr } = await supabase
        .from('traffic_campaigns')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (cErr || !campaign) {
        return res.status(404).json({ error: 'Campaign not found' });
      }

      if (campaign.status === 'completed' || campaign.status === 'cancelled') {
        return res.status(400).json({ error: `Campaign is already ${campaign.status}` });
      }

      // 1. Abort any currently running Apify Actor run for this campaign
      const { data: runningBatches } = await supabase
        .from('traffic_batches')
        .select('id, apify_run_id, apify_key_id')
        .eq('campaign_id', id)
        .eq('status', 'running')
        .not('apify_run_id', 'is', null);

      if (runningBatches && runningBatches.length > 0) {
        for (const rb of runningBatches) {
          try {
            const keyObj = keyManager.keys.find(k => k.id === rb.apify_key_id);
            if (keyObj) {
              const client = new ApifyClient({ token: keyObj.key_value });
              await client.run(rb.apify_run_id).abort();
              console.log(`[Cancel] Aborted in-flight Apify run ${rb.apify_run_id} for batch #${rb.id}`);
            }
          } catch (abortErr) {
            console.warn(`[Cancel] Could not abort Apify run ${rb.apify_run_id}:`, abortErr.message);
          }

          await supabase
            .from('traffic_batches')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: 'Cancelled by user'
            })
            .eq('id', rb.id);
        }
      }

      // 2. Find all pending batches to refund
      const { data: pendingBatches } = await supabase
        .from('traffic_batches')
        .select('id, visits_target')
        .eq('campaign_id', id)
        .eq('status', 'pending');

      const refundVisits = (pendingBatches || []).reduce((sum, b) => sum + (b.visits_target || 0), 0);

      // 3. Mark pending batches skipped so worker never executes them
      if (pendingBatches && pendingBatches.length > 0) {
        await supabase
          .from('traffic_batches')
          .update({ status: 'skipped' })
          .eq('campaign_id', id)
          .eq('status', 'pending');
      }

      // Mark campaign cancelled
      await supabase
        .from('traffic_campaigns')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);

      // Refund credits to user for unexecuted pending visits (at whatever rate the campaign was charged)
      const creditMultiplier = campaign.traffic_source === 'serp_google' ? 2 : 1;
      const refundCredits = refundVisits * creditMultiplier;

      if (refundCredits > 0) {
        const { data: creditRow } = await supabase
          .from('traffic_credits')
          .select('balance, total_used')
          .eq('user_id', userId)
          .single();

        if (creditRow) {
          await supabase
            .from('traffic_credits')
            .update({
              balance: creditRow.balance + refundCredits,
              total_used: Math.max(0, creditRow.total_used - refundCredits),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

          await supabase.from('credit_transactions').insert({
            user_id: userId,
            type: 'refund',
            amount: refundCredits,
            description: `Refund for cancelled campaign: ${campaign.name} (${refundVisits} unused visits @ ${creditMultiplier} cr/ea)`
          });
        }
      }

      res.json({
        success: true,
        refundedCredits: refundVisits,
        message: `Campaign cancelled. ${refundVisits} unused credits refunded to your balance.`
      });
    } catch (err) {
      console.error('[POST /api/campaigns/:id/cancel]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Admin API Routes
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/admin/keys
   */
  app.get('/api/admin/keys', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      res.json({ keys: data || [] });
    } catch (err) {
      console.error('[GET /api/admin/keys]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/admin/keys
   * Bulk add keys with deduplication
   */
  app.post('/api/admin/keys', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { keys } = req.body;
      if (!keys || !Array.isArray(keys) || keys.length === 0) {
        return res.status(400).json({ error: 'An array of keys is required' });
      }

      const { data: existingKeys, error: fetchError } = await supabase
        .from('api_keys')
        .select('key_name, key_value');
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
            key_name: k.key_name || 'Apify Key',
            key_value: k.key_value,
            provider: k.provider || 'apify',
            status: 'ACTIVE',
            health: 100,
            usage_usd: 0,
            limit_usd: 5.0
          });
          existingNames.add(k.key_name);
          existingValues.add(k.key_value);
        }
      }

      if (keysToInsert.length > 0) {
        const { error: insertError } = await supabase.from('api_keys').insert(keysToInsert);
        if (insertError) throw new Error(insertError.message);
      }

      await keyManager.init();

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
   */
  app.delete('/api/admin/keys', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { keyIds } = req.body;
      if (!keyIds || !Array.isArray(keyIds)) {
        return res.status(400).json({ error: 'keyIds array required' });
      }

      const { error } = await supabase.from('api_keys').delete().in('id', keyIds);
      if (error) throw new Error(error.message);

      await keyManager.init();
      res.json({ success: true });
    } catch (err) {
      console.error('[DELETE /api/admin/keys]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/admin/keys/health
   */
  app.post('/api/admin/keys/health', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { keyIds } = req.body;
      if (!keyIds || !Array.isArray(keyIds)) {
        return res.status(400).json({ error: 'keyIds array required' });
      }

      const { data: keys, error } = await supabase.from('api_keys').select('*').in('id', keyIds);
      if (error) throw new Error(error.message);

      const results = await Promise.all(keys.map(k => checkApifyKeyHealth(k)));
      await keyManager.init();

      res.json({ success: true, updatedKeys: results });
    } catch (err) {
      console.error('[POST /api/admin/keys/health]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/stats
   */
  app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
    try {
      const [
        { count: totalUsers },
        { count: totalCampaigns },
        { data: activeCampaigns },
        { data: completedVisitsData },
        { data: keysData }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('traffic_campaigns').select('*', { count: 'exact', head: true }),
        supabase.from('traffic_campaigns').select('id').eq('status', 'running'),
        supabase.from('traffic_campaigns').select('visits_completed'),
        supabase.from('api_keys').select('id, status, usage_usd, limit_usd, health')
      ]);

      const totalDeliveredVisits = (completedVisitsData || []).reduce((acc, row) => acc + (row.visits_completed || 0), 0);
      const totalKeys = keysData?.length || 0;
      const activeKeys = (keysData || []).filter(k => k.status === 'ACTIVE' || k.status === 'Active').length;
      const totalApifySpend = (keysData || []).reduce((acc, k) => acc + Number(k.usage_usd || 0), 0);

      res.json({
        totalUsers: totalUsers || 0,
        totalCampaigns: totalCampaigns || 0,
        activeCampaignsCount: activeCampaigns?.length || 0,
        totalDeliveredVisits,
        totalKeys,
        activeKeys,
        totalApifySpend
      });
    } catch (err) {
      console.error('[GET /api/admin/stats]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/admin/campaigns
   * List all campaigns across all users
   */
  app.get('/api/admin/campaigns', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('traffic_campaigns')
        .select('*, users(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw new Error(error.message);
      res.json({ campaigns: data || [] });
    } catch (err) {
      console.error('[GET /api/admin/campaigns]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/admin/users/:userId/credits
   * Admin manually grants/adjusts credits
   */
  app.post('/api/admin/users/:userId/credits', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { amount, reason = 'Admin grant' } = req.body;
      const creditAmount = parseInt(amount, 10);

      if (!creditAmount || isNaN(creditAmount)) {
        return res.status(400).json({ error: 'Valid numeric amount is required' });
      }

      const { data: userCredits } = await supabase
        .from('traffic_credits')
        .select('balance, total_purchased')
        .eq('user_id', userId)
        .single();

      const currentBalance = userCredits?.balance || 0;
      const newBalance = Math.max(0, currentBalance + creditAmount);

      await supabase
        .from('traffic_credits')
        .upsert({
          user_id: userId,
          balance: newBalance,
          total_purchased: (userCredits?.total_purchased || 0) + (creditAmount > 0 ? creditAmount : 0),
          updated_at: new Date().toISOString()
        });

      await supabase.from('credit_transactions').insert({
        user_id: userId,
        type: creditAmount >= 0 ? 'purchase' : 'debit',
        amount: creditAmount,
        description: `Admin adjustment: ${reason}`
      });

      res.json({ success: true, newBalance });
    } catch (err) {
      console.error('[POST /api/admin/users/:userId/credits]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Polar Payment Webhook
  // ─────────────────────────────────────────────────────────────────────────────
  app.post('/api/webhooks/polar', async (req, res) => {
    try {
      const event = req.body;
      console.log('[Polar Webhook] Received event:', event?.type || event?.event);

      // Handle order created or payment completed
      const eventType = event?.type || event?.event;
      if (eventType === 'order.created' || eventType === 'subscription.created' || eventType === 'checkout.created') {
        const data = event?.data;
        const customerEmail = data?.customer?.email || data?.customer_email || data?.user?.email;
        const metadata = data?.metadata || {};
        const customerExternalId = data?.customer?.external_id || data?.customer_external_id || metadata?.user_id;

        let targetUserId = customerExternalId;
        if (!targetUserId && customerEmail) {
          const { data: userRow } = await supabase.from('users').select('id').eq('email', customerEmail).single();
          targetUserId = userRow?.id;
        }

        if (targetUserId) {
          // Polar amounts are in cents (e.g. $100.00 = 10000 cents)
          const amountUsd = (data?.amount || data?.total_amount || 0) / 100;

          // 1 Unit ($1) = 1,000 Traffic Visits / Credits
          const unitsPurchased = data?.units || data?.items?.[0]?.units;
          const creditsAwarded = unitsPurchased
            ? unitsPurchased * 1000
            : (metadata?.credits ? parseInt(metadata.credits, 10) : Math.round(amountUsd * 1000));

          if (creditsAwarded > 0) {
            const { data: currentCredits } = await supabase
              .from('traffic_credits')
              .select('balance, total_purchased')
              .eq('user_id', targetUserId)
              .single();

            const prevBalance = currentCredits?.balance || 0;
            await supabase.from('traffic_credits').upsert({
              user_id: targetUserId,
              balance: prevBalance + creditsAwarded,
              total_purchased: (currentCredits?.total_purchased || 0) + creditsAwarded,
              updated_at: new Date().toISOString()
            });

            await supabase.from('credit_transactions').insert({
              user_id: targetUserId,
              type: 'purchase',
              amount: creditsAwarded,
              description: `Polar payment ($${amountUsd.toFixed(2)}) — ${creditsAwarded.toLocaleString()} traffic credits`,
              polar_order_id: data?.id || event?.id
            });

            console.log(`🎉 [Polar] Credited ${creditsAwarded} visits to user ${targetUserId}`);
          }
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error('[Polar Webhook Error]', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Start Server
  // ─────────────────────────────────────────────────────────────────────────────
  async function start() {
    await keyManager.init();

    // Force PostgREST schema cache reload on every startup.
    // This ensures newly-added columns (delivery_mode, traffic_curve, etc.)
    // are visible via the REST API immediately after Render restarts.
    try {
      const { error: notifyErr } = await supabase.rpc('reload_postgrest_schema');
      if (notifyErr) {
        console.warn('⚠️  PostgREST schema reload RPC failed (non-fatal):', notifyErr.message);
      } else {
        console.log('✅ PostgREST schema cache reloaded on startup');
      }
    } catch (e) {
      console.warn('⚠️  PostgREST schema reload error (non-fatal):', e.message);
    }

    app.listen(PORT, () => {
      console.log(`🚀 Website Traffic Backend running on http://localhost:${PORT}`);
      console.log(`📡 Linked Apify Actor: ${ACTOR_ID}`);
    });
  }

  start();
