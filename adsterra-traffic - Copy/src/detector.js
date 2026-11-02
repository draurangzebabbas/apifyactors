/**
 * Detector utilities for page health, ad network script presence,
 * blank page detection, and analytics metadata.
 */

export async function isPageBlank(page) {
    try {
        return await page.evaluate(() => {
            const { body } = document;
            if (!body) return true;
            const text = (body.innerText || '').trim();
            const hasImages = document.querySelectorAll('img').length > 0;
            const hasIframes = document.querySelectorAll('iframe').length > 0;
            const hasCanvas = document.querySelectorAll('canvas').length > 0;
            const hasVideos = document.querySelectorAll('video').length > 0;
            return text.length < 20 && !hasImages && !hasIframes && !hasCanvas && !hasVideos;
        });
    } catch {
        return false;
    }
}

export async function detectAds(page) {
    try {
        return await page.evaluate(() => {
            const iframes = Array.from(document.querySelectorAll('iframe'));
            const adIframes = iframes.filter((f) => {
                const src = (f.src || '').toLowerCase();
                const id = (f.id || '').toLowerCase();
                const cls = (f.className || '').toLowerCase();
                return (
                    src.includes('ad') ||
                    src.includes('banner') ||
                    src.includes('monetag') ||
                    src.includes('adsterra') ||
                    src.includes('propeller') ||
                    src.includes('pop') ||
                    id.includes('ad') ||
                    cls.includes('ad')
                );
            });

            const scripts = Array.from(document.querySelectorAll('script[src]')).map((s) => s.src);
            const adScripts = scripts.filter(
                (s) =>
                    s.includes('monetag') ||
                    s.includes('adsterra') ||
                    s.includes('propellerads') ||
                    s.includes('popads') ||
                    s.includes('adnxs') ||
                    s.includes('doubleclick') ||
                    s.includes('googletag') ||
                    s.includes('adsystem'),
            );

            return {
                totalIframes: iframes.length,
                adIframes: adIframes.length,
                adIframeSrcs: adIframes.slice(0, 5).map((f) => f.src.slice(0, 100)),
                adScripts: adScripts.slice(0, 5).map((s) => s.slice(0, 100)),
                pageHeight: document.body ? document.body.scrollHeight : 0,
                hasCanvas: document.querySelectorAll('canvas').length > 0,
                hasVideo: document.querySelectorAll('video').length > 0,
            };
        });
    } catch {
        return null;
    }
}

export async function getPageMetadata(page) {
    try {
        return await page.evaluate(() => {
            return {
                referrer: document.referrer || null,
                title: document.title || null,
                url: window.location.href,
                scrollHeight: Math.max(
                    document.documentElement.scrollHeight,
                    document.body ? document.body.scrollHeight : 0,
                ),
            };
        });
    } catch {
        return { referrer: null, title: null, url: page.url(), scrollHeight: 0 };
    }
}
