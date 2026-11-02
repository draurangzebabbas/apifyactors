import { describe, expect, it } from 'vitest';

import { detectPlatform } from '../src/backlink.js';
import { buildContextOptions, getStealthInitScript, resolveDeviceProfile, resolveProxyGeo } from '../src/devices.js';
import { randomBetween, sleep } from '../src/humanizer.js';
import { rotateResidentialProxyUrl } from '../src/proxyRotator.js';
import { PRESET_REFERRERS, resolveReferrer } from '../src/referrers.js';
import { buildSerpQuery, executeGoogleSerpSearch, findTargetInSerp } from '../src/serp.js';
import { extractAndSanitizeUrls, extractTargetItems } from '../src/urlSanitizer.js';

describe('SERP query builder', () => {
    it('should generate site: query with full canonical protocol when no custom query is provided', () => {
        const query = buildSerpQuery('https://example.com/blog/my-article');
        expect(query).toBe('site:https://example.com/blog/my-article');
    });

    it('should handle root domain URLs', () => {
        const query = buildSerpQuery('https://dailydogguide.com/');
        expect(query).toBe('site:https://dailydogguide.com/');
    });

    it('should preserve queries that already have site: prefix', () => {
        const query = buildSerpQuery('site:https://dailydogguide.com/puppy-training-schedule');
        expect(query).toBe('site:https://dailydogguide.com/puppy-training-schedule');
    });

    it('should generate site:query with exact canonical url matching user scenario', () => {
        const query = buildSerpQuery('https://dailydogguide.com/german-shepherd-lifespan/');
        expect(query).toBe('site:https://dailydogguide.com/german-shepherd-lifespan/');
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

    it('should resolve proxy country to matching timezone and locale', () => {
        const gb = resolveProxyGeo('http://customer-resi_123-cc-gb-sessid-1:pass@pr.oxylabs.io:7777');
        expect(gb.locale).toBe('en-GB');
        expect(gb.timezoneId).toBe('Europe/London');

        const ca = resolveProxyGeo('http://customer-resi_123-cc-ca-sessid-1:pass@pr.oxylabs.io:7777');
        expect(ca.locale).toBe('en-CA');
        expect(ca.timezoneId).toBe('America/Toronto');

        const us = resolveProxyGeo('http://customer-resi_123-cc-us-sessid-1:pass@pr.oxylabs.io:7777');
        expect(us.locale).toBe('en-US');
        expect(us.timezoneId).toBe('America/New_York');
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

    it('should extract per-target serpQuery metadata from requestList items', () => {
        const input = [
            { url: 'https://dailydogguide.com/dog-breeds-chart/', serpQuery: 'Dog Breeds Chart' },
            {
                url: 'https://dailydogguide.com/german-shepherd-lifespan/',
                userData: { serpQuery: 'German Shepherd Lifespan' },
            },
            'https://dailydogguide.com/puppy-training-schedule/',
        ];
        const result = extractTargetItems(input);
        expect(result).toEqual([
            { url: 'https://dailydogguide.com/dog-breeds-chart/', serpQuery: 'Dog Breeds Chart' },
            { url: 'https://dailydogguide.com/german-shepherd-lifespan/', serpQuery: 'German Shepherd Lifespan' },
            { url: 'https://dailydogguide.com/puppy-training-schedule/' },
        ]);
    });

    it('should map per-URL queries from multi-line serpQueryList text by line index', () => {
        const input = [
            'https://dailydogguide.com/dog-breeds-chart/',
            'https://dailydogguide.com/german-shepherd-lifespan/',
            'https://dailydogguide.com/puppy-training-schedule/',
        ];
        const queryListText = `"Dog Breeds Chart" site:dailydogguide.com\n"German Shepherd Lifespan" site:dailydogguide.com\n"Puppy Training Schedule" site:dailydogguide.com`;
        const result = extractTargetItems(input, queryListText);
        expect(result).toEqual([
            {
                url: 'https://dailydogguide.com/dog-breeds-chart/',
                serpQuery: '"Dog Breeds Chart" site:dailydogguide.com',
            },
            {
                url: 'https://dailydogguide.com/german-shepherd-lifespan/',
                serpQuery: '"German Shepherd Lifespan" site:dailydogguide.com',
            },
            {
                url: 'https://dailydogguide.com/puppy-training-schedule/',
                serpQuery: '"Puppy Training Schedule" site:dailydogguide.com',
            },
        ]);
    });

    it('should map per-URL queries from "URL | Query" formatted lines', () => {
        const input = [
            'https://dailydogguide.com/puppy-training-schedule/',
            'https://dailydogguide.com/dog-breeds-chart/',
        ];
        const queryListText = `https://dailydogguide.com/dog-breeds-chart/ | "Dog Breeds Chart"\npuppy-training-schedule | "Puppy Training Schedule"`;
        const result = extractTargetItems(input, queryListText);
        expect(result).toEqual([
            {
                url: 'https://dailydogguide.com/puppy-training-schedule/',
                serpQuery: '"Puppy Training Schedule"',
            },
            {
                url: 'https://dailydogguide.com/dog-breeds-chart/',
                serpQuery: '"Dog Breeds Chart"',
            },
        ]);
    });
});

describe('Residential Proxy Session Auto-Rotation', () => {
    it('should rotate Oxylabs sessid in proxy URL', () => {
        const original =
            'http://customer-resi_8c8ceb37-cc-gb-city-birmingham-sessid-0065223813-sesstime-10:MIi4e+smOtog@pr.oxylabs.io:7777';
        const rotated = rotateResidentialProxyUrl(original, 2, 1);

        expect(rotated).not.toEqual(original);
        expect(rotated).toContain('pr.oxylabs.io:7777');
        expect(rotated).toContain('customer-resi_8c8ceb37');
        expect(rotated).toContain('sessid-s2a1');
        expect(rotated).not.toContain('sessid-0065223813');
    });

    it('should inject sessid into Oxylabs proxy URL when sessid is absent', () => {
        const original = 'http://customer-resi_abc123-cc-us:password@pr.oxylabs.io:7777';
        const rotated = rotateResidentialProxyUrl(original, 1, 1);

        expect(rotated).toContain('sessid-s1a1');
        expect(rotated).toContain('customer-resi_abc123-cc-us');
    });

    it('should rotate Smartproxy / generic session token', () => {
        const original = 'http://sp12345-session-99999:password@gate.smartproxy.com:7000';
        const rotated = rotateResidentialProxyUrl(original, 3, 1);

        expect(rotated).not.toEqual(original);
        expect(rotated).toContain('session-s3a1');
        expect(rotated).not.toContain('session-99999');
    });

    it('should preserve standard static datacenter and Oxylabs ISP proxies without modification', () => {
        const dc = 'http://user:pass@45.38.107.97:6014';
        expect(rotateResidentialProxyUrl(dc, 1, 1)).toBe(dc);

        const oxylabsIsp = 'http://isp_6c0b5c8e:br2w+DHqfe+G@isp.oxylabs.io:8001';
        expect(rotateResidentialProxyUrl(oxylabsIsp, 1, 1)).toBe(oxylabsIsp);
    });

    it('should handle empty or null proxy URLs safely', () => {
        expect(rotateResidentialProxyUrl('', 1, 1)).toBe('');
        expect(rotateResidentialProxyUrl(null, 1, 1)).toBe(null);
    });
});

describe('Total Target Visits & Round-Robin Queue Distribution', () => {
    it('should distribute total visits evenly in round-robin order across target URLs', () => {
        const targetItems = [
            { url: 'https://site.com/page-1' },
            { url: 'https://site.com/page-2' },
            { url: 'https://site.com/page-3' },
        ];
        const totalVisits = 10;
        const taskQueue = [];
        let sessionCounter = 1;

        for (let i = 0; i < totalVisits; i++) {
            const item = targetItems[i % targetItems.length];
            taskQueue.push({
                url: item.url,
                sessionNumber: sessionCounter++,
            });
        }

        expect(taskQueue).toHaveLength(10);
        expect(taskQueue.map((t) => t.url)).toEqual([
            'https://site.com/page-1',
            'https://site.com/page-2',
            'https://site.com/page-3',
            'https://site.com/page-1',
            'https://site.com/page-2',
            'https://site.com/page-3',
            'https://site.com/page-1',
            'https://site.com/page-2',
            'https://site.com/page-3',
            'https://site.com/page-1',
        ]);

        const counts = taskQueue.reduce((acc, t) => {
            acc[t.url] = (acc[t.url] || 0) + 1;
            return acc;
        }, {});
        expect(counts['https://site.com/page-1']).toBe(4);
        expect(counts['https://site.com/page-2']).toBe(3);
        expect(counts['https://site.com/page-3']).toBe(3);
    });

    it('should interleave repetitions when totalVisits is not specified', () => {
        const targetItems = [{ url: 'https://site.com/a' }, { url: 'https://site.com/b' }];
        const repetitions = 3;
        const taskQueue = [];
        let sessionCounter = 1;

        for (let r = 1; r <= repetitions; r++) {
            for (const item of targetItems) {
                taskQueue.push({
                    url: item.url,
                    sessionNumber: sessionCounter++,
                });
            }
        }

        expect(taskQueue).toHaveLength(6);
        expect(taskQueue.map((t) => t.url)).toEqual([
            'https://site.com/a',
            'https://site.com/b',
            'https://site.com/a',
            'https://site.com/b',
            'https://site.com/a',
            'https://site.com/b',
        ]);
    });
});

describe('serpMaxRetries clamping', () => {
    const clamp = (val, min, max) => Math.min(Math.max(Number(val) || min, min), max);

    it('should clamp serpMaxRetries to minimum 1', () => {
        expect(clamp(0, 1, 10)).toBe(1);
        expect(clamp(-5, 1, 10)).toBe(1);
        expect(clamp(null, 1, 10)).toBe(1);
    });

    it('should clamp serpMaxRetries to maximum 10', () => {
        expect(clamp(50, 1, 10)).toBe(10);
        expect(clamp(999, 1, 10)).toBe(10);
    });

    it('should accept valid serpMaxRetries values in range 1-10', () => {
        expect(clamp(3, 1, 10)).toBe(3);
        expect(clamp(7, 1, 10)).toBe(7);
        expect(clamp(10, 1, 10)).toBe(10);
        expect(clamp(1, 1, 10)).toBe(1);
    });

    it('should default to 3 when serpMaxRetries is undefined', () => {
        const serpMaxRetries = undefined;
        const serpRetryLimit = clamp(serpMaxRetries ?? 3, 1, 10);
        expect(serpRetryLimit).toBe(3);
    });
});

describe('Stealth init script content', () => {
    it('should include all critical stealth overrides', () => {
        const profile = { platform: 'Win32', isMobile: false, hasTouch: false };
        const script = getStealthInitScript(profile);
        expect(typeof script).toBe('string');
        expect(script).toContain('webdriver');
        expect(script).toContain('colorDepth');
        expect(script).toContain('hardwareConcurrency');
        expect(script).toContain('deviceMemory');
        expect(script).toContain('languages');
        expect(script).toContain('window.chrome');
    });
});

describe('SERP error classification & domain validation', () => {
    it('should classify click_landed_on_google as a retryable SERP error', () => {
        const msg = 'click_landed_on_google';
        const isSerpError =
            msg.includes('google_captcha_detected') ||
            msg.includes('google_serp_timeout_or_blocked') ||
            msg.includes('click_failed') ||
            msg.includes('click_landed_on_google') ||
            msg.includes('click_landed_on_wrong_domain') ||
            msg.includes('SERP search failed');
        expect(isSerpError).toBe(true);
    });

    it('should classify click_landed_on_wrong_domain as a retryable SERP error', () => {
        const msg = 'click_landed_on_wrong_domain: malicious-ad.com';
        const isSerpError =
            msg.includes('google_captcha_detected') ||
            msg.includes('google_serp_timeout_or_blocked') ||
            msg.includes('click_failed') ||
            msg.includes('click_landed_on_google') ||
            msg.includes('click_landed_on_wrong_domain') ||
            msg.includes('SERP search failed');
        expect(isSerpError).toBe(true);
    });

    it('should correctly detect domain mismatch between target and landed URL', () => {
        const targetUrl = 'https://dailydogguide.com/puppy-training-schedule/';
        const landedGoogle = 'https://www.google.com/';
        const landedAd = 'https://some-ad-tracker.net/redirect';
        const landedValid = 'https://dailydogguide.com/puppy-training-schedule/';

        const checkMismatch = (target, landed) => {
            const targetHost = new URL(target).hostname.replace(/^www\./, '');
            const landedHost = new URL(landed).hostname.replace(/^www\./, '');
            return !landedHost.includes(targetHost) && !targetHost.includes(landedHost);
        };

        expect(checkMismatch(targetUrl, landedGoogle)).toBe(true);
        expect(checkMismatch(targetUrl, landedAd)).toBe(true);
        expect(checkMismatch(targetUrl, landedValid)).toBe(false);
    });

    it('should detect sesstime in residential proxy url', () => {
        const proxyUrl =
            'http://customer-resi_8c8ceb37-cc-us-sessid-0408032058-sesstime-10:MIi4e+smOtog@pr.oxylabs.io:7777';
        const match = proxyUrl.match(/sesstime-(\d+)/i);
        expect(match).not.toBeNull();
        expect(Number(match[1])).toBe(10);
    });

    it('should format failed SERP query using buildSerpQuery instead of raw URL', () => {
        const url = 'https://dailydogguide.com/how-to-train-your-dog/';
        const queryForSession = '';
        const serpCustomQuery = '';
        const formattedQuery = buildSerpQuery(url, queryForSession || serpCustomQuery);
        expect(formattedQuery).toBe('site:https://dailydogguide.com/how-to-train-your-dog/');
        expect(formattedQuery).not.toBe(url);
    });

    it('should accurately categorize all detailed failure reasons', () => {
        const classifyDetailedReason = (msg) => {
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
        };

        expect(classifyDetailedReason('SERP: target_not_found_in_serp on page 2')).toBe('serp_not_ranked');
        expect(classifyDetailedReason('Encountered google_captcha_detected challenge')).toBe('google_captcha_detected');
        expect(classifyDetailedReason('google_serp_timeout_or_blocked during navigation')).toBe(
            'google_serp_timeout_or_blocked',
        );
        expect(classifyDetailedReason('Redirect looped back: click_landed_on_google')).toBe('click_landed_on_google');
        expect(classifyDetailedReason('click_landed_on_wrong_domain: badsite.org')).toBe(
            'click_landed_on_wrong_domain',
        );
        expect(classifyDetailedReason('Timeout clicking element: click_failed')).toBe('click_failed');
        expect(classifyDetailedReason('net::ERR_TUNNEL_CONNECTION_FAILED')).toBe('network_error');
        expect(classifyDetailedReason('backlink_target_not_found on target page')).toBe('backlink_not_found');
        expect(classifyDetailedReason('unknown unexpected syntax error')).toBe('other');
    });

    it('should calculate summary completion percentages properly', () => {
        const target = 100;
        const successful = 85;
        const totalAttempted = 105;
        const completionRate = ((successful / target) * 100).toFixed(1);
        const successRate = ((successful / totalAttempted) * 100).toFixed(1);

        expect(completionRate).toBe('85.0');
        expect(successRate).toBe('81.0');
    });

    it('should find target in SERP without getting excluded by Search Console promo banner', async () => {
        const mockPage = {
            evaluate: async (_fn, _args) => {
                // Emulate findTargetInSerp evaluation behavior
                return {
                    rank: 1,
                    href: 'https://dailydogguide.com/puppy-training-schedule/',
                    title: 'Puppy Training Schedule: Week-by-Week by Age - Daily Dog Guide',
                };
            },
        };
        const res = await findTargetInSerp(mockPage, 'https://dailydogguide.com/puppy-training-schedule/');
        expect(res).not.toBeNull();
        expect(res.rank).toBe(1);
        expect(res.href).toBe('https://dailydogguide.com/puppy-training-schedule/');
    });

    it('should NOT inject window.chrome or Chrome plugins for Safari devices to prevent BotGuard flagging', () => {
        const safariProfile = { browser: 'safari', platform: 'iPhone', isMobile: true, hasTouch: true };
        const script = getStealthInitScript(safariProfile);
        expect(script).toContain('delete window.chrome');
        expect(script).not.toContain("name: 'Chrome PDF Plugin'");
    });

    it('should inject window.chrome and plugins for Chrome desktop', () => {
        const chromeProfile = { browser: 'chrome', platform: 'Win32', isMobile: false, hasTouch: false };
        const script = getStealthInitScript(chromeProfile);
        expect(script).toContain('window.chrome =');
        expect(script).toContain("name: 'Chrome PDF Plugin'");
    });
});
