-- Create user_pages table
CREATE TABLE IF NOT EXISTS public.user_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    composio_connection_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    page_name TEXT NOT NULL,
    page_avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for user_pages
ALTER TABLE public.user_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own pages" ON public.user_pages
    FOR ALL USING (auth.uid() = user_id);

-- Create comment_pools table
CREATE TABLE IF NOT EXISTS public.comment_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for comment_pools
ALTER TABLE public.comment_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own comment pools" ON public.comment_pools
    FOR ALL USING (auth.uid() = user_id);

-- Create comment_pool_items table
CREATE TABLE IF NOT EXISTS public.comment_pool_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES public.comment_pools(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for comment_pool_items
ALTER TABLE public.comment_pool_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own comment pool items" ON public.comment_pool_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.comment_pools
            WHERE id = comment_pool_items.pool_id AND user_id = auth.uid()
        )
    );

-- Add new columns to user_keywords
ALTER TABLE public.user_keywords 
ADD COLUMN IF NOT EXISTS auto_comment_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS user_page_id UUID REFERENCES public.user_pages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS comment_pool_id UUID REFERENCES public.comment_pools(id) ON DELETE SET NULL;

-- Create auto_comment_logs table
CREATE TABLE IF NOT EXISTS public.auto_comment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL,
    keyword_id UUID REFERENCES public.user_keywords(id) ON DELETE SET NULL,
    user_page_id UUID REFERENCES public.user_pages(id) ON DELETE SET NULL,
    comment_text TEXT,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for auto_comment_logs
ALTER TABLE public.auto_comment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own auto comment logs" ON public.auto_comment_logs
    FOR SELECT USING (auth.uid() = user_id);
