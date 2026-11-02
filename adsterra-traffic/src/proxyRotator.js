/**
 * Utilities for auto-rotating session-based residential proxies
 * (Oxylabs, Smartproxy, BrightData, etc.) so each browser session
 * gets a fresh, unique residential exit IP.
 */

/**
 * Generates a unique session string for sticky residential proxies.
 * @param {number} sessionNumber
 * @param {number} attempt
 * @returns {string}
 */
export function generateSessionId(sessionNumber = 1, attempt = 1) {
    const randomHex = Math.random().toString(36).substring(2, 8);
    return `s${sessionNumber}a${attempt}${randomHex}`;
}

/**
 * Inspects a proxy URL. If it contains session tokens commonly used by
 * residential proxy providers (such as Oxylabs `sessid-XXXX` or Smartproxy/BrightData `session-XXXX`),
 * this function rotates the session token so a fresh residential IP is allocated.
 *
 * @param {string} proxyUrl - Raw proxy URL string (e.g. http://user:pass@host:port)
 * @param {number} sessionNumber - Current session number
 * @param {number} attempt - Current retry attempt
 * @returns {string} Proxy URL with rotated session identifier
 */
export function rotateResidentialProxyUrl(proxyUrl, sessionNumber = 1, attempt = 1) {
    if (!proxyUrl || typeof proxyUrl !== 'string') return proxyUrl;

    try {
        const u = new URL(proxyUrl);
        if (!u.username) return proxyUrl;

        let user = decodeURIComponent(u.username);
        const newSessionId = generateSessionId(sessionNumber, attempt);
        let modified = false;

        // Case 1: Oxylabs format (-sessid-XXXX or sessid-XXXX)
        if (/sessid-[a-zA-Z0-9]+/i.test(user)) {
            user = user.replace(/sessid-[a-zA-Z0-9]+/gi, `sessid-${newSessionId}`);
            modified = true;
        } else if (
            user.includes('customer-resi') ||
            (u.hostname === 'pr.oxylabs.io' && !user.startsWith('isp_') && !u.hostname.includes('isp.') && !u.hostname.includes('dc.'))
        ) {
            // Oxylabs residential without explicit sessid - inject sessid
            user = `${user}-sessid-${newSessionId}`;
            modified = true;
        }

        // Case 2: BrightData / Smartproxy / Rayobyte / Generic session tokens (-session-XXXX)
        if (!modified && /session-[a-zA-Z0-9]+/i.test(user)) {
            user = user.replace(/session-[a-zA-Z0-9]+/gi, `session-${newSessionId}`);
            modified = true;
        }

        if (modified) {
            u.username = encodeURIComponent(user);
            return u.toString();
        }

        return proxyUrl;
    } catch {
        return proxyUrl;
    }
}
