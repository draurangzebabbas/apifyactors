/**
 * Referrers & Traffic Sources Management
 *
 * Provides realistic presets for simulated referral traffic (Social, Search, Blogs),
 * plus custom referrer resolution.
 */

export const PRESET_REFERRERS = {
    social: [
        'https://www.linkedin.com/feed/',
        'https://www.reddit.com/r/technology/',
        'https://www.reddit.com/r/all/',
        'https://medium.com/',
        'https://t.co/',
        'https://twitter.com/',
        'https://www.facebook.com/',
        'https://www.quora.com/',
        'https://www.pinterest.com/',
        'https://news.ycombinator.com/',
    ],
    search: [
        'https://www.google.com/',
        'https://www.bing.com/',
        'https://search.yahoo.com/',
        'https://duckduckgo.com/',
        'https://www.ecosia.org/',
    ],
    blogs: [
        'https://medium.com/',
        'https://substack.com/',
        'https://dev.to/',
        'https://hashnode.com/',
        'https://wordpress.com/',
    ],
};

/**
 * Resolves an effective referrer URL for a session based on user configuration.
 *
 * @param {string} referrerSource - 'preset_social' | 'preset_search' | 'preset_blogs' | 'custom'
 * @param {string[]|string} customReferrers - Optional array or newline-separated string of URLs
 * @param {string} [fallbackBacklinkUrl] - Optional backlinkUrl from input
 * @returns {string|null} Resolved referrer URL
 */
export function resolveReferrer(referrerSource = 'preset_social', customReferrers = [], fallbackBacklinkUrl = '') {
    const src = (referrerSource || 'preset_social').toLowerCase().trim();

    let pool = [];

    if (src === 'preset_social') {
        pool = PRESET_REFERRERS.social;
    } else if (src === 'preset_search') {
        pool = PRESET_REFERRERS.search;
    } else if (src === 'preset_blogs') {
        pool = PRESET_REFERRERS.blogs;
    } else if (src === 'custom') {
        if (Array.isArray(customReferrers)) {
            pool = customReferrers.map((r) => (typeof r === 'string' ? r.trim() : r?.url?.trim())).filter(Boolean);
        } else if (typeof customReferrers === 'string' && customReferrers.trim()) {
            pool = customReferrers
                .split(/[\r\n,]+/)
                .map((s) => s.trim())
                .filter(Boolean);
        }
    }

    // Fallback to backlinkUrl if pool is empty and fallback is provided
    if (pool.length === 0 && fallbackBacklinkUrl && fallbackBacklinkUrl.trim()) {
        return fallbackBacklinkUrl.trim();
    }

    if (pool.length === 0) {
        pool = PRESET_REFERRERS.social;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
}
