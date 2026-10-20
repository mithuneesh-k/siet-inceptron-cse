-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║  Migration 009: Database-Backed Showcase CMS & Role Access Control    ║
-- ║  Target Table: public.showcase_posts                                   ║
-- ║  Run this in your Supabase SQL Editor (Dashboard)                      ║
-- ║  https://supabase.com/dashboard/project/_/sql                         ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- 1. Create Showcase Posts Table with robust field aliases
CREATE TABLE IF NOT EXISTS public.showcase_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    category text NOT NULL DEFAULT 'Project' CHECK (category IN ('Project', 'Achievement', 'Research', 'Innovation', 'Internship')),
    cover_image_url text,
    image_url text,
    project_url text,
    link_url text,
    author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    author_name text,
    author_designation text,
    is_featured boolean DEFAULT false,
    published boolean DEFAULT true,
    is_published boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Indexes for fast query sorting, category browsing, and author filtering
CREATE INDEX IF NOT EXISTS showcase_posts_created_at_idx ON public.showcase_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS showcase_posts_author_id_idx ON public.showcase_posts (author_id);
CREATE INDEX IF NOT EXISTS showcase_posts_category_idx ON public.showcase_posts (category);
CREATE INDEX IF NOT EXISTS showcase_posts_published_idx ON public.showcase_posts (published);

-- 3. Automatic updated_at and synonym synchronization trigger
CREATE OR REPLACE FUNCTION public.handle_showcase_posts_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    
    -- Sync published / is_published
    IF NEW.published IS DISTINCT FROM OLD.published AND NEW.is_published IS NOT DISTINCT FROM OLD.is_published THEN
        NEW.is_published = NEW.published;
    ELSIF NEW.is_published IS DISTINCT FROM OLD.is_published AND NEW.published IS NOT DISTINCT FROM OLD.published THEN
        NEW.published = NEW.is_published;
    END IF;

    -- Sync cover_image_url / image_url
    IF NEW.cover_image_url IS DISTINCT FROM OLD.cover_image_url AND NEW.image_url IS NOT DISTINCT FROM OLD.image_url THEN
        NEW.image_url = NEW.cover_image_url;
    ELSIF NEW.image_url IS DISTINCT FROM OLD.image_url AND NEW.cover_image_url IS NOT DISTINCT FROM OLD.cover_image_url THEN
        NEW.cover_image_url = NEW.image_url;
    END IF;

    -- Sync project_url / link_url
    IF NEW.project_url IS DISTINCT FROM OLD.project_url AND NEW.link_url IS NOT DISTINCT FROM OLD.link_url THEN
        NEW.link_url = NEW.project_url;
    ELSIF NEW.link_url IS DISTINCT FROM OLD.link_url AND NEW.project_url IS NOT DISTINCT FROM OLD.project_url THEN
        NEW.project_url = NEW.link_url;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_showcase_posts_update ON public.showcase_posts;
CREATE TRIGGER tr_showcase_posts_update
    BEFORE UPDATE ON public.showcase_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_showcase_posts_update();

-- 4. Enable Row-Level Security
ALTER TABLE public.showcase_posts ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policy: Anyone (including public visitors) can read published showcase posts
DROP POLICY IF EXISTS "Public read access for published showcase posts" ON public.showcase_posts;
CREATE POLICY "Public read access for published showcase posts"
    ON public.showcase_posts
    FOR SELECT
    USING (published = true OR is_published = true);

-- 6. RLS Policy: Authenticated Faculty / HOD can insert posts with their own author_id
DROP POLICY IF EXISTS "Faculty and HOD can create showcase posts" ON public.showcase_posts;
CREATE POLICY "Faculty and HOD can create showcase posts"
    ON public.showcase_posts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = author_id);

-- 7. RLS Policy: Authors can update their own posts
DROP POLICY IF EXISTS "Authors can update own showcase posts" ON public.showcase_posts;
CREATE POLICY "Authors can update own showcase posts"
    ON public.showcase_posts
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

-- 8. RLS Policy: HODs and Admins can delete showcase posts
DROP POLICY IF EXISTS "HOD can delete any showcase post" ON public.showcase_posts;
CREATE POLICY "HOD can delete any showcase post"
    ON public.showcase_posts
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.faculty f 
            WHERE f.user_id = auth.uid() 
            AND (f.is_hod = true OR UPPER(f.designation) LIKE '%HOD%')
        )
        OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );
