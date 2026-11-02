import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { supabase, BUCKETS } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { translations } from '../i18n/translations'
import { OwnerOnly } from '../components/AccessControl'
import CommentSection from '../components/CommentSection'

export default function ArticleDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isOwner } = useAuth()
  const { lang } = useLanguage()
  const t = translations[lang]

  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchArticle = async () => {
      let query = supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)

      const { data, error } = await query.single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      if (!data.is_published && !isOwner) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setArticle(data)
      setLoading(false)

      if (data.is_published) {
        await supabase
          .from('articles')
          .update({ views: (data.views || 0) + 1 })
          .eq('id', data.id)
      }
    }

    fetchArticle()
  }, [slug, isOwner])

  const handleDelete = async () => {
    if (!confirm(t.blog.confirmDelete)) return

    if (article.cover_image_url) {
      const pathMatch = article.cover_image_url.match(/\/storage\/v1\/object\/public\/articles\/(.+)$/)
      if (pathMatch) {
        await supabase.storage.from(BUCKETS.ARTICLES).remove([pathMatch[1]])
      }
    }

    const { error } = await supabase.from('articles').delete().eq('id', article.id)
    if (!error) {
      navigate('/articles')
    } else {
      alert(t.blog.deleteFailed + ': ' + error.message)
    }
  }

  if (loading) {
    return <div className="loading"><div className="loading-spinner" /></div>
  }

  if (notFound) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">&#128533;</div>
          <h2>{t.blog.notFound}</h2>
          <p className="text-muted mt-1">{t.blog.notFoundDesc}</p>
          <Link to="/articles" className="btn mt-2">{t.blog.backToList}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <article className="article-detail">
        <div className="breadcrumb mb-2">
          <Link to="/articles" className="text-secondary">{t.blog.title}</Link>
          <span className="text-muted">/</span>
          <span>{article.title}</span>
        </div>

        <h1 className="article-title">{article.title}</h1>

        <div className="article-meta-bar">
          <span className="text-muted">
            {new Date(article.created_at).toLocaleDateString()}
          </span>
          <span className="text-muted">{article.views || 0} {t.blog.views}</span>
          {!article.is_published && (
            <span className="badge" style={{ background: 'var(--warning)', color: '#000', borderColor: 'var(--warning)' }}>
              {t.blog.draft}
            </span>
          )}
          {article.tags?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {article.tags.map((tag) => (
                <span key={tag} className="badge badge-secondary">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {article.cover_image_url && (
          <img
            src={article.cover_image_url}
            alt={article.title}
            className="article-cover"
          />
        )}

        {article.video_url && (
          <div className="article-video mt-2">
            {article.video_url.includes('youtube') || article.video_url.includes('youtu.be') ? (
              <iframe
                src={article.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                title="Article video"
                frameBorder="0"
                allowFullScreen
                style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius)' }}
              />
            ) : article.video_url.includes('bilibili') ? (
              <iframe
                src={article.video_url.replace('video/', 'player/').replace('BV', 'BV')}
                title="Article video"
                frameBorder="0"
                allowFullScreen
                style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius)' }}
              />
            ) : (
              <video controls style={{ width: '100%', borderRadius: 'var(--radius)' }}>
                <source src={article.video_url} />
              </video>
            )}
          </div>
        )}

        <div className="markdown-body mt-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {article.content}
          </ReactMarkdown>
        </div>

        <OwnerOnly>
          <div className="owner-controls card mt-3">
            <h4>{t.blog.manageArticle}</h4>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Link to={`/articles/${article.slug}/edit`} className="btn btn-sm">{t.common.edit}</Link>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>{t.common.delete}</button>
            </div>
          </div>
        </OwnerOnly>

        <CommentSection targetType="article" targetId={article.id} />
      </article>
    </div>
  )
}
