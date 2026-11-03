-- Enable pg_cron and pg_net extensions if not enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to ping the Render backend to prevent free tier spin-down (inactivity after 15 mins)
CREATE OR REPLACE FUNCTION public.keep_render_backend_alive()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    backend_url TEXT := 'https://apifyactors.onrender.com/health';
BEGIN
    -- Perform an asynchronous HTTP GET request using pg_net
    PERFORM net.http_get(
        url := backend_url,
        headers := '{"User-Agent": "Supabase-KeepAlive-Cron"}'::jsonb,
        timeout_milliseconds := 10000
    );
END;
$$;

-- Schedule the job to run every 10 minutes (* /10)
-- Checks if job already exists before scheduling
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'render_keep_alive_ping') THEN
        PERFORM cron.unschedule('render_keep_alive_ping');
    END IF;
    
    PERFORM cron.schedule(
        'render_keep_alive_ping',
        '*/10 * * * *',
        'SELECT public.keep_render_backend_alive();'
    );
END;
$$;
