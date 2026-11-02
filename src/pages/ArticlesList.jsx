import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { translations } from '../i18n/translations'
import { OwnerOnly } from '../components/AccessControl'

export default function ArticlesList() {
  const { isOwner } = useAuth()
  const { lang } = useLanguage()
  const t = translations[lang]

  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState('')

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    let query = supabase
      .from('articles')
      .select('id, title, slug, excerpt, created_at, tags, is_published, views')
      .order('created_at', { ascending: false })

    if (!isOwner) {
      query = query.eq('is_published', true)
    }

    const { data, error } = await query
    if (!error) setArticles(data || [])
    setLoading(false)
  }

  const allTags = [...new Set(articles.flatMap((a) => a.tags || []))].sort()

  const filtered = articles.filter((article) => {
    const matchesSearch =
      !searchTerm ||
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTag = !selectedTag || article.tags?.includes(selectedTag)
    return matchesSearch && matchesTag
  })

  if (loading) {
    return <div className="loading"><div className="loading-spinner" /></div>
  }

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h1>{t.blog.title}</h1>
        <OwnerOnly>
          <Link to="/articles/new" className="btn btn-primary btn-sm">+ {t.blog.newArticle}</Link>
        </OwnerOnly>
      </div>

      <div className="filter-bar mb-3">
        <input
          type="text"
          className="form-input"
          placeholder={t.blog.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {allTags.length > 0 && (
          <select
            className="form-select"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="">{t.blog.allTags}</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#9998;</div>
          <p>{t.blog.noArticles}</p>
        </div>
      ) : (
        <div className="article-list">
          {filtered.map((article) => (
            <Link
              key={article.id}
              to={`/articles/${article.slug}`}
              className="article-item card card-link"
            >
              <div className="flex items-center justify-between flex-wrap gap-1">
                <h2>{article.title}</h2>
                {!article.is_published && (
                  <span className="badge" style={{ background: 'var(--warning)', color: '#000', borderColor: 'var(--warning)' }}>
                    {t.blog.draft}
                  </span>
                )}
              </div>
              {article.excerpt && <p className="text-secondary">{article.excerpt}</p>}
              <div className="article-meta">
                <span className="text-muted">
                  {new Date(article.created_at).toLocaleDateString()}
                </span>
                <span className="text-muted">{article.views || 0} {t.blog.views}</span>
                {article.tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {article.tags.map((tag) => (
                      <span key={tag} className="badge badge-secondary">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
