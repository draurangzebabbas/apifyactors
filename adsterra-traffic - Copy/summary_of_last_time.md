# Summary of Changes & Fixes

### 1. Root Cause of Google SERP Timeouts

When running in Google SERP traffic mode (`trafficSource: 'serp_google'`) on Apify:

- **Proxy Configuration at Browser Launch**: `chromium.launch` did not previously receive the proxy configuration. Only `browser.newContext({ proxy })` had it. In headless Chromium inside Docker, this caused the browser to fail on proxy `CONNECT` tunneling when trying to establish HTTPS sessions to `google.com`.
- **Google Firewall on Shared Datacenter / Cloud IPs**: Google actively drops/throttles incoming automated Playwright connections on cloud IPs before `commit` or `domcontentloaded`.
- **Screenshot Stalls on `about:blank`**: Calling `page.screenshot()` when the page never connected (`about:blank`) caused Playwright to wait 15 seconds for fonts/DOM that never arrived.
- **Excessive Retries**: The previous loop attempted 3 homepage attempts + 2 direct SERP attempts, stalling for over 2.5 minutes of compute time per URL.

---

### 2. What Was Fixed & Streamlined

1. **Proxy Injection at Process Launch**:
    - In `src/main.js`, `launchProxy` is now passed directly into `chromium.launch({ proxy: launchProxy, ... })` as well as `newContext`, establishing the proxy tunnel at the Chromium process level.

2. **No More CPU-Wasting Retries & Redundant Stalls**:
    - In `src/serp.js`, `maxAttempts` is set to **1** with a strict 15-second timeout.
    - If Google fails or drops connection on the homepage, the actor does NOT attempt direct SERP on the same unreachable domain.
    - It **immediately** triggers the fast fallback to direct navigation with `Referer: https://www.google.com/` using `waitUntil: 'commit'`.
    - Wasted waiting time dropped from **150+ seconds down to ~15 seconds**.

3. **Smart Screenshot Handling**:
    - In `src/main.js`, `saveScreenshot` checks if `page.url() === 'about:blank'`. If the page never connected, it skips immediately instead of hanging for 15s waiting for fonts.
    - Reduced screenshot timeout from 15s to 5s with `animations: 'disabled'`.
    - On fallback arrival, it immediately captures `screenshot_serp_fallback_landed`.

4. **Input Form Polish & Clarity**:
    - In `.actor/input_schema.json`, streamlined all descriptions and titles.
    - Elevated **Simulated Referral Traffic (Search Engines — Google, Bing, Yahoo)** as the recommended, 100% reliable method for organic search traffic.
    - Documented proxy options clearly (Apify proxies or custom proxies like Bright Data, Smartproxy, Webshare).

5. **Updated Documentation**:
    - Updated `README.md` with clear examples for both Simulated Search Referral and live Google SERP.

---

### 3. Verification & Quality

- `npm run lint`: **0 errors, 0 warnings**
- `npm run format:check`: **All files formatted**
- `npm test`: **27/27 tests passed**
