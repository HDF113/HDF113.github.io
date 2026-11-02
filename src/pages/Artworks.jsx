import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { translations } from '../i18n/translations'
import { OwnerOnly } from '../components/AccessControl'

export default function Artworks() {
  const { isOwner } = useAuth()
  const { lang } = useLanguage()
  const t = translations[lang]

  const [artworks, setArtworks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchArtworks()
  }, [])

  const fetchArtworks = async () => {
    const { data, error } = await supabase
      .from('artworks')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setArtworks(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t.common.confirmDelete)) return
    const { error } = await supabase.from('artworks').delete().eq('id', id)
    if (!error) setArtworks(artworks.filter((a) => a.id !== id))
  }

  if (loading) {
    return <div className="loading"><div className="loading-spinner" /></div>
  }

  return (
    <div className="container-wide">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h1>{t.artworks.title}</h1>
        <OwnerOnly>
          <button className="btn btn-primary btn-sm" onClick={() => alert('Add artwork form coming soon')}>{t.artworks.newArtwork}</button>
        </OwnerOnly>
      </div>

      {artworks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#127912;</div>
          <p>{t.artworks.noArtworks}</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {artworks.map((art) => (
            <div key={art.id} className="card">
              {art.image_url && (
                <img src={art.image_url} alt={art.title} className="artwork-image" />
              )}
              <h3>{art.title}</h3>
              <p className="text-secondary text-sm">{art.category}</p>
              <p className="text-muted text-sm">{art.year}</p>
              <p className="text-secondary">{art.description}</p>
              <OwnerOnly>
                <div className="flex gap-1 mt-2">
                  <button className="btn btn-sm" onClick={() => alert('Edit coming soon')}>{t.common.edit}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(art.id)}>{t.common.delete}</button>
                </div>
              </OwnerOnly>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
