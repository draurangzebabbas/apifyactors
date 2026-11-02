# Organic SERP, Backlink & Direct Traffic Generator — Apify Actor

A flexible, high-fidelity browser traffic generator and testing tool built with Playwright and Apify. Simulates realistic organic search visits (Google SERP), backlink referral visits (LinkedIn, Reddit, Medium, Facebook, etc.), or direct navigation, authentic human reading and scrolling behavior, and multi-page deep internal site browsing.

---

## 🌟 Key Features

### 1. 🚦 Four Powerful Traffic Modes

- **Simulated Referral Traffic (Recommended)**:
    - Navigates directly to your target URLs with authentic HTTP `Referer` headers.
    - Choose presets: **Search Engines** (`google.com`, `bing.com`, `yahoo.com`, `duckduckgo.com`), **Social Networks** (`reddit.com`, `linkedin.com`, `medium.com`, `twitter.com`), or custom blog referrers.
    - **100% reliable, zero bot blocks or timeouts**: Never gets blocked by Google or social media firewalls.
    - **Identical analytics attribution**: Classified as **Organic Search** (`google / organic`) in Google Analytics 4 (GA4) and search engine referral in Adsterra / ad networks.
- **Google SERP Organic Traffic**:
    - Opens Google Search using automatic `site:{targetUrl}` query or custom search keywords.
    - Dismisses Google cookie consent banners automatically.
    - Locates the organic search result ranking for your site and clicks it.
    - _Note_: If Google is unreachable or blocks the proxy IP, it automatically falls back within 15 seconds to a direct visit with Google referrer, avoiding wasted CPU.
- **Backlink Referral Traffic**:
    - Navigates to any public backlink source page (LinkedIn post, Reddit thread, Medium article, Facebook post, Quora answer, Twitter/X post, etc.).
    - Dismisses platform popups, cookie consent banners, and login walls.
    - Simulates human reading and scrolling on the source page.
    - Locates your backlink by anchor text (or target URL match) and clicks it.
- **Direct Traffic**:
    - Clean direct visits, bookmark clicks, or direct link validation (e.g., Adsterra direct links, Monetag).

### 2. 🧠 Organic Human Behavior Emulation

- **Variable Dwell Time**: Configure min and max dwell duration (e.g. 15s–45s). Each session picks a random dwell time to avoid static footprint patterns.
- **Human-like Scrolling**:
    - Variable scroll step sizes (120px–380px) with smooth scrolling.
    - Natural reading pauses (1s–3s).
    - Realistic scroll reverses (~20% probability of scrolling slightly upwards to simulate re-reading).
    - Smooth cursor jitter and mouse movements across the viewport.

### 3. 🧭 Deep Browsing & Internal Page Navigation

- Automatically discovers unvisited internal links on the same domain.
- Clicks through to internal pages to a configurable depth (e.g., 1–3 pages deep).
- Configurable dwell time on each internal page.
- Records the entire session journey / breadcrumb trail (e.g., `Google SERP -> Home -> About -> Services`).
- Reduces bounce rate and emulates genuine multi-page visitor sessions.

### 4. 📊 Comprehensive Analytics & Diagnostics

- **Navigation Path**: Full sequence of URLs visited during the session.
- **Referrer Verification**: Confirms if `document.referrer` was properly passed.
- **Dwell Time Metrics**: Individual dwell times per page + total session dwell time.
- **Scroll Depth**: Maximum scroll depth percentage achieved on each page.
- **Ad & Monetization Detection**: Tracks ad iframes, ad network scripts (Adsterra, Monetag, Google Tag, etc.), and checks for blank pages.
- **Technical Health**: Captures HTTP status, 3xx redirect count, browser console errors, and failed network requests.
- **Screenshots**: Optional before/after screenshots of the landing page and internal pages stored in the Key-Value store.

---

## ⚙️ Input Configuration

| Parameter                     | Type    | Default          | Description                                                                         |
| ----------------------------- | ------- | ---------------- | ----------------------------------------------------------------------------------- |
| `trafficSource`               | String  | `"direct"`       | `"direct"`, `"serp_google"`, or `"backlink"`.                                       |
| `startUrls`                   | Array   | Required         | Target website URLs. In Backlink mode, the destination link the backlink points to. |
| `backlinkUrl`                 | String  | `""`             | **Required for Backlink mode.** Page containing backlink (LinkedIn, Reddit, etc.).  |
| `backlinkAnchorText`          | String  | `""`             | Anchor text to search and click on the backlink page.                               |
| `serpCustomQuery`             | String  | `""`             | Optional Google search query. If empty, automatically uses `site:{targetUrl}`.      |
| `dwellTimeMinSeconds`         | Integer | `15`             | Minimum dwell time spent on the landing page.                                       |
| `dwellTimeMaxSeconds`         | Integer | `35`             | Maximum dwell time spent on the landing page.                                       |
| `scrollBehavior`              | String  | `"human-random"` | `"human-random"` (reading pauses + reverse scrolls), `"slow-linear"`, or `"none"`.  |
| `enableInternalNavigation`    | Boolean | `true`           | Enables deep browsing through internal links.                                       |
| `maxInternalPages`            | Integer | `2`              | Maximum internal pages to visit deep per session.                                   |
| `internalPageDwellMinSeconds` | Integer | `10`             | Min dwell time on each internal page.                                               |
| `internalPageDwellMaxSeconds` | Integer | `25`             | Max dwell time on each internal page.                                               |
| `repeatVisits`                | Integer | `1`              | Number of browser sessions to run per target URL.                                   |
| `maxConcurrentSessions`       | Integer | `2`              | Number of simultaneous browser instances (1–3 recommended on Free tier).            |
| `navigationTimeoutSeconds`    | Integer | `60`             | Maximum page load timeout.                                                          |
| `captureScreenshots`          | Boolean | `true`           | Captures before/after screenshots to the default Key-Value Store.                   |
| `proxyConfiguration`          | Object  | `{}`             | Residential proxies strongly recommended for SERP and ad validation.                |

---

## 📋 Example Configurations

### Example 1: Organic Search Traffic via Search Engine Referrers (Recommended)

```json
{
    "trafficSource": "referrer",
    "referrerSource": "preset_search",
    "startUrls": [{ "url": "https://myblog.com/top-10-tools" }],
    "dwellTimeMinSeconds": 20,
    "dwellTimeMaxSeconds": 45,
    "scrollBehavior": "human-random",
    "enableInternalNavigation": true,
    "maxInternalPages": 2,
    "internalPageDwellMinSeconds": 10,
    "internalPageDwellMaxSeconds": 20,
    "repeatVisits": 3,
    "maxConcurrentSessions": 2
}
```

### Example 2: Live Google SERP Traffic (with Fast 15s Fallback)

```json
{
    "trafficSource": "serp_google",
    "startUrls": [{ "url": "https://myblog.com/top-10-tools" }],
    "serpCustomQuery": "",
    "dwellTimeMinSeconds": 20,
    "dwellTimeMaxSeconds": 45,
    "scrollBehavior": "human-random",
    "enableInternalNavigation": true,
    "maxInternalPages": 2
}
```

### Example 2: Backlink Referral Traffic (LinkedIn / Reddit / Medium)

```json
{
    "trafficSource": "backlink",
    "startUrls": [{ "url": "https://dailydogguide.com/dog-breeds-chart/" }],
    "backlinkUrl": "https://www.linkedin.com/feed/update/urn:li:share:75197065113261260080/",
    "backlinkAnchorText": "Dog Breeds Chart",
    "dwellTimeMinSeconds": 20,
    "dwellTimeMaxSeconds": 40,
    "scrollBehavior": "human-random",
    "enableInternalNavigation": true,
    "maxInternalPages": 2,
    "repeatVisits": 2
}
```

### Example 3: Direct Traffic Testing with Ad Detection

```json
{
    "trafficSource": "direct",
    "startUrls": [{ "url": "https://landingpage.com" }],
    "dwellTimeMinSeconds": 30,
    "dwellTimeMaxSeconds": 60,
    "scrollBehavior": "human-random",
    "enableInternalNavigation": false,
    "captureScreenshots": true
}
```

---

## 📈 Output Dataset Fields

Each session outputs a comprehensive dataset record:

- `sessionNumber`: Repetition index (1, 2, ...).
- `trafficSource`: `"direct"`, `"serp_google"`, or `"backlink"`.
- `status`: `"SUCCESS"` or `"FAILED"`.
- `serpQuery`: Search query sent to Google (in SERP mode).
- `serpRankFound`: Search result rank where your link was located (e.g. Rank 1).
- `serpClickSucceeded`: `true` if the organic link was clicked.
- `backlinkSourceUrl`: URL of backlink source page (in backlink mode).
- `backlinkAnchorText`: Anchor text searched on the backlink page.
- `backlinkClickSucceeded`: `true` if the link on the backlink page was located and clicked.
- `landingUrl`: Final destination URL after redirects.
- `landingTitle`: Document title of landing page.
- `httpStatus`: HTTP response code (e.g., 200).
- `redirectCount`: Number of 3xx redirects.
- `referrer`: Observed `document.referrer` (e.g., `https://www.google.com/`).
- `landingDwellSeconds`: Exact time spent reading the landing page.
- `landingScrollDepthPercent`: Scroll depth reached (0–100%).
- `internalPagesCount`: Number of internal pages visited.
- `internalPagesVisited`: Detailed array of internal pages, including titles, dwell times, and scroll depths.
- `navigationPath`: Full breadcrumb trail of visited URLs.
- `totalPagesVisited`: Total pages viewed (landing + internal).
- `totalSessionDwellSeconds`: Total active session dwell time across all pages.
- `isBlankPage`: Boolean flag indicating if the page was blank.
- `adDetection`: Object containing counts of detected iframes, ad scripts, canvas, and video.
- `screenshotBeforeScroll` / `screenshotAfterScroll`: Keys in the default Key-Value Store.

---

## 💡 Best Practices

1. **Proxies**: Use residential proxies when testing Google SERP or ad-monetized networks to prevent Google captcha detection or IP rate-limiting.
2. **Concurrency**: Keep `maxConcurrentSessions` at 1–3 on the Apify Free plan to conserve memory.
3. **Internal Navigation**: Setting `maxInternalPages: 2` with `10s–25s` dwell time simulates a 40–80 second multi-page session, ideal for testing web analytics goals and ad impression triggers.
