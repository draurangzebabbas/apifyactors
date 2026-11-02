import { log } from 'apify';

import { randomBetween, simulateRandomMouseMovements, sleep } from './humanizer.js';

// ─── Platform-specific popup dismissal selectors ──────────────────────────────
// Each platform may show cookie consent banners, login walls, or app-download prompts.
const POPUP_DISMISSAL_SELECTORS = [
    // Generic cookie / GDPR / Consent managers
    '#didomi-notice-agree-button',
    '#onetrust-accept-btn-handler',
    '.qc-cmp2-summary-buttons button:first-child',
    'button:has-text("Accept all")',
    'button:has-text("Accept All")',
    'button:has-text("Accept All Cookies")',
    'button:has-text("Accept Cookies")',
    'button:has-text("Allow all")',
    'button:has-text("Allow All")',
    'button:has-text("I Accept")',
    'button:has-text("I agree")',
    'button:has-text("Agree")',
    'button:has-text("OK")',
    'button:has-text("Got it")',
    'button:has-text("Dismiss")',
    'button:has-text("Close")',
    'button:has-text("Continue")',
    'button:has-text("Not now")',
    'button:has-text("No thanks")',
    'button:has-text("Maybe later")',
    'button:has-text("Skip")',
    '[aria-label="Close"]',
    '[aria-label="Dismiss"]',
    '[aria-label="close"]',

    // LinkedIn — "Join now" / "Sign in" gate shown on public posts
    'button.modal__dismiss',
    '.contextual-sign-in-modal button[data-tracking-control-name="guest_homepage-basic_nav-header-signin"]',
    'button[data-id="dismiss-btn"]',
    '.sign-in-modal__close-btn',
    'button:has-text("Dismiss")',

    // Medium — cookie, sign-up, and header dialogs
    'button:has-text("Continue reading")',
    '[data-testid="close-button"]',
    'div[data-testid="headerCloseButton"] button',
    'button[aria-label="close"]',
    'button[aria-label="Close"]',

    // Reddit — cookie consent / age gate
    'button:has-text("Accept all")',
    'button:has-text("Continue")',
    'button[id*="accept"]',

    // Facebook — cookie consent
    'button[data-cookiebanner="accept_only_essential_button"]',
    'button[data-cookiebanner="accept_button"]',
    '[data-testid="cookie-policy-manage-dialog-accept-button"]',

    // Twitter/X
    'div[role="button"]:has-text("Accept all cookies")',
    'div[role="button"]:has-text("Refuse non-essential cookies")',

    // Quora
    'button:has-text("Agree")',
    '.q-click-wrapper:has-text("Accept")',

    // Generic modal close
    'button.close',
    'button.modal-close',
    'button.popup-close',
    '.dialog-close-button',
];

/**
 * Dismisses any visible popup/modal/cookie-banner found on the page.
 * Iterates through platform-specific and generic selectors once.
 *
 * @param {import('playwright').Page} page
 * @param {string} platformHint - Used in log messages (e.g. 'linkedin', 'medium')
 * @returns {Promise<number>} Number of popups dismissed
 */
export async function dismissPopups(page, platformHint = 'page') {
    let dismissed = 0;

    for (const selector of POPUP_DISMISSAL_SELECTORS) {
        try {
            const btn = page.locator(selector).first();
            const visible = await btn.isVisible({ timeout: 800 }).catch(() => false);
            if (visible) {
                await sleep(randomBetween(200, 500));
                await btn.click({ force: true, timeout: 3000 }).catch(() => {});
                log.info(`[BKL] Dismissed popup on ${platformHint}: "${selector}"`);
                dismissed++;
                await sleep(randomBetween(400, 800));
                // Only dismiss one at a time — let caller retry if needed
                break;
            }
        } catch {
            // Selector not present, continue
        }
    }

    return dismissed;
}

/**
 * Attempts to dismiss all visible popups on the page up to maxRounds times.
 * Useful for platforms that show multiple dialogs in sequence (e.g. LinkedIn).
 *
 * @param {import('playwright').Page} page
 * @param {string} platformHint
 * @param {number} maxRounds - Max dismissal attempts (default 4)
 */
export async function dismissAllPopups(page, platformHint = 'page', maxRounds = 4) {
    for (let r = 0; r < maxRounds; r++) {
        const count = await dismissPopups(page, platformHint);
        if (count === 0) break;
        await sleep(600); // Wait for next popup to appear
    }
}

/**
 * Detects which platform the URL belongs to for targeted popup handling.
 * @param {string} url
 * @returns {string} platform hint
 */
export function detectPlatform(url) {
    const lowerUrl = (url || '').toLowerCase();
    if (lowerUrl.includes('linkedin.com')) return 'linkedin';
    if (lowerUrl.includes('medium.com')) return 'medium';
    if (lowerUrl.includes('reddit.com')) return 'reddit';
    if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) return 'facebook';
    if (lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com')) return 'twitter';
    if (lowerUrl.includes('quora.com')) return 'quora';
    if (lowerUrl.includes('instagram.com')) return 'instagram';
    if (lowerUrl.includes('pinterest.com')) return 'pinterest';
    return 'web';
}

/**
 * Searches for the target link on the backlink source page.
 * Strategy (in priority order):
 *   1. Anchor text match (if provided) — looks for <a> whose text contains anchorText
 *   2. href URL match — finds <a> whose href contains the target domain/path
 *   3. Any visible clickable element whose text contains the target domain
 *
 * @param {import('playwright').Page} page
 * @param {string} targetUrl    - The URL the backlink should point to
 * @param {string} anchorText   - Expected anchor text for the link (can be partial)
 * @returns {Promise<{element: import('playwright').Locator, matchType: string, text: string, href: string}|null>}
 */
async function findBacklink(page, targetUrl, anchorText = '') {
    const targetObj = new URL(targetUrl);
    const targetHost = targetObj.hostname.replace(/^www\./, '').toLowerCase();
    const targetPath = targetObj.pathname.replace(/\/$/, '').toLowerCase();

    const result = await page.evaluate(
        ({ host, path, anchor, rawTarget }) => {
            const normalize = (s) => (s || '').toLowerCase().trim();
            const cleanUrl = (s) =>
                normalize(s)
                    .replace(/^https?:\/\//, '')
                    .replace(/^www\./, '')
                    .replace(/\/$/, '');

            const anchorNorm = normalize(anchor);
            const anchorClean = cleanUrl(anchor);
            const targetClean = cleanUrl(rawTarget);

            // All <a> elements on the page
            const links = Array.from(document.querySelectorAll('a[href]'));

            for (const a of links) {
                const href = a.href || a.getAttribute('href') || '';
                const text = normalize(a.innerText || a.textContent || '');
                const textClean = cleanUrl(text);
                const hrefLower = normalize(href);
                let decodedHref = '';
                try {
                    decodedHref = decodeURIComponent(hrefLower);
                } catch {
                    decodedHref = hrefLower;
                }

                let matchType = null;

                // Priority 1: Anchor text match (exact or stripped of protocol/slashes)
                if (anchorNorm && (text.includes(anchorNorm) || (anchorClean && textClean.includes(anchorClean)))) {
                    matchType = 'anchor_text';
                }

                // Priority 2: Decoded href contains target domain + path
                if (!matchType && (hrefLower.includes(host) || decodedHref.includes(host))) {
                    if (!path || hrefLower.includes(path) || decodedHref.includes(path)) {
                        matchType = 'href_url';
                    }
                }

                // Priority 3: Clean target URL matches href or link text
                if (
                    !matchType &&
                    targetClean &&
                    (cleanUrl(href).includes(targetClean) || textClean.includes(targetClean))
                ) {
                    matchType = 'target_url_clean';
                }

                // Priority 4: Shortlink or redirect wrapper (Medium redirect, bitly, lnkd.in, etc.)
                if (
                    !matchType &&
                    anchorNorm &&
                    (hrefLower.includes('medium.com/r/') ||
                        hrefLower.includes('lnkd.in') ||
                        hrefLower.includes('bit.ly') ||
                        hrefLower.includes('t.co'))
                ) {
                    if (text.includes(anchorNorm) || (anchorClean && textClean.includes(anchorClean))) {
                        matchType = 'shortlink_anchor';
                    }
                }

                if (matchType) {
                    a.setAttribute('data-backlink-target', 'true');
                    return { matchType, text: a.innerText.trim().slice(0, 120), href, totalLinks: links.length };
                }
            }

            // Priority 5: Visible text / span that shows the URL as text
            const allText = Array.from(document.querySelectorAll('span, p, div'));
            for (const el of allText) {
                const text = normalize(el.innerText || el.textContent || '');
                const textClean = cleanUrl(text);
                if (
                    (text.includes(host) && (!path || text.includes(path))) ||
                    (targetClean && textClean.includes(targetClean))
                ) {
                    const nearestLink = el.closest('a') || el.querySelector('a');
                    if (nearestLink) {
                        nearestLink.setAttribute('data-backlink-target', 'true');
                        return {
                            matchType: 'text_url_match',
                            text: el.innerText.trim().slice(0, 120),
                            href: nearestLink.href || '',
                            totalLinks: links.length,
                        };
                    }
                }
            }

            return { totalLinks: links.length };
        },
        { host: targetHost, path: targetPath, anchor: anchorText, rawTarget: targetUrl },
    );

    if (!result || !result.matchType) return { element: null, totalLinks: result?.totalLinks || 0 };

    const locator = page.locator('a[data-backlink-target="true"]').first();
    return { element: locator, ...result };
}

/**
 * Detects and attempts to wait through or solve Cloudflare Turnstile verification.
 *
 * @param {import('playwright').Page} page
 * @param {number} [maxWaitMs=12000] - Max time to wait for challenge resolution
 * @returns {Promise<boolean>} true if page is accessible, false if still blocked
 */
export async function handleCloudflareChallenge(page, maxWaitMs = 12000) {
    const isChallenge = async () => {
        const title = (await page.title().catch(() => '')).toLowerCase();
        if (
            title.includes('just a moment') ||
            title.includes('security verification') ||
            title.includes('attention required')
        ) {
            return true;
        }
        return await page
            .evaluate(() => {
                return !!document.querySelector(
                    'iframe[src*="challenges.cloudflare.com"], #turnstile-wrapper, .cf-turnstile',
                );
            })
            .catch(() => false);
    };

    if (!(await isChallenge())) return true;

    log.info('[BKL] Cloudflare verification interstitial detected. Waiting for automated challenge to complete…');
    const start = Date.now();

    while (Date.now() - start < maxWaitMs) {
        await sleep(1500);

        // Check if page navigated away from challenge
        const title = (await page.title().catch(() => '')).toLowerCase();
        if (
            !title.includes('just a moment') &&
            !title.includes('security verification') &&
            !title.includes('attention required') &&
            title.length > 0
        ) {
            log.info(`[BKL] ✓ Cloudflare challenge passed! Loaded: "${await page.title()}"`);
            await sleep(1500);
            return true;
        }

        // Attempt clicking Turnstile checkbox if visible in any frame
        for (const frame of page.frames()) {
            if (frame.url().includes('challenges.cloudflare.com') || frame.url().includes('turnstile')) {
                try {
                    const box = frame
                        .locator('input[type="checkbox"], #checkbox, .ctp-checkbox-label, span.mark')
                        .first();
                    if (await box.isVisible({ timeout: 400 }).catch(() => false)) {
                        log.info('[BKL] Clicking Turnstile verification checkbox…');
                        await box.click({ timeout: 2000, force: true }).catch(() => {});
                        await sleep(2000);
                        break;
                    }
                } catch {
                    /* ignore */
                }
            }
        }
    }

    const stillChallenged = await isChallenge();
    return !stillChallenged;
}

/**
 * Executes the Backlink Traffic flow:
 *
 *  STEP 1 — Navigate to the backlink source page (LinkedIn post, Reddit thread, Medium article, etc.)
 *  STEP 2 — Dismiss all popups/login walls/cookie banners (platform-aware)
 *  STEP 3 — Scroll/read the page for a natural dwell period
 *  STEP 4 — Find the target link by anchor text or URL match
 *  STEP 5 — Click the link → navigate to the target URL
 *           (Referrer will be the backlink source, e.g. linkedin.com, medium.com)
 *
 * @param {import('playwright').Page} page
 * @param {string} targetUrl       - The final destination URL
 * @param {string} backlinkUrl     - The page that contains the backlink (LinkedIn post, etc.)
 * @param {string} anchorText      - Anchor text to locate the link (optional but recommended)
 * @param {number} navTimeoutMs    - Navigation timeout per step
 * @param {Function} [onPageReady] - Optional callback after backlink page loads (e.g. screenshot)
 * @returns {Promise<{success: boolean, matchType: string|null, backlinkUrl: string, error: string|null}>}
 */
export async function executeBacklinkTraffic(
    page,
    targetUrl,
    backlinkUrl,
    anchorText,
    navTimeoutMs,
    onPageReady = null,
) {
    const platform = detectPlatform(backlinkUrl);
    log.info(`[BKL] Starting backlink flow. Platform: ${platform}`);
    log.info(`[BKL] Backlink source: ${backlinkUrl}`);
    log.info(`[BKL] Target URL: ${targetUrl}`);
    if (anchorText) log.info(`[BKL] Looking for anchor text: "${anchorText}"`);

    // ── STEP 1: Navigate to the backlink source page ──────────────────────────
    log.info('[BKL] STEP 1 — Navigating to backlink source page…');
    try {
        await page.goto(backlinkUrl, { waitUntil: 'commit', timeout: navTimeoutMs });
    } catch (gotoErr) {
        // If we're at least on the right domain despite timeout, continue
        const curUrl = page.url() || '';
        try {
            const backlinkHost = new URL(backlinkUrl).hostname;
            if (curUrl.includes(backlinkHost)) {
                log.info(`[BKL] STEP 1 — Reached ${platform} despite slow load, continuing…`);
            } else {
                throw gotoErr;
            }
        } catch {
            return { success: false, matchType: null, backlinkUrl, error: `navigation_failed: ${gotoErr.message}` };
        }
    }

    // Wait for some visible content
    await page.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {});
    await sleep(randomBetween(1500, 2500));
    log.info(`[BKL] STEP 1 ✓ — Loaded: ${page.url()}`);

    // Check & wait for Cloudflare challenge if present
    await handleCloudflareChallenge(page, 12000);

    // ── STEP 2: Dismiss all popups/login-walls ────────────────────────────────
    log.info('[BKL] STEP 2 — Dismissing popups and login walls…');
    await dismissAllPopups(page, platform, 5);

    // Platform-specific extra handling
    if (platform === 'linkedin') {
        // LinkedIn often shows a "Join to see more" modal after a short delay
        await sleep(1500);
        await dismissAllPopups(page, 'linkedin', 3);
    } else if (platform === 'medium') {
        // Medium shows a paywall/sign-up dialog after ~2s of reading
        await sleep(2000);
        await dismissAllPopups(page, 'medium', 3);
    } else if (platform === 'reddit') {
        // Reddit often shows cookie + NSFW + app prompts
        await sleep(1000);
        await dismissAllPopups(page, 'reddit', 4);
    }

    log.info('[BKL] STEP 2 ✓ — Popup dismissal complete.');

    // Optional screenshot of backlink page
    if (typeof onPageReady === 'function') {
        try {
            await onPageReady();
        } catch {
            /* ignore */
        }
    }

    // ── STEP 3: Scroll/read naturally on the backlink page ───────────────────
    log.info('[BKL] STEP 3 — Scrolling/reading backlink source page naturally…');
    const readDwellMs = randomBetween(4000, 9000);
    const scrollSteps = Math.floor(readDwellMs / 1200);
    for (let i = 0; i < scrollSteps; i++) {
        const scrollAmount = randomBetween(150, 400);
        await page.mouse.wheel(0, scrollAmount).catch(() => {});
        await sleep(randomBetween(800, 1400));
        // Occasionally pause (reading behavior)
        if (randomBetween(0, 3) === 0) {
            await sleep(randomBetween(600, 1200));
        }
        // Dismiss any popup that appeared during scroll
        await dismissPopups(page, platform).catch(() => {});
    }
    log.info(`[BKL] STEP 3 ✓ — Read for ~${Math.round(readDwellMs / 1000)}s.`);

    // ── STEP 4: Find the target backlink ─────────────────────────────────────
    log.info('[BKL] STEP 4 — Searching for target link on backlink source page…');
    const found = await findBacklink(page, targetUrl, anchorText);

    if (!found || !found.element) {
        const pageTitle = await page.title().catch(() => '');
        const isBotBlocked =
            /cloudflare|attention required|just a moment|turnstile|captcha|security check|sorry, you have been blocked/i.test(
                pageTitle,
            );
        if (isBotBlocked) {
            log.warning(
                `[BKL] ⚠️ Cloudflare/Bot challenge detected on "${backlinkUrl}" (Title: "${pageTitle}"). The backlink page was blocked by anti-bot security.`,
            );
        } else {
            log.warning(
                `[BKL] STEP 4 — Could not find backlink matching "${anchorText || targetUrl}" on the page (Page title: "${pageTitle}", total <a> links found: ${found?.totalLinks || 0}). Check the screenshot in Key-value store to verify what was rendered.`,
            );
        }
        return {
            success: false,
            matchType: null,
            backlinkUrl,
            error: isBotBlocked ? 'anti_bot_challenge_blocked' : 'backlink_not_found_on_page',
        };
    }

    log.info(`[BKL] STEP 4 ✓ — Found link (match: ${found.matchType}): "${found.text}" → ${found.href}`);

    // ── STEP 5: Click the backlink ────────────────────────────────────────────
    log.info('[BKL] STEP 5 — Clicking the backlink…');
    try {
        await found.element.scrollIntoViewIfNeeded();
        await simulateRandomMouseMovements(page);
        await sleep(randomBetween(600, 1400));

        // Remove target="_blank" so navigation stays in same tab
        await found.element
            .evaluate((el) => {
                const a = el.closest('a') || el;
                a.removeAttribute('target');
                a.removeAttribute('rel');
            })
            .catch(() => {});

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'commit', timeout: navTimeoutMs }).catch(() => {}),
            found.element.click({ delay: randomBetween(50, 120) }),
        ]);

        await sleep(randomBetween(1500, 3000));

        // Handle any redirect chain (lnkd.in, bit.ly, etc.)
        const finalUrl = page.url();
        log.info(`[BKL] STEP 5 ✓ — Navigated to: ${finalUrl}`);

        // If the URL is still a shortlink or redirect, follow it
        if (!finalUrl.includes(new URL(targetUrl).hostname) && !finalUrl.includes('about:blank')) {
            log.info('[BKL] Landed on redirect page. Waiting for final destination…');
            await page.waitForNavigation({ waitUntil: 'commit', timeout: 15000 }).catch(() => {});
            await sleep(1500);
            log.info(`[BKL] Final destination: ${page.url()}`);
        }

        return { success: true, matchType: found.matchType, backlinkUrl, error: null };
    } catch (clickErr) {
        log.warning(`[BKL] Click failed (${clickErr.message}). Navigating directly with backlink referrer…`);
        try {
            await page.goto(targetUrl, {
                referer: backlinkUrl,
                waitUntil: 'domcontentloaded',
                timeout: navTimeoutMs,
            });
            return { success: true, matchType: 'direct_with_referrer', backlinkUrl, error: null };
        } catch (navErr) {
            return {
                success: false,
                matchType: null,
                backlinkUrl,
                error: `click_and_fallback_failed: ${navErr.message}`,
            };
        }
    }
}
