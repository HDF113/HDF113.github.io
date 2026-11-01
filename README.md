# HDF113 Personal Website

A modern, minimalist personal website built with React + Vite + Supabase, deployed on GitHub Pages.

## Features

- **Tech Articles** - Write articles in Markdown with image and video support
- **Project Showcase** - Display coding projects with tech stack, repo and demo links
- **File Repository** - Upload and share files of any type
- **Commenting System** - Authenticated users can comment; site owner can moderate
- **Role-Based Access Control** - Owner (full CRUD), Authenticated users (comment only), Visitors (read-only)
- **Dark Tech Theme** - Clean, modern, developer-friendly design

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Backend (BaaS) | Supabase (Auth + PostgreSQL + Storage) |
| Styling | Pure CSS (CSS Variables, no framework) |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| Deployment | GitHub Pages (via GitHub Actions) |

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A GitHub account (username: HDF113)
- A Supabase account (free tier is sufficient)

### Step 1: Clone and Install

```bash
 git clone https://github.com/HDF113/HDF113.github.io.git
 cd HDF113.github.io
 npm install
```

### Step 2: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the Supabase Dashboard, go to **SQL Editor**
3. Copy the entire contents of `supabase/schema.sql` and paste it into the SQL editor
4. Click **Run** to execute the script - this creates all tables, policies, and storage buckets

### Step 3: Enable GitHub OAuth

1. In Supabase Dashboard, go to **Authentication > Providers**
2. Enable the **GitHub** provider
3. You need to create a GitHub OAuth App:
   - Go to GitHub > Settings > Developer settings > OAuth Apps > New OAuth App
   - Application name: `HDF113 Website`
   - Homepage URL: `https://hdf113.github.io`
   - Authorization callback URL: `https://your-project-ref.supabase.co/auth/v1/callback`
   - Copy the Client ID and generate a Client Secret
4. Paste the Client ID and Client Secret into Supabase's GitHub provider settings

### Step 4: Configure Environment Variables

Create a `.env` file in the project root:

```bash
 cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in: Supabase Dashboard > Settings > API

### Step 5: Run Locally

```bash
 npm run dev
```

Open `http://localhost:5173` in your browser.

### Step 6: Sign In as Owner

1. Click "Sign In" in the navbar - you'll be redirected to GitHub OAuth
2. Authorize the app with your GitHub account (username: **HDF113**)
3. After signing in, the system will recognize you as the site owner
4. You'll see "Owner" badge and gain full CRUD access

> **Important**: The `is_site_owner()` database function checks if your profile username matches `HDF113`. If your GitHub username is different, update the `SITE_OWNER` constant in `src/lib/supabase.js` and the SQL function in `supabase/schema.sql`.

## Deployment to GitHub Pages

### Option A: Automatic Deployment (Recommended)

This project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys when you push to `main`.

1. Create a repository named `HDF113.github.io` on GitHub
2. Push your code to the `main` branch
3. Add repository secrets (GitHub repo > Settings > Secrets and variables > Actions):
   - `VITE_SUPABASE_URL` - your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - your Supabase anon key
4. Enable GitHub Pages: repo > Settings > Pages > Source > **GitHub Actions**
5. Push to `main` - the workflow will build and deploy automatically
6. Your site will be live at `https://hdf113.github.io`

### Option B: Manual Deployment

```bash
 npm run build
 # The dist/ folder contains the static files
 # You can use gh-pages package:
 npm run deploy
```

## Project Structure

```
personal-website/
|-- .github/workflows/deploy.yml   # GitHub Actions auto-deploy
|-- public/
|   |-- favicon.svg
|-- src/
|   |-- components/
|   |   |-- AccessControl.jsx      # OwnerOnly / AuthRequired wrappers
|   |   |-- CommentSection.jsx     # Comment system with replies
|   |   |-- Footer.jsx
|   |   |-- Layout.jsx
|   |   |-- Navbar.jsx             # Auth-aware navigation
|   |-- context/
|   |   |-- AuthContext.jsx        # Supabase auth state management
|   |-- lib/
|   |   |-- supabase.js            # Supabase client + config
|   |-- pages/
|   |   |-- Home.jsx               # Landing page with stats
|   |   |-- ArticlesList.jsx       # Article listing with search/filter
|   |   |-- ArticleDetail.jsx      # Full article view with comments
|   |   |-- ArticleEditor.jsx      # Markdown editor with live preview
|   |   |-- ProjectsList.jsx       # Project showcase grid
|   |   |-- ProjectDetail.jsx      # Project detail with comments
|   |   |-- ProjectEditor.jsx      # Project create/edit form
|   |   |-- FilesList.jsx          # File repository table
|   |   |-- FileUpload.jsx         # Drag-and-drop file upload
|   |   |-- NotFound.jsx           # 404 page
|   |-- styles/
|   |   |-- global.css             # CSS variables, base styles
|   |   |-- layout.css             # Navbar/Footer styles
|   |   |-- pages.css              # Page-specific styles
|   |-- App.jsx                    # Router configuration
|   |-- main.jsx                   # Entry point
|-- supabase/
|   |-- schema.sql                 # Database schema + RLS policies
|-- .env.example
|-- index.html
|-- package.json
|-- vite.config.js
```

## Permission Model

| Action | Owner | Authenticated User | Visitor |
|--------|:-----:|:-------------------:|:-------:|
| View published content | Yes | Yes | Yes |
| Create/Edit/Delete articles | Yes | No | No |
| Create/Edit/Delete projects | Yes | No | No |
| Upload/Delete files | Yes | No | No |
| Post comments | Yes | Yes | No |
| Delete own comments | Yes | Yes | No |
| Delete any comment | Yes | No | No |

Permissions are enforced at two levels:
1. **Database level**: PostgreSQL Row Level Security (RLS) policies in `supabase/schema.sql`
2. **UI level**: React components conditionally render edit/delete controls

## Managing Content

### Writing Articles
1. Sign in as owner
2. Navigate to Articles > "+ New Article"
3. Write in Markdown - supports code blocks, images, tables
4. Upload a cover image or insert images inline
5. Add a video URL (YouTube/Bilibili supported)
6. Click "Publish" to make it public, or "Save as Draft"

### Adding Projects
1. Sign in as owner
2. Navigate to Projects > "+ New Project"
3. Fill in title, description, tech stack, repo/demo URLs
4. Upload a screenshot
5. Mark as "Featured" to show on homepage

### Uploading Files
1. Sign in as owner
2. Navigate to Files > "+ Upload File"
3. Drag and drop or click to select a file
4. Add a name, description, and category
5. Click "Upload File"

## Customization

### Change Site Owner
Edit `SITE_OWNER` in `src/lib/supabase.js` and the `is_site_owner()` function in `supabase/schema.sql`.

### Change Theme Colors
Edit CSS variables in `src/styles/global.css`:

```css
:root {
  --bg-primary: #0a0a0f;
  --accent: #64ffda;
  /* ... */
}
```

### Add Analytics
Add your analytics script to `index.html`.

## Troubleshooting

### Site shows blank page
- Check browser console for errors
- Verify `.env` file exists and has correct Supabase URL and key
- Ensure you ran `npm run build` before deploying

### Cannot sign in
- Verify GitHub OAuth app callback URL matches your Supabase project URL
- Check that GitHub provider is enabled in Supabase Auth settings

### Owner badge not showing
- Ensure your GitHub username matches `SITE_OWNER` in `src/lib/supabase.js`
- Check that the `is_site_owner()` function in SQL recognizes your username
- Alternative: uncomment the hardcoded UUID check in the SQL function and put your auth user UUID

### Cannot upload files/images
- Verify storage buckets were created (run schema.sql)
- Check storage policies are set up correctly
- Ensure you're signed in as the owner

## License

MIT
