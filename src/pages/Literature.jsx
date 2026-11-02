import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { translations } from '../i18n/translations'
import { OwnerOnly } from '../components/AccessControl'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Literature() {
  const { isOwner } = useAuth()
  const { lang } = useLanguage()
  const t = translations[lang]

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLiterature()
  }, [])

  const fetchLiterature = async () => {
    const { data, error } = await supabase
      .from('literature')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setItems(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t.common.confirmDelete)) return
    const { error } = await supabase.from('literature').delete().eq('id', id)
    if (!error) setItems(items.filter((l) => l.id !== id))
  }

  if (loading) {
    return <div className="loading"><div className="loading-spinner" /></div>
  }

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h1>{t.literature.title}</h1>
        <OwnerOnly>
          <button className="btn btn-primary btn-sm" onClick={() => alert('Add literature form coming soon')}>{t.literature.newLiterature}</button>
        </OwnerOnly>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#9999;</div>
          <p>{t.literature.noLiterature}</p>
        </div>
      ) : (
        <div className="article-list">
          {items.map((item) => (
            <div key={item.id} className="card">
              <h3>{item.title}</h3>
              <div className="article-meta mb-1">
                {item.category && <span className="badge badge-secondary">{item.category}</span>}
                <span className="text-muted"> &middot; {new Date(item.created_at).toLocaleDateString()}</span>
              </div>
              {item.excerpt && <p className="text-secondary text-sm">{item.excerpt}</p>}
              {item.content && (
                <div className="markdown-body mt-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
                </div>
              )}
              <OwnerOnly>
                <div className="flex gap-1 mt-2">
                  <button className="btn btn-sm" onClick={() => alert('Edit coming soon')}>{t.common.edit}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.id)}>{t.common.delete}</button>
                </div>
              </OwnerOnly>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
