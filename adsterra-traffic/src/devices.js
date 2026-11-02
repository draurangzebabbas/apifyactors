/**
 * Device Profiles & User Agent Management
 *
 * Supports:
 *  - Desktop (Windows Chrome, Mac Chrome, Windows Firefox, Mac Safari, Windows Edge)
 *  - Mobile (Android Chrome on Galaxy/Pixel, iOS Safari on iPhone/iPad)
 *  - Full device emulation: viewport, deviceScaleFactor, isMobile, hasTouch, sec-ch-ua client hints
 */

export const DEVICE_PROFILES = {
    'desktop-chrome-win': {
        name: 'Desktop Chrome (Windows 11)',
        type: 'desktop',
        os: 'windows',
        browser: 'chrome',
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        platform: 'Win32',
        clientHints: {
            'sec-ch-ua': '"Chromium";v="133", "Not_A Brand";v="24", "Google Chrome";v="133"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"15.0.0"',
        },
    },
    'desktop-chrome-mac': {
        name: 'Desktop Chrome (macOS)',
        type: 'desktop',
        os: 'macos',
        browser: 'chrome',
        userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        isMobile: false,
        hasTouch: false,
        platform: 'MacIntel',
        clientHints: {
            'sec-ch-ua': '"Chromium";v="133", "Not_A Brand";v="24", "Google Chrome";v="133"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-ch-ua-platform-version': '"14.7.1"',
        },
    },
    'desktop-firefox-win': {
        name: 'Desktop Firefox (Windows)',
        type: 'desktop',
        os: 'windows',
        browser: 'firefox',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0',
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        platform: 'Win32',
        clientHints: null,
    },
    'desktop-safari-mac': {
        name: 'Desktop Safari (macOS)',
        type: 'desktop',
        os: 'macos',
        browser: 'safari',
        userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
        isMobile: false,
        hasTouch: false,
        platform: 'MacIntel',
        clientHints: null,
    },
    'desktop-edge-win': {
        name: 'Desktop Microsoft Edge (Windows)',
        type: 'desktop',
        os: 'windows',
        browser: 'edge',
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0',
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        platform: 'Win32',
        clientHints: {
            'sec-ch-ua': '"Microsoft Edge";v="133", "Chromium";v="133", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        },
    },
    'mobile-android-galaxy': {
        name: 'Samsung Galaxy S24 Ultra (Android / Chrome)',
        type: 'mobile',
        os: 'android',
        browser: 'chrome',
        userAgent:
            'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.6943.122 Mobile Safari/537.36',
        viewport: { width: 384, height: 824 },
        deviceScaleFactor: 2.8,
        isMobile: true,
        hasTouch: true,
        platform: 'Linux armv8l',
        clientHints: {
            'sec-ch-ua': '"Chromium";v="133", "Not_A Brand";v="24", "Google Chrome";v="133"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'sec-ch-ua-model': '"SM-S928B"',
        },
    },
    'mobile-android-pixel': {
        name: 'Google Pixel 8 Pro (Android / Chrome)',
        type: 'mobile',
        os: 'android',
        browser: 'chrome',
        userAgent:
            'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.6943.122 Mobile Safari/537.36',
        viewport: { width: 412, height: 892 },
        deviceScaleFactor: 2.6,
        isMobile: true,
        hasTouch: true,
        platform: 'Linux aarch64',
        clientHints: {
            'sec-ch-ua': '"Chromium";v="133", "Not_A Brand";v="24", "Google Chrome";v="133"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'sec-ch-ua-model': '"Pixel 8 Pro"',
        },
    },
    'mobile-ios-iphone': {
        name: 'Apple iPhone 16 Pro (iOS / Safari)',
        type: 'mobile',
        os: 'ios',
        browser: 'safari',
        userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1',
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        platform: 'iPhone',
        clientHints: null,
    },
    'mobile-ios-ipad': {
        name: 'Apple iPad Air (iPadOS / Safari)',
        type: 'tablet',
        os: 'ios',
        browser: 'safari',
        userAgent:
            'Mozilla/5.0 (iPad; CPU OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1',
        viewport: { width: 820, height: 1180 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        platform: 'iPad',
        clientHints: null,
    },
};

const DESKTOP_KEYS = [
    'desktop-chrome-win',
    'desktop-chrome-mac',
    'desktop-firefox-win',
    'desktop-safari-mac',
    'desktop-edge-win',
];

const MOBILE_KEYS = ['mobile-android-galaxy', 'mobile-android-pixel', 'mobile-ios-iphone', 'mobile-ios-ipad'];

/**
 * Resolves a device profile based on user configuration.
 *
 * @param {string} deviceSelection - 'random' | 'desktop-random' | 'mobile-random' | 'desktop-chrome' | 'desktop-firefox' | 'desktop-safari' | 'mobile-android' | 'mobile-ios'
 * @param {string} [customUserAgent] - Optional custom User-Agent override
 * @returns {object} Full device profile with Playwright context options
 */
export function resolveDeviceProfile(deviceSelection = 'random', customUserAgent = '') {
    const sel = (deviceSelection || 'random').toLowerCase().trim();

    let chosenKey;

    switch (sel) {
        case 'desktop-chrome':
            chosenKey = Math.random() < 0.6 ? 'desktop-chrome-win' : 'desktop-chrome-mac';
            break;
        case 'desktop-firefox':
            chosenKey = 'desktop-firefox-win';
            break;
        case 'desktop-safari':
            chosenKey = 'desktop-safari-mac';
            break;
        case 'desktop-edge':
            chosenKey = 'desktop-edge-win';
            break;
        case 'desktop-random':
            chosenKey = DESKTOP_KEYS[Math.floor(Math.random() * DESKTOP_KEYS.length)];
            break;
        case 'mobile-android':
            chosenKey = Math.random() < 0.5 ? 'mobile-android-galaxy' : 'mobile-android-pixel';
            break;
        case 'mobile-ios':
            chosenKey = 'mobile-ios-iphone';
            break;
        case 'mobile-random':
            chosenKey = MOBILE_KEYS[Math.floor(Math.random() * MOBILE_KEYS.length)];
            break;
        case 'random':
        default:
            // 65% desktop, 35% mobile for organic blend
            if (Math.random() < 0.65) {
                chosenKey = DESKTOP_KEYS[Math.floor(Math.random() * DESKTOP_KEYS.length)];
            } else {
                chosenKey = MOBILE_KEYS[Math.floor(Math.random() * MOBILE_KEYS.length)];
            }
            break;
    }

    const base = DEVICE_PROFILES[chosenKey] || DEVICE_PROFILES['desktop-chrome-win'];

    // Clone to prevent mutating constants
    const profile = JSON.parse(JSON.stringify(base));
    profile.key = chosenKey;

    // Apply custom User-Agent override if provided
    if (customUserAgent && customUserAgent.trim()) {
        profile.userAgent = customUserAgent.trim();
        profile.name += ` (Custom UA)`;
    }

    // Natural viewport variation for desktop (+/- 20px) to prevent identical fingerprints
    if (!profile.isMobile) {
        const heightJitter = Math.floor(Math.random() * 40) - 20;
        profile.viewport.height = Math.max(700, profile.viewport.height + heightJitter);
    }

    return profile;
}

/**
 * Infers matching browser locale and timezone from proxy country tags (e.g. -cc-gb, -cc-us, -cc-ca).
 * Prevents Google BotGuard from detecting IP vs. browser timezone mismatches.
 *
 * @param {string} proxyUrl
 * @returns {{ locale: string, timezoneId: string }}
 */
export function resolveProxyGeo(proxyUrl = '') {
    const raw = String(proxyUrl || '').toLowerCase();

    if (raw.includes('-cc-gb') || raw.includes('-country-gb') || raw.includes('country=gb')) {
        return { locale: 'en-GB', timezoneId: 'Europe/London' };
    }
    if (raw.includes('-cc-ca') || raw.includes('-country-ca') || raw.includes('country=ca')) {
        return { locale: 'en-CA', timezoneId: 'America/Toronto' };
    }
    if (raw.includes('-cc-au') || raw.includes('-country-au') || raw.includes('country=au')) {
        return { locale: 'en-AU', timezoneId: 'Australia/Sydney' };
    }
    if (raw.includes('-cc-de') || raw.includes('-country-de') || raw.includes('country=de')) {
        return { locale: 'de-DE', timezoneId: 'Europe/Berlin' };
    }
    if (raw.includes('-cc-fr') || raw.includes('-country-fr') || raw.includes('country=fr')) {
        return { locale: 'fr-FR', timezoneId: 'Europe/Paris' };
    }
    return { locale: 'en-US', timezoneId: 'America/New_York' };
}

/**
 * Builds Playwright browser context options matching the chosen device profile.
 *
 * @param {object} profile - Device profile from resolveDeviceProfile()
 * @param {string} [locale='en-US']
 * @param {string} [timezoneId='America/New_York']
 * @returns {object} Playwright context options
 */
export function buildContextOptions(profile, locale = 'en-US', timezoneId = 'America/New_York') {
    const extraHTTPHeaders = {
        'accept-language': `${locale},en;q=0.9`,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    };

    if (profile.clientHints) {
        Object.assign(extraHTTPHeaders, profile.clientHints);
    }

    return {
        userAgent: profile.userAgent,
        viewport: profile.viewport,
        deviceScaleFactor: profile.deviceScaleFactor,
        isMobile: profile.isMobile,
        hasTouch: profile.hasTouch,
        locale,
        timezoneId,
        extraHTTPHeaders,
    };
}

/**
 * Returns an injection function for context.addInitScript to patch automation markers.
 *
 * @param {object} profile - Device profile
 * @returns {Function}
 */
export function getStealthInitScript(profile) {
    const { platform, isMobile, hasTouch } = profile;
    let touchPoints = 0;
    if (hasTouch) {
        touchPoints = isMobile ? 5 : 1;
    }

    return `(() => {
        // 1. Hide webdriver flag
        try {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            delete navigator.__proto__.webdriver;
        } catch {}

        // 2. Platform override
        try {
            Object.defineProperty(navigator, 'platform', { get: () => '${platform || 'Win32'}' });
        } catch {}

        // 3. Touch points
        try {
            Object.defineProperty(navigator, 'maxTouchPoints', { get: () => ${touchPoints} });
        } catch {}

        // 4. Screen color depth (real Chrome always reports 24)
        try {
            Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
            Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });
        } catch {}

        // 5. Languages — match accept-language header sent in context
        try {
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        } catch {}

        // 6. Hardware concurrency — realistic CPU core count
        try {
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        } catch {}

        // 7. Device memory — realistic value (GB)
        try {
            Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        } catch {}

        // 8. Notification permission — return 'default' instead of throwing
        try {
            const origQuery = window.Notification
                ? window.Notification.requestPermission
                : undefined;
            if (!window.Notification) {
                window.Notification = { permission: 'default', requestPermission: () => Promise.resolve('default') };
            }
            const origPermsQuery = navigator.permissions && navigator.permissions.query;
            if (origPermsQuery) {
                navigator.permissions.query = (params) => {
                    if (params && params.name === 'notifications') {
                        return Promise.resolve({ state: 'prompt', onchange: null });
                    }
                    return origPermsQuery.call(navigator.permissions, params);
                };
            }
        } catch {}

        // 9. Chrome runtime (only for Chromium/Edge browsers; never for Safari or Firefox)
        ${profile.browser === 'chrome' || profile.browser === 'edge' ? `
        window.chrome = {
            app: { isInstalled: false },
            runtime: {
                PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
                OnInstalledReason: { INSTALL: 'install', UPDATE: 'update', CHROME_UPDATE: 'chrome_update', SHARED_MODULE_UPDATE: 'shared_module_update' },
                OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' }
            }
        };` : `
        try {
            delete window.chrome;
        } catch {}`}

        // 10. Plugins — mimic real installed plugins per browser
        try {
            ${profile.browser === 'chrome' || profile.browser === 'edge' ? `
            Object.defineProperty(navigator, 'plugins', {
                get: () => [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin' }
                ]
            });` : `
            Object.defineProperty(navigator, 'plugins', {
                get: () => []
            });`}
        } catch {}

        // 11. Hide automation-related properties in window object
        try {
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
        } catch {}
    })();`;
}
