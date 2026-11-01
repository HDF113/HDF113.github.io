import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { OwnerOnly } from '../components/AccessControl'
import CommentSection from '../components/CommentSection'

export default function ProjectDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const fetchProject = async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setProject(data)
      }
      setLoading(false)
    }
    fetchProject()
  }, [slug])

  const handleDelete = async () => {
    if (!confirm('Delete this project? This cannot be undone.')) return

    if (project.screenshot_url) {
      const pathMatch = project.screenshot_url.match(/\/storage\/v1\/object\/public\/projects\/(.+)$/)
      if (pathMatch) {
        await supabase.storage.from('projects').remove([pathMatch[1]])
      }
    }

    const { error } = await supabase.from('projects').delete().eq('id', project.id)
    if (!error) navigate('/projects')
  }

  if (loading) return <div className="loading"><div className="loading-spinner" /></div>

  if (notFound) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">&#128533;</div>
          <h2>Project Not Found</h2>
          <Link to="/projects" className="btn mt-2">Back to Projects</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="breadcrumb mb-2">
        <Link to="/projects" className="text-secondary">Projects</Link>
        <span className="text-muted">/</span>
        <span>{project.title}</span>
      </div>

      <h1>{project.title}</h1>

      <div className="flex gap-2 mt-1 flex-wrap items-center">
        {project.tech_stack?.map((tech) => (
          <span key={tech} className="badge">{tech}</span>
        ))}
        {project.featured && <span className="badge">&#9733; Featured</span>}
      </div>

      <p className="text-secondary mt-2" style={{ fontSize: '1.1rem' }}>{project.description}</p>

      <div className="flex gap-2 mt-2 flex-wrap">
        {project.repo_url && (
          <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
            &#128279; View Source Code
          </a>
        )}
        {project.demo_url && (
          <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
            &#9654; Live Demo
          </a>
        )}
      </div>

      {project.screenshot_url && (
        <img src={project.screenshot_url} alt={project.title} className="project-screenshot mt-3" />
      )}

      {project.long_description && (
        <div className="markdown-body mt-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {project.long_description}
          </ReactMarkdown>
        </div>
      )}

      <OwnerOnly>
        <div className="owner-controls card mt-3">
          <h4>Manage Project</h4>
          <div className="flex gap-2 mt-2 flex-wrap">
            <Link to={`/projects/${project.slug}/edit`} className="btn btn-sm">Edit</Link>
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      </OwnerOnly>

      <CommentSection targetType="project" targetId={project.id} />
    </div>
  )
}
