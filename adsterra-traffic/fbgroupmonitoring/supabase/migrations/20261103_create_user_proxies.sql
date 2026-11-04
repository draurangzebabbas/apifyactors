-- Create user_proxies table for the proxy vault
CREATE TABLE IF NOT EXISTS public.user_proxies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    proxy_name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 7777,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    connection_type TEXT NOT NULL DEFAULT 'http',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_proxies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own proxies"
    ON public.user_proxies FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own proxies"
    ON public.user_proxies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own proxies"
    ON public.user_proxies FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own proxies"
    ON public.user_proxies FOR DELETE
    USING (auth.uid() = user_id);

