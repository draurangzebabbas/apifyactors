# Implementation Plan: Auto-Comment with Multi-Account & Comment Pools

This plan ensures your existing scraper and matching logic remains 100% intact. We are strictly adding new modules on top of it.

## Part 1: How Composio Works for Your Users

**To answer your question:** 
**NO**, your users will *never* know about Composio or need to sign up for it. 
Here is how it works:
1. **You** have the Composio account and the API key.
2. We install the Composio SDK in your app.
3. When your user goes to the "Accounts" page and clicks "Connect Facebook", they see a standard Facebook login popup.
4. Once they log in and select their Pages, Composio securely stores their access token under **your** account, linked to their specific `user_id` (this is called an "Entity" in Composio).
5. When your backend wants to comment, it tells Composio: *"Execute `FACEBOOK_CREATE_COMMENT` for user_id X using this page"*, and Composio handles the tokens automatically.

---

## Part 2: Step-by-Step Execution Plan

### Step 1: Database Schema Updates (Supabase)
We will create a few new tables to support the new features, without touching the existing `facebook_posts` or `user_keywords` beyond adding optional columns.

1. **`user_pages`**: Stores the Facebook Pages the user has connected via Composio.
   - Columns: `id`, `user_id`, `composio_connection_id`, `page_id`, `page_name`, `page_avatar_url`, `created_at`
2. **`comment_pools`**: Stores the names of the comment pools (e.g., "Web Dev Pitch").
   - Columns: `id`, `user_id`, `name`, `created_at`
3. **`comment_pool_items`**: Stores the actual comments inside those pools.
   - Columns: `id`, `pool_id`, `content`, `created_at`
4. **`user_keywords` (Update)**: Link keywords to pages and pools.
   - Add columns: `auto_comment_enabled` (boolean), `user_page_id` (UUID), `comment_pool_id` (UUID)
5. **`auto_comment_logs`**: To track what was posted and any errors.
   - Columns: `id`, `user_id`, `post_id`, `keyword_id`, `page_id`, `comment_text`, `status` (SUCCESS/FAILED), `error_message`, `created_at`

### Step 2: Backend API & Composio Setup
1. Install `composio-core` SDK in the backend.
2. Create `POST /api/composio/link`: Generates a Facebook connection URL for a user to click.
3. Create `GET /api/composio/callback` (or webhook): Once connected, fetch the user's Pages from Composio (`FACEBOOK_LIST_MANAGED_PAGES`) and save them to `user_pages`.
4. Create APIs for Comment Pools: `GET/POST /api/comment-pools` and `GET/POST /api/comment-pools/:id/items`.

### Step 3: Frontend UI Updates (Next.js)
1. **New Page: `/dashboard/accounts`**
   - Shows connected Facebook Pages.
   - "Connect New Page" button (triggers Composio auth flow).
2. **New Page/Section: `/dashboard/comment-pools`**
   - Create pools (e.g., "Web Dev Responses").
   - Add multiple different comments to each pool.
3. **Update Page: `/dashboard/keywords`**
   - Add a toggle: "Auto-Comment"
   - If ON, reveal two dropdowns:
     - "Select Page to Comment As" (fetches from `user_pages`)
     - "Select Comment Pool" (fetches from `comment_pools`)

### Step 4: The Auto-Comment Engine (Backend)
Update the existing `runScrapingWorker` in `server.js`. Right after the keyword matching logic (`user_post_matches.upsert`), we will add a safe, isolated block:
1. For every new match, check if the keyword has `auto_comment_enabled = true`.
2. Check if we haven't already commented on this post for this user.
3. Fetch the connected `user_page_id`.
4. Fetch all comments for the `comment_pool_id` and pick one randomly (or sequentially).
5. Call Composio: `composio.executeAction('FACEBOOK_CREATE_COMMENT', { object_id, message })` using the user's entity.
6. Log the success or failure in `auto_comment_logs`.

### Step 5: Testing
- We will start by testing the UI and DB saving.
- Then we test the Composio connection flow.
- Finally, we test the worker by running it in a "dry-run" mode (logging the comment it *would* post) before going live.

---

**Do you approve this plan?** Once you give the go-ahead, I will use the Supabase MCP to execute the database migrations (Step 1) and then move to Step 2.
