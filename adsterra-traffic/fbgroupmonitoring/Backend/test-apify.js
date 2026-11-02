/**
 * Comprehensive Apify Actor Test Suite
 * Actor: wmJ51jY3JE7K6cO9u
 * 
 * Tests all 4 traffic modes and features:
 * 1. Referrer (Simulated Referral) mode with Search Engine presets
 * 2. Direct Navigation mode (no referrer)
 * 3. Backlink Click mode
 * 4. Google SERP mode using user's real residential Oxylabs proxy
 */

require('dotenv').config();

const ACTOR_ID = process.env.APIFY_ACTOR_ID || 'wmJ51jY3JE7K6cO9u';
const TOKEN = process.env.APIFY_TEST_TOKEN || process.env.APIFY_API_KEY || process.env.APIFY_TOKEN;

// Proxy configuration read dynamically from environment variables
const PROXY_HOST = process.env.PROXY_HOST || 'pr.oxylabs.io';
const PROXY_PORT = process.env.PROXY_PORT || 7777;
const PROXY_USER = process.env.PROXY_USER || '';
const PROXY_PASS = process.env.PROXY_PASS || '';
const FULL_PROXY_URL = (PROXY_USER && PROXY_PASS)
    ? `http://${PROXY_USER}:${PROXY_PASS}@${PROXY_HOST}:${PROXY_PORT}`
    : (process.env.PROXY_URL || '');

async function runTestCase(testName, input) {
    console.log(`\n==================================================`);
    console.log(`▶ RUNNING TEST: ${testName}`);
    console.log(`Input summary:`, {
        trafficSource: input.trafficSource,
        referrerSource: input.referrerSource,
        targetUrls: input.startUrls?.map(u => u.url),
        visits: input.totalVisits,
        proxy: input.proxyConfiguration ? 'Configured' : 'None'
    });
    console.log(`==================================================`);

    const runUrl = `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${TOKEN}&timeout=180&waitForFinish=180`;
    
    try {
        const startRes = await fetch(runUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input)
        });

        if (!startRes.ok) {
            const errText = await startRes.text();
            throw new Error(`Apify Start Failed (${startRes.status}): ${errText}`);
        }

        const runData = await startRes.json();
        const run = runData.data;

        console.log(`Run started ID: ${run.id} | Status: ${run.status}`);

        // Get KV Store OUTPUT
        let kvOutput = null;
        try {
            const kvRes = await fetch(`https://api.apify.com/v2/key-value-stores/${run.defaultKeyValueStoreId}/records/OUTPUT?token=${TOKEN}`);
            if (kvRes.ok) {
                kvOutput = await kvRes.json();
            }
        } catch (e) {
            console.warn('Could not fetch KV OUTPUT:', e.message);
        }

        // Get Dataset items
        let datasetItems = [];
        try {
            const dsRes = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${TOKEN}`);
            if (dsRes.ok) {
                datasetItems = await dsRes.json();
            }
        } catch (e) {
            console.warn('Could not fetch dataset items:', e.message);
        }

        console.log(`\n--- RESULT: ${testName} ---`);
        console.log(`Status: ${run.status}`);
        if (kvOutput) {
            console.log(`Delivered Visits: ${kvOutput.successfulVisitsDelivered} / ${kvOutput.totalVisitsRequested} (${kvOutput.targetFulfillmentPercent})`);
            console.log(`Success Rate: ${kvOutput.sessionSuccessRatePercent}`);
            console.log(`Failure Breakdown:`, kvOutput.failureBreakdown);
        }
        console.log(`Dataset records returned: ${datasetItems.length}`);
        if (datasetItems.length > 0) {
            const first = datasetItems[0];
            console.log(`Sample Session #1:`);
            console.log(` - Status: ${first.status}`);
            console.log(` - Landing: ${first.landingUrl} (HTTP ${first.httpStatus})`);
            console.log(` - Referrer: ${first.referrer}`);
            console.log(` - Device: ${first.deviceUsed}`);
            console.log(` - Dwell: ${first.totalSessionDwellSeconds}s`);
            if (first.serpQuery) console.log(` - SERP Query: ${first.serpQuery} | Rank: ${first.serpRankFound}`);
            if (first.errorMessage) console.log(` - Error: [${first.errorType}] ${first.errorMessage}`);
        }

        return {
            testName,
            status: run.status,
            success: run.status === 'SUCCEEDED' || (kvOutput && kvOutput.successfulVisitsDelivered > 0),
            runId: run.id,
            kvOutput
        };
    } catch (err) {
        console.error(`❌ Test "${testName}" failed:`, err.message);
        return {
            testName,
            status: 'FAILED',
            success: false,
            error: err.message
        };
    }
}

async function main() {
    const targetUrl = 'https://example.com';
    const results = [];

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Direct Navigation (no referrer)
    // ─────────────────────────────────────────────────────────────
    results.push(await runTestCase('1. Direct Traffic Mode', {
        startUrls: [{ url: targetUrl }],
        totalVisits: 1,
        maxConcurrentSessions: 1,
        trafficSource: 'direct',
        deviceType: 'random',
        scrollBehavior: 'human-random',
        dwellTimeMinSeconds: 5,
        dwellTimeMaxSeconds: 8,
        enableInternalNavigation: false,
        proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
    }));

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Simulated Referral Traffic (Preset Search: Google/Bing/DuckDuckGo)
    // ─────────────────────────────────────────────────────────────
    results.push(await runTestCase('2. Simulated Referral (Search Engine Referrers)', {
        startUrls: [{ url: targetUrl }],
        totalVisits: 1,
        maxConcurrentSessions: 1,
        trafficSource: 'referrer',
        referrerSource: 'preset_search',
        deviceType: 'desktop-random',
        scrollBehavior: 'human-random',
        dwellTimeMinSeconds: 5,
        dwellTimeMaxSeconds: 8,
        enableInternalNavigation: false,
        proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
    }));

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Backlink Traffic Mode
    // ─────────────────────────────────────────────────────────────
    results.push(await runTestCase('3. Backlink Mode', {
        startUrls: [{ url: 'https://www.iana.org/help/example-domains' }],
        totalVisits: 1,
        maxConcurrentSessions: 1,
        trafficSource: 'backlink',
        backlinkUrl: 'https://example.com', // example.com has a link to "More information..." (iana.org)
        backlinkAnchorText: 'More information',
        deviceType: 'desktop-chrome',
        dwellTimeMinSeconds: 5,
        dwellTimeMaxSeconds: 8,
        enableInternalNavigation: false,
        proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] }
    }));

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Google SERP Traffic with Oxylabs Residential Proxy
    // ─────────────────────────────────────────────────────────────
    results.push(await runTestCase('4. Google SERP with Oxylabs Residential Proxy', {
        startUrls: [{ url: targetUrl }],
        totalVisits: 1,
        maxConcurrentSessions: 1,
        trafficSource: 'serp_google',
        serpCustomQuery: 'site:example.com',
        serpMaxRetries: 2,
        serpFallbackToDirect: true, // fallback to direct with Google referrer if blocked
        deviceType: 'desktop-chrome',
        dwellTimeMinSeconds: 5,
        dwellTimeMaxSeconds: 10,
        enableInternalNavigation: false,
        proxyConfiguration: {
            useApifyProxy: false,
            proxyUrls: [FULL_PROXY_URL]
        }
    }));

    // ─────────────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────────────
    console.log(`\n==================================================`);
    console.log(`📊 TEST SUITE SUMMARY`);
    console.log(`==================================================`);
    for (const r of results) {
        console.log(`${r.success ? '✅ PASS' : '❌ FAIL'} | ${r.testName} (Status: ${r.status})`);
    }
}

main();
