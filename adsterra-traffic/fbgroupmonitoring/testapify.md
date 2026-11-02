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


-----------------------------------
-------------------------------

```json
--- ROOT RUN KEYS ---
[
  'id',
  'actId',
  'userId',
  'startedAt',
  'finishedAt',
  'status',
  'statusMessage',
  'isStatusMessageTerminal',
  'meta',
  'stats',
  'options',
  'buildId',
  'exitCode',
  'defaultKeyValueStoreId',
  'defaultDatasetId',
  'defaultRequestQueueId',
  'storageIds',
  'pricingInfo',
  'chargedEventCounts',
  'platformUsageBillingModel',
  'accountedChargedEventCounts',
  'standby',
  'generalAccess',
  'buildNumber',
  'containerUrl',
  'usage',
  'usageTotalUsd',
  'usageUsd',
  'consoleUrl',
  'eventUsage'
]

--- PRICING/COST FIELDS ON RUN ROOT ---
usageTotalUsd: 0.00026216813418269167
usageUsd: {
  ACTOR_COMPUTE_UNITS: 0.00010300000000000006,
  DATASET_READS: 0,
  DATASET_WRITES: 0,
  KEY_VALUE_STORE_READS: 0.000005,
  KEY_VALUE_STORE_WRITES: 0.0001,
  KEY_VALUE_STORE_LISTS: 0,
  REQUEST_QUEUE_READS: 0,
  REQUEST_QUEUE_WRITES: 0,
  DATA_TRANSFER_INTERNAL_GBYTES: 6.73346221446991e-8,
  DATA_TRANSFER_EXTERNAL_GBYTES: 0.000004100799560546875,
  PROXY_RESIDENTIAL_TRANSFER_GBYTES: 0,
  PROXY_SERPS: 0
}
chargedUsd: undefined
pricingInfo: {
  "minimalMaxTotalChargeUsd": null,
  "isPPEPlatformUsagePaidByUser": true,
  "pricingModel": "PAY_PER_EVENT",
  "isPriceChangeNotificationSuppressed": true,
  "createdAt": "2026-04-21T19:09:49.044Z",
  "startedAt": "2026-04-21T19:09:49.044Z",
  "apifyMarginPercentage": 0.2,
  "pricingPerEvent": {
    "actorChargeEvents": {
      "apify-default-dataset-item": {
        "eventTitle": "result",
        "eventDescription": "Single result in the default dataset.",
        "isOneTimeEvent": false,
        "eventPriceUsd": 0.0035,
        "isPrimaryEvent": true
      },
      "apify-actor-start": {
        "eventTitle": "Actor Start",
        "eventDescription": "Charged when the Actor starts running. Number of events charged depends on Actor memory (one event per GB, minimum one event).",
        "isOneTimeEvent": true,
        "eventPriceUsd": 0.00005
      }
    }
  }
}
usage: {
  "ACTOR_COMPUTE_UNITS": 0.0005150000000000003,
  "DATASET_READS": 0,
  "DATASET_WRITES": 0,
  "KEY_VALUE_STORE_READS": 1,
  "KEY_VALUE_STORE_WRITES": 2,
  "KEY_VALUE_STORE_LISTS": 0,
  "REQUEST_QUEUE_READS": 0,
  "REQUEST_QUEUE_WRITES": 0,
  "DATA_TRANSFER_INTERNAL_GBYTES": 0.000001346692442893982,
  "DATA_TRANSFER_EXTERNAL_GBYTES": 0.000020503997802734375,
  "PROXY_RESIDENTIAL_TRANSFER_GBYTES": 0,
  "PROXY_SERPS": 0
}
```

