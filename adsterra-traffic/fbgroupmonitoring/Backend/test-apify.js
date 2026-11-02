const { ApifyClient } = require('apify-client');

async function testApify() {
    const client = new ApifyClient({
        token: 'YOUR_APIFY_TOKEN'
    });

    const input = {
        startUrls: [{ url: 'https://web.facebook.com/groups/971110907002212' }],
        maxPosts: 5,
        resultsLimit: 5,
        logLevel: 'WARNING'
    };

    try {
        const run = await client.actor('swerve/fb-group-scraper').call(input);
        
        console.log('--- ROOT RUN KEYS ---');
        console.log(Object.keys(run));
        
        console.log('\n--- PRICING/COST FIELDS ON RUN ROOT ---');
        console.log('usageTotalUsd:', run.usageTotalUsd);
        console.log('usageUsd:', run.usageUsd);
        console.log('chargedUsd:', run.chargedUsd);
        console.log('pricingInfo:', JSON.stringify(run.pricingInfo, null, 2));
        console.log('usage:', JSON.stringify(run.usage, null, 2));

    } catch (error) {
        console.error('Apify run failed:', error);
    }
}

testApify();

