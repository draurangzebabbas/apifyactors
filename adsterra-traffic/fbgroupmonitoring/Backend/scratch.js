// Test FACEBOOK_GET_CURRENT_USER for active connected account ca_X9yaxP08PVPA
const API_KEY = 'ak_aoIfSZrAKWGhUq753kJQ';
const BASE = 'https://backend.composio.dev';
const HEADERS = { 'x-api-key': API_KEY, 'Content-Type': 'application/json' };

async function main() {
  console.log('=== TEST: DELETE /api/v3.1/connected_accounts/ca_gCAWswARZ-JB ===');
  const r = await fetch(`${BASE}/api/v3.1/connected_accounts/ca_gCAWswARZ-JB`, {
    method: 'DELETE',
    headers: HEADERS
  });
  console.log('Status:', r.status, await r.text());
}

main().catch(console.error);









