import { Actor } from 'apify';
import { chromium } from 'playwright';

await Actor.init();

let browser = null;
let page = null;

try {
    const input = (await Actor.getInput()) || {};
    let { postUrl, commentText, pageName, cookies } = input;

    if (!postUrl && input.postId) {
        postUrl = String(input.postId);
    }
    if (!postUrl) {
        throw new Error("Missing required parameter: 'postUrl'");
    }
    if (!commentText) {
        throw new Error("Missing required parameter: 'commentText'");
    }
    if (!cookies) {
        throw new Error("Missing required parameter: 'cookies'. Please provide your Facebook session cookies.");
    }

    // ── 1. Smart URL Normalization ───────────────────────────────────────────
    // Supports:
    // - Numeric ID: "4623777684615716" -> "https://www.facebook.com/4623777684615716"
    // - Share links: "https://web.facebook.com/share/p/1HsiUkMVbJ/" -> "https://www.facebook.com/share/p/1HsiUkMVbJ/"
    // - Subdomains: web.facebook.com, m.facebook.com -> www.facebook.com
    postUrl = String(postUrl).trim();

    if (/^\d+$/.test(postUrl)) {
        console.log(`[Facebook Commenter] Pure numeric post ID detected (${postUrl}). Converting to canonical Facebook URL...`);
        postUrl = `https://www.facebook.com/${postUrl}`;
    } else if (postUrl.startsWith('fb://')) {
        postUrl = postUrl.replace('fb://', 'https://www.facebook.com/');
    } else if (!postUrl.startsWith('http://') && !postUrl.startsWith('https://')) {
        postUrl = `https://${postUrl}`;
    }

    // Rewrite web.facebook.com or m.facebook.com to www.facebook.com to prevent regional redirects
    postUrl = postUrl.replace(/^https?:\/\/(web|m|mbasic|touch)\.facebook\.com/i, 'https://www.facebook.com');

    // Clean tracking query parameters that trigger Facebook bot security checks (rdid, share_url, etc.)
    try {
        const u = new URL(postUrl);
        if (u.pathname.includes('/permalink/') || u.pathname.includes('/posts/')) {
            ['rdid', 'share_url', '__cft__[0]', '__tn__'].forEach(p => u.searchParams.delete(p));
            postUrl = u.toString();
        }
    } catch (e) {}

    console.log(`[Facebook Commenter] Starting execution for URL: ${postUrl}`);

    // ── 2. Parse & Normalize Cookies ─────────────────────────────────────────
    const normalizedCookies = [];
    let parsedCookies = cookies;

    if (typeof cookies === 'string') {
        const trimmed = cookies.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            try {
                parsedCookies = JSON.parse(trimmed);
            } catch (e) {
                parsedCookies = trimmed;
            }
        }
    }

    if (Array.isArray(parsedCookies)) {
        for (const c of parsedCookies) {
            if (c.name && c.value !== undefined) {
                let domain = c.domain || '.facebook.com';
                if (!domain.includes('facebook.com')) domain = '.facebook.com';
                normalizedCookies.push({
                    name: String(c.name),
                    value: String(c.value),
                    domain: domain,
                    path: c.path || '/',
                    secure: c.secure !== undefined ? Boolean(c.secure) : true,
                    httpOnly: c.httpOnly !== undefined ? Boolean(c.httpOnly) : false,
                    sameSite: 'Lax'
                });
            }
        }
    } else if (typeof parsedCookies === 'string') {
        const pairs = parsedCookies.split(';');
        for (const pair of pairs) {
            const idx = pair.indexOf('=');
            if (idx > -1) {
                const name = pair.slice(0, idx).trim();
                const value = pair.slice(idx + 1).trim();
                if (name) {
                    normalizedCookies.push({
                        name,
                        value,
                        domain: '.facebook.com',
                        path: '/',
                        secure: true,
                        httpOnly: false,
                        sameSite: 'Lax'
                    });
                }
            }
        }
    }

    if (normalizedCookies.length === 0) {
        throw new Error("Failed to parse any valid cookies from input. Ensure cookies are provided in JSON array or key=value format.");
    }

    console.log(`[Facebook Commenter] Loaded ${normalizedCookies.length} session cookies.`);

    // ── 3. Configure Proxy & Launch Playwright Browser ───────────────────────
    // Reads proxy configuration from input (or defaults to high-trust RESIDENTIAL)
    let proxyConfiguration = null;
    try {
        if (input.proxyConfiguration) {
            proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfiguration);
        } else {
            // Default to RESIDENTIAL proxy for maximum trust and zero Facebook cookie lockouts
            proxyConfiguration = await Actor.createProxyConfiguration({
                groups: ['RESIDENTIAL']
            });
        }
    } catch (e) {
        try {
            console.log(`[Facebook Commenter] Note: Residential proxy not available (${e.message}), falling back to standard Apify proxy...`);
            proxyConfiguration = await Actor.createProxyConfiguration();
        } catch (err) {
            console.log('[Facebook Commenter] Note: Running without proxy:', err.message);
        }
    }

    const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl() : undefined;
    if (proxyUrl) {
        console.log('[Facebook Commenter] Using Apify proxy for secure browsing.');
    }

    browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-gpu',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1280,900'
        ]
    });

    const contextOptions = {
        viewport: { width: 1280, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        locale: 'en-US'
    };

    if (proxyUrl) {
        const u = new URL(proxyUrl);
        contextOptions.proxy = {
            server: `${u.protocol}//${u.host}`,
            username: decodeURIComponent(u.username || ''),
            password: decodeURIComponent(u.password || '')
        };
    }

    const context = await browser.newContext(contextOptions);

    // Stealth evasion script: hide webdriver flags
    await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
    });

    await context.addCookies(normalizedCookies);
    page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);

    // ── 4. Navigate to Post URL ──────────────────────────────────────────────
    console.log(`[Facebook Commenter] Navigating to: ${postUrl}`);
    try {
        await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (navErr) {
        console.log(`[Facebook Commenter] Initial navigation event notice: ${navErr.message}. Checking page state...`);
        // If the initial event timed out, the page might already have loaded enough DOM to interact
        await page.waitForTimeout(5000);
    }
    
    // Wait for Facebook React SPA to hydrate post elements
    await page.waitForTimeout(4000);

    const currentUrl = page.url();
    console.log(`[Facebook Commenter] Current browser URL: ${currentUrl}`);

    if (currentUrl.includes('/login') || currentUrl.includes('/checkpoint') || currentUrl.includes('/recover/')) {
        throw new Error("Facebook session rejected or expired. Please update your Facebook session cookies in your vault.");
    }

    // Dismiss genuine cookie consent banners if present
    // NOTE: NEVER match generic "Close" buttons here, as Facebook posts open in modal popups with a "Close" [X] button!
    try {
        const consentSelectors = [
            'button[data-cookiebanner="accept_button"]',
            'button[data-cookiebanner="accept_only_essential_button"]',
            'div[aria-label="Allow all cookies"][role="button"]',
            'div[aria-label="Decline optional cookies"][role="button"]',
            'button:has-text("Allow all cookies")',
            'button:has-text("Decline optional cookies")',
            'button:has-text("Only allow essential cookies")'
        ];
        for (const sel of consentSelectors) {
            const btn = page.locator(sel).first();
            if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
                console.log(`[Facebook Commenter] Dismissing cookie consent dialog...`);
                await btn.click().catch(() => {});
                await page.waitForTimeout(1000);
                break;
            }
        }
    } catch (e) {}

    // ── Handle "Continue as [Name]" overlay dialog ──────────────────────────
    // Facebook frequently displays a "Continue as <User>" or "Log in as <User>" prompt
    try {
        const continueSelectors = [
            // Matches "Continue as ..." case-insensitively regardless of the person's name
            'div[role="button"]:has-text("Continue as")',
            'button:has-text("Continue as")',
            'div[aria-label^="Continue as" i][role="button"]',
            'button[aria-label^="Continue as" i]',
            // Alternative profile prompts
            'div[role="button"]:has-text("Continue")',
            'button:has-text("Continue")'
        ];

        for (const sel of continueSelectors) {
            const continueBtn = page.locator(sel).first();
            if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                const btnText = await continueBtn.innerText().catch(() => 'Continue button');
                console.log(`[Facebook Commenter] Detected profile prompt ("${btnText.trim()}"). Clicking to proceed...`);
                await continueBtn.click().catch(() => {});
                await page.waitForTimeout(3000);
                break;
            }
        }
    } catch (e) {
        console.log('[Facebook Commenter] Note: Continue-as check skipped:', e.message);
    }

    // ── Handle "See more on Facebook" or guest login modal ──────────────────
    // When visiting without valid session or guest view, Facebook shows "See more on Facebook" with a close [X]
    try {
        const seeMoreModalClose = page.locator('div[role="dialog"] div[aria-label="Close"][role="button"], div[role="dialog"] [aria-label="close" i]').first();
        const hasSeeMore = await page.locator('text="See more on Facebook"').first().isVisible({ timeout: 1500 }).catch(() => false);
        if (hasSeeMore && await seeMoreModalClose.isVisible({ timeout: 1500 }).catch(() => false)) {
            console.log('[Facebook Commenter] Dismissing "See more on Facebook" overlay dialog...');
            await seeMoreModalClose.click().catch(() => {});
            await page.waitForTimeout(1500);
        }
    } catch (e) {}

    // Check page text for common Facebook restricted/deleted states
    const pageText = await page.evaluate(() => document.body.innerText || '');

    if (pageText.includes("Sorry, something went wrong")) {
        throw new Error("Facebook returned 'Sorry, something went wrong'. Facebook temporarily blocked this post URL or rate-limited requests from this session. Please wait a few minutes or refresh your session cookies.");
    }

    if (
        pageText.includes("This content isn't available at the moment") ||
        pageText.includes("This content is not available right now") ||
        pageText.includes("When this happens, it's usually because the owner only shared it") ||
        pageText.includes("Page Not Found")
    ) {
        throw new Error("This post is no longer available on Facebook (deleted by author or removed by group admins).");
    }

    if (
        pageText.includes("Commenting has been turned off for this post") ||
        pageText.includes("Commenting was turned off") ||
        pageText.includes("comments are turned off")
    ) {
        throw new Error("Commenting has been turned off for this post by the author or group admin.");
    }

    if (
        pageText.includes("Join group to comment") ||
        pageText.includes("Join Group to post or comment")
    ) {
        throw new Error("Your Facebook account must join this group before it can comment.");
    }

    // ── 5. Detect & Handle Any Overlay Dialogs (Continue as [User], Close Dialogs, etc.) ────
    try {
        const handleOverlays = async () => {
            const continueSelectors = [
                'div[role="button"]:has-text("Continue as")',
                'button:has-text("Continue as")',
                'div[aria-label^="Continue as" i][role="button"]',
                'button[aria-label^="Continue as" i]',
                'div[role="button"]:has-text("Continue")',
                'button:has-text("Continue")'
            ];
            for (const sel of continueSelectors) {
                const continueBtn = page.locator(sel).first();
                if (await continueBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
                    const btnText = await continueBtn.innerText().catch(() => 'Continue button');
                    console.log(`[Facebook Commenter] Clicking identity confirmation button ("${btnText.trim()}")...`);
                    await continueBtn.click().catch(() => {});
                    await page.waitForTimeout(2500);
                    return true;
                }
            }
            return false;
        };

        await handleOverlays();
    } catch (e) {}

    // ── 6. Detect Post Scope (Modal Overlay vs Standalone Page) ───────────────
    // If the post itself is in a dialog overlay (e.g. permalink popup)
    const dialogs = page.locator('div[role="dialog"]');
    const dialogCount = await dialogs.count().catch(() => 0);
    let postScope = page;
    let isDialog = false;

    if (dialogCount > 0) {
        // Find dialog that contains post content or comment field
        for (let i = 0; i < dialogCount; i++) {
            const d = dialogs.nth(i);
            const hasCommentBox = await d.locator('div[role="textbox"], div[data-lexical-editor="true"], div[role="button"][aria-label*="comment" i], div:has-text("Write a comment")').first().isVisible({ timeout: 1000 }).catch(() => false);
            if (hasCommentBox) {
                postScope = d;
                isDialog = true;
                break;
            }
        }
        if (!isDialog && dialogCount === 1) {
            postScope = dialogs.first();
            isDialog = true;
        }
    }

    const container = postScope;
    console.log(`[Facebook Commenter] Post container: ${isDialog ? 'Modal Dialog (div[role="dialog"])' : 'Main Page View'}`);

    // Scroll down slightly inside container to bring comment area into view
    if (isDialog) {
        await postScope.evaluate(el => el.scrollBy(0, 350)).catch(() => {});
    } else {
        await page.evaluate(() => window.scrollBy(0, 350)).catch(() => {});
    }
    await page.waitForTimeout(1500);

    // ── 6. Locate & Activate Comment Input Box ────────────────────────────────
    console.log(`[Facebook Commenter] Locating comment input box...`);

    // Check if there is an inactive placeholder button (e.g., "Write a comment..." or "Comment as ...")
    const placeholderSelectors = [
        'div[role="button"][aria-label*="Write a comment" i]',
        'div[role="button"][aria-label*="Write a public comment" i]',
        'div[role="button"]:has-text("Write a comment...")',
        'span:has-text("Write a comment...")',
        'span:has-text("Comment as ")'
    ];
    for (const pSel of placeholderSelectors) {
        const ph = container.locator(pSel).first();
        if (await ph.isVisible({ timeout: 1000 }).catch(() => false)) {
            console.log(`[Facebook Commenter] Clicking comment placeholder to activate rich editor...`);
            await ph.click().catch(() => {});
            await page.waitForTimeout(1000);
            break;
        }
    }

    const commentSelectors = [
        'div[role="textbox"][contenteditable="true"]',
        'div[data-lexical-editor="true"]',
        'div[aria-label*="Write a comment" i]',
        'div[aria-label*="Write a public comment" i]',
        'div[aria-label*="Write an answer" i]',
        'div[aria-label*="Write a response" i]',
        'div[aria-placeholder*="Comment" i]',
        'div[role="textbox"]'
    ];

    let commentBox = null;
    for (const sel of commentSelectors) {
        const el = container.locator(sel).first();
        if (await el.isVisible({ timeout: 2500 }).catch(() => false)) {
            commentBox = el;
            break;
        }
    }

    // Fallback: search globally on page if container scoping was too narrow
    if (!commentBox && isDialog) {
        for (const sel of commentSelectors) {
            const el = page.locator(sel).first();
            if (await el.isVisible({ timeout: 1500 }).catch(() => false)) {
                commentBox = el;
                break;
            }
        }
    }

    // Fallback 2: Check for the post's "Comment" action button (Like / Comment / Share bar)
    // Often clicking this opens or focuses the comment text box
    if (!commentBox) {
        console.log('[Facebook Commenter] Comment box not directly visible. Looking for "Comment" action button...');
        const actionCommentBtn = container.locator('div[role="button"][aria-label*="Comment" i], div[role="button"]:has-text("Comment"), span:has-text("Comment")').first();
        if (await actionCommentBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
            console.log('[Facebook Commenter] Clicking "Comment" action button on post bar...');
            await actionCommentBtn.click().catch(() => {});
            await page.waitForTimeout(1500);

            for (const sel of commentSelectors) {
                const el = container.locator(sel).first();
                if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
                    commentBox = el;
                    break;
                }
            }
        }
    }

    if (!commentBox) {
        const errScreenshot = await page.screenshot({ fullPage: false }).catch(() => null);
        if (errScreenshot) {
            await Actor.setValue('ERROR_NO_COMMENT_BOX.jpg', errScreenshot, { contentType: 'image/jpeg' });
        }
        throw new Error("Could not find comment box. The post may be locked, archived, or requires group membership.");
    }

    await commentBox.scrollIntoViewIfNeeded().catch(() => {});
    await commentBox.click();
    await page.waitForTimeout(600);

    // ── 7. Type and Submit Comment ───────────────────────────────────────────
    console.log(`[Facebook Commenter] Typing comment: "${commentText}"`);
    await page.keyboard.type(commentText, { delay: 25 });
    await page.waitForTimeout(1200);

    console.log(`[Facebook Commenter] Submitting comment via Enter key...`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    // Also click send button if Enter key didn't submit
    try {
        const sendBtnSelectors = [
            'div[aria-label="Comment"][role="button"]',
            'div[aria-label="Send"][role="button"]',
            'div[aria-label="Post"][role="button"]'
        ];
        for (const sSel of sendBtnSelectors) {
            const sBtn = container.locator(sSel).first();
            if (await sBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await sBtn.click().catch(() => {});
                await page.waitForTimeout(2000);
                break;
            }
        }
    } catch (e) {}

    // Allow Facebook to process and render comment
    await page.waitForTimeout(3000);

    // ── 8. Capture Proof Screenshot & Save Output ────────────────────────────
    const proofScreenshot = await page.screenshot({ fullPage: false }).catch(() => null);
    if (proofScreenshot) {
        await Actor.setValue('PROOF_SCREENSHOT.jpg', proofScreenshot, { contentType: 'image/jpeg' });
    }

    const result = {
        success: true,
        message: 'Comment submitted successfully on Facebook.',
        postUrl,
        commentText,
        pageName: pageName || 'Personal Profile',
        timestamp: new Date().toISOString()
    };

    console.log(`[Facebook Commenter] SUCCESS: Comment submitted successfully!`);
    await Actor.pushData(result);
    await Actor.setValue('OUTPUT', result);

    await browser.close().catch(() => {});
    await Actor.exit();
} catch (err) {
    console.error(`[Facebook Commenter] ERROR: ${err.message}`);
    try {
        if (page) {
            const errScreenshot = await page.screenshot({ fullPage: false }).catch(() => null);
            if (errScreenshot) {
                await Actor.setValue('ERROR_SCREENSHOT.jpg', errScreenshot, { contentType: 'image/jpeg' });
            }
        }
    } catch (e) {}

    await Actor.setValue('OUTPUT', {
        success: false,
        error: err.message,
        timestamp: new Date().toISOString()
    });

    if (browser) await browser.close().catch(() => {});
    // Mark the run failed cleanly without uncaught exception crash
    await Actor.fail(err.message);
}
