import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { translations } from '../i18n/translations'
import { OwnerOnly } from '../components/AccessControl'

export default function Research() {
  const { isOwner } = useAuth()
  const { lang } = useLanguage()
  const t = translations[lang]

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResearch()
  }, [])

  const fetchResearch = async () => {
    const { data, error } = await supabase
      .from('research')
      .select('*')
      .order('published_date', { ascending: false })

    if (!error) setItems(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t.common.confirmDelete)) return
    const { error } = await supabase.from('research').delete().eq('id', id)
    if (!error) setItems(items.filter((r) => r.id !== id))
  }

  if (loading) {
    return <div className="loading"><div className="loading-spinner" /></div>
  }

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h1>{t.research.title}</h1>
        <OwnerOnly>
          <button className="btn btn-primary btn-sm" onClick={() => alert('Add research form coming soon')}>{t.research.newResearch}</button>
        </OwnerOnly>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#128218;</div>
          <p>{t.research.noResearch}</p>
        </div>
      ) : (
        <div className="article-list">
          {items.map((item) => (
            <div key={item.id} className="card">
              <h3>{item.title}</h3>
              <div className="article-meta mb-1">
                {item.authors && <span className="text-muted">{item.authors}</span>}
                {item.venue && <span className="text-muted"> &middot; {item.venue}</span>}
                {item.published_date && <span className="text-muted"> &middot; {new Date(item.published_date).getFullYear()}</span>}
              </div>
              <p className="text-secondary">{item.abstract}</p>
              {item.keywords?.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {item.keywords.map((kw) => <span key={kw} className="badge badge-secondary">{kw}</span>)}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                {item.paper_url && (
                  <a href={item.paper_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">{t.research.paper}</a>
                )}
                {item.doi && (
                  <a href={`https://doi.org/${item.doi}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm">DOI</a>
                )}
              </div>
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
