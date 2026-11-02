import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { translations } from '../i18n/translations'
import { OwnerOnly } from '../components/AccessControl'

export default function Home() {
  const { isOwner } = useAuth()
  const { lang } = useLanguage()
  const t = translations[lang]

  const [resume, setResume] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [stats, setStats] = useState({ articles: 0, opensource: 0, artworks: 0, research: 0, literature: 0, files: 0 })
  const [recentArticles, setRecentArticles] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [resumeRes, articlesCount, ossCount, artCount, researchCount, litCount, filesCount, recentRes] = await Promise.all([
      supabase.from('resume').select('*').eq('id', 'main').single(),
      supabase.from('articles').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('opensource_projects').select('*', { count: 'exact', head: true }),
      supabase.from('artworks').select('*', { count: 'exact', head: true }),
      supabase.from('research').select('*', { count: 'exact', head: true }),
      supabase.from('literature').select('*', { count: 'exact', head: true }),
      supabase.from('file_entries').select('*', { count: 'exact', head: true }),
      supabase.from('articles').select('id, title, slug, excerpt, created_at').eq('is_published', true).order('created_at', { ascending: false }).limit(5),
    ])

    setResume(resumeRes.data || getDefaultResume())
    setEditContent((resumeRes.data?.content) || getDefaultResume().content)
    setStats({
      articles: articlesCount.count || 0,
      opensource: ossCount.count || 0,
      artworks: artCount.count || 0,
      research: researchCount.count || 0,
      literature: litCount.count || 0,
      files: filesCount.count || 0,
    })
    setRecentArticles(recentRes.data || [])
    setLoading(false)
  }

  const getDefaultResume = () => ({
    id: 'main',
    content: lang === 'zh' ? `# HDF113\n\n## 全栈开发者 & 技术创作者\n\n欢迎来到我的个人空间！\n\n### 关于我\n- 热爱技术与创作\n- 专注于 Web 开发与人工智能\n- 喜欢开源，乐于分享\n\n### 技术栈\n- React, Vue, Node.js\n- Python, Go\n- PostgreSQL, Supabase\n\n### 联系方式\n- GitHub: https://github.com/HDF113\n` : `# HDF113\n\n## Full-stack Developer & Tech Creator\n\nWelcome to my personal space!\n\n### About Me\n- Passionate about technology and creation\n- Focused on Web Development and AI\n- Love open source, enjoy sharing\n\n### Tech Stack\n- React, Vue, Node.js\n- Python, Go\n- PostgreSQL, Supabase\n\n### Contact\n- GitHub: https://github.com/HDF113\n`,
  })

  const handleSave = async () => {
    const { error } = await supabase
      .from('resume')
      .upsert({ id: 'main', content: editContent, updated_at: new Date().toISOString() })

    if (!error) {
      setResume({ ...resume, content: editContent })
      setEditing(false)
    }
  }

  if (loading) {
    return <div className="loading"><div className="loading-spinner" /></div>
  }

  return (
    <div className="container">
      {/* Resume Section */}
      <section className="resume-section card">
        <div className="flex items-center justify-between mb-2">
          <h2>{t.home.sections.about}</h2>
          <OwnerOnly>
            {editing ? (
              <div className="flex gap-1">
                <button className="btn btn-primary btn-sm" onClick={handleSave}>{t.home.saveResume}</button>
                <button className="btn btn-sm" onClick={() => { setEditing(false); setEditContent(resume?.content || ''); }}>{t.home.cancelEdit}</button>
              </div>
            ) : (
              <button className="btn btn-sm" onClick={() => setEditing(true)}>{t.home.editResume}</button>
            )}
          </OwnerOnly>
        </div>

        {editing ? (
          <div className="editor-layout">
            <div className="editor-form">
              <textarea
                className="form-textarea"
                rows="25"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="# Markdown resume..."
              />
            </div>
            <div className="editor-preview">
              <h4 className="text-secondary mb-1">{t.blog.preview}</h4>
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{resume?.content || ''}</ReactMarkdown>
          </div>
        )}
      </section>

      {/* Stats Grid */}
      <section className="stats-grid mt-3">
        <Link to="/articles" className="stat-card card card-link">
          <div className="stat-number">{stats.articles}</div>
          <div className="stat-label">{t.home.stats.articles}</div>
        </Link>
        <Link to="/opensource" className="stat-card card card-link">
          <div className="stat-number">{stats.opensource}</div>
          <div className="stat-label">{t.nav.opensource}</div>
        </Link>
        <Link to="/artworks" className="stat-card card card-link">
          <div className="stat-number">{stats.artworks}</div>
          <div className="stat-label">{t.nav.artworks}</div>
        </Link>
        <Link to="/research" className="stat-card card card-link">
          <div className="stat-number">{stats.research}</div>
          <div className="stat-label">{t.nav.research}</div>
        </Link>
        <Link to="/literature" className="stat-card card card-link">
          <div className="stat-number">{stats.literature}</div>
          <div className="stat-label">{t.nav.literature}</div>
        </Link>
        <Link to="/files" className="stat-card card card-link">
          <div className="stat-number">{stats.files}</div>
          <div className="stat-label">{t.nav.files}</div>
        </Link>
      </section>

      {/* Owner Panel */}
      <OwnerOnly>
        <section className="owner-panel card mt-3">
          <h3>{t.home.ownerPanel}</h3>
          <p className="text-secondary mt-1">{t.home.quickActions}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Link to="/articles/new" className="btn btn-primary btn-sm">{t.home.newArticle}</Link>
            <Link to="/files/upload" className="btn btn-primary btn-sm">{t.home.uploadFile}</Link>
          </div>
        </section>
      </OwnerOnly>

      {/* Recent Articles */}
      <section className="mt-3">
        <div className="flex items-center justify-between mb-2">
          <h2>{t.home.recentArticles}</h2>
          <Link to="/articles" className="text-secondary">{t.home.viewAll} &rarr;</Link>
        </div>
        {recentArticles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#9998;</div>
            <p>{t.home.noArticles}</p>
          </div>
        ) : (
          <div className="article-list">
            {recentArticles.map((article) => (
              <Link key={article.id} to={`/articles/${article.slug}`} className="article-item card card-link">
                <h3>{article.title}</h3>
                {article.excerpt && <p className="text-secondary">{article.excerpt}</p>}
                <div className="article-meta">
                  <span className="text-muted">{new Date(article.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
