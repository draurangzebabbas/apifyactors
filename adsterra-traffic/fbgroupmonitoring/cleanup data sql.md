-- ============================================================
-- SAFE DATA RESET — FB Group Monitor
-- Deletes: posts, runs, costs, heatmaps, matches
-- Keeps: users, groups, members, keywords, keys, cookies, subs
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Delete matches first (FK references facebook_posts)
DELETE FROM user_post_matches;

-- Step 2: Delete heatmap / stats data
DELETE FROM hourly_user_match_stats;
DELETE FROM hourly_post_stats;

-- Step 3: Delete cost archive summaries
DELETE FROM daily_scrape_cost_summary;

-- Step 4: Delete scrape run logs
DELETE FROM scrape_runs;

-- Step 5: Delete all posts
DELETE FROM facebook_posts;

-- Step 6: Reset lifetime counters (if table exists)
DELETE FROM historical_group_stats;

-- Step 7: Reset adaptive limit on groups back to default 15
-- (optional but recommended so engine starts fresh)
UPDATE groups SET current_results_limit = 15, adaptive_state = 'LEARNING';

-- ============================================================
-- VERIFY — run these to confirm everything is empty
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM facebook_posts)        AS posts,
  (SELECT COUNT(*) FROM scrape_runs)           AS runs,
  (SELECT COUNT(*) FROM user_post_matches)     AS matches,
  (SELECT COUNT(*) FROM hourly_post_stats)     AS heatmap_rows,
  (SELECT COUNT(*) FROM daily_scrape_cost_summary) AS cost_summaries;
