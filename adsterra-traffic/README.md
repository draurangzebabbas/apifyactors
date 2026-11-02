# 🚀 Organic Search, Backlink & Direct Website Traffic Generator

> **The easiest, most realistic browser traffic generator on Apify.**  
> Send genuine human visitors to your website, blog, or direct ad links — complete with real Google search clicks, authentic referrers, natural mouse movements, randomized reading pauses, and multi-page deep internal browsing.

---

## 📖 Table of Contents

1. [⚡ Quick Start Guide (Ready in 60 Seconds)](#-quick-start-guide-ready-in-60-seconds)
2. [🎯 Choose Your Traffic Mode (Which One Do You Need?)](#-choose-your-traffic-mode-which-one-do-you-need)
3. [🛡️ Proxies Explained for Beginners (Everything You Need to Know)](#️-proxies-explained-for-beginners-everything-you-need-to-know)
4. [🧠 Human Behavior & Anti-Bot Protection](#-human-behavior--anti-bot-protection)
5. [📸 Understanding Your Screenshots (Ordered by Step)](#-understanding-your-screenshots-ordered-by-step)
6. [📋 Ready-to-Use Copy & Paste Templates](#-ready-to-use-copy--paste-templates)
7. [📊 Dataset & Analytics Reference](#-dataset--analytics-reference)
8. [💡 Pro Tips & Best Practices](#-pro-tips--best-practices)

---

## ⚡ Quick Start Guide (Ready in 60 Seconds)

You don't need any coding or technical knowledge to get started!

### 1️⃣ Paste Your Web Page

In the **Target URLs** field, add the web page you want visitors to go to:

```json
[{ "url": "https://yourwebsite.com/my-awesome-article/" }]
```

### 2️⃣ Pick a Traffic Mode

- Want **100% guaranteed Organic Google Search traffic** in Google Analytics 4 (GA4) with zero chance of blocks?  
  👉 Choose **Simulated Referral Traffic** (Preset: Search Engines).
- Want real browsers to literally open **google.com**, type your query, and click your link?  
  👉 Choose **SERP Traffic** (Residential proxy required).

### 3️⃣ Click "Start" / "Run"

That's it! The Actor launches a real headless browser, emulates a real human on a smartphone or desktop, scrolls naturally, stays on your page for 15–40 seconds, and records complete analytics and screenshots.

---

## 🎯 Choose Your Traffic Mode (Which One Do You Need?)

| Traffic Mode                                 | How it Works                                                                               | Best For                                                            | Proxy Needed?                  |
| :------------------------------------------- | :----------------------------------------------------------------------------------------- | :------------------------------------------------------------------ | :----------------------------- |
| **1. Simulated Referral** ⭐ _(Recommended)_ | Arrives directly at your site with an authentic `Referer: https://www.google.com/` header. | Google Analytics (GA4), Adsterra, Monetag, zero blocks.             | Any proxy or Apify default     |
| **2. Google SERP**                           | Opens `google.com`, dismisses cookie consent, types query, finds your link, clicks it.     | 100% genuine live Google click testing.                             | **Residential Proxy required** |
| **3. Backlink Referral**                     | Visits a LinkedIn, Reddit, Medium, or forum post and clicks your backlink.                 | Testing backlink clickthroughs, tracking referral campaigns.        | Any proxy                      |
| **4. Direct Traffic**                        | Clean direct visit with no referrer header (like typing the URL in the browser bar).       | Direct ad links (e.g. Adsterra direct links), website uptime/speed. | Any proxy                      |

---

### Deep Dive into the 4 Modes:

#### 1. Simulated Referral Traffic _(100% Reliable & Recommended)_

- **What it does**: The browser visits your target website directly while sending a genuine HTTP Referrer header.
- **Why it's awesome**: Google Analytics (GA4), Adsterra, and ad networks classify this **100% as Organic Search** (e.g. `google / organic`) or Social referral.
- **Why it never fails**: Because the browser doesn't touch Google's servers, Google can never show a CAPTCHA or block your IP!

#### 2. Live Google SERP Traffic

- **What it does**:
    1. Opens `google.com`.
    2. Automatically clicks "Accept all" on Google's cookie consent dialog.
    3. Types your search query character-by-character like a human.
    4. Scans the search results, finds the result matching your domain & page slug, and clicks it!
- **Targeted Keywords**: You can search anything you want, e.g. `"Dog Breeds Chart" site:yourwebsite.com` or broad keywords.
- **Fail-Safe Fallback**: If Google ever shows a CAPTCHA or rate-limits the proxy, the Actor doesn't fail your run — it immediately activates a smart fallback by visiting your target page directly with a Google referrer header.

#### 3. Backlink Traffic

- **What it does**: You provide a source page where your link is posted (e.g., your LinkedIn update, Medium post, or Reddit thread). The Actor loads that page, scrolls down, finds your link by anchor text or destination URL, and clicks it to land on your website.

#### 4. Direct Traffic

- **What it does**: Navigates straight to your target URL or monetized direct link with no referrer. Ideal for verifying ad network direct links (Adsterra, Monetag) and checking for redirects.

### 🎯 Pure Organic SERP vs. Fallback Mode

- **Strict Organic SERP (`serpFallbackToDirect: false` - Default)**:
    - Perfect for selling traffic packages. If Google blocks an IP or shows a CAPTCHA, the Actor **does not** fall back to direct traffic. Instead, it rotates to a fresh residential IP and retries so you deliver **100% genuine Google SERP clicks**.
- **Package Volume Target (`totalVisits`)**:
    - Want to sell a package of 1,000 visits across 5 URLs? Simply set `"totalVisits": 1000`. The Actor distributes visits evenly and interleaved round-robin (200 visits per URL) automatically without needing manual multiplication.

---

## 🛡️ Proxies Explained for Beginners (Everything You Need to Know)

### What is a Proxy and why do I need one?

When you browse the web from your home, websites see your home IP address. If you send 50 visits from Apify's datacenter servers without a proxy, websites (and Google) know the visits are coming from a cloud server and might block them. A **proxy** changes the browser's IP address so every visit appears to come from a real home computer or phone in the US, UK, Canada, etc.

### Datacenter vs. Residential Proxies

- 🏢 **Datacenter Proxies (e.g., Free Webshare)**:
    - Good for: Simulated Referral mode, Direct Traffic, and general browsing.
    - Not good for: Live Google SERP searches (Google knows datacenter IPs and blocks them).
- 🏠 **Residential Proxies (e.g., Oxylabs, Smartproxy, Apify Residential)**:
    - Good for: **Everything**, especially live Google SERP searching.
    - These use real residential home broadband connections (Comcast, Vodafone, AT&T, etc.). Google treats them like real people.

### 🔄 Automatic Session & IP Rotation Built-In!

You don't need to worry about IP bans or rate-limiting. This Actor includes **automatic residential proxy session rotation**:

- If you use **Oxylabs**, **Smartproxy**, or **Apify Residential**, the Actor automatically gives **every single visit a fresh, unique residential IP**.
- If you run **100 visits**, they will come from **100 different home internet connections**!

---

## 🧠 Human Behavior & Anti-Bot Protection

Robots visit a page and leave in 1 second without moving. Real humans don't. This Actor emulates real human browsing down to the millisecond:

- ⏳ **Natural Dwell Time**: Stays on each page for a random time (e.g. 15s–45s).
- 📜 **Human-Random Scrolling**:
    - Smooth, randomized scroll distances (120px–380px).
    - Realistic reading pauses (1s–3s) as if reading paragraphs.
    - ~20% chance of scrolling slightly back up (simulating re-reading a section).
    - Natural mouse cursor jitter and movements across the screen.
- 📱 **Mobile & Desktop Device Profiles**: Automatically mimics real devices (iPhone 15, Samsung Galaxy S24, Pixel 8, Chrome Windows 11, Safari Mac) with matching screen sizes, touch capability, and User-Agents.
- 🧭 **Multi-Page Deep Browsing**: If enabled (`enableInternalNavigation: true`), the visitor doesn't just bounce! After reading the landing page, it finds internal links on your site (e.g., "About Us", "Related Articles") and clicks through to 1 or 2 more pages, spending 10–25s on each. This drops your bounce rate and maximizes ad impressions.

---

## 📸 Understanding Your Screenshots (Ordered by Step)

Screenshots are saved automatically to your run's **Key-Value Store**. They are named chronologically so you can see the complete story of each visit from start to finish:

| Screenshot Key                      | What You Are Looking At                                    |
| :---------------------------------- | :--------------------------------------------------------- |
| `s001_step01_serp_consent_handled`  | Google homepage loaded & cookie consent banner accepted.   |
| `s001_step02_serp_homepage_ready`   | Google search box ready and clean.                         |
| `s001_step03_serp_query_typed`      | Your custom search keyword typed into Google's search box. |
| `s001_step04_serp_query_submitted`  | Enter pressed; Google search results loaded.               |
| `s001_step05_serp_result_matched`   | Your website's organic ranking result located on the page. |
| `s001_step06_serp_before_click`     | Mouse positioned over your link right before clicking.     |
| `s001_step07_serp_click_landed`     | Browser successfully navigated to your target website.     |
| `s001_step08_landing_before_scroll` | Landing page loaded before the human scroll simulation.    |
| `s001_step09_landing_after_scroll`  | Landing page after reading, dwelling, and scrolling down.  |

---

## 📋 Ready-to-Use Copy & Paste Templates

### 🌟 Template 1: 100% Reliable Organic Google Traffic (Best for Analytics & Ads)

```json
{
    "trafficSource": "referrer",
    "referrerSource": "preset_search",
    "startUrls": [{ "url": "https://yourwebsite.com/article-1/" }, { "url": "https://yourwebsite.com/article-2/" }],
    "dwellTimeMinSeconds": 20,
    "dwellTimeMaxSeconds": 45,
    "scrollBehavior": "human-random",
    "enableInternalNavigation": true,
    "maxInternalPages": 2,
    "repeatVisits": 5,
    "maxConcurrentSessions": 2
}
```

### 🔍 Template 2: Live Google SERP with Targeted Keywords (Oxylabs / Residential)

You can specify queries in the **Per-URL Search Queries** textarea (one query per line), or directly inside `startUrls`:

```json
{
    "trafficSource": "serp_google",
    "startUrls": [
        { "url": "https://yourwebsite.com/dog-breeds-chart/" },
        { "url": "https://yourwebsite.com/puppy-training-schedule/" }
    ],
    "serpQueryList": "\"Dog Breeds Chart\" site:yourwebsite.com\n\"Puppy Training Schedule\" site:yourwebsite.com",
    "deviceType": "mobile-random",
    "dwellTimeMinSeconds": 20,
    "dwellTimeMaxSeconds": 40,
    "scrollBehavior": "human-random",
    "enableInternalNavigation": true,
    "maxInternalPages": 1,
    "repeatVisits": 1,
    "maxConcurrentSessions": 1,
    "proxyConfiguration": {
        "useApifyProxy": false,
        "proxyUrls": ["http://customer-resi_XXXXX:PASSWORD@pr.oxylabs.io:7777"]
    }
}
```

### 🔗 Template 3: Backlink Click Campaign (LinkedIn / Reddit / Medium)

```json
{
    "trafficSource": "backlink",
    "startUrls": [{ "url": "https://yourwebsite.com/my-post/" }],
    "backlinkUrl": "https://www.linkedin.com/feed/update/urn:li:share:75197065113261260080/",
    "backlinkAnchorText": "Read the Full Guide Here",
    "dwellTimeMinSeconds": 25,
    "dwellTimeMaxSeconds": 50,
    "scrollBehavior": "human-random",
    "enableInternalNavigation": true,
    "maxInternalPages": 2
}
```

---

## 📊 Dataset & Analytics Reference

Every session generates a clean, structured JSON record in your Apify dataset:

| Field                       | Meaning                                                                                       |
| :-------------------------- | :-------------------------------------------------------------------------------------------- |
| `status`                    | `SUCCESS` or `FAILED`.                                                                        |
| `trafficSource`             | Mode used (`referrer`, `serp_google`, `backlink`, or `direct`).                               |
| `inputUrl`                  | The destination URL you provided.                                                             |
| `landingUrl`                | Final URL reached (including any redirects).                                                  |
| `httpStatus`                | HTTP code returned by your server (`200` = healthy).                                          |
| `referrer`                  | The exact `document.referrer` seen by your analytics script (e.g. `https://www.google.com/`). |
| `serpRankFound`             | Rank position where your link was found on Google (e.g. Rank 1, Rank 3).                      |
| `serpClickSucceeded`        | `true` if the organic link was clicked and navigated.                                         |
| `landingDwellSeconds`       | Exact seconds the visitor spent on your landing page.                                         |
| `landingScrollDepthPercent` | How far down the page the visitor scrolled (e.g. `45%`, `80%`).                               |
| `internalPagesVisited`      | List of all deeper pages visited on your website during the visit.                            |
| `adDetection`               | Counts of ad iframes, Google Tag scripts, and monetization networks detected.                 |
| `deviceUsed`                | Exact phone or computer emulated (e.g. `Samsung Galaxy S24 Ultra (Android / Chrome)`).        |

---

## 💡 Pro Tips & Best Practices

1. **Keep Concurrency at 1–2**:
   Browsers need memory and CPU. Setting `maxConcurrentSessions: 1` or `2` ensures pages load fast without timeouts and saves your Apify compute units.
2. **Use Simulated Referral for High Volume**:
   If you want to send 500+ daily visits to your blog or affiliate site, use **Simulated Referral Traffic** (`preset_search`). It requires less bandwidth, runs faster, and GA4 records 100% of it as Organic Search.
3. **Internal Navigation Boosts Quality**:
   Enabling `enableInternalNavigation: true` with `maxInternalPages: 1` or `2` turns a simple visit into an engaged multi-page session, reducing bounce rate significantly.
4. **Targeted Keywords**:
   When using SERP mode, adding `"site:yourdomain.com"` to your query guarantees your page will appear on page 1 of Google results so the Actor can find and click it immediately.

---

### Need Help or Custom Features?

Open an issue or reach out through the Apify Console. Happy traffic generating!
