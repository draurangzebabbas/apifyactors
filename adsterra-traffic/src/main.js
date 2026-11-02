/**
 * Organic Traffic & Direct Link Tester — Apify Actor
 *
 * Supports:
 *   1. Direct Traffic: Straight navigation to target URLs or direct links
 *   2. SERP Traffic: Realistic Google Search (site:{target} or custom query), finding organic results & clicking
 *   3. Humanized Browsing: Variable dwell time, natural random scrolling, reading pauses, mouse movements
 *   4. Deep Browsing / Internal Navigation: Multi-page deep traversal with configurable depth & dwell
 *   5. Rich Analytics: Referrer checks, navigation path, dwell metrics, ad network detection, screenshots
 */

import { Actor, log } from 'apify';
import { chromium } from 'playwright';

import { executeBacklinkTraffic } from './backlink.js';
import { detectAds, getPageMetadata, isPageBlank } from './detector.js';
import { buildContextOptions, getStealthInitScript, resolveDeviceProfile, resolveProxyGeo } from './devices.js';
import { humanRandomScroll, linearSlowScroll, randomBetween, sleep } from './humanizer.js';
import { executeInternalNavigation } from './internalNav.js';
import { rotateResidentialProxyUrl } from './proxyRotator.js';
import { resolveReferrer } from './referrers.js';
import { buildSerpQuery, executeGoogleSerpSearch } from './serp.js';
import { extractTargetItems } from './urlSanitizer.js';

await Actor.init();

// ── 1. Input Processing & Defaults ───────────────────────────────────────────

const input = (await Actor.getInput()) || {};

const {
    startUrls = [],
    trafficSource = 'referrer', // 'direct' | 'referrer' | 'serp_google' | 'backlink'
    referrerSource = 'preset_social', // 'preset_social' | 'preset_search' | 'preset_blogs' | 'custom'
    customReferrers = '',
    deviceType = 'random',
    customUserAgent = '',
    serpCustomQuery = '',
    serpQueryList = '',
    serpFallbackToDirect = false,
    serpMaxRetries = 3,
    backlinkUrl = '',
    backlinkAnchorText = '',
    testMode = 'link-validation',
    testDurationSeconds,
    dwellTimeMinSeconds = 15,
    dwellTimeMaxSeconds = 35,
    scrollBehavior = 'human-random', // 'human-random' | 'slow-linear' | 'none'
    enableInternalNavigation = true,
    maxInternalPages = 2,
    internalPageDwellMinSeconds = 10,
    internalPageDwellMaxSeconds = 25,
    totalVisits = null,
    repeatVisits = 1,
    maxConcurrentSessions = 2,
    navigationTimeoutSeconds = 60,
    waitAfterNavigationSeconds = 5,
    maxRunDurationSeconds = 3600,
    maxRetries = 1,
    captureScreenshots = true,
    captureConsoleErrors = true,
    captureNetworkFailures = true,
    proxyConfiguration: proxyInput = null,
} = input;

// Extract, sanitize, and validate target URLs (with optional per-target serpQuery)
const targetItems = extractTargetItems(startUrls, serpQueryList);
const validUrls = targetItems.map((item) => item.url);

if (validUrls.length === 0) {
    log.error('No valid target URLs provided in startUrls.');
    await Actor.fail('No valid HTTP/HTTPS URLs found in startUrls.');
}

// Early validation for backlink mode — fail fast before any browser launches
if (trafficSource === 'backlink') {
    if (!backlinkUrl || !backlinkUrl.trim()) {
        log.error('Backlink mode is selected but "Backlink Source Page URL" (backlinkUrl) is empty.');
        await Actor.fail(
            '[Backlink mode] You must provide a "Backlink Source Page URL" — the LinkedIn post, Reddit thread, Medium article, etc. that contains your link.',
        );
    }
    try {
        const parsedBacklinkUrl = new URL(backlinkUrl.trim());
        if (!['http:', 'https:'].includes(parsedBacklinkUrl.protocol)) {
            throw new Error('Must use http or https protocol');
        }
    } catch {
        log.error(`Backlink Source Page URL is not a valid URL: ${backlinkUrl}`);
        await Actor.fail(`[Backlink mode] "Backlink Source Page URL" is not a valid URL: ${backlinkUrl}`);
    }
    if (!backlinkAnchorText || !backlinkAnchorText.trim()) {
        log.warning(
            '[Backlink mode] "Anchor Text" (backlinkAnchorText) is empty — the system will fall back to matching by target URL on the backlink page. For best results, provide the anchor text.',
        );
    }
    log.info('Backlink mode validated.', { backlinkUrl, backlinkAnchorText: backlinkAnchorText || '(match by URL)' });
}

// Dwell time configuration (backward compatible with testDurationSeconds)
let resolvedMinDwell = Number(dwellTimeMinSeconds) || 15;
let resolvedMaxDwell = Number(dwellTimeMaxSeconds) || 35;
if (testDurationSeconds && !input.dwellTimeMinSeconds) {
    const fixed = Number(testDurationSeconds);
    resolvedMinDwell = Math.max(5, fixed - 5);
    resolvedMaxDwell = fixed + 5;
}
if (resolvedMinDwell > resolvedMaxDwell) {
    const temp = resolvedMinDwell;
    resolvedMinDwell = resolvedMaxDwell;
    resolvedMaxDwell = temp;
}

// Concurrency clamp: 1 by default, max 5 (max 3 for SERP/backlink to avoid anti-bot blocks)
const requestedConcurrency = Number(maxConcurrentSessions) || 1;
const safeMaxLimit = trafficSource === 'serp_google' || trafficSource === 'backlink' ? 3 : 5;
const concurrencyLimit = Math.min(Math.max(requestedConcurrency, 1), safeMaxLimit);

if (requestedConcurrency > safeMaxLimit) {
    log.info(
        `Concurrency automatically clamped from ${requestedConcurrency} to safe limit of ${concurrencyLimit} to prevent anti-bot blocks and container memory exhaustion.`,
    );
}
const navTimeoutMs = Math.min(Math.max(Number(navigationTimeoutSeconds) || 60, 10), 180) * 1000;
const extraWaitMs = Math.min(Math.max(Number(waitAfterNavigationSeconds) || 5, 0), 60) * 1000;
const maxRunMs = Math.min(Math.max(Number(maxRunDurationSeconds) || 3600, 60), 86400) * 1000;
const repetitions = Math.min(Math.max(Number(repeatVisits) || 1, 1), 10000);
const retryLimit = Math.min(Math.max(Number(maxRetries) || 1, 0), 3);
// SERP-specific retry cap — separate from general network retries.
// Limits how many times a SERP session re-fires against Google on CAPTCHA / timeout
// before giving up, protecting proxy credit budget.
const serpRetryLimit = Math.min(Math.max(Number(serpMaxRetries) || 3, 1), 10);
const resolvedInternalMaxPages = enableInternalNavigation
    ? Math.min(Math.max(Number(maxInternalPages) || 0, 0), 10)
    : 0;

// Resolve Total Package Visits vs per-URL Repetitions
const resolvedTotalVisits = totalVisits && Number(totalVisits) > 0 ? Math.floor(Number(totalVisits)) : null;
const totalSessionsTarget = resolvedTotalVisits !== null ? resolvedTotalVisits : validUrls.length * repetitions;

log.info('Traffic & Direct Link Actor initializing.', {
    trafficSource,
    urls: validUrls.length,
    totalVisitsTarget: totalSessionsTarget,
    visitsDistributionMode: resolvedTotalVisits !== null ? 'Package Total Visits (round-robin)' : 'Per-URL Repetitions',
    repetitionsPerUrl:
        resolvedTotalVisits !== null ? `~${(resolvedTotalVisits / validUrls.length).toFixed(1)} avg` : repetitions,
    concurrency: concurrencyLimit,
    dwellRange: `${resolvedMinDwell}s - ${resolvedMaxDwell}s`,
    scrollBehavior,
    internalPagesMax: resolvedInternalMaxPages,
    serpFallbackToDirect: trafficSource === 'serp_google' ? serpFallbackToDirect : undefined,
    serpMaxRetries: trafficSource === 'serp_google' ? serpRetryLimit : undefined,
});

if (trafficSource === 'serp_google') {
    log.info(
        '💡 Notice: Google SERP mode automates live searches on google.com. ' +
            'Google frequently throttles or drops Datacenter Proxies with connection timeouts (page.goto: Timeout) or CAPTCHAs. ' +
            'For reliable SERP navigation, use Apify Residential Proxies (RESIDENTIAL group). Alternatively, "Simulated Referral Traffic" ' +
            'with the "Search Engines" preset visits your target URL directly with a Google referrer header without touching google.com, ' +
            'which is 100% reliable and recognized by Google Analytics (GA4) and ad networks as Organic Search.',
    );

    if (proxyInput?.proxyUrls?.length) {
        const proxyUrl = String(proxyInput.proxyUrls[0] || '');
        const sessTimeMatch = proxyUrl.match(/sesstime-(\d+)/i);
        const sessTime = sessTimeMatch ? Number(sessTimeMatch[1]) : null;
        if (sessTime && sessTime > 1 && (Number(maxConcurrentSessions) || 1) > 1) {
            log.warning(
                `⚠️  Proxy Warning: Your proxy URL uses "sesstime-${sessTime}" (${sessTime}-minute sticky sessions). ` +
                    `With ${maxConcurrentSessions} concurrent sessions, multiple parallel Google searches will share the same exit IP for up to ${sessTime} minutes, ` +
                    'causing rapid CAPTCHA cascades. Use "sesstime-1" or "sesstime-0" for SERP mode with concurrency > 1.',
            );
        }
    }
}

// ── 2. Proxy Configuration ───────────────────────────────────────────────────

let proxyConfig = null;
let proxyDescription = 'none';
try {
    if (proxyInput) {
        proxyConfig = await Actor.createProxyConfiguration(proxyInput);
        proxyDescription = 'Apify proxy (user configured)';
        log.info('Proxy configuration loaded successfully.');
    }
} catch (err) {
    log.warning(`Proxy setup warning: ${err.message}. Running without proxy.`);
    proxyDescription = `failed: ${err.message}`;
}

// ── 3. Run State & Summary ───────────────────────────────────────────────────

const summary = {
    urlsSubmitted: validUrls.length,
    totalVisitsRequested: resolvedTotalVisits,
    sessionsScheduled: totalSessionsTarget,
    sessionsCompleted: 0,
    successfulSessions: 0,
    failedSessions: 0,
    serpClicksSucceeded: 0,
    backlinkClicksSucceeded: 0,
    totalInternalPagesExplored: 0,
    blankPagesDetected: 0,
    proxyFailures: 0,
    skippedDueToRuntimeLimit: 0,
    proxyUsed: proxyDescription,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    totalDurationMs: 0,
    maxConcurrencyAchieved: 0,
    averageDwellSeconds: 0,
    averagePagesPerSession: 0,
    failureBreakdown: {
        serp_not_ranked: 0,
        google_captcha_detected: 0,
        google_serp_timeout_or_blocked: 0,
        click_landed_on_google: 0,
        click_landed_on_wrong_domain: 0,
        click_failed: 0,
        network_error: 0,
        backlink_not_found: 0,
        other: 0,
    },
};

function recordFailureReason(key) {
    const validKey = summary.failureBreakdown[key] !== undefined ? key : 'other';
    summary.failureBreakdown[validKey] = (summary.failureBreakdown[validKey] || 0) + 1;
}

function classifyDetailedReason(msg) {
    if (msg.includes('target_not_found_in_serp')) return 'serp_not_ranked';
    if (msg.includes('google_captcha_detected')) return 'google_captcha_detected';
    if (msg.includes('google_serp_timeout_or_blocked')) return 'google_serp_timeout_or_blocked';
    if (msg.includes('click_landed_on_google')) return 'click_landed_on_google';
    if (msg.includes('click_landed_on_wrong_domain')) return 'click_landed_on_wrong_domain';
    if (msg.includes('click_failed')) return 'click_failed';
    if (msg.includes('backlink_target_not_found')) return 'backlink_not_found';
    if (
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('ERR_TUNNEL_CONNECTION_FAILED') ||
        msg.includes('ERR_PROXY_CONNECTION_FAILED') ||
        msg.includes('ERR_CONNECTION_CLOSED') ||
        msg.includes('ERR_EMPTY_RESPONSE') ||
        msg.includes('ERR_NETWORK_CHANGED') ||
        msg.includes('NS_ERROR_NET')
    ) {
        return 'network_error';
    }
    return 'other';
}

let shutdownRequested = false;
Actor.on('aborting', () => {
    shutdownRequested = true;
});

const runStart = Date.now();
const allDwellSeconds = [];
const allPagesVisitedCounts = [];

const sessionStepCounters = new Map();

async function saveScreenshot(page, label, sessionNumber) {
    if (!captureScreenshots || !page) return null;
    try {
        const curUrl = page.url() || '';
        // If the browser never reached a website (still on about:blank), skip to prevent hanging on font loading
        if (!curUrl || curUrl === 'about:blank') {
            log.debug(`[Screenshot] Skipped "${label}" because page is about:blank.`);
            return null;
        }

        const currentStep = (sessionStepCounters.get(sessionNumber) || 0) + 1;
        sessionStepCounters.set(sessionNumber, currentStep);

        const sPad = String(sessionNumber).padStart(3, '0');
        const stepPad = String(currentStep).padStart(2, '0');
        const cleanLabel = String(label)
            .replace(/^landing_before$/, 'landing_before_scroll')
            .replace(/^landing_after$/, 'landing_after_scroll');
        const key = `s${sPad}_step${stepPad}_${cleanLabel}`;

        const buf = await page.screenshot({
            type: 'jpeg',
            quality: 75,
            fullPage: false,
            timeout: 5000,
            animations: 'disabled',
        });
        await Actor.setValue(key, buf, { contentType: 'image/jpeg' });
        log.info(`[Screenshot] Saved "${cleanLabel}" -> Key: ${key}`);
        return key;
    } catch (err) {
        log.warning(`Screenshot "${label}" could not be captured: ${err.message}`);
        return null;
    }
}

// ── 5. Single Browser Session ────────────────────────────────────────────────

async function runSession(task) {
    const { url, serpQuery: targetSerpQuery = '', sessionNumber } = task;
    const sessionStart = Date.now();
    const startedAt = new Date().toISOString();

    log.info(`[S${sessionNumber}] ▶ Starting session (${trafficSource}) for: ${url}`);

    const result = {
        trafficSource,
        referrerSource: trafficSource === 'referrer' ? referrerSource : null,
        deviceUsed: null,
        deviceType: null,
        testMode: testMode || 'link-validation',
        sessionNumber,
        inputUrl: url,
        status: 'FAILED',
        serpQuery: null,
        serpRankFound: null,
        serpClickSucceeded: null,
        serpScreenshot: null,
        serpScreenshots: [],
        backlinkSourceUrl: null,
        backlinkAnchorText: null,
        backlinkClickSucceeded: null,
        landingUrl: null,
        landingTitle: null,
        httpStatus: null,
        redirectCount: 0,
        referrer: null,
        landingDwellSeconds: 0,
        landingScrollDepthPercent: 0,
        internalNavigationEnabled: enableInternalNavigation,
        internalPagesCount: 0,
        internalPagesVisited: [],
        navigationPath: [],
        totalPagesVisited: 0,
        totalSessionDwellSeconds: 0,
        isBlankPage: null,
        adDetection: null,
        proxyUsed: proxyDescription,
        consoleErrors: captureConsoleErrors ? [] : null,
        networkFailures: captureNetworkFailures ? [] : null,
        screenshotBeforeScroll: null,
        screenshotAfterScroll: null,
        startedAt,
        finishedAt: null,
        durationSeconds: 0,
        errorType: null,
        errorMessage: null,
    };

    let attempt = 0;
    const sessionMaxAttempts = trafficSource === 'serp_google' ? serpRetryLimit : Math.max(retryLimit, 1);
    while (attempt < sessionMaxAttempts) {
        attempt++;
        let browser = null;
        let context = null;
        let page = null;

        try {
            // Obtain proxy URL if active
            let proxyUrl = null;
            if (proxyConfig) {
                try {
                    const randomToken = Math.random().toString(36).substring(2, 7);
                    proxyUrl = await proxyConfig.newUrl(`s${sessionNumber}_a${attempt}_${randomToken}`);
                } catch (e) {
                    summary.proxyFailures++;
                    log.warning(`[S${sessionNumber}] Proxy URL generation failed: ${e.message}`);
                }
            }

            // Auto-rotate residential proxy session ID (Oxylabs, Smartproxy, BrightData)
            // so every session / attempt connects through a fresh residential IP
            if (proxyUrl) {
                proxyUrl = rotateResidentialProxyUrl(proxyUrl, sessionNumber, attempt);
            }

            // Resolve device & browser profile for this session
            const deviceProfile = resolveDeviceProfile(deviceType, customUserAgent);
            result.deviceUsed = deviceProfile.name;
            result.deviceType = deviceProfile.type;

            let launchProxy;
            if (proxyUrl) {
                try {
                    const u = new URL(proxyUrl);
                    // Standard forward proxies (Oxylabs, Smartproxy, etc.) use HTTP CONNECT.
                    // If a user accidentally enters https://, normalize to http:// so Playwright connects cleanly.
                    const protocol = (u.protocol === 'https:') ? 'http:' : (u.protocol || 'http:');
                    launchProxy = {
                        server: `${protocol}//${u.host}`,
                        username: decodeURIComponent(u.username || ''),
                        password: decodeURIComponent(u.password || ''),
                    };
                } catch {
                    log.warning(`[S${sessionNumber}] Bad proxy URL formatted.`);
                }
            }

            // Launch browser with anti-detection flags & process-level proxy configuration
            // Note: --disable-http2 is added when a proxy is present because residential proxies
            // (Oxylabs, Smartproxy, Webshare Residential, etc.) use HTTP/1.1 CONNECT tunneling.
            // Chromium's HTTP/2 multiplexing is incompatible with H1.1 proxy CONNECT tunnels,
            // causing google.com to hang until timeout. H1.1 forces the correct tunnel protocol.
            //
            // Headful mode: when Xvfb is running (DISPLAY env is set) we launch with headless:false
            // so Google sees a genuine GUI window instead of a headless bot fingerprint.
            const hasDisplay = !!process.env.DISPLAY;
            const launchArgs = [
                '--disable-blink-features=AutomationControlled',
                '--disable-gpu',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                `--window-size=${deviceProfile.viewport.width},${deviceProfile.viewport.height}`,
            ];
            if (launchProxy) {
                launchArgs.push('--disable-http2');
            }
            if (trafficSource === 'serp_google') {
                // Extra stealth flags to reduce Chromium bot-detection signals on Google
                launchArgs.push(
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-features=AudioServiceOutOfProcess',
                    '--disable-ipc-flooding-protection',
                    '--disable-renderer-backgrounding',
                    '--disable-backgrounding-occluded-windows',
                );
            }
            browser = await chromium.launch({
                headless: !hasDisplay,
                proxy: launchProxy,
                args: launchArgs,
            });

            const proxyGeo = resolveProxyGeo(proxyUrl);
            const ctxOpts = buildContextOptions(deviceProfile, proxyGeo.locale, proxyGeo.timezoneId);
            if (launchProxy) {
                ctxOpts.proxy = launchProxy;
            }

            context = await browser.newContext(ctxOpts);
            await context.addInitScript(getStealthInitScript(deviceProfile));

            page = await context.newPage();

            // Setup listeners
            const consoleErrors = [];
            if (captureConsoleErrors) {
                page.on('console', (msg) => {
                    if (msg.type() === 'error') {
                        consoleErrors.push({ type: msg.type(), text: msg.text().slice(0, 300) });
                    }
                });
            }

            const networkFailures = [];
            if (captureNetworkFailures) {
                page.on('requestfailed', (req) => {
                    networkFailures.push({
                        url: req.url().slice(0, 180),
                        method: req.method(),
                        failure: req.failure()?.errorText || 'failed',
                    });
                });
            }

            let documentStatus = null;
            let redirectCount = 0;
            page.on('response', (resp) => {
                const s = resp.status();
                const req = resp.request();
                const reqUrl = resp.url();
                // Capture main HTML document status, ignore analytics beacons/pixels and google domain redirects
                if (
                    (req.isNavigationRequest() || req.resourceType() === 'document') &&
                    !reqUrl.includes('google.') &&
                    !reqUrl.includes('gstatic.')
                ) {
                    documentStatus = s;
                }
                if (s >= 300 && s < 400) redirectCount++;
            });

            // ── NAVIGATION (DIRECT | SERP | BACKLINK) ────────────────────────

            let navResp = null;
            if (trafficSource === 'serp_google') {
                log.info(`[S${sessionNumber}] Starting Google SERP navigation flow…`);
                const queryForSession = targetSerpQuery || serpCustomQuery;
                let serpResult = null;
                try {
                    serpResult = await executeGoogleSerpSearch(
                        page,
                        url,
                        queryForSession,
                        navTimeoutMs,
                        async (p, label) => saveScreenshot(p, label, sessionNumber),
                    );
                } catch (serpErr) {
                    serpResult = {
                        success: false,
                        query: buildSerpQuery(url, queryForSession || serpCustomQuery),
                        rank: null,
                        error: serpErr.message,
                        screenshots: [],
                    };
                }

                if (serpResult.page && serpResult.page !== page) {
                    page = serpResult.page;
                }

                if (serpResult.success && serpResult.destinationUrl) {
                    try {
                        const targetHost = new URL(url).hostname.replace(/^www\./, '');
                        const landedHost = new URL(serpResult.destinationUrl).hostname.replace(/^www\./, '');
                        if (!landedHost.includes(targetHost) && !targetHost.includes(landedHost)) {
                            log.warning(
                                `[S${sessionNumber}] SERP click landed on unexpected domain: expected "${targetHost}", got "${landedHost}". ` +
                                    'This indicates an ad redirect or intermediate page loop. Marking as SERP failure.',
                            );
                            serpResult.success = false;
                            serpResult.error = `click_landed_on_wrong_domain: ${landedHost}`;
                        }
                    } catch {
                        // ignore URL parse errors
                    }
                }

                result.serpQuery = serpResult.query;
                result.serpRankFound = serpResult.rank;
                result.serpClickSucceeded = serpResult.success;
                result.serpScreenshots = serpResult.screenshots || [];
                if (serpResult.screenshotKey) {
                    result.serpScreenshot = serpResult.screenshotKey;
                } else if (result.serpScreenshots.length > 0) {
                    result.serpScreenshot = result.serpScreenshots[result.serpScreenshots.length - 1];
                }

                if (serpResult.success) {
                    summary.serpClicksSucceeded++;
                    result.navigationPath.push(`Google SERP (Rank #${serpResult.rank}: "${serpResult.query}")`);
                } else if (serpFallbackToDirect) {
                    log.warning(
                        `[S${sessionNumber}] Google SERP did not succeed (${serpResult.error}). Fallback to direct navigation with Google referrer (serpFallbackToDirect is enabled).`,
                    );
                    result.navigationPath.push(`Google SERP (Fallback: ${serpResult.error})`);
                    try {
                        navResp = await page.goto(url, {
                            referer: 'https://www.google.com/',
                            waitUntil: 'commit',
                            timeout: navTimeoutMs,
                        });
                        const fallbackShot = await saveScreenshot(page, 'serp_fallback_landed', sessionNumber);
                        if (fallbackShot) {
                            result.serpScreenshots.push(fallbackShot);
                            if (!result.serpScreenshot) result.serpScreenshot = fallbackShot;
                        }
                    } catch (navErr) {
                        const curUrl = page.url() || '';
                        if (curUrl && curUrl.includes(new URL(url).hostname)) {
                            log.info(`[S${sessionNumber}] Reached target domain despite slow subresources.`);
                        } else {
                            throw navErr;
                        }
                    }
                } else {
                    log.warning(
                        `[S${sessionNumber}] Google SERP navigation did not succeed (${serpResult.error}). Strict SERP mode active: direct fallback is disabled to guarantee 100% genuine Google SERP clicks.`,
                    );
                    throw new Error(`SERP search failed (${serpResult.error})`);
                }
            } else if (trafficSource === 'referrer') {
                // ── SIMULATED REFERRAL TRAFFIC (Direct with custom / rotating Referer) ───
                const resolvedRef = resolveReferrer(referrerSource, customReferrers, backlinkUrl);
                log.info(`[S${sessionNumber}] Simulated Referral visit via: ${resolvedRef} [${deviceProfile.name}]`);
                result.referrer = resolvedRef;
                result.navigationPath.push(`Referral Source (${resolvedRef})`);
                try {
                    navResp = await page.goto(url, {
                        referer: resolvedRef,
                        waitUntil: 'commit',
                        timeout: navTimeoutMs,
                    });
                } catch (navErr) {
                    const curUrl = page.url() || '';
                    if (curUrl && curUrl.includes(new URL(url).hostname)) {
                        log.info(`[S${sessionNumber}] Reached target domain despite slow subresources.`);
                    } else {
                        throw navErr;
                    }
                }
            } else if (trafficSource === 'backlink') {
                // ── BACKLINK TRAFFIC MODE ─────────────────────────────────────
                // Guard — should have been caught at startup, but double-check
                if (!backlinkUrl || !backlinkUrl.trim()) {
                    throw new Error(
                        '[Backlink mode] "Backlink Source Page URL" (backlinkUrl) is required but was not provided.',
                    );
                }
                log.info(`[S${sessionNumber}] Starting Backlink traffic flow via: ${backlinkUrl}`);
                if (backlinkAnchorText) {
                    log.info(`[S${sessionNumber}] Anchor text to find: "${backlinkAnchorText}"`);
                } else {
                    log.info(`[S${sessionNumber}] No anchor text provided — will match link by target URL.`);
                }

                const backlinkResult = await executeBacklinkTraffic(
                    page,
                    url,
                    backlinkUrl,
                    backlinkAnchorText,
                    navTimeoutMs,
                    async () => saveScreenshot(page, 'backlink_source', sessionNumber),
                );

                result.backlinkSourceUrl = backlinkUrl;
                result.backlinkAnchorText = backlinkAnchorText || null;
                result.backlinkClickSucceeded = backlinkResult.success;

                result.navigationPath.push(`Backlink (${backlinkUrl})`);

                if (backlinkResult.success) {
                    summary.backlinkClicksSucceeded++;
                    result.navigationPath.push(`Backlink click (match: ${backlinkResult.matchType})`);
                    log.info(`[S${sessionNumber}] Backlink click succeeded (match: ${backlinkResult.matchType}).`);
                } else {
                    log.warning(
                        `[S${sessionNumber}] Backlink click failed (${backlinkResult.error}). Fallback: direct with backlink referrer.`,
                    );
                    result.navigationPath.push(`Backlink Fallback: ${backlinkResult.error}`);
                    try {
                        navResp = await page.goto(url, {
                            referer: backlinkUrl,
                            waitUntil: 'domcontentloaded',
                            timeout: navTimeoutMs,
                        });
                    } catch (navErr) {
                        const curUrl = page.url() || '';
                        if (curUrl && curUrl.includes(new URL(url).hostname)) {
                            log.info(`[S${sessionNumber}] Reached target domain despite slow subresources.`);
                        } else {
                            throw navErr;
                        }
                    }
                }
            } else {
                // ── DIRECT TRAFFIC MODE ───────────────────────────────────────
                log.info(`[S${sessionNumber}] Navigating directly to: ${url}`);
                result.navigationPath.push('Direct Traffic');
                try {
                    navResp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navTimeoutMs });
                } catch (navErr) {
                    const curUrl = page.url() || '';
                    if (curUrl && curUrl.includes(new URL(url).hostname)) {
                        log.info(`[S${sessionNumber}] Reached target domain despite slow subresources.`);
                    } else {
                        throw navErr;
                    }
                }
            }

            if (navResp && (!documentStatus || documentStatus === 204)) {
                documentStatus = navResp.status();
            }

            // Extra wait for network idle and scripts
            try {
                await page.waitForLoadState('networkidle', { timeout: Math.max(extraWaitMs, 4000) });
            } catch {
                // Ad scripts or analytics often keep network active
            }

            // Read landing page details
            const metadata = await getPageMetadata(page);
            result.landingUrl = metadata.url;
            result.landingTitle = metadata.title;
            result.referrer = metadata.referrer;
            result.httpStatus = documentStatus || 200;
            result.redirectCount = redirectCount;
            result.navigationPath.push(result.landingUrl);

            // Screenshot Before Scroll
            if (captureScreenshots) {
                result.screenshotBeforeScroll = await saveScreenshot(page, 'landing_before', sessionNumber);
            }

            // Blank page check
            result.isBlankPage = await isPageBlank(page);
            if (result.isBlankPage) {
                summary.blankPagesDetected++;
                log.warning(`[S${sessionNumber}] Landing page appears blank.`);
            }

            // Initial Ad Detection
            result.adDetection = await detectAds(page);

            // ── DWELL TIME & SCROLLING ON LANDING PAGE ───────────────────────
            const targetLandingDwellSeconds = randomBetween(resolvedMinDwell, resolvedMaxDwell);
            const targetLandingDwellMs = targetLandingDwellSeconds * 1000;
            const landingDwellStart = Date.now();

            log.info(
                `[S${sessionNumber}] Interacting on landing page for ${targetLandingDwellSeconds}s (${scrollBehavior})…`,
            );

            if (scrollBehavior === 'human-random') {
                result.landingScrollDepthPercent = await humanRandomScroll(page, targetLandingDwellMs);
            } else if (scrollBehavior === 'slow-linear') {
                result.landingScrollDepthPercent = await linearSlowScroll(page, targetLandingDwellMs);
            } else {
                await sleep(targetLandingDwellMs);
                result.landingScrollDepthPercent = 0;
            }

            result.landingDwellSeconds = Math.round((Date.now() - landingDwellStart) / 1000);

            // Screenshot After Scroll
            if (captureScreenshots) {
                result.screenshotAfterScroll = await saveScreenshot(page, 'landing_after', sessionNumber);
            }

            // Ad check after dwell (scripts may have injected ad iframes during dwell)
            const afterDwellAds = await detectAds(page);
            if (afterDwellAds && afterDwellAds.adIframes >= (result.adDetection?.adIframes || 0)) {
                result.adDetection = afterDwellAds;
            }

            // ── INTERNAL PAGE DEEP NAVIGATION ────────────────────────────────
            let totalInternalDwellMs = 0;
            if (resolvedInternalMaxPages > 0) {
                log.info(
                    `[S${sessionNumber}] Starting internal page deep browsing (max: ${resolvedInternalMaxPages})…`,
                );
                const internalResult = await executeInternalNavigation(page, {
                    maxPages: resolvedInternalMaxPages,
                    minDwellSeconds: Number(internalPageDwellMinSeconds) || 10,
                    maxDwellSeconds: Number(internalPageDwellMaxSeconds) || 25,
                    scrollBehavior,
                    navTimeoutMs,
                    captureScreenshots,
                    sessionNumber,
                    saveScreenshotFn: saveScreenshot,
                });

                result.internalPagesVisited = internalResult.pagesVisited;
                result.internalPagesCount = internalResult.pagesVisited.length;
                totalInternalDwellMs = internalResult.totalInternalDwellMs;
                summary.totalInternalPagesExplored += result.internalPagesCount;

                for (const p of internalResult.pagesVisited) {
                    result.navigationPath.push(p.url);
                }
            }

            // Calculate overall session metrics
            result.totalPagesVisited = 1 + result.internalPagesCount;
            result.totalSessionDwellSeconds = result.landingDwellSeconds + Math.round(totalInternalDwellMs / 1000);
            result.status = 'SUCCESS';
            summary.successfulSessions++;

            if (captureConsoleErrors) result.consoleErrors = consoleErrors;
            if (captureNetworkFailures) result.networkFailures = networkFailures;

            log.info(
                `[S${sessionNumber}] ✅ Session completed successfully: visited ${result.totalPagesVisited} pages, total dwell ${result.totalSessionDwellSeconds}s`,
            );
            break; // Finished successfully
        } catch (err) {
            const msg = err.message || '';

            // Classify error type for diagnostics
            const isSerpNotFound = msg.includes('target_not_found_in_serp');
            const isSerpError =
                msg.includes('google_captcha_detected') ||
                msg.includes('google_serp_timeout_or_blocked') ||
                msg.includes('click_failed') ||
                msg.includes('click_landed_on_google') ||
                msg.includes('click_landed_on_wrong_domain') ||
                msg.includes('SERP search failed');
            const isNetworkError =
                msg.includes('ECONNRESET') ||
                msg.includes('ETIMEDOUT') ||
                msg.includes('ERR_TUNNEL_CONNECTION_FAILED') ||
                msg.includes('ERR_PROXY_CONNECTION_FAILED') ||
                msg.includes('ERR_CONNECTION_CLOSED') ||
                msg.includes('ERR_EMPTY_RESPONSE') ||
                msg.includes('ERR_NETWORK_CHANGED') ||
                msg.includes('NS_ERROR_NET');

            // target_not_found_in_serp: page not ranking → skip immediately, no proxy burn
            if (isSerpNotFound) {
                result.status = 'FAILED';
                result.errorType = 'serp_not_ranked';
                result.errorMessage = msg.slice(0, 350);
                summary.failedSessions++;
                recordFailureReason('serp_not_ranked');
                log.warning(
                    `[S${sessionNumber}] Target URL not found in Google SERP results. ` +
                        'The page may not be indexed or ranking below page 2 for this query. ' +
                        'Consider providing a custom serpCustomQuery or a per-URL serpQuery.',
                );
                break;
            }

            const canRetry = attempt < sessionMaxAttempts;
            if (canRetry) {
                const retryDelay = isSerpError ? 3000 * attempt : 2000 * attempt;
                const errorCategory = isSerpError ? 'SERP error' : 'Network error';
                log.warning(
                    `[S${sessionNumber}] ${errorCategory} (${msg}). Retrying with fresh proxy in ${retryDelay}ms (attempt ${attempt}/${sessionMaxAttempts})…`,
                );
                await sleep(retryDelay);
                // Continues to next attempt automatically in while loop
            } else {
                result.status = 'FAILED';
                // Classify error type for output dataset
                let errorType = 'session_error';
                if (isSerpError) errorType = 'serp_error';
                else if (isNetworkError) errorType = 'network_error';
                result.errorType = errorType;
                result.errorMessage = msg.slice(0, 350);
                summary.failedSessions++;
                recordFailureReason(classifyDetailedReason(msg));
                log.error(`[S${sessionNumber}] Session failed after ${attempt} attempts: ${msg}`);
                break;
            }
        } finally {
            try {
                if (page) await page.close();
            } catch {
                // Ignore
            }
            try {
                if (context) await context.close();
            } catch {
                // Ignore
            }
            try {
                if (browser) await browser.close();
            } catch {
                // Ignore
            }
        }
    }

    result.finishedAt = new Date().toISOString();
    result.durationSeconds = Math.round((Date.now() - sessionStart) / 1000);

    allDwellSeconds.push(result.totalSessionDwellSeconds);
    allPagesVisitedCounts.push(result.totalPagesVisited);

    await Actor.pushData(result);
    summary.sessionsCompleted++;
    return {
        success: result.status === 'SUCCESS',
        errorType: result.errorType || null,
        url: result.targetUrl || task.url,
    };
}

// ── 6. Concurrency Worker Pool ───────────────────────────────────────────────

let sessionCounter = 1;
let consecutiveFailures = 0;
const unrankedUrls = new Set();
const maxAttemptsCap = Math.max(totalSessionsTarget * 3, 30);

async function executeTask(task, workerFn, tasks) {
    const sessionRes = await workerFn(task);
    const success = sessionRes && sessionRes.success;

    if (success) {
        consecutiveFailures = 0;
    } else {
        const errorType = sessionRes?.errorType || 'unknown';

        // Only count genuine network/proxy errors towards proxy outage circuit breaker
        if (errorType !== 'serp_not_ranked') {
            consecutiveFailures++;
        }

        if (errorType === 'serp_not_ranked') {
            unrankedUrls.add(task.url);
        }

        // Replenish/re-queue to fulfill the requested successful visits
        const stillNeeded = totalSessionsTarget - summary.successfulSessions;
        const canScheduleMore = tasks.length < maxAttemptsCap && !shutdownRequested && Date.now() - runStart < maxRunMs;

        if (stillNeeded > 0 && canScheduleMore) {
            sessionCounter++;

            if (errorType === 'serp_not_ranked') {
                // Pick another URL that hasn't failed with serp_not_ranked
                const viableItems = targetItems.filter((item) => !unrankedUrls.has(item.url));
                if (viableItems.length > 0) {
                    const nextItem = viableItems[sessionCounter % viableItems.length];
                    const replacementTask = {
                        url: nextItem.url,
                        serpQuery: nextItem.serpQuery || '',
                        sessionNumber: sessionCounter,
                    };
                    tasks.push(replacementTask);
                    summary.sessionsScheduled++;
                    log.info(
                        `[Queue] Replaced unranked URL (${task.url}) with ranking candidate (${nextItem.url}) -> S${replacementTask.sessionNumber} scheduled`,
                    );
                } else {
                    log.warning(
                        `[Queue] All target URLs (${unrankedUrls.size}/${targetItems.length}) are not found in Google SERP. Cannot replenish further tasks without ranking URLs.`,
                    );
                }
            } else {
                // Transient failure (CAPTCHA, timeout, proxy disconnect) -> retry with fresh proxy session
                const retryTask = {
                    ...task,
                    sessionNumber: sessionCounter,
                };
                tasks.push(retryTask);
                summary.sessionsScheduled++;
                log.info(
                    `[Queue] Re-queuing transient failure for ${task.url} -> New attempt scheduled as S${retryTask.sessionNumber} (still needed: ${stillNeeded})`,
                );
            }
        }
    }
}

async function runTasksWithConcurrency(tasks, limit, workerFn) {
    const executing = new Set();
    const maxConsecutiveFailures = 25; // safety circuit breaker for genuine proxy outages

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];

        // If target successful visits already delivered, gracefully finish in-flight and stop
        if (summary.successfulSessions >= totalSessionsTarget) {
            log.info(
                `[Queue] 🎉 Target of ${totalSessionsTarget} successful visits fulfilled! Waiting for remaining in-flight sessions…`,
            );
            break;
        }

        if (shutdownRequested || Date.now() - runStart > maxRunMs) {
            summary.skippedDueToRuntimeLimit++;
            continue;
        }

        if (consecutiveFailures >= maxConsecutiveFailures) {
            log.error(
                `[Circuit Breaker] Stopping run early: ${consecutiveFailures} consecutive proxy/network failures detected (proxy outage or network block).`,
            );
            summary.skippedDueToRuntimeLimit += tasks.length - i;
            break;
        }

        // Brief cooldown if consecutive failures are building up
        if (consecutiveFailures >= 5 && consecutiveFailures % 5 === 0) {
            log.warning(
                `[Queue] ${consecutiveFailures} consecutive failures detected. Pausing 5s for proxy IP rotation…`,
            );
            await sleep(5000);
        }

        if (executing.size > 0) {
            // Stagger parallel session launches to avoid simultaneous proxy spikes
            await sleep(randomBetween(500, 1500));
        }

        const p = executeTask(task, workerFn, tasks);
        executing.add(p);
        const clean = () => executing.delete(p);
        p.then(clean, clean);

        if (executing.size > summary.maxConcurrencyAchieved) {
            summary.maxConcurrencyAchieved = executing.size;
        }

        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }
    await Promise.all(executing);
}

// ── 7. Execute Queue ─────────────────────────────────────────────────────────

const taskQueue = [];

if (resolvedTotalVisits !== null) {
    // Interleaved round-robin distribution across target items
    for (let i = 0; i < resolvedTotalVisits; i++) {
        const item = targetItems[i % targetItems.length];
        taskQueue.push({
            url: item.url,
            serpQuery: item.serpQuery || '',
            sessionNumber: sessionCounter++,
        });
    }
    log.info(
        `[Queue] Built round-robin queue for ${resolvedTotalVisits} total package visits across ${targetItems.length} URLs.`,
    );
} else {
    // Interleaved repetitions: Round 1 all URLs, Round 2 all URLs, ...
    for (let r = 1; r <= repetitions; r++) {
        for (const item of targetItems) {
            taskQueue.push({
                url: item.url,
                serpQuery: item.serpQuery || '',
                sessionNumber: sessionCounter++,
            });
        }
    }
    log.info(
        `[Queue] Built interleaved queue for ${taskQueue.length} total sessions (${repetitions} visits per URL across ${targetItems.length} URLs).`,
    );
}

log.info(`Executing ${taskQueue.length} total sessions with concurrency limit of ${concurrencyLimit}…`);
await runTasksWithConcurrency(taskQueue, concurrencyLimit, runSession);

// ── 8. Aggregate Summary & Completion ────────────────────────────────────────

summary.finishedAt = new Date().toISOString();
summary.totalDurationMs = Date.now() - runStart;

if (allDwellSeconds.length > 0) {
    const sumDwell = allDwellSeconds.reduce((a, b) => a + b, 0);
    summary.averageDwellSeconds = Math.round(sumDwell / allDwellSeconds.length);
}
if (allPagesVisitedCounts.length > 0) {
    const sumPages = allPagesVisitedCounts.reduce((a, b) => a + b, 0);
    summary.averagePagesPerSession = Number((sumPages / allPagesVisitedCounts.length).toFixed(2));
}

const successRate =
    summary.sessionsCompleted > 0 ? ((summary.successfulSessions / summary.sessionsCompleted) * 100).toFixed(1) : '0.0';
const targetCompletionRate =
    totalSessionsTarget > 0 ? ((summary.successfulSessions / totalSessionsTarget) * 100).toFixed(1) : '0.0';

const durationSec = Math.round(summary.totalDurationMs / 1000);
const durationMinutes = Math.floor(durationSec / 60);
const durationSeconds = durationSec % 60;
const durationFormatted = `${durationMinutes}m ${durationSeconds}s`;

const summaryReport = {
    status: summary.successfulSessions >= totalSessionsTarget ? 'COMPLETED' : 'PARTIAL_COMPLETION',
    trafficSource,
    totalVisitsRequested: totalSessionsTarget,
    successfulVisitsDelivered: summary.successfulSessions,
    targetFulfillmentPercent: `${targetCompletionRate}%`,
    totalSessionsAttempted: summary.sessionsCompleted,
    failedSessions: summary.failedSessions,
    skippedSessions: summary.skippedDueToRuntimeLimit,
    sessionSuccessRatePercent: `${successRate}%`,
    averageDwellSeconds: summary.averageDwellSeconds,
    averagePagesPerSession: summary.averagePagesPerSession,
    runDuration: durationFormatted,
    failureBreakdown: summary.failureBreakdown,
    failureDescriptions: {
        serp_not_ranked: 'Target URL not found in top 20 Google SERP results (pages 1-2)',
        google_serp_timeout_or_blocked: 'Google throttled, timed out, or blocked proxy IP',
        google_captcha_detected: 'Google CAPTCHA / bot challenge detected',
        click_landed_on_google: 'Click navigation looped back to Google domain',
        click_landed_on_wrong_domain: 'Click navigation redirected to unexpected/ad domain',
        click_failed: 'Playwright click interaction failed on organic result link',
        network_error: 'Proxy or network connection dropped, reset, or timed out',
        backlink_not_found: 'Target link/anchor text not found on backlink page',
        other: 'Other unexpected runtime exceptions',
    },
};

// Console Log Box
const divider = '='.repeat(78);
const subDivider = '-'.repeat(78);
const pad = (label, val) => `  ${label.padEnd(32)}: ${val}`;

const logLines = [
    '',
    divider,
    '                         TRAFFIC RUN EXECUTION SUMMARY                        ',
    divider,
    pad('Run Status', summaryReport.status),
    pad('Traffic Source', summaryReport.trafficSource),
    pad('Target Visits Requested', summaryReport.totalVisitsRequested),
    pad(
        'Successful Visits Delivered',
        `${summaryReport.successfulVisitsDelivered} (${summaryReport.targetFulfillmentPercent} fulfilled)`,
    ),
    pad('Total Sessions Attempted', summaryReport.totalSessionsAttempted),
    pad('Failed Sessions', summaryReport.failedSessions),
    pad('Skipped Sessions', summaryReport.skippedSessions),
    pad('Average Dwell Time', `${summaryReport.averageDwellSeconds}s`),
    pad('Average Pages / Session', summaryReport.averagePagesPerSession),
    pad('Total Run Duration', summaryReport.runDuration),
];

const failureEntries = Object.entries(summary.failureBreakdown).filter(([, count]) => count > 0);
if (failureEntries.length > 0) {
    logLines.push(subDivider);
    logLines.push('                           FAILURE REASONS BREAKDOWN                          ');
    logLines.push(subDivider);
    for (const [key, count] of failureEntries) {
        const desc = summaryReport.failureDescriptions[key] || key;
        logLines.push(`  • ${key.padEnd(32)}: ${String(count).padStart(3)} (${desc})`);
    }
}
logLines.push(divider);
logLines.push('');

log.info(logLines.join('\n'));

// Save to Apify OUTPUT (Overview tab in Apify Console) and RUN_SUMMARY
await Actor.setValue('OUTPUT', summaryReport);
await Actor.setValue('RUN_SUMMARY', { ...summary, ...summaryReport });

await Actor.exit();
