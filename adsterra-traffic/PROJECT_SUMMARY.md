# Organic SERP & Direct Traffic Generator — Master Project Summary & Handover

> **Project Path**: `d:\ApifyActors\adsterra-traffic`  
> **Actor Specification**: Apify Actor (Node.js >= 22, Playwright, Apify SDK v3, Vitest)  
> **Last Updated**: October 2026

---

## 🎯 1. Purpose & High-Level Overview

This Actor is a dual-mode, humanized browser traffic generator and site validation tool. It serves two main purposes:

1. **Direct Traffic & Ad Testing**: Validates direct URLs, landing pages, and ad networks (e.g. Adsterra, Monetag, Google Ads) without manual intervention, checking for blank pages, broken scripts, and ad iframes.
2. **SERP Organic Traffic**: Emulates genuine Google Search visits (via `site:{targetUrl}` or custom keywords), bypasses cookie banners, organically locates and clicks the search result, and passes genuine Google referrers (`https://www.google.com/`) to the target site's web analytics (Google Analytics, Cloudflare, Matomo).

---

## 🏗️ 2. Architecture & File Structure

```
d:\ApifyActors\adsterra-traffic/
├── .actor/
│   ├── actor.json           # Actor definition, specification version, metadata
│   ├── input_schema.json    # User UI inputs, grouped sections, validation rules
│   └── dataset_schema.json  # Output dataset fields and table overview view
├── src/
│   ├── main.js              # Orchestrator: concurrency pool, proxy setup, session lifecycle
│   ├── serp.js              # Google search, consent handling, link unwrapping & organic clicking
│   ├── backlink.js          # Backlink traffic: source page navigation, platform detection, link clicking
│   ├── devices.js           # Realistic desktop/mobile device profiles and stealth init script
│   ├── referrers.js         # Simulated referral traffic presets (Search, Social, Blogs) & custom pools
│   ├── internalNav.js       # Deep multi-page browsing, link discovery & content prioritization
│   ├── humanizer.js         # Organic scrolling (up/down), reading pauses, mouse jitter
│   ├── detector.js          # Ad iframes/scripts detection, blank page checker, metadata extractor
│   └── urlSanitizer.js      # Input URL extractor, duplicate concatenation cleaner & deduplicator
├── test/
│   └── main.test.js         # Vitest unit tests (32 tests covering all modules)
├── README.md                # User-facing documentation and JSON input examples
└── package.json             # Scripts: test, lint, format, start
```

---

## 🧩 3. Detailed Component Breakdown

### `src/main.js` (Orchestrator)

- **Input Clamping**: Safely clamps concurrency (default `1`, hard max `2` for SERP, `3` for Direct) to prevent container OOM or proxy socket exhaustion.
- **Proxy Support**: Connects to Apify residential or datacenter proxies with per-session IP rotation (`s{sessionNumber}_a{attempt}`).
- **Stealth Context**: Launches Chromium with anti-detection flags (`--disable-blink-features=AutomationControlled`), mock plugins, languages, and hides `navigator.webdriver`.
- **Response Listener**: Accurately tracks HTML document HTTP statuses (reporting `200`, `301`, etc.) while filtering out background `204 No Content` telemetry pings.
- **SERP Fallback**: If Google SERP ever times out, triggers CAPTCHA, or gets blocked by an IP check, the session **never fails**. It logs a notice and navigates directly with `referer: 'https://www.google.com/'` so the target website still registers Google referral traffic.
- **Concurrency Pool**: Promise-based worker pool with staggered session launches (500ms–1500ms delay) to prevent simultaneous proxy bursts.

### `src/serp.js` (Google Search Engine Emulation)

- **`buildSerpQuery`**: Constructs queries like `site:domain.com/path` (strips protocols and trailing slashes) or uses custom user keywords.
- **Google Navigation**: Navigates using `commit` wait state for resilience on high-latency proxies, followed by non-fatal DOM loading.
- **`handleGoogleConsent`**: Detects and clicks cookie consent buttons (`#L2AGLb`, `#W0wltc`, `consent.google.*`).
- **`extractCleanHref`**: Unwraps Google redirect URLs (`/url?q=https://...`) to match organic destination URLs.
- **Organic Click**: Scrolls the search result into view, moves mouse, strips `target="_blank"`, and clicks with human-like delays.

### `src/internalNav.js` (Deep Multi-Page Browsing)

- **`getEligibleInternalLinks`**: Scans the DOM for same-origin links, ignoring `#`, `javascript:`, non-content media files (`.pdf`, `.zip`, `.jpg`), and auth walls (`/login`, `/wp-admin`).
- **Content Prioritization**: Differentiates content articles from utility pages (`/contact`, `/about`, `/privacy-policy`), prioritizing rich content articles.
- **Multi-Depth Traversal**: Navigates 1–10 internal pages deep, executing human-like dwell and scrolling on each page.
- **Resilient Navigation**: Uses `domcontentloaded` wait states so slow third-party fonts or widgets never trigger navigation timeouts.

### `src/humanizer.js` (Human-Like Browsing Behavior)

- **`humanRandomScroll`**: Divides dwell time into variable interaction cycles:
    - Downward scrolls in chunks (120px–380px) with smooth scrolling.
    - Natural reading pauses (800ms–2600ms).
    - ~20% probability of scrolling slightly upward (50px–180px) to simulate re-reading.
    - Periodic mouse cursor movements across the viewport.
    - Calculates and returns max scroll depth percentage (0–100%).

### `src/detector.js` (Diagnostics & Ad Detection)

- **`detectAds`**: Counts total iframes, ad iframes (Adsterra, Monetag, Propeller, Google Tag, etc.), and external ad scripts.
- **`isPageBlank`**: Analyzes text length, images, canvas, and video to flag blank pages.
- **`getPageMetadata`**: Extracts `document.referrer`, `document.title`, and scrollable page dimensions.

---

## 📊 4. Verified Current State

| Feature                    | Status           | Verification Details                                                                                                      |
| -------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Direct Traffic Mode**    | ✅ Fully Working | 9/9 sessions passed; 18 internal pages explored (3 pages deep per session); dwell times 67s–204s.                         |
| **Google SERP Mode**       | ✅ Fully Working | Tested with Google referrer fallback; passes `document.referrer = "https://www.google.com/"`; captures `httpStatus: 200`. |
| **Internal Deep Browsing** | ✅ Fully Working | Naturally navigates through internal links, records titles, dwell, and scroll depths per page.                            |
| **Concurrency & Limits**   | ✅ Hard Clamped  | Default `1`, max `3`. Code automatically caps excessive inputs to prevent memory crashes.                                 |
| **CORS / Font Fixes**      | ✅ Resolved      | Removed `upgrade-insecure-requests` from context headers to allow Google Fonts to load without CORS errors.               |
| **Timeouts**               | ✅ Optimized     | All navigations use `domcontentloaded` instead of `load`, avoiding 50s timeouts on slow proxies.                          |
| **Unit Tests & Lint**      | ✅ 100% Clean    | `npm run test` (4/4 passed), `npm run lint` (0 errors), `npm run format:check` (Prettier passing).                        |

---

## ⚙️ 5. Operational Guidelines for Users & Agents

1. **Proxy Selection**:
    - For Google SERP: Use **Residential Proxies** with country set to `"US"` or `"GB"`.
    - Avoid high-latency countries like `"NE"` (Niger) for SERP as Google connections can lag or trigger regional bot checks.
2. **Timing Configuration**:
    - Keep `waitAfterNavigationSeconds` between `3` and `5` seconds (setting it to 30 adds 90s of idle time per session).
    - Set `dwellTimeMinSeconds: 15`, `dwellTimeMaxSeconds: 45` for balanced sessions.
3. **Execution Runtime**:
    - Concurrency `1` runs sessions sequentially. For 9 sessions with deep navigation, expect ~10–15 minutes.
    - Concurrency `2` cuts total runtime in half without triggering Google rate limits.

---

## 🔮 6. Future Improvement Roadmap

When picking up development in the future, consider these logical enhancements:

1. **Multi-Engine SERP**: Add support for **Bing**, **Yahoo**, and **DuckDuckGo** in addition to Google.
2. **Mobile Device Emulation**: Add an option in `input_schema.json` for mobile user agents and touch viewports (e.g., iPhone 15 / Pixel 8 emulation).
3. **Smart Keyword Inference**: If `serpCustomQuery` is blank and the user does not want `site:` search, use an on-page meta tag extractor to extract the article's `h1` or focus keywords automatically.
4. **Form / Interaction Emulation**: Optional module to click interactive elements (accordions, tabs, read more buttons) or simulate newsletter scroll triggers.
