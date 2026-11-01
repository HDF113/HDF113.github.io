import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { OwnerOnly } from '../components/AccessControl'

export default function ProjectsList() {
  const { isOwner } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterTech, setFilterTech] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!error) setProjects(data || [])
    setLoading(false)
  }

  // Collect unique tech stack items
  const allTech = [...new Set(projects.flatMap((p) => p.tech_stack || []))].sort()

  const filtered = projects.filter(
    (p) => !filterTech || p.tech_stack?.includes(filterTech)
  )

  if (loading) {
    return <div className="loading"><div className="loading-spinner" /></div>
  }

  return (
    <div className="container-wide">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h1>Projects</h1>
        <OwnerOnly>
          <Link to="/projects/new" className="btn btn-primary btn-sm">+ New Project</Link>
        </OwnerOnly>
      </div>

      {/* Filter */}
      {allTech.length > 0 && (
        <div className="filter-bar mb-3">
          <select
            className="form-select"
            value={filterTech}
            onChange={(e) => setFilterTech(e.target.value)}
          >
            <option value="">All technologies</option>
            {allTech.map((tech) => (
              <option key={tech} value={tech}>{tech}</option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#128187;</div>
          <p>No projects yet.</p>
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.slug}`}
              className="project-card card card-link"
            >
              {project.screenshot_url && (
                <div className="project-card-image">
                  <img src={project.screenshot_url} alt={project.title} />
                </div>
              )}
              <div className="project-card-body">
                <div className="flex items-center justify-between gap-1">
                  <h3>{project.title}</h3>
                  {project.featured && <span className="badge">&#9733; Featured</span>}
                </div>
                <p className="text-secondary text-sm mt-1">{project.description}</p>
                {project.tech_stack?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {project.tech_stack.map((tech) => (
                      <span key={tech} className="badge badge-secondary">{tech}</span>
                    ))}
                  </div>
                )}
                <div className="project-card-links mt-2">
                  {project.repo_url && (
                    <a
                      href={project.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      &#128279; Code
                    </a>
                  )}
                  {project.demo_url && (
                    <a
                      href={project.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      &#9654; Demo
                    </a>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
