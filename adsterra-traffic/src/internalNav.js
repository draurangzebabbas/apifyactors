import { log } from 'apify';

import { detectAds } from './detector.js';
import { humanRandomScroll, linearSlowScroll, randomBetween, sleep } from './humanizer.js';

/**
 * Extracts eligible internal navigation links from the current page.
 */
export async function getEligibleInternalLinks(page, visitedUrls) {
    try {
        const currentUrl = page.url();
        const currentOrigin = new URL(currentUrl).origin;
        const currentHost = new URL(currentUrl).hostname.replace(/^www\./, '').toLowerCase();

        return await page.evaluate(
            (ctx) => {
                const anchors = Array.from(document.querySelectorAll('a[href]'));
                const candidates = [];
                const seenHrefs = new Set(ctx.visitedUrls.map((u) => u.toLowerCase()));

                for (const a of anchors) {
                    try {
                        const { href } = a;
                        if (!href || href.startsWith('#')) {
                            continue;
                        }

                        const u = new URL(href, window.location.href);
                        if (!['http:', 'https:'].includes(u.protocol)) continue;

                        const linkHost = u.hostname.replace(/^www\./, '').toLowerCase();
                        // Must be same origin or same base host
                        if (u.origin !== ctx.currentOrigin && linkHost !== ctx.currentHost) continue;

                        // Clean normalized URL for duplicate checking
                        const cleanUrl = `${u.origin}${u.pathname}`.toLowerCase();
                        if (seenHrefs.has(cleanUrl) || seenHrefs.has(href.toLowerCase())) continue;

                        // Filter out non-content file extensions
                        const pathLower = u.pathname.toLowerCase();
                        if (
                            pathLower.match(
                                /\.(pdf|zip|tar|gz|exe|apk|dmg|jpg|jpeg|png|gif|svg|webp|ico|mp4|mp3|avi|mov|css|js|json)$/,
                            )
                        ) {
                            continue;
                        }

                        // Filter out auth/cart walls
                        if (
                            pathLower.includes('logout') ||
                            pathLower.includes('signout') ||
                            pathLower.includes('wp-login') ||
                            pathLower.includes('wp-admin')
                        ) {
                            continue;
                        }

                        // Ensure element is visible
                        const rect = a.getBoundingClientRect();
                        const isVisible =
                            rect.width > 0 &&
                            rect.height > 0 &&
                            window.getComputedStyle(a).visibility !== 'hidden' &&
                            window.getComputedStyle(a).display !== 'none';

                        if (!isVisible) continue;

                        candidates.push({
                            href: u.href,
                            text: (a.innerText || a.getAttribute('aria-label') || a.title || '').trim().slice(0, 100),
                        });
                        seenHrefs.add(cleanUrl);
                    } catch {
                        // Ignore malformed URLs
                    }
                }

                return candidates;
            },
            { currentOrigin, currentHost, visitedUrls },
        );
    } catch {
        return [];
    }
}

/**
 * Executes deep internal browsing by clicking through internal pages.
 */
export async function executeInternalNavigation(page, options) {
    const {
        maxPages = 2,
        minDwellSeconds = 10,
        maxDwellSeconds = 25,
        scrollBehavior = 'human-random',
        navTimeoutMs = 60000,
        captureScreenshots = false,
        sessionNumber = 1,
        saveScreenshotFn,
    } = options;

    const visitedPages = [];
    const visitedUrlSet = [page.url()];
    let totalInternalDwellMs = 0;

    for (let depth = 1; depth <= maxPages; depth++) {
        log.info(`[S${sessionNumber}] [InternalNav] Discovering links for deep page #${depth}…`);

        const candidateLinks = await getEligibleInternalLinks(page, visitedUrlSet);
        if (candidateLinks.length === 0) {
            log.info(`[S${sessionNumber}] [InternalNav] No further unvisited internal links found on page.`);
            break;
        }

        // Prefer content articles over utility pages (about, contact, privacy, etc.)
        const utilityKeywords = ['about', 'contact', 'privacy', 'terms', 'cookie', 'disclaimer', 'policy'];
        const contentLinks = candidateLinks.filter((c) => {
            const p = c.href.toLowerCase();
            return !utilityKeywords.some((k) => p.includes(k));
        });
        const pool = contentLinks.length > 0 ? contentLinks : candidateLinks;
        const chosen = pool[randomBetween(0, pool.length - 1)];

        log.info(
            `[S${sessionNumber}] [InternalNav #${depth}] Selected internal link: "${chosen.text}" -> ${chosen.href}`,
        );
        visitedUrlSet.push(chosen.href);

        let navSucceeded = false;
        let responseStatus = 200;
        const pageStart = Date.now();

        try {
            // Find link locator on page
            const linkLocator = page.locator(`a[href="${chosen.href}"]`).first();

            if (await linkLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
                await linkLocator.scrollIntoViewIfNeeded();
                await sleep(randomBetween(500, 1200));

                // Strip target="_blank"
                await linkLocator.evaluate((el) => el.removeAttribute('target'));

                // Click and wait for navigation
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: navTimeoutMs }).catch(() => {}),
                    linkLocator.click({ delay: randomBetween(40, 100) }),
                ]);
                navSucceeded = true;
            } else {
                // Direct goto fallback if not interactable
                const resp = await page.goto(chosen.href, { waitUntil: 'domcontentloaded', timeout: navTimeoutMs });
                responseStatus = resp ? resp.status() : 200;
                navSucceeded = true;
            }
        } catch (err) {
            log.warning(`[S${sessionNumber}] [InternalNav #${depth}] Click error: ${err.message}. Trying direct goto…`);
            try {
                const resp = await page.goto(chosen.href, { waitUntil: 'domcontentloaded', timeout: navTimeoutMs });
                responseStatus = resp ? resp.status() : 200;
                navSucceeded = true;
            } catch (gotoErr) {
                log.warning(`[S${sessionNumber}] [InternalNav #${depth}] Navigation failed: ${gotoErr.message}`);
                break;
            }
        }

        if (!navSucceeded) break;

        // Extra wait for dynamic scripts/network
        try {
            await page.waitForLoadState('networkidle', { timeout: 4000 });
        } catch {
            // Settle timeout is normal
        }

        // Calculate random dwell for this internal page
        const internalDwellSeconds = randomBetween(
            Math.min(minDwellSeconds, maxDwellSeconds),
            Math.max(minDwellSeconds, maxDwellSeconds),
        );
        const internalDwellMs = internalDwellSeconds * 1000;
        log.info(`[S${sessionNumber}] [InternalNav #${depth}] Browsing internal page for ${internalDwellSeconds}s…`);

        let scrollDepth = 0;
        if (scrollBehavior === 'human-random') {
            scrollDepth = await humanRandomScroll(page, internalDwellMs);
        } else if (scrollBehavior === 'slow-linear') {
            scrollDepth = await linearSlowScroll(page, internalDwellMs);
        } else {
            await sleep(internalDwellMs);
        }

        totalInternalDwellMs += Date.now() - pageStart;

        // Collect page details
        let pageTitle = null;
        try {
            pageTitle = await page.title();
        } catch {
            // Ignore
        }

        const adData = await detectAds(page);

        let screenshotKey = null;
        if (captureScreenshots && saveScreenshotFn) {
            screenshotKey = await saveScreenshotFn(page, `internal_p${depth}`, sessionNumber);
        }

        visitedPages.push({
            pageNumber: depth,
            url: page.url(),
            title: pageTitle,
            dwellSeconds: Math.round((Date.now() - pageStart) / 1000),
            scrollDepthPercent: scrollDepth,
            httpStatus: responseStatus,
            adDetection: adData,
            screenshot: screenshotKey,
        });

        log.info(`[S${sessionNumber}] [InternalNav #${depth}] ✅ Finished internal page: ${page.url()}`);
    }

    return {
        pagesVisited: visitedPages,
        totalInternalDwellMs,
    };
}
