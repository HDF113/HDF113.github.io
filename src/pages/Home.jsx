import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { OwnerOnly } from '../components/AccessControl'

export default function Home() {
  const { isOwner } = useAuth()
  const [stats, setStats] = useState({ articles: 0, projects: 0, files: 0 })
  const [recentArticles, setRecentArticles] = useState([])
  const [featuredProjects, setFeaturedProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [articlesRes, projectsRes, filesRes, recentRes, featuredRes] = await Promise.all([
        supabase.from('articles').select('*', { count: 'exact', head: true }).eq('is_published', true),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('file_entries').select('*', { count: 'exact', head: true }),
        supabase.from('articles').select('id, title, slug, excerpt, created_at, tags').eq('is_published', true).order('created_at', { ascending: false }).limit(5),
        supabase.from('projects').select('id, title, slug, description, tech_stack, screenshot_url, repo_url, demo_url').eq('featured', true).order('sort_order').limit(3),
      ])

      setStats({
        articles: articlesRes.count || 0,
        projects: projectsRes.count || 0,
        files: filesRes.count || 0,
      })
      setRecentArticles(recentRes.data || [])
      setFeaturedProjects(featuredRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="loading"><div className="loading-spinner" /></div>
  }

  return (
    <div className="container">
      {/* Hero */}
      <section className="hero">
        <h1 className="hero-title">HDF113</h1>
        <p className="hero-subtitle">Developer &amp; Tech Writer</p>
        <p className="hero-desc">
          Welcome to my personal space on the web. I write about technology, build projects, and share resources.
        </p>
        <div className="hero-actions">
          <Link to="/articles" className="btn btn-primary">Read Articles</Link>
          <Link to="/projects" className="btn">View Projects</Link>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-grid mt-3">
        <Link to="/articles" className="stat-card card card-link">
          <div className="stat-number">{stats.articles}</div>
          <div className="stat-label">Articles</div>
        </Link>
        <Link to="/projects" className="stat-card card card-link">
          <div className="stat-number">{stats.projects}</div>
          <div className="stat-label">Projects</div>
        </Link>
        <Link to="/files" className="stat-card card card-link">
          <div className="stat-number">{stats.files}</div>
          <div className="stat-label">Files</div>
        </Link>
      </section>

      {/* Owner actions */}
      <OwnerOnly>
        <section className="owner-panel card mt-3">
          <h3>Owner Dashboard</h3>
          <p className="text-secondary mt-1">Quick actions for managing your site:</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Link to="/articles/new" className="btn btn-primary btn-sm">+ New Article</Link>
            <Link to="/projects/new" className="btn btn-primary btn-sm">+ New Project</Link>
            <Link to="/files/upload" className="btn btn-primary btn-sm">+ Upload File</Link>
          </div>
        </section>
      </OwnerOnly>

      {/* Recent articles */}
      <section className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <h2>Recent Articles</h2>
          <Link to="/articles" className="text-secondary">View all &rarr;</Link>
        </div>
        {recentArticles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#9998;</div>
            <p>No articles published yet.</p>
          </div>
        ) : (
          <div className="article-list">
            {recentArticles.map((article) => (
              <Link key={article.id} to={`/articles/${article.slug}`} className="article-item card card-link">
                <h3>{article.title}</h3>
                {article.excerpt && <p className="text-secondary">{article.excerpt}</p>}
                <div className="article-meta">
                  <span className="text-muted">
                    {new Date(article.created_at).toLocaleDateString()}
                  </span>
                  {article.tags?.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="badge badge-secondary">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured projects */}
      <section className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <h2>Featured Projects</h2>
          <Link to="/projects" className="text-secondary">View all &rarr;</Link>
        </div>
        {featuredProjects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#128187;</div>
            <p>No featured projects yet.</p>
          </div>
        ) : (
          <div className="grid grid-3">
            {featuredProjects.map((project) => (
              <Link key={project.id} to={`/projects/${project.slug}`} className="card card-link">
                {project.screenshot_url && (
                  <img src={project.screenshot_url} alt={project.title} className="project-thumb" />
                )}
                <h3>{project.title}</h3>
                <p className="text-secondary text-sm">{project.description}</p>
                {project.tech_stack?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {project.tech_stack.slice(0, 3).map((tech) => (
                      <span key={tech} className="badge badge-secondary">{tech}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
