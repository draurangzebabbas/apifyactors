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
import { buildContextOptions, getStealthInitScript, resolveDeviceProfile } from './devices.js';
import { humanRandomScroll, linearSlowScroll, randomBetween, sleep } from './humanizer.js';
import { executeInternalNavigation } from './internalNav.js';
import { resolveReferrer } from './referrers.js';
import { executeGoogleSerpSearch } from './serp.js';
import { extractAndSanitizeUrls } from './urlSanitizer.js';

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
    repeatVisits = 1,
    maxConcurrentSessions = 2,
    navigationTimeoutSeconds = 60,
    waitAfterNavigationSeconds = 5,
    maxRunDurationSeconds = 600,
    maxRetries = 1,
    captureScreenshots = true,
    captureConsoleErrors = true,
    captureNetworkFailures = true,
    proxyConfiguration: proxyInput = null,
} = input;

// Extract, sanitize, and validate target URLs
const validUrls = extractAndSanitizeUrls(startUrls);

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

// Safe concurrency clamp: 1 by default, max 3 (max 2 for SERP/backlink)
const requestedConcurrency = Number(maxConcurrentSessions) || 1;
const safeMaxLimit = trafficSource === 'serp_google' || trafficSource === 'backlink' ? 2 : 3;
const concurrencyLimit = Math.min(Math.max(requestedConcurrency, 1), safeMaxLimit);

if (requestedConcurrency > safeMaxLimit) {
    log.info(
        `Concurrency automatically clamped from ${requestedConcurrency} to safe limit of ${concurrencyLimit} to prevent anti-bot blocks and container memory exhaustion.`,
    );
}
const navTimeoutMs = Math.min(Math.max(Number(navigationTimeoutSeconds) || 60, 10), 180) * 1000;
const extraWaitMs = Math.min(Math.max(Number(waitAfterNavigationSeconds) || 5, 0), 60) * 1000;
const maxRunMs = Math.min(Math.max(Number(maxRunDurationSeconds) || 600, 60), 7200) * 1000;
const repetitions = Math.min(Math.max(Number(repeatVisits) || 1, 1), 50);
const retryLimit = Math.min(Math.max(Number(maxRetries) || 1, 0), 3);
const resolvedInternalMaxPages = enableInternalNavigation
    ? Math.min(Math.max(Number(maxInternalPages) || 0, 0), 10)
    : 0;

log.info('Traffic & Direct Link Actor initializing.', {
    trafficSource,
    urls: validUrls.length,
    repetitions,
    concurrency: concurrencyLimit,
    dwellRange: `${resolvedMinDwell}s - ${resolvedMaxDwell}s`,
    scrollBehavior,
    internalPagesMax: resolvedInternalMaxPages,
});

if (trafficSource === 'serp_google') {
    log.info(
        '💡 Notice: Google SERP mode automates live searches on google.com. ' +
            'Google frequently throttles or drops Datacenter Proxies with connection timeouts (page.goto: Timeout) or CAPTCHAs. ' +
            'For reliable SERP navigation, use Apify Residential Proxies (RESIDENTIAL group). Alternatively, "Simulated Referral Traffic" ' +
            'with the "Search Engines" preset visits your target URL directly with a Google referrer header without touching google.com, ' +
            'which is 100% reliable and recognized by Google Analytics (GA4) and ad networks as Organic Search.',
    );
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
    sessionsScheduled: validUrls.length * repetitions,
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
};

let shutdownRequested = false;
Actor.on('aborting', () => {
    shutdownRequested = true;
});

const runStart = Date.now();
const allDwellSeconds = [];
const allPagesVisitedCounts = [];

async function saveScreenshot(page, label, sessionNumber) {
    if (!captureScreenshots || !page) return null;
    try {
        const curUrl = page.url() || '';
        // If the browser never reached a website (still on about:blank), skip to prevent hanging on font loading
        if (!curUrl || curUrl === 'about:blank') {
            log.debug(`[Screenshot] Skipped "${label}" because page is about:blank.`);
            return null;
        }
        const buf = await page.screenshot({
            type: 'jpeg',
            quality: 75,
            fullPage: false,
            timeout: 5000,
            animations: 'disabled',
        });
        const key = `screenshot_${label}_s${sessionNumber}_${Date.now()}`;
        await Actor.setValue(key, buf, { contentType: 'image/jpeg' });
        log.info(`[Screenshot] Saved "${label}" -> Key: ${key}`);
        return key;
    } catch (err) {
        log.warning(`Screenshot "${label}" could not be captured: ${err.message}`);
        return null;
    }
}

// ── 5. Single Browser Session ────────────────────────────────────────────────

async function runSession(task) {
    const { url, sessionNumber } = task;
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
    while (attempt <= retryLimit) {
        attempt++;
        let browser = null;
        let context = null;
        let page = null;

        try {
            // Obtain proxy URL if active
            let proxyUrl = null;
            if (proxyConfig) {
                try {
                    proxyUrl = await proxyConfig.newUrl(`s${sessionNumber}_a${attempt}`);
                } catch (e) {
                    summary.proxyFailures++;
                    log.warning(`[S${sessionNumber}] Proxy URL generation failed: ${e.message}`);
                }
            }

            // Resolve device & browser profile for this session
            const deviceProfile = resolveDeviceProfile(deviceType, customUserAgent);
            result.deviceUsed = deviceProfile.name;
            result.deviceType = deviceProfile.type;

            let launchProxy;
            if (proxyUrl) {
                try {
                    const u = new URL(proxyUrl);
                    launchProxy = {
                        server: `${u.protocol}//${u.host}`,
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
            browser = await chromium.launch({
                headless: true,
                proxy: launchProxy,
                args: launchArgs,
            });

            const ctxOpts = buildContextOptions(deviceProfile, 'en-US', 'America/New_York');
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
                let serpResult = null;
                try {
                    serpResult = await executeGoogleSerpSearch(
                        page,
                        url,
                        serpCustomQuery,
                        navTimeoutMs,
                        async (p, label) => saveScreenshot(p, label, sessionNumber),
                    );
                } catch (serpErr) {
                    serpResult = {
                        success: false,
                        query: serpCustomQuery || url,
                        rank: null,
                        error: serpErr.message,
                        screenshots: [],
                    };
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

                if (serpResult.page && serpResult.page !== page) {
                    page = serpResult.page;
                }

                if (serpResult.success) {
                    summary.serpClicksSucceeded++;
                    result.navigationPath.push(`Google SERP (Rank #${serpResult.rank}: "${serpResult.query}")`);
                } else {
                    log.warning(
                        `[S${sessionNumber}] Google SERP did not respond (${serpResult.error}). Fast fallback: visiting target directly with Google organic referrer.`,
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
            const isTransient = err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT');
            if (attempt <= retryLimit && isTransient) {
                const retryDelay = 2000 * attempt;
                log.warning(`[S${sessionNumber}] Transient error (${err.message}). Retrying in ${retryDelay}ms…`);
                await sleep(retryDelay);
            } else {
                result.status = 'FAILED';
                result.errorType = 'session_error';
                result.errorMessage = err.message.slice(0, 350);
                summary.failedSessions++;
                log.error(`[S${sessionNumber}] Session failed: ${err.message}`);
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
}

// ── 6. Concurrency Worker Pool ───────────────────────────────────────────────

async function runTasksWithConcurrency(tasks, limit, workerFn) {
    const executing = new Set();
    for (const task of tasks) {
        if (shutdownRequested || Date.now() - runStart > maxRunMs) {
            summary.skippedDueToRuntimeLimit++;
            continue;
        }

        if (executing.size > 0) {
            // Stagger parallel session launches to avoid simultaneous proxy spikes
            await sleep(randomBetween(500, 1500));
        }

        const p = Promise.resolve().then(() => workerFn(task));
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
let sessionCounter = 1;
for (const url of validUrls) {
    for (let r = 1; r <= repetitions; r++) {
        taskQueue.push({ url, sessionNumber: sessionCounter++ });
    }
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

log.info('All sessions finished. Summary:', summary);
await Actor.setValue('RUN_SUMMARY', summary);

await Actor.exit();
