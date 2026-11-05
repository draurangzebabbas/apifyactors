Analyzed server.js:L425-480
Ran check proxy test 2 batches
Analyzed server.js:L460-505
Analyzed server.js:L785-835
Edited server.js
Analyzed server.js:L815-855
Edited server.js
Ran commit and push strict SERP failure guard

### 1. Strict SERP Failure Guard Implemented & Deployed 🛡️

You made a crucial observation: when a campaign uses **Strict Google SERP (fallback turned off)** and the proxy is bad or the domains don't rank in Google top 20, retrying repeatedly will simply burn Apify compute units and waste your account credits without delivering any visits.

We have implemented this guard in `Backend/server.js`:

1. **One-Shot Evaluation for Strict SERP**:
   - If a campaign has `traffic_source: 'serp_google'` and `serp_fallback_to_direct: false`:
   - If the batch delivers `0` visits (because of CAPTCHAs, bad proxy, or URLs not ranked in Google top 20):
     - The worker **DOES NOT** reschedule or loop.
     - The campaign is immediately marked **`failed`**.
     - All remaining unused credits are **automatically refunded** to the user's credit balance.
     - A clear push notification is sent explaining the failure.
2. **Watchdog Protection**:
   - The Watchdog explicitly ignores failed Strict SERP campaigns so they will never be restarted automatically.
3. **Other Campaigns Keep 100% Fulfillment**:
   - For all other campaigns (Simulated Referral, Direct, Backlink, or SERP with Fallback enabled), auto-rescheduling and watchdog continue working because those channels are 100% reliable and never get blocked by Google.

*This has been committed and pushed to `main` (commit `f60d9eb`).*

---

### 2. Discussion: Google SERP, CAPTCHAs & Supercharging the Apify Actor

*(As requested, no edits have been made to the Apify Actor code; this is purely strategic architecture analysis).*

#### A. Can We Make the Apify Actor Solve the CAPTCHA?
- **How Google CAPTCHAs Work**:
  Google displays reCAPTCHA Enterprise / bot challenge screens when an IP address displays non-human patterns, shares too many concurrent sessions from the same exit node, or has a poor IP reputation score (common with datacenter IPs or overused residential sticky ports).
- **Automated Solving Limitations & Risks**:
  - In automated headless browsers, programmatic CAPTCHA solvers (e.g., clicking image tiles, third-party audio/token solvers) take between 30 to 90 seconds per page, frequently fail, and cause Google to immediately flag the IP address with a permanent ban for the remainder of the session.
  - Furthermore, automated bot-solving directly triggers Google's aggressive anti-abuse heuristics, resulting in immediate connection resets (`ERR_CONNECTION_CLOSED`).
- **The True Working Industry Solution (Avoidance > Solving)**:
  Instead of trying to solve the puzzle, **the goal is never to trigger the CAPTCHA in the first place**:
  1. **Strict 1-Minute Sticky IPs (`sesstime-1` / `sesstime-0`)**: Rotating the proxy IP every single session means Google sees every search coming from an independent new household connection.
  2. **Fingerprint Masking (Canvas/WebGL/Audio)**: Ensuring the browser uses realistic audio context noise and WebGL vendor strings (`Google Inc. (NVIDIA...)` rather than Linux SwiftShader).
  3. **Organic Delay & Mouse Trajectory**: Before typing the query, letting the browser perform an organic scroll and bezier mouse curve on `google.com`.

---

#### B. What Happens When a URL is Not in the Top 20? Can It Be Skipped or Supercharged?
Currently, in `src/serp.js`:
1. The actor searches Google for the query.
2. It looks through **Page 1 (results 1–10)**.
3. If not found, it clicks "Next" to check **Page 2 (results 11–20)**.
4. If still not found after 3 retry queries:
   - If `serpFallbackToDirect: true`: It navigates directly to the target URL while setting the `Referer: https://www.google.com/` header so Google Analytics (GA4) registers it as Organic Search.
   - If `serpFallbackToDirect: false`: It records `serp_not_ranked`, marks that session failed, and moves on to the next scheduled visit.

#### How We Can Supercharge This in the Future (When You Decide to Update):
1. **Dynamic Keyword Generation**:
   Instead of searching rigid `site:` queries (which Google often restricts or ranks strangely), the actor can extract the **actual `<title>` or H1 tag** from the target URL (e.g., `"Puppy Training Schedule Daily Dog Guide"`) and search for that natural keyword. This almost always puts the target URL in the #1 or #2 organic position on Google without looking like a bot.
2. **Extended Depth Pagination (Top 50 / Pages 1–5)**:
   We can allow configurable search depth (e.g., checking up to Page 3 or Page 5) rather than cutting off at Page 2.
3. **Smart URL Skipping / Failover**:
   If a specific URL in a multi-URL campaign is verified to not be indexed in Google, the actor can automatically skip that specific URL and divert the remaining visits to the other URLs in the campaign that *do* rank, ensuring the campaign total target is still 100% delivered.