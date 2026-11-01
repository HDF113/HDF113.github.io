import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { supabase, BUCKETS } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ArticleEditor() {
  const { slug } = useParams() // If editing, slug will be provided
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [isPublished, setIsPublished] = useState(false)
  const [existingArticle, setExistingArticle] = useState(null)
  const [loading, setLoading] = useState(!!slug)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [error, setError] = useState('')

  // Load existing article if editing
  useEffect(() => {
    if (slug) {
      supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .single()
        .then(({ data }) => {
          if (data) {
            setExistingArticle(data)
            setTitle(data.title)
            setExcerpt(data.excerpt || '')
            setContent(data.content)
            setTags(data.tags?.join(', ') || '')
            setCoverImage(data.cover_image_url || '')
            setVideoUrl(data.video_url || '')
            setIsPublished(data.is_published)
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

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `covers/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.ARTICLES)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from(BUCKETS.ARTICLES)
        .getPublicUrl(filePath)

      setCoverImage(urlData.publicUrl)
    } catch (err) {
      setError('Failed to upload image: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  // Insert image into markdown content at cursor position
  const handleContentImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError('')

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `content/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.ARTICLES)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from(BUCKETS.ARTICLES)
        .getPublicUrl(filePath)

      // Insert markdown image syntax
      const markdownImage = `\n![${file.name}](${urlData.publicUrl})\n`
      setContent((prev) => prev + markdownImage)
    } catch (err) {
      setError('Failed to upload image: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async (publish = null) => {
    setError('')
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.')
      return
    }

    setSaving(true)

    const articleSlug = existingArticle?.slug || generateSlug(title)
    const publishState = publish !== null ? publish : isPublished

    const articleData = {
      title: title.trim(),
      slug: articleSlug,
      excerpt: excerpt.trim() || content.substring(0, 150).replace(/[#*`]/g, '') + '...',
      content,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      cover_image_url: coverImage || null,
      video_url: videoUrl || null,
      is_published: publishState,
      author_id: user?.id,
    }

    try {
      if (existingArticle) {
        const { error: updateError } = await supabase
          .from('articles')
          .update(articleData)
          .eq('id', existingArticle.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('articles')
          .insert(articleData)

        if (insertError) throw insertError
      }

      navigate(`/articles/${articleSlug}`)
    } catch (err) {
      setError('Failed to save article: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="loading"><div className="loading-spinner" /></div>
  }

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h1>{existingArticle ? 'Edit Article' : 'New Article'}</h1>
        <button
          className="btn btn-sm"
          onClick={() => navigate(-1)}
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="error-banner mb-2">{error}</div>
      )}

      <div className="editor-layout">
        {/* Left: Form fields */}
        <div className="editor-form">
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Excerpt</label>
            <input
              type="text"
              className="form-input"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary (auto-generated if empty)"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tags (comma-separated)</label>
            <input
              type="text"
              className="form-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="react, javascript, tutorial"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Cover Image</label>
            <div className="flex gap-1 items-center">
              <input
                type="text"
                className="form-input"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="Image URL or upload"
              />
              <button
                className="btn btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                {uploadingImage ? 'Uploading...' : 'Upload'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
            {coverImage && (
              <img src={coverImage} alt="Cover preview" className="cover-preview mt-1" />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Video URL (YouTube, Bilibili, or direct link)</label>
            <input
              type="text"
              className="form-input"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Content (Markdown) *
              <button
                type="button"
                className="btn btn-sm ml-1"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = handleContentImageUpload
                  input.click()
                }}
                disabled={uploadingImage}
                style={{ marginLeft: '8px' }}
              >
                + Insert Image
              </button>
            </label>
            <textarea
              className="form-textarea"
              rows="20"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Your article content in Markdown..."
            />
          </div>

          <div className="flex gap-2 mt-2 flex-wrap">
            <button
              className="btn btn-primary"
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Publish'}
            </button>
            <button
              className="btn"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              Save as Draft
            </button>
          </div>
        </div>

        {/* Right: Live preview */}
        <div className="editor-preview">
          <h4 className="text-secondary mb-1">Preview</h4>
          <div className="markdown-body preview-content">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {content}
              </ReactMarkdown>
            ) : (
              <p className="text-muted">Start writing to see preview...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

