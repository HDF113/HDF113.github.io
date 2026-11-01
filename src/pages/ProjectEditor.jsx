import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, BUCKETS } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ProjectEditor() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [longDescription, setLongDescription] = useState('')
  const [techStack, setTechStack] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [demoUrl, setDemoUrl] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [featured, setFeatured] = useState(false)
  const [existingProject, setExistingProject] = useState(null)
  const [loading, setLoading] = useState(!!slug)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (slug) {
      supabase
        .from('projects')
        .select('*')
        .eq('slug', slug)
        .single()
        .then(({ data }) => {
          if (data) {
            setExistingProject(data)
            setTitle(data.title)
            setDescription(data.description)
            setLongDescription(data.long_description || '')
            setTechStack(data.tech_stack?.join(', ') || '')
            setRepoUrl(data.repo_url || '')
            setDemoUrl(data.demo_url || '')
            setScreenshotUrl(data.screenshot_url || '')
            setFeatured(data.featured)
          }
          setLoading(false)
        })
    }
  })

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80)
  }

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `screenshots/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.PROJECTS)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from(BUCKETS.PROJECTS)
        .getPublicUrl(filePath)

      setScreenshotUrl(urlData.publicUrl)
    } catch (err) {
      setError('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setError('')
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.')
      return
    }

    setSaving(true)
    const projectSlug = existingProject?.slug || generateSlug(title)

    const projectData = {
      title: title.trim(),
      slug: projectSlug,
      description: description.trim(),
      long_description: longDescription || null,
      tech_stack: techStack.split(',').map((t) => t.trim()).filter(Boolean),
      repo_url: repoUrl || null,
      demo_url: demoUrl || null,
      screenshot_url: screenshotUrl || null,
      featured,
      author_id: user?.id,
    }

    try {
      if (existingProject) {
        const { error: err } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', existingProject.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('projects')
          .insert(projectData)
        if (err) throw err
      }
      navigate(`/projects/${projectSlug}`)
    } catch (err) {
      setError('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="loading"><div className="loading-spinner" /></div>

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h1>{existingProject ? 'Edit Project' : 'New Project'}</h1>
        <button className="btn btn-sm" onClick={() => navigate(-1)}>Cancel</button>
      </div>

      {error && <div className="error-banner mb-2">{error}</div>}

      <div className="form-group">
        <label className="form-label">Title *</label>
        <input type="text" className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project name" />
      </div>

      <div className="form-group">
        <label className="form-label">Short Description *</label>
        <input type="text" className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One-line description" />
      </div>

      <div className="form-group">
        <label className="form-label">Tech Stack (comma-separated)</label>
        <input type="text" className="form-input" value={techStack} onChange={(e) => setTechStack(e.target.value)} placeholder="React, Node.js, PostgreSQL" />
      </div>

      <div className="form-group">
        <label className="form-label">Repository URL</label>
        <input type="text" className="form-input" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/..." />
      </div>

      <div className="form-group">
        <label className="form-label">Demo URL</label>
        <input type="text" className="form-input" value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://my-demo.com" />
      </div>

      <div className="form-group">
        <label className="form-label">Screenshot</label>
        <div className="flex gap-1 items-center">
          <input type="text" className="form-input" value={screenshotUrl} onChange={(e) => setScreenshotUrl(e.target.value)} placeholder="Image URL or upload" />
          <button className="btn btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScreenshotUpload} style={{ display: 'none' }} />
        </div>
        {screenshotUrl && <img src={screenshotUrl} alt="Screenshot preview" className="cover-preview mt-1" />}
      </div>

      <div className="form-group">
        <label className="form-label">Detailed Description (Markdown)</label>
        <textarea className="form-textarea" rows="12" value={longDescription} onChange={(e) => setLongDescription(e.target.value)}
          placeholder="# Project Details&#10;&#10;Describe your project in detail..." />
      </div>

      <div className="form-group">
        <label className="form-label">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} style={{ marginRight: '8px' }} />
          Featured project
        </label>
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Project'}
      </button>
    </div>
  )
}

