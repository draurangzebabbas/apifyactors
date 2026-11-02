import { describe, expect, it } from 'vitest';

import { detectPlatform } from '../src/backlink.js';
import { buildContextOptions, resolveDeviceProfile } from '../src/devices.js';
import { randomBetween, sleep } from '../src/humanizer.js';
import { PRESET_REFERRERS, resolveReferrer } from '../src/referrers.js';
import { buildSerpQuery, executeGoogleSerpSearch } from '../src/serp.js';
import { extractAndSanitizeUrls } from '../src/urlSanitizer.js';

describe('SERP query builder', () => {
    it('should generate site: query when no custom query is provided', () => {
        const query = buildSerpQuery('https://example.com/blog/my-article');
        expect(query).toBe('site:example.com/blog/my-article');
    });

    it('should handle root domain URLs', () => {
        const query = buildSerpQuery('https://dailydogguide.com/');
        expect(query).toBe('site:dailydogguide.com');
    });

    it('should preserve queries that already have site: prefix', () => {
        const query = buildSerpQuery('site:https://dailydogguide.com/puppy-training-schedule');
        expect(query).toBe('site:https://dailydogguide.com/puppy-training-schedule');
    });

    it('should generate site:query for deep path matching user scenario', () => {
        const query = buildSerpQuery('https://dailydogguide.com/german-shepherd-lifespan');
        expect(query).toBe('site:dailydogguide.com/german-shepherd-lifespan');
    });

    it('should prioritize custom query when provided', () => {
        const query = buildSerpQuery('https://example.com', 'best tech deals 2026');
        expect(query).toBe('best tech deals 2026');
    });
});

describe('Backlink Platform Detector', () => {
    it('should identify LinkedIn URLs', () => {
        expect(detectPlatform('https://www.linkedin.com/feed/update/urn:li:share:12345')).toBe('linkedin');
    });

    it('should identify Medium URLs', () => {
        expect(detectPlatform('https://medium.com/@author/my-article-9876')).toBe('medium');
    });

    it('should identify Reddit URLs', () => {
        expect(detectPlatform('https://www.reddit.com/r/technology/comments/abc123/')).toBe('reddit');
    });

    it('should identify Facebook URLs', () => {
        expect(detectPlatform('https://www.facebook.com/permalink.php?story_fbid=123')).toBe('facebook');
        expect(detectPlatform('https://fb.com/post/123')).toBe('facebook');
    });

    it('should identify Twitter/X URLs', () => {
        expect(detectPlatform('https://twitter.com/user/status/123456')).toBe('twitter');
        expect(detectPlatform('https://x.com/user/status/123456')).toBe('twitter');
    });

    it('should identify Quora URLs', () => {
        expect(detectPlatform('https://www.quora.com/What-is-SEO')).toBe('quora');
    });

    it('should fallback to generic web for regular sites', () => {
        expect(detectPlatform('https://customblog.org/post-1')).toBe('web');
    });
});

describe('Device & User Agent Emulation', () => {
    it('should resolve desktop chrome profile', () => {
        const profile = resolveDeviceProfile('desktop-chrome');
        expect(profile.type).toBe('desktop');
        expect(profile.browser).toBe('chrome');
        expect(profile.isMobile).toBe(false);
        expect(profile.hasTouch).toBe(false);
        expect(profile.userAgent).toContain('Chrome');
    });

    it('should resolve desktop firefox profile', () => {
        const profile = resolveDeviceProfile('desktop-firefox');
        expect(profile.type).toBe('desktop');
        expect(profile.browser).toBe('firefox');
        expect(profile.userAgent).toContain('Firefox');
    });

    it('should resolve desktop safari profile', () => {
        const profile = resolveDeviceProfile('desktop-safari');
        expect(profile.type).toBe('desktop');
        expect(profile.browser).toBe('safari');
        expect(profile.userAgent).toContain('Safari');
    });

    it('should resolve mobile Android profile with touch enabled', () => {
        const profile = resolveDeviceProfile('mobile-android');
        expect(profile.type).toBe('mobile');
        expect(profile.os).toBe('android');
        expect(profile.isMobile).toBe(true);
        expect(profile.hasTouch).toBe(true);
        expect(profile.viewport.width).toBeLessThan(500);
        expect(profile.deviceScaleFactor).toBeGreaterThanOrEqual(2);
    });

    it('should resolve mobile iOS iPhone profile', () => {
        const profile = resolveDeviceProfile('mobile-ios');
        expect(profile.type).toBe('mobile');
        expect(profile.os).toBe('ios');
        expect(profile.isMobile).toBe(true);
        expect(profile.hasTouch).toBe(true);
        expect(profile.userAgent).toContain('iPhone');
    });

    it('should support custom user agent override', () => {
        const customUa = 'CustomBotAgent/2.0 (Testing)';
        const profile = resolveDeviceProfile('desktop-chrome', customUa);
        expect(profile.userAgent).toBe(customUa);
    });

    it('should build context options matching profile', () => {
        const profile = resolveDeviceProfile('mobile-android');
        const opts = buildContextOptions(profile);
        expect(opts.userAgent).toBe(profile.userAgent);
        expect(opts.isMobile).toBe(true);
        expect(opts.hasTouch).toBe(true);
        expect(opts.extraHTTPHeaders['sec-ch-ua-platform']).toBe('"Android"');
    });
});

describe('Referrers Manager', () => {
    it('should pick from social presets', () => {
        const ref = resolveReferrer('preset_social');
        expect(PRESET_REFERRERS.social).toContain(ref);
    });

    it('should pick from search presets', () => {
        const ref = resolveReferrer('preset_search');
        expect(PRESET_REFERRERS.search).toContain(ref);
    });

    it('should pick from blogs presets', () => {
        const ref = resolveReferrer('preset_blogs');
        expect(PRESET_REFERRERS.blogs).toContain(ref);
    });

    it('should support custom referrers array or string', () => {
        const custom = 'https://medium.com/@myuser/post-1, https://myforum.net/topic/42';
        const ref = resolveReferrer('custom', custom);
        expect(['https://medium.com/@myuser/post-1', 'https://myforum.net/topic/42']).toContain(ref);
    });

    it('should fallback to backlinkUrl when custom is empty', () => {
        const ref = resolveReferrer('custom', '', 'https://medium.com/@author/test-post');
        expect(ref).toBe('https://medium.com/@author/test-post');
    });
});

describe('Humanizer helpers', () => {
    it('should generate numbers within the requested range', () => {
        for (let i = 0; i < 50; i++) {
            const val = randomBetween(10, 25);
            expect(val).toBeGreaterThanOrEqual(10);
            expect(val).toBeLessThanOrEqual(25);
        }
    });

    it('should sleep asynchronously', async () => {
        const start = Date.now();
        await sleep(50);
        expect(Date.now() - start).toBeGreaterThanOrEqual(40);
    });
});

describe('SERP Flow Diagnostics & Fallback', () => {
    it('should capture diagnostic screenshots on failure and return structured error', async () => {
        const captured = [];
        const mockScreenshot = async (page, label) => {
            captured.push(label);
            return `key_${label}`;
        };

        const mockPage = {
            url: () => 'about:blank',
            title: async () => '',
            goto: async () => {
                throw new Error('Timeout 20000ms exceeded');
            },
            locator: () => ({
                first: () => ({
                    isVisible: async () => false,
                }),
            }),
            waitForNavigation: async () => {},
        };

        const result = await executeGoogleSerpSearch(
            mockPage,
            'https://dailydogguide.com/puppy-training-schedule',
            '',
            1000,
            mockScreenshot,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('google_serp_timeout_or_blocked');
        expect(result.screenshots.length).toBeGreaterThan(0);
        expect(captured).toContain('serp_step1_timeout_a1');
        expect(captured).toContain('serp_failed_fast');
    }, 15000);
});

describe('URL Sanitizer and Deduplication', () => {
    it('should cleanly extract standard valid URLs from strings and requestList objects', () => {
        const input = ['https://example.com/one', { url: 'https://example.com/two' }];
        const result = extractAndSanitizeUrls(input);
        expect(result).toEqual(['https://example.com/one', 'https://example.com/two']);
    });

    it('should fix accidentally duplicated/concatenated URLs', () => {
        const input = ['https://dailydogguide.com/dog-breeds-chart/https://dailydogguide.com/dog-breeds-chart/'];
        const result = extractAndSanitizeUrls(input);
        expect(result).toEqual(['https://dailydogguide.com/dog-breeds-chart/']);
    });

    it('should split two different concatenated URLs into separate items', () => {
        const input = ['https://site1.com/pagehttps://site2.com/other'];
        const result = extractAndSanitizeUrls(input);
        expect(result).toEqual(['https://site1.com/page', 'https://site2.com/other']);
    });

    it('should ignore non-http protocols and malformed strings', () => {
        const input = ['ftp://example.com', 'tel:+1234567890', 'not-a-url', '   '];
        const result = extractAndSanitizeUrls(input);
        expect(result).toEqual([]);
    });

    it('should deduplicate repeated identical URLs', () => {
        const input = ['https://example.com/page', 'https://example.com/page'];
        const result = extractAndSanitizeUrls(input);
        expect(result).toEqual(['https://example.com/page']);
    });
});
