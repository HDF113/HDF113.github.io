-- ============================================================
-- Personal Website Database Schema (v2 - Full Multi-Module)
-- For: HDF113's Personal Website
-- Backend: Supabase (PostgreSQL)
-- ============================================================
-- Run this entire script in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================================

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
-- 2. ARTICLES TABLE (Blog)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  video_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_tags ON public.articles USING GIN(tags);

-- ============================================================
-- 3. FILE ENTRIES TABLE (File Repository)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.file_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  file_extension TEXT,
  category TEXT DEFAULT 'general',
  download_count INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_category ON public.file_entries(category, created_at DESC);

-- ============================================================
-- 4. COMMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('article', 'project', 'file', 'opensource', 'artwork', 'research', 'literature')),
  target_id UUID NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON public.comments(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);

-- ============================================================
-- 5. RESUME TABLE (Editable homepage resume)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.resume (
  id TEXT PRIMARY KEY DEFAULT 'main',
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. OPENSOURCE PROJECTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.opensource_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  long_description TEXT,
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

CREATE INDEX IF NOT EXISTS idx_oss_list ON public.opensource_projects(sort_order, created_at DESC);

-- ============================================================
-- 7. ARTWORKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT,
  year INTEGER,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artworks_list ON public.artworks(created_at DESC);

-- ============================================================
-- 8. RESEARCH TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  authors TEXT,
  abstract TEXT,
  venue TEXT,
  published_date DATE,
  paper_url TEXT,
  doi TEXT,
  keywords TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_list ON public.research(published_date DESC);

-- ============================================================
-- 9. LITERATURE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.literature (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  excerpt TEXT,
  category TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_literature_list ON public.literature(created_at DESC);

-- ============================================================
-- 10. PLANS TABLE (Future plans - editable single page)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY DEFAULT 'main',
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER files_updated_at
  BEFORE UPDATE ON public.file_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER resume_updated_at
  BEFORE UPDATE ON public.resume
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER oss_updated_at
  BEFORE UPDATE ON public.opensource_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER artworks_updated_at
  BEFORE UPDATE ON public.artworks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER research_updated_at
  BEFORE UPDATE ON public.research
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER literature_updated_at
  BEFORE UPDATE ON public.literature
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 12. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opensource_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.literature ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.is_site_owner()
RETURNS BOOLEAN AS $$
DECLARE
  owner_uuid UUID;
BEGIN
  SELECT id INTO owner_uuid FROM public.profiles WHERE username = 'HDF113' LIMIT 1;
  IF owner_uuid IS NOT NULL AND owner_uuid = auth.uid() THEN
    RETURN TRUE;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES policies
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ARTICLES policies
CREATE POLICY "Articles: public can view published"
  ON public.articles FOR SELECT USING (is_published = true OR public.is_site_owner());
CREATE POLICY "Articles: owner can insert"
  ON public.articles FOR INSERT WITH CHECK (public.is_site_owner());
CREATE POLICY "Articles: owner can update"
  ON public.articles FOR UPDATE USING (public.is_site_owner());
CREATE POLICY "Articles: owner can delete"
  ON public.articles FOR DELETE USING (public.is_site_owner());

-- FILE ENTRIES policies
CREATE POLICY "Files: public can view all"
  ON public.file_entries FOR SELECT USING (true);
CREATE POLICY "Files: owner can insert"
  ON public.file_entries FOR INSERT WITH CHECK (public.is_site_owner());
CREATE POLICY "Files: owner can update"
  ON public.file_entries FOR UPDATE USING (public.is_site_owner());
CREATE POLICY "Files: owner can delete"
  ON public.file_entries FOR DELETE USING (public.is_site_owner());

-- COMMENTS policies
CREATE POLICY "Comments: public can view all"
  ON public.comments FOR SELECT USING (true);
CREATE POLICY "Comments: authenticated can insert"
  ON public.comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Comments: users can update own"
  ON public.comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Comments: users can delete own"
  ON public.comments FOR DELETE USING (auth.uid() = author_id OR public.is_site_owner());

-- RESUME policies (only owner can edit, everyone can view)
CREATE POLICY "Resume: public can view"
  ON public.resume FOR SELECT USING (true);
CREATE POLICY "Resume: owner can insert"
  ON public.resume FOR INSERT WITH CHECK (public.is_site_owner());
CREATE POLICY "Resume: owner can update"
  ON public.resume FOR UPDATE USING (public.is_site_owner());
CREATE POLICY "Resume: owner can delete"
  ON public.resume FOR DELETE USING (public.is_site_owner());

-- OPENSOURCE_PROJECTS policies
CREATE POLICY "OSS: public can view all"
  ON public.opensource_projects FOR SELECT USING (true);
CREATE POLICY "OSS: owner can insert"
  ON public.opensource_projects FOR INSERT WITH CHECK (public.is_site_owner());
CREATE POLICY "OSS: owner can update"
  ON public.opensource_projects FOR UPDATE USING (public.is_site_owner());
CREATE POLICY "OSS: owner can delete"
  ON public.opensource_projects FOR DELETE USING (public.is_site_owner());

-- ARTWORKS policies
CREATE POLICY "Artworks: public can view all"
  ON public.artworks FOR SELECT USING (true);
CREATE POLICY "Artworks: owner can insert"
  ON public.artworks FOR INSERT WITH CHECK (public.is_site_owner());
CREATE POLICY "Artworks: owner can update"
  ON public.artworks FOR UPDATE USING (public.is_site_owner());
CREATE POLICY "Artworks: owner can delete"
  ON public.artworks FOR DELETE USING (public.is_site_owner());

-- RESEARCH policies
CREATE POLICY "Research: public can view all"
  ON public.research FOR SELECT USING (true);
CREATE POLICY "Research: owner can insert"
  ON public.research FOR INSERT WITH CHECK (public.is_site_owner());
CREATE POLICY "Research: owner can update"
  ON public.research FOR UPDATE USING (public.is_site_owner());
CREATE POLICY "Research: owner can delete"
  ON public.research FOR DELETE USING (public.is_site_owner());

-- LITERATURE policies
CREATE POLICY "Literature: public can view all"
  ON public.literature FOR SELECT USING (true);
CREATE POLICY "Literature: owner can insert"
  ON public.literature FOR INSERT WITH CHECK (public.is_site_owner());
CREATE POLICY "Literature: owner can update"
  ON public.literature FOR UPDATE USING (public.is_site_owner());
CREATE POLICY "Literature: owner can delete"
  ON public.literature FOR DELETE USING (public.is_site_owner());

-- PLANS policies
CREATE POLICY "Plans: public can view"
  ON public.plans FOR SELECT USING (true);
CREATE POLICY "Plans: owner can insert"
  ON public.plans FOR INSERT WITH CHECK (public.is_site_owner());
CREATE POLICY "Plans: owner can update"
  ON public.plans FOR UPDATE USING (public.is_site_owner());
CREATE POLICY "Plans: owner can delete"
  ON public.plans FOR DELETE USING (public.is_site_owner());

-- ============================================================
-- 13. STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('articles', 'articles', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('artworks', 'artworks', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('research', 'research', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Articles bucket: public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'articles');
CREATE POLICY "Articles bucket: owner write"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'articles' AND public.is_site_owner());
CREATE POLICY "Articles bucket: owner update"
  ON storage.objects FOR UPDATE USING (bucket_id = 'articles' AND public.is_site_owner());
CREATE POLICY "Articles bucket: owner delete"
  ON storage.objects FOR DELETE USING (bucket_id = 'articles' AND public.is_site_owner());

CREATE POLICY "Files bucket: public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'files');
CREATE POLICY "Files bucket: owner write"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'files' AND public.is_site_owner());
CREATE POLICY "Files bucket: owner update"
  ON storage.objects FOR UPDATE USING (bucket_id = 'files' AND public.is_site_owner());
CREATE POLICY "Files bucket: owner delete"
  ON storage.objects FOR DELETE USING (bucket_id = 'files' AND public.is_site_owner());

CREATE POLICY "Artworks bucket: public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'artworks');
CREATE POLICY "Artworks bucket: owner write"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'artworks' AND public.is_site_owner());
CREATE POLICY "Artworks bucket: owner update"
  ON storage.objects FOR UPDATE USING (bucket_id = 'artworks' AND public.is_site_owner());
CREATE POLICY "Artworks bucket: owner delete"
  ON storage.objects FOR DELETE USING (bucket_id = 'artworks' AND public.is_site_owner());

CREATE POLICY "Research bucket: public read"
  ON storage.objects FOR SELECT USING (bucket_id = 'research');
CREATE POLICY "Research bucket: owner write"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'research' AND public.is_site_owner());
CREATE POLICY "Research bucket: owner update"
  ON storage.objects FOR UPDATE USING (bucket_id = 'research' AND public.is_site_owner());
CREATE POLICY "Research bucket: owner delete"
  ON storage.objects FOR DELETE USING (bucket_id = 'research' AND public.is_site_owner());

-- ============================================================
-- DONE!
-- ============================================================
