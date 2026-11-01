-- ============================================================
-- Personal Website Database Schema
-- For: HDF113's Personal Website
-- Backend: Supabase (PostgreSQL)
-- ============================================================
-- Run this entire script in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================================
-- Stores additional user info alongside Supabase Auth.
-- The site owner is identified by checking if their GitHub login
-- matches the SITE_OWNER constant ('HDF113') in the frontend.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  website TEXT,
  bio TEXT,
  is_site_owner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'preferred_username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. ARTICLES TABLE
-- ============================================================
-- Stores technical articles with Markdown content.
-- Supports cover images, embedded images, and video URLs.

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,          -- Markdown content
  cover_image_url TEXT,
  video_url TEXT,                  -- External video URL (YouTube, Bilibili, etc.)
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON public.articles USING GIN(tags);

-- ============================================================
-- 3. PROJECTS TABLE
-- ============================================================
-- Stores coding project showcases.

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  long_description TEXT,           -- Markdown content for detailed description
  tech_stack TEXT[] DEFAULT '{}',
  repo_url TEXT,
  demo_url TEXT,
  screenshot_url TEXT,
  featured BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_list ON public.projects(sort_order, created_at DESC);

-- ============================================================
-- 4. FILES TABLE
-- ============================================================
-- Stores metadata for uploaded files in the file repository.
-- Actual file binaries are stored in Supabase Storage (bucket: 'files').

CREATE TABLE IF NOT EXISTS public.file_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,         -- Path in Supabase Storage bucket
  file_size BIGINT,
  file_type TEXT,                   -- MIME type
  file_extension TEXT,
  category TEXT DEFAULT 'general',  -- e.g., 'documents', 'images', 'code', 'archives'
  download_count INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_category ON public.file_entries(category, created_at DESC);

-- ============================================================
-- 5. COMMENTS TABLE
-- ============================================================
-- Universal commenting system supporting articles and projects.
-- Uses polymorphic relation via (target_type, target_id).

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('article', 'project', 'file')),
  target_id UUID NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE, -- For threaded replies
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON public.comments(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);

-- ============================================================
-- 6. UPDATED_AT TRIGGER
-- ============================================================
-- Automatically update updated_at on row modification.

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER files_updated_at
  BEFORE UPDATE ON public.file_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is the site owner
-- The site owner is determined by matching the GitHub username.
-- You MUST set your Supabase auth user's metadata or profile username
-- to 'HDF113' (your GitHub username). Alternatively, you can hardcode
-- your Supabase auth user UUID below for guaranteed owner detection.
CREATE OR REPLACE FUNCTION public.is_site_owner()
RETURNS BOOLEAN AS $$
DECLARE
  owner_uuid UUID;
BEGIN
  -- Option 1: Check by username in profiles table
  SELECT id INTO owner_uuid FROM public.profiles WHERE username = 'HDF113' LIMIT 1;
  IF owner_uuid IS NOT NULL AND owner_uuid = auth.uid() THEN
    RETURN TRUE;
  END IF;

  -- Option 2: Hardcode your Supabase auth user UUID here for guaranteed detection
  -- Uncomment and replace with your actual auth user UUID:
  -- IF auth.uid() = '00000000-0000-0000-0000-000000000000'::UUID THEN
  --   RETURN TRUE;
  -- END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------
-- PROFILES policies
-- ------------------------------------------------------------
-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (fallback if trigger fails)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------
-- ARTICLES policies
-- ------------------------------------------------------------
-- Anyone can view published articles; owner can view all
CREATE POLICY "Articles: public can view published"
  ON public.articles FOR SELECT
  USING (is_published = true OR public.is_site_owner());

-- Only site owner can insert articles
CREATE POLICY "Articles: owner can insert"
  ON public.articles FOR INSERT
  WITH CHECK (public.is_site_owner());

-- Only site owner can update articles
CREATE POLICY "Articles: owner can update"
  ON public.articles FOR UPDATE
  USING (public.is_site_owner());

-- Only site owner can delete articles
CREATE POLICY "Articles: owner can delete"
  ON public.articles FOR DELETE
  USING (public.is_site_owner());

-- ------------------------------------------------------------
-- PROJECTS policies
-- ------------------------------------------------------------
-- Anyone can view all projects
CREATE POLICY "Projects: public can view all"
  ON public.projects FOR SELECT
  USING (true);

-- Only site owner can insert projects
CREATE POLICY "Projects: owner can insert"
  ON public.projects FOR INSERT
  WITH CHECK (public.is_site_owner());

-- Only site owner can update projects
CREATE POLICY "Projects: owner can update"
  ON public.projects FOR UPDATE
  USING (public.is_site_owner());

-- Only site owner can delete projects
CREATE POLICY "Projects: owner can delete"
  ON public.projects FOR DELETE
  USING (public.is_site_owner());

-- ------------------------------------------------------------
-- FILE ENTRIES policies
-- ------------------------------------------------------------
-- Anyone can view file entries
CREATE POLICY "Files: public can view all"
  ON public.file_entries FOR SELECT
  USING (true);

-- Only site owner can insert file entries
CREATE POLICY "Files: owner can insert"
  ON public.file_entries FOR INSERT
  WITH CHECK (public.is_site_owner());

-- Only site owner can update file entries
CREATE POLICY "Files: owner can update"
  ON public.file_entries FOR UPDATE
  USING (public.is_site_owner());

-- Only site owner can delete file entries
CREATE POLICY "Files: owner can delete"
  ON public.file_entries FOR DELETE
  USING (public.is_site_owner());

-- ------------------------------------------------------------
-- COMMENTS policies
-- ------------------------------------------------------------
-- Anyone can view comments
CREATE POLICY "Comments: public can view all"
  ON public.comments FOR SELECT
  USING (true);

-- Any authenticated user can insert comments
CREATE POLICY "Comments: authenticated can insert"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own comments
CREATE POLICY "Comments: users can update own"
  ON public.comments FOR UPDATE
  USING (auth.uid() = author_id);

-- Users can delete their own comments; site owner can delete any
CREATE POLICY "Comments: users can delete own"
  ON public.comments FOR DELETE
  USING (auth.uid() = author_id OR public.is_site_owner());

-- ============================================================
-- 8. STORAGE BUCKETS
-- ============================================================
-- Create storage buckets for file uploads.
-- Run these in Supabase Dashboard > Storage, or execute via SQL.

INSERT INTO storage.buckets (id, name, public) VALUES ('articles', 'articles', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('projects', 'projects', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public can read, only owner can write
-- Articles bucket
CREATE POLICY "Articles bucket: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'articles');

CREATE POLICY "Articles bucket: owner write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'articles' AND public.is_site_owner());

CREATE POLICY "Articles bucket: owner update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'articles' AND public.is_site_owner());

CREATE POLICY "Articles bucket: owner delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'articles' AND public.is_site_owner());

-- Projects bucket
CREATE POLICY "Projects bucket: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'projects');

CREATE POLICY "Projects bucket: owner write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'projects' AND public.is_site_owner());

CREATE POLICY "Projects bucket: owner update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'projects' AND public.is_site_owner());

CREATE POLICY "Projects bucket: owner delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'projects' AND public.is_site_owner());

-- Files bucket
CREATE POLICY "Files bucket: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'files');

CREATE POLICY "Files bucket: owner write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'files' AND public.is_site_owner());

CREATE POLICY "Files bucket: owner update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'files' AND public.is_site_owner());

CREATE POLICY "Files bucket: owner delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'files' AND public.is_site_owner());

-- ============================================================
-- DONE! Your database schema is ready.
-- ============================================================
-- Next steps:
-- 1. Create a Supabase project at https://supabase.com
-- 2. Run this SQL script in Supabase SQL Editor
-- 3. Enable GitHub OAuth provider in Authentication > Providers
-- 4. Copy your project URL and anon key to the .env file
-- 5. Sign up with your GitHub account (username: HDF113)
--    The is_site_owner() function will recognize you as the owner
-- ============================================================
