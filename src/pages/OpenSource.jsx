import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { translations } from '../i18n/translations'
import { OwnerOnly } from '../components/AccessControl'

export default function OpenSource() {
  const { isOwner } = useAuth()
  const { lang } = useLanguage()
  const t = translations[lang]

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTech, setFilterTech] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('opensource_projects')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!error) setProjects(data || [])
    setLoading(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t.common.confirmDelete)) return
    const { error } = await supabase.from('opensource_projects').delete().eq('id', id)
    if (!error) setProjects(projects.filter((p) => p.id !== id))
  }

  const allTech = [...new Set(projects.flatMap((p) => p.tech_stack || []))].sort()
  const filtered = projects.filter((p) => !filterTech || p.tech_stack?.includes(filterTech))

  if (loading) {
    return <div className="loading"><div className="loading-spinner" /></div>
  }

  return (
    <div className="container-wide">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h1>{t.opensource.title}</h1>
        <OwnerOnly>
          <button className="btn btn-primary btn-sm" onClick={() => alert('Add project form coming soon')}>{t.opensource.newProject}</button>
        </OwnerOnly>
      </div>

      {allTech.length > 0 && (
        <div className="filter-bar mb-3">
          <select className="form-select" value={filterTech} onChange={(e) => setFilterTech(e.target.value)}>
            <option value="">{t.blog.allTags}</option>
            {allTech.map((tech) => <option key={tech} value={tech}>{tech}</option>)}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#128187;</div>
          <p>{t.opensource.noProjects}</p>
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map((project) => (
            <div key={project.id} className="project-card card">
              {project.screenshot_url && (
                <div className="project-card-image">
                  <img src={project.screenshot_url} alt={project.title} />
                </div>
              )}
              <div className="project-card-body">
                <div className="flex items-center justify-between gap-1">
                  <h3>{project.title}</h3>
                  {project.featured && <span className="badge">&#9733; {t.opensource.featured}</span>}
                </div>
                <p className="text-secondary text-sm mt-1">{project.description}</p>
                {project.tech_stack?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {project.tech_stack.map((tech) => <span key={tech} className="badge badge-secondary">{tech}</span>)}
                  </div>
                )}
                <div className="project-card-links mt-2">
                  {project.repo_url && (
                    <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="text-secondary">&#128279; {t.opensource.code}</a>
                  )}
                  {project.demo_url && (
                    <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="text-secondary">&#9654; {t.opensource.demo}</a>
                  )}
                </div>
                <OwnerOnly>
                  <div className="flex gap-1 mt-2">
                    <button className="btn btn-sm" onClick={() => alert('Edit coming soon')}>{t.common.edit}</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(project.id)}>{t.common.delete}</button>
                  </div>
                </OwnerOnly>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
