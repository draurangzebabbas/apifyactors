CREATE OR REPLACE FUNCTION public.update_hourly_user_match_stats()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    post_group_id UUID;
    post_posted_at TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT group_id, posted_at INTO post_group_id, post_posted_at
    FROM facebook_posts
    WHERE id = NEW.post_id;

    IF FOUND AND post_posted_at IS NOT NULL THEN
        INSERT INTO hourly_user_match_stats (user_id, group_id, date, hour, match_count)
        VALUES (
            NEW.user_id,
            post_group_id,
            (post_posted_at AT TIME ZONE 'UTC')::date,
            EXTRACT(HOUR FROM (post_posted_at AT TIME ZONE 'UTC'))::integer,
            1
        )
        ON CONFLICT (user_id, group_id, date, hour)
        DO UPDATE SET match_count = hourly_user_match_stats.match_count + 1;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_update_hourly_user_match_stats
AFTER INSERT ON public.user_post_matches
FOR EACH ROW EXECUTE FUNCTION update_hourly_user_match_stats();
