import { log } from 'apify';

import { randomBetween, simulateRandomMouseMovements, sleep } from './humanizer.js';

/**
 * Builds a Google search query for the target URL.
 * Uses site:{hostname/path} format by default so the exact page surfaces in SERP.
 */
export function buildSerpQuery(targetUrl, customQuery = '') {
    if (customQuery && customQuery.trim().length > 0) {
        return customQuery.trim();
    }

    const trimmed = (targetUrl || '').trim();
    if (trimmed.toLowerCase().startsWith('site:')) {
        return trimmed;
    }

    try {
        const u = new URL(trimmed);
        const cleanPath = `${u.hostname}${u.pathname.replace(/\/$/, '')}`;
        return `site:${cleanPath}`;
    } catch {
        return `site:${trimmed}`;
    }
}

/**
 * Dismisses Google cookie consent popups / consent.google.com pages.
 */
export async function handleGoogleConsent(page) {
    const consentSelectors = [
        '#xe7COe button:has-text("Accept all")',
        '#xe7COe button:has-text("I agree")',
        '#xe7COe button:has-text("Accept")',
        '#xe7COe button:has-text("Agree")',
        '#xe7COe button:visible',
        'button#L2AGLb',
        'button#W0wltc',
        'div[role="dialog"] button:has-text("Accept all")',
        'div[role="dialog"] button:has-text("I agree")',
        'div[role="dialog"] button:has-text("Alle akzeptieren")',
        'div[role="dialog"] button:has-text("Tout accepter")',
        'div[role="dialog"] button:has-text("Acepto")',
        'div[role="dialog"] button:has-text("Aceptar todo")',
        'div[aria-modal="true"] button:has-text("Accept all")',
        'div[aria-modal="true"] button:has-text("I agree")',
        'div[aria-modal="true"] button:visible',
        'button:has-text("Accept all")',
        'button:has-text("I agree")',
        'button:has-text("Agree")',
        'button:has-text("Accept")',
        'button:has-text("Reject all")',
        'button:has-text("Tout accepter")',
        'button:has-text("Alle akzeptieren")',
        'button:has-text("Acepto")',
        'button:has-text("Aceptar todo")',
        'button:has-text("Accetta tutto")',
        'button[aria-label*="Accept" i]',
        'button[aria-label*="Agree" i]',
        'form[action*="consent"] button',
        'input[type="submit"][value*="Accept" i]',
    ];

    for (const selector of consentSelectors) {
        try {
            const btn = page.locator(selector).first();
            if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await sleep(randomBetween(200, 500));
                await btn.click({ force: true }).catch(() => {});
                log.info(`[SERP] Handled Google consent dialog via "${selector}".`);
                await sleep(1000);
                return true;
            }
        } catch {
            // Try next
        }
    }

    // Fallback: If modal overlay (#xe7COe or role=dialog) is still covering the DOM, dismiss it via script
    const dismissedViaEval = await page
        .evaluate(() => {
            const modal = document.querySelector(
                '#xe7COe, div[aria-label*="Before you continue" i], div[role="dialog"]',
            );
            if (modal) {
                const buttons = Array.from(modal.querySelectorAll('button, [role="button"]'));
                for (const b of buttons) {
                    const txt = (b.innerText || '').toLowerCase();
                    if (
                        txt.includes('accept') ||
                        txt.includes('agree') ||
                        txt.includes('alle') ||
                        txt.includes('tout')
                    ) {
                        b.click();
                        return true;
                    }
                }
                // If button not found, click the last button (usually the primary action on mobile modals)
                if (buttons.length > 0) {
                    buttons[buttons.length - 1].click();
                    return true;
                }
            }
            return false;
        })
        .catch(() => false);

    if (dismissedViaEval) {
        log.info('[SERP] Handled Google consent dialog via DOM evaluation.');
        await sleep(1000);
        return true;
    }

    return false;
}

/**
 * Tries to navigate to Google homepage and get the search box ready.
 * Retries up to maxAttempts times with increasing waits between attempts.
 * Takes diagnostic screenshots at every failure and major milestone.
 *
 * @param {import('playwright').Page} page
 * @param {number} perAttemptMs  - Time budget per attempt
 * @param {number} maxAttempts
 * @param {Function} [takeScreenshot] - Diagnostic screenshot helper
 * @returns {Promise<import('playwright').Locator|null>} search input locator or null
 */
async function openGoogleAndGetSearchBox(page, perAttemptMs, maxAttempts = 1, takeScreenshot = null) {
    const searchBoxSelectors = [
        'textarea[name="q"]',
        'input[name="q"]',
        'textarea.gLFyf',
        'input.gLFyf',
        '[name="q"]',
        'textarea[aria-label*="Search" i]',
        'input[aria-label*="Search" i]',
        'textarea[title*="Search" i]',
        'input[title*="Search" i]',
        'input[type="search"]',
        'textarea',
    ];

    // 15s timeout: gives residential proxy tunnel 2-4s to establish while failing fast if Google rejects the IP
    const gotoTimeout = Math.min(perAttemptMs, 15000);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        log.info(`[SERP] STEP 1 — Loading google.com (timeout ${gotoTimeout}ms)…`);
        try {
            // Try commit first — resolves as soon as HTTP headers are received without waiting for slow ad/tracker beacons
            try {
                await page.goto('https://www.google.com/?hl=en', {
                    waitUntil: 'commit',
                    timeout: gotoTimeout,
                });
            } catch (navErr) {
                const cur = page.url() || '';
                if (!cur.includes('google.')) {
                    throw navErr;
                }
                log.info(`[SERP] google.com navigation reached ${cur} despite timeout.`);
            }

            await sleep(1500);

            // Handle consent page redirects & modal popups immediately
            const consentHandled = await handleGoogleConsent(page).catch(() => false);
            if (consentHandled && takeScreenshot) {
                await takeScreenshot(`serp_consent_handled_a${attempt}`);
            }

            if (page.url().includes('consent.google.')) {
                await handleGoogleConsent(page).catch(() => {});
                await page.waitForNavigation({ waitUntil: 'commit', timeout: 10000 }).catch(() => {});
                await sleep(1000);
            }

            // Check if search box is visible
            for (const sel of searchBoxSelectors) {
                const loc = page.locator(sel).first();
                if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
                    log.info(`[SERP] STEP 1 — Google homepage ready (attempt ${attempt}) ✓`);
                    if (takeScreenshot) {
                        await takeScreenshot(`serp_homepage_ready_a${attempt}`);
                    }
                    return loc;
                }
            }

            // Box not visible yet — check again after a short delay
            await sleep(1500);
            await handleGoogleConsent(page).catch(() => {});
            for (const sel of searchBoxSelectors) {
                const loc = page.locator(sel).first();
                if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
                    log.info(`[SERP] STEP 1 — Search box appeared after extra wait (attempt ${attempt}) ✓`);
                    if (takeScreenshot) {
                        await takeScreenshot(`serp_homepage_ready_a${attempt}`);
                    }
                    return loc;
                }
            }

            // If here, search box was not located
            const curUrl = page.url() || '';
            const curTitle = await page.title().catch(() => '');
            log.warning(`[SERP] Search box not found on ${curUrl} ("${curTitle}")`);
            if (takeScreenshot) {
                await takeScreenshot(`serp_searchbox_not_found_a${attempt}`);
            }
        } catch (err) {
            const curUrl = page.url() || 'unknown';
            const curTitle = await page.title().catch(() => '');
            log.warning(
                `[SERP] STEP 1 attempt ${attempt} failed: ${err.message} (Page URL: ${curUrl}, Title: "${curTitle}")`,
            );
            if (takeScreenshot) {
                await takeScreenshot(`serp_step1_timeout_a${attempt}`);
            }
        }

        if (attempt < maxAttempts) {
            const delay = 1500 * attempt;
            log.info(`[SERP] Waiting ${delay}ms before retrying google.com homepage…`);
            await sleep(delay);
        }
    }

    log.warning('[SERP] STEP 1 — Could not load google.com search box after all attempts.');
    return null;
}

/**
 * Types the query into Google search box in a human-like way and presses Enter.
 * Then verifies the SERP results page loads.
 */
async function typeQueryAndSearch(page, searchInput, query, waitMs = 20000, takeScreenshot = null) {
    try {
        await searchInput.click({ delay: randomBetween(60, 140), timeout: 3500 });
    } catch {
        // Overlay intercepted pointer events: handle consent again and force focus
        await handleGoogleConsent(page).catch(() => {});
        await searchInput.focus().catch(() => {});
        await searchInput.click({ force: true, timeout: 2000 }).catch(() => {});
    }
    await sleep(randomBetween(200, 450));
    await searchInput.fill('');
    await sleep(randomBetween(100, 200));

    // Type query naturally character-by-character
    await searchInput.pressSequentially(query, { delay: randomBetween(30, 65) });
    await sleep(randomBetween(400, 800));

    if (takeScreenshot) {
        await takeScreenshot('serp_query_typed');
    }

    log.info('[SERP] Pressing Enter to submit search…');
    await Promise.all([
        Promise.race([
            page.waitForURL(/.*google\..*\/search.*/, { timeout: waitMs }),
            page.waitForSelector('#search, #rso, div.g, div.MjjYud, a[jsname="UWckNb"]', { timeout: waitMs }),
        ]).catch(() => {}),
        searchInput.press('Enter'),
    ]);

    await sleep(randomBetween(1500, 2500));

    // If still on homepage (e.g. autocomplete swallowed Enter), trigger submission
    const curUrl = page.url() || '';
    if (!curUrl.includes('/search')) {
        log.info('[SERP] Retrying search submission via search button or Enter…');
        const submitBtn = page
            .locator(
                'input[name="btnK"]:visible, button[type="submit"]:visible, button[aria-label*="Search" i]:visible',
            )
            .first();
        if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await submitBtn.click().catch(() => {});
        } else {
            await searchInput.press('Enter').catch(() => {});
        }
        await page.waitForURL(/.*google\..*\/search.*/, { timeout: 15000 }).catch(() => {});
    }

    await sleep(randomBetween(1200, 2000));

    if (takeScreenshot) {
        await takeScreenshot('serp_query_submitted');
    }
}

/**
 * Navigates to Google SERP directly as fallback if homepage typing fails.
 */
async function loadSerpDirectly(page, query, perAttemptMs, maxAttempts = 1, takeScreenshot = null) {
    const directUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;
    const resultsSelector = '#search, #rso, div.g, div.MjjYud, a[jsname="UWckNb"], #topstuff';
    const gotoTimeout = Math.min(perAttemptMs, 15000);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        log.info(`[SERP] Direct SERP URL fallback attempt (timeout ${gotoTimeout}ms): ${directUrl}`);
        try {
            await page.goto(directUrl, { waitUntil: 'commit', timeout: gotoTimeout });
            await sleep(1500);
            await handleGoogleConsent(page).catch(() => {});

            const visible = await page
                .locator(resultsSelector)
                .first()
                .isVisible({ timeout: 8000 })
                .catch(() => false);
            if (visible) {
                log.info(`[SERP] SERP results loaded via direct URL (attempt ${attempt}) ✓`);
                if (takeScreenshot) {
                    await takeScreenshot(`serp_direct_loaded_a${attempt}`);
                }
                return true;
            }

            if (takeScreenshot) {
                await takeScreenshot(`serp_direct_no_results_a${attempt}`);
            }
        } catch (err) {
            const curUrl = page.url() || 'unknown';
            const curTitle = await page.title().catch(() => '');
            log.warning(
                `[SERP] Direct SERP attempt ${attempt} error: ${err.message} (Page URL: ${curUrl}, Title: "${curTitle}")`,
            );
            if (takeScreenshot) {
                await takeScreenshot(`serp_direct_error_a${attempt}`);
            }
        }

        if (attempt < maxAttempts) {
            await sleep(2000);
        }
    }

    return false;
}

/**
 * Scans the SERP page for organic results matching the target URL.
 * Handles direct links, Google /url?q= redirects, Google /goto? encrypted redirects,
 * breadcrumbs, site titles, and snippet text.
 */
async function findTargetInSerp(page, targetUrl, rankOffset = 0) {
    try {
        const targetObj = new URL(targetUrl);
        const targetHost = targetObj.hostname.replace(/^www\./, '').toLowerCase();
        const cleanPath = targetObj.pathname.replace(/\/$/, '').toLowerCase();
        const pathSegments = cleanPath
            .split('/')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
        const targetSlug = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';

        const match = await page.evaluate(
            ({ host, slug, segments, offset }) => {
                const isExcluded = (href, text) => {
                    const lowerText = (text || '').toLowerCase();
                    const lowerHref = (href || '').toLowerCase();
                    return (
                        lowerHref.includes('google.com/webmasters') ||
                        lowerHref.includes('support.google.com') ||
                        lowerHref.includes('accounts.google.com') ||
                        lowerHref.includes('policies.google.com') ||
                        lowerHref.includes('maps.google.com') ||
                        lowerHref.includes('google.com/search') ||
                        lowerHref.includes('google.com/preferences') ||
                        lowerText.includes('try google search console') ||
                        lowerText.includes('google promotion')
                    );
                };

                const candidates = Array.from(
                    document.querySelectorAll(
                        'a[jsname="UWckNb"], #search a[href], #rso a[href], div.g a[href], div.MjjYud a[href], div[data-hveid] a[href], a:has(h3), a:has(cite), a.zReHs, main a[href]',
                    ),
                );

                let rank = offset;
                const seenLinks = new Set();

                for (const a of candidates) {
                    const href = a.href || a.getAttribute('href') || '';
                    const isScriptUrl = href.toLowerCase().slice(0, 11) === ['java', 'script:'].join('');
                    if (!href || href === '#' || isScriptUrl) continue;

                    const h3 = a.querySelector('h3') || a.closest('div')?.querySelector('h3');
                    const text = (a.innerText || '').trim();
                    const title = (h3 ? h3.innerText : text).trim();

                    const container =
                        a.closest('div.MjjYud, div.g, div[data-hveid], jscontroller, div[data-sokoban-container]') ||
                        a.parentElement;
                    const containerText = (container ? container.innerText : '').toLowerCase();
                    const anchorText = text.toLowerCase();

                    if (isExcluded(href, `${title} ${containerText}`)) continue;

                    const dedupeKey = title || href;
                    if (seenLinks.has(dedupeKey)) continue;
                    seenLinks.add(dedupeKey);

                    rank++;

                    let matched = false;

                    // Check 1: Direct href or Google /url? redirect
                    let cleanHref = href;
                    try {
                        const u = new URL(href, window.location.origin);
                        if (u.hostname.includes('google.') && (u.pathname === '/url' || u.pathname === '/url/')) {
                            const real = u.searchParams.get('url') || u.searchParams.get('q');
                            if (real) cleanHref = real;
                        }
                    } catch {
                        /* ignore */
                    }

                    try {
                        const parsed = new URL(cleanHref, window.location.origin);
                        const parsedHost = parsed.hostname.replace(/^www\./, '').toLowerCase();
                        if (!parsed.hostname.includes('google.') && parsedHost === host) {
                            if (!slug || parsed.pathname.toLowerCase().includes(slug)) {
                                matched = true;
                            }
                        }
                    } catch {
                        /* ignore */
                    }

                    // Check 2: Google /goto? or encrypted link matching host and slug in breadcrumbs/snippet
                    if (!matched) {
                        const hostNoTld = host.split('.')[0];
                        const slugWords = slug.replace(/[-_]/g, ' ');
                        const slugNormalized = slug.replace(/[-_]/g, '');
                        const containerNormalized = containerText.replace(/[\s\-_]/g, '');
                        const anchorNormalized = anchorText.replace(/[\s\-_]/g, '');

                        const hasHost =
                            containerText.includes(host) ||
                            anchorText.includes(host) ||
                            containerText.includes(hostNoTld) ||
                            anchorText.includes(hostNoTld);

                        if (hasHost) {
                            if (!slug) {
                                matched = true;
                            } else if (
                                containerText.includes(slug) ||
                                anchorText.includes(slug) ||
                                containerText.includes(slugWords) ||
                                anchorText.includes(slugWords) ||
                                containerNormalized.includes(slugNormalized) ||
                                anchorNormalized.includes(slugNormalized)
                            ) {
                                matched = true;
                            } else if (
                                segments.length > 0 &&
                                segments.some((seg) => {
                                    const segClean = seg.replace(/[-_]/g, '');
                                    return (
                                        containerNormalized.includes(segClean) || anchorNormalized.includes(segClean)
                                    );
                                })
                            ) {
                                matched = true;
                            }
                        }
                    }

                    if (matched) {
                        a.setAttribute('data-serp-target', 'true');
                        if (h3) h3.setAttribute('data-serp-target-h3', 'true');
                        return { rank, href: cleanHref || href, title: title || host };
                    }
                }

                return null;
            },
            { host: targetHost, slug: targetSlug, segments: pathSegments, offset: rankOffset },
        );

        return match;
    } catch {
        return null;
    }
}

/**
 * Full organic Google SERP traffic flow:
 *
 *  STEP 1 — Open google.com homepage & verify search box (with diagnostic screenshots)
 *  STEP 2 — Dismiss any consent dialogs
 *  STEP 3 — Type query (site:{url} or custom) humanly into search box
 *  STEP 4 — Press Enter → verify Google SERP results page loaded
 *  STEP 5 — Find the organic result matching the target URL
 *  STEP 6 — Click the organic result & wait for navigation to target website
 *
 *  Fallback: If Google homepage search box is unavailable, falls back to direct SERP URL.
 *  Final Fallback: If Google blocks with CAPTCHA, returns descriptive status with screenshot.
 *
 * @param {import('playwright').Page} page
 * @param {string} targetUrl
 * @param {string} customQuery
 * @param {number} navTimeoutMs
 * @param {Function} [screenshotCallback] - Callback (page, label) => Promise<string|null>
 */
export async function executeGoogleSerpSearch(page, targetUrl, customQuery, navTimeoutMs, screenshotCallback = null) {
    const query = buildSerpQuery(targetUrl, customQuery);
    log.info(`[SERP] Target URL: "${targetUrl}"`);
    log.info(`[SERP] Generated Search Query: "${query}"`);

    const perAttemptMs = Math.max(Number(navTimeoutMs) || 60000, 30000);
    const screenshots = [];

    const takeScreenshot = async (label, targetPage = page) => {
        if (typeof screenshotCallback === 'function') {
            try {
                let key = null;
                // Support both (targetPage, label) or legacy (label, targetPage)
                if (screenshotCallback.length >= 2) {
                    key = await screenshotCallback(targetPage, label);
                } else {
                    key = await screenshotCallback(label, targetPage);
                }
                if (key && typeof key === 'string') {
                    screenshots.push(key);
                }
                return key;
            } catch (err) {
                log.debug(`[SERP Screenshot] Error capturing "${label}": ${err.message}`);
            }
        }
        return null;
    };

    let serpPageReady = false;

    // ── STEP 1-3: Open google.com homepage, find search box, type & submit ─────
    const searchInput = await openGoogleAndGetSearchBox(page, perAttemptMs, 1, takeScreenshot);

    if (searchInput) {
        log.info(`[SERP] STEP 3 — Typing query "${query}" into Google search box…`);
        await typeQueryAndSearch(page, searchInput, query, 15000, takeScreenshot);

        const currentUrl = page.url() || '';
        if (currentUrl.includes('/search')) {
            serpPageReady = true;
            log.info('[SERP] STEP 4 — Google SERP loaded via homepage search box ✓');
        } else {
            log.warning('[SERP] STEP 4 — Did not transition to /search.');
        }
    } else {
        log.warning('[SERP] STEP 2 — Search box not ready on homepage.');
    }

    // ── Fallback: Direct SERP URL only if Google domain was reachable ────────
    const reachedUrl = page.url() || '';
    if (!serpPageReady && reachedUrl.includes('google.')) {
        log.info('[SERP] Google homepage was reachable; trying direct SERP URL fallback…');
        serpPageReady = await loadSerpDirectly(page, query, perAttemptMs, 1, takeScreenshot);
    }

    if (!serpPageReady) {
        log.warning('[SERP] Google SERP did not respond (timeout or blocked by Google). Fast-failing SERP step.');
        await takeScreenshot('serp_failed_fast');
        return {
            success: false,
            query,
            rank: null,
            error: 'google_serp_timeout_or_blocked',
            screenshots,
            screenshotKey: screenshots[screenshots.length - 1] || null,
        };
    }

    // ── Check for Google CAPTCHA / Bot detection ─────────────────────────────
    await page
        .waitForSelector('#search, #rso, div.g, div.MjjYud, a[jsname="UWckNb"], [data-async-context]', {
            timeout: 10000,
        })
        .catch(() => {});
    await sleep(randomBetween(1000, 2000));

    const hasCaptcha = await page
        .evaluate(() => {
            const text = (document.body ? document.body.innerText : '').toLowerCase();
            const title = (document.title || '').toLowerCase();
            return (
                document.querySelector('#captcha-form') !== null ||
                document.querySelector('#recaptcha') !== null ||
                document.querySelector('form[action*="Captcha"]') !== null ||
                title.includes('sorry') ||
                title.includes('unusual traffic') ||
                text.includes('unusual traffic from your computer network')
            );
        })
        .catch(() => false);

    if (hasCaptcha) {
        log.warning('[SERP] Google CAPTCHA / bot detection on this IP/proxy.');
        await takeScreenshot('serp_captcha_detected');
        return {
            success: false,
            query,
            rank: null,
            error: 'google_captcha_detected',
            screenshots,
            screenshotKey: screenshots[screenshots.length - 1] || null,
        };
    }

    // ── STEP 5: Find organic result matching target URL ───────────────────────
    log.info('[SERP] STEP 5 — Scanning SERP for organic result…');
    let matchedResult = await findTargetInSerp(page, targetUrl);

    if (!matchedResult) {
        log.info('[SERP] Target not found on Page 1. Checking Page 2 / More results…');
        const nextButton = page
            .locator('#pnnext, a:has-text("Next"), a:has-text("More results"), button:has-text("More results")')
            .first();
        if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await nextButton.scrollIntoViewIfNeeded();
            await sleep(randomBetween(500, 1000));
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'commit', timeout: 20000 }).catch(() => {}),
                nextButton.click(),
            ]);
            await sleep(randomBetween(1000, 2000));
            matchedResult = await findTargetInSerp(page, targetUrl, 10);
        } else {
            // Modern Google continuous scroll: scroll to bottom to load more results
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
            await sleep(randomBetween(1500, 2500));
            matchedResult = await findTargetInSerp(page, targetUrl, 10);
        }
    }

    if (!matchedResult) {
        log.warning(`[SERP] Organic result for "${targetUrl}" not found in Google SERP.`);
        await takeScreenshot('serp_target_not_found');
        return {
            success: false,
            query,
            rank: null,
            error: 'target_not_found_in_serp',
            screenshots,
            screenshotKey: screenshots[screenshots.length - 1] || null,
        };
    }

    log.info(`[SERP] STEP 5 ✓ — Rank #${matchedResult.rank}: "${matchedResult.title}" (${matchedResult.href})`);
    await takeScreenshot('serp_result_matched');

    // ── STEP 6: Click the organic result ─────────────────────────────────────
    log.info(`[SERP] STEP 6 — Clicking organic result Rank #${matchedResult.rank}…`);
    const targetLocator = page.locator('a[data-serp-target="true"], h3[data-serp-target-h3="true"]').first();

    let activePage = page;

    try {
        await targetLocator.scrollIntoViewIfNeeded();
        await simulateRandomMouseMovements(page);
        await sleep(randomBetween(600, 1200));

        // Capture screenshot right before clicking the organic link
        await takeScreenshot('serp_before_click');

        // Ensure navigation stays in the current page
        await targetLocator.evaluate((el) => {
            const a = el.tagName === 'A' ? el : el.closest('a');
            if (a) {
                a.removeAttribute('target');
                a.setAttribute('target', '_self');
            }
        });

        // Listen for either same-page navigation away from Google or a new tab opening
        let newPage = null;
        try {
            const [p] = await Promise.all([
                page
                    .context()
                    .waitForEvent('page', { timeout: 4000 })
                    .catch(() => null),
                page.waitForURL((u) => !u.hostname.includes('google.'), { timeout: perAttemptMs }).catch(() => null),
                targetLocator.click({ delay: randomBetween(60, 120), timeout: 8000 }),
            ]);
            newPage = p;
        } catch {
            log.info('[SERP] Standard click intercepted by overlay; retrying with force click…');
            const [p] = await Promise.all([
                page
                    .context()
                    .waitForEvent('page', { timeout: 4000 })
                    .catch(() => null),
                page.waitForURL((u) => !u.hostname.includes('google.'), { timeout: perAttemptMs }).catch(() => null),
                targetLocator.click({ force: true, timeout: 8000 }).catch(async () => {
                    await targetLocator.evaluate((el) => {
                        const a = el.tagName === 'A' ? el : el.closest('a');
                        if (a) a.click();
                        else el.click();
                    });
                }),
            ]);
            newPage = p;
        }

        if (newPage) {
            log.info('[SERP] Navigation opened a new tab. Switching to active page…');
            activePage = newPage;
            await activePage.waitForURL((u) => u.href !== 'about:blank', { timeout: 10000 }).catch(() => {});
            try {
                if (page !== newPage) await page.close();
            } catch {
                // Ignore
            }
        }

        await activePage.waitForLoadState('domcontentloaded', { timeout: perAttemptMs }).catch(() => {});
        await sleep(randomBetween(1500, 3000));

        // Validate we actually navigated away from Google
        const finalUrl = activePage.url() || '';
        if (finalUrl.includes('google.') || finalUrl === 'about:blank' || finalUrl === '') {
            log.warning(
                `[SERP] Click succeeded but remained on Google domain (${finalUrl}). ` +
                    'This can happen when Google redirect chains loop back or fail to exit.',
            );
            await takeScreenshot('serp_click_stayed_on_google', activePage);
            return {
                success: false,
                query,
                rank: matchedResult.rank,
                error: 'click_landed_on_google',
                screenshotKey: screenshots[screenshots.length - 1] || null,
                screenshots,
                destinationUrl: finalUrl,
                page: activePage,
            };
        }

        log.info(`[SERP] STEP 6 ✓ — Organic click succeeded. Landed on: ${activePage.url()}`);
        await takeScreenshot('serp_click_landed', activePage);

        return {
            success: true,
            query,
            rank: matchedResult.rank,
            screenshotKey: screenshots[screenshots.length - 1] || null,
            screenshots,
            destinationUrl: activePage.url(),
            page: activePage,
        };
    } catch (clickErr) {
        log.warning(`[SERP] Click navigation failed: ${clickErr.message}`);
        await takeScreenshot('serp_click_failed');
        return {
            success: false,
            query,
            rank: matchedResult.rank,
            error: `click_failed: ${clickErr.message}`,
            screenshotKey: screenshots[screenshots.length - 1] || null,
            screenshots,
            page: activePage,
        };
    }
}
