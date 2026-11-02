CREATE TABLE IF NOT EXISTS public.hourly_user_match_stats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    match_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, group_id, date, hour)
);

CREATE INDEX IF NOT EXISTS idx_hourly_user_match_stats_user_group_date ON public.hourly_user_match_stats(user_id, group_id, date);

-- Enable RLS
ALTER TABLE public.hourly_user_match_stats ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own stats
CREATE POLICY "Users can view their own hourly match stats" ON public.hourly_user_match_stats
    FOR SELECT USING (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "Admins have full access to hourly match stats" ON public.hourly_user_match_stats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users WHERE admin_users.user_id = auth.uid()
        )
    );
