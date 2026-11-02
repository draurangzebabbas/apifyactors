# API Key Rotation & Management Architecture Guide

This document outlines a robust, scalable architecture for managing, rotating, and recovering API keys (such as Apify, OpenAI, etc.) in high-throughput applications. 

The goal of this architecture is to ensure high availability, distribute request load evenly, seamlessly handle rate limits/quotas, and proactively recover failed keys without blocking the main application logic. This strategy is abstracted so it can be implemented in any future application requiring reliable third-party API interactions.

---

## 1. Core Principles

1. **Stateful Synchronization:** API key states (active, rate_limited, failed) are maintained both in-memory for speed and in a persistent database (e.g., Supabase, PostgreSQL) for cross-instance consistency.
2. **Round-Robin & LRU (Least Recently Used):** Keys are rotated evenly to distribute the load, preventing any single key from hitting its quota prematurely.
3. **Parallel Proactive Recovery:** Keys that fail or hit quotas are placed on a "cooldown". After the cooldown, they are tested in parallel to quickly bring them back into the active pool.
4. **Minimum Availability Thresholds:** The system constantly monitors the active pool. If the number of healthy keys drops below a defined threshold, emergency recovery is triggered automatically.

---

## 2. Initialization and Threshold Management

When the system initializes or when the `KeyManager` is instantiated, it must fetch the available keys from the database and classify them.

### Strategy:
- **Categorization:** Separate keys into `active` and `candidate` (previously failed or rate-limited, but not permanently deactivated).
- **Minimum Threshold:** Define a minimum active key limit (e.g., `5` active keys). If the active pool falls below this threshold, the system immediately attempts to recover candidate keys.
- **LRU Sorting:** Sort the active pool by the `last_used_at` timestamp. This ensures that the keys which haven't been used in a while are prioritized, balancing the request distribution.
- **Fallback Mechanism:** If absolutely zero keys are active after recovery, the system should fall back to any non-inactive keys as a last resort to prevent complete system failure.

---

## 3. Key Assignment: Round-Robin Distribution

When a process requests an API key, the system uses a Round-Robin strategy to serve the next available healthy key.

### How it works:
1. The system maintains a `currentIndex` pointer.
2. Upon request, it checks the key at `currentIndex`.
3. If the key is labeled `active`, it is returned, and `currentIndex` is incremented.
4. If the key is not `active`, the system iterates through the array until it finds an `active` key.
5. **Emergency Check:** If a full loop is completed without finding an `active` key, an immediate parallel recovery check is triggered across all candidate keys.

---

## 4. Error Handling and Logical Label Updating

When an API call is made using a key, the result (success or failure) must be reported back to the Key Manager to update the key's health status.

### Success:
- Increment the key's `successes` counter.
- Ensure the label remains `active`.
- Update the `last_used_at` timestamp.

### Failure Handling:
When an error occurs, the HTTP status code dictates the logical label applied to the key:
- **HTTP 429 (Too Many Requests / Quota Hit):** The key is labeled as `rate_limited`. This indicates the key is valid but temporarily exhausted.
- **HTTP 401, 402, 403 (Unauthorized / Payment Required):** The key is labeled as `failed`. This indicates a potential billing issue or revoked access.
- **Other Errors (5xx, Network issues):** These are usually provider-side and should *not* invalidate the key.

*All status changes are immediately synced to the persistent database to ensure other instances or workers do not attempt to use the exhausted key.*

---

## 5. Parallel Recovery and Cooldown Cycles

Keys do not stay dead forever. A core feature of this architecture is the **Parallel Proactive Recovery** system.

### The Cooldown Cycle:
- Once a key is marked as `rate_limited` or `failed`, it enters a cooldown period (e.g., `5 minutes`).
- The system will ignore this key during normal assignment until the cooldown period expires.

### Parallel Health Checks:
- When the system detects a low active key count, or during a scheduled background job, it gathers all candidate keys whose cooldown period has expired.
- It runs a lightweight "health check" API call (e.g., fetching account info) on all eligible candidate keys **in parallel** (using `Promise.allSettled` or equivalent).
- **Parallelism is crucial here:** Testing 50 keys sequentially could take minutes. Testing them in parallel takes only a few seconds.
- Keys that pass the health check are immediately labeled back to `active` in both memory and the database.

---

## 6. Implementation Checklist for Future Apps

To implement this architecture in a new application, you need the following components:

1. **Database Schema:**
   - `id`, `key_string`, `provider` (e.g., 'apify', 'openai'), `status` (active, rate_limited, failed, inactive), `last_used_at`, `usage_count`.
2. **KeyManager Class/Service:**
   - In-memory state tracking (`keyStatus` map).
   - `getNextKey()` method utilizing Round-Robin `currentIndex`.
   - `markSuccess(key)` and `markFailure(key, httpStatus)` methods.
3. **Recovery Routine:**
   - A `recovery(candidates)` function that filters by `last_used_at < (now - cooldown_ms)`.
   - Executes parallel ping/test requests to the provider.
4. **Sync Mechanism:**
   - A method to flush local usage counts and status updates back to the database periodically or upon critical status changes.
5. **API Wrapper / Caller:**
   - A wrapper around your standard HTTP client that automatically requests a key, injects it into the header, catches errors, reports back to `markFailure`, and throws the error up to the application logic.

By adhering to this architecture, applications can achieve massive scale and handle thousands of parallel scraping or processing tasks without getting bottlenecked by brittle API key management.
