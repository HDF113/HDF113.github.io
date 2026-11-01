import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, BUCKETS } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function FileUpload() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  const categoryOptions = [
    'general', 'documents', 'images', 'code', 'archives', 'videos', 'audio', 'data', 'other'
  ]

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    if (!name) {
      setName(selectedFile.name)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }

  const handleUpload = async () => {
    setError('')
    if (!file) {
      setError('Please select a file to upload.')
      return
    }

    setUploading(true)

    try {
      // Generate a unique file path
      const fileExt = file.name.split('.').pop() || 'bin'
      const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `${category}/${uniqueName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.FILES)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Insert metadata into database
      const { error: dbError } = await supabase.from('file_entries').insert({
        name: name.trim() || file.name,
        description: description.trim() || null,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        file_extension: fileExt,
        category,
        uploaded_by: user?.id,
      })

      if (dbError) throw dbError

      navigate('/files')
    } catch (err) {
      setError('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    let size = bytes
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024
      i++
    }
    return `${size.toFixed(1)} ${units[i]}`
  }

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h1>Upload File</h1>
        <button className="btn btn-sm" onClick={() => navigate(-1)}>Cancel</button>
      </div>

      {error && <div className="error-banner mb-2">{error}</div>}

      {/* Drop zone */}
      <div
        className={`drop-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
          style={{ display: 'none' }}
        />
        {file ? (
          <div className="drop-zone-file">
            <div className="file-icon">&#128196;</div>
            <div>
              <div className="file-name">{file.name}</div>
              <div className="text-muted">{formatFileSize(file.size)} - {file.type || 'unknown type'}</div>
            </div>
            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setFile(null) }}>
              Change
            </button>
          </div>
        ) : (
          <div className="drop-zone-prompt">
            <div className="empty-state-icon">&#8682;</div>
            <p>Drag &amp; drop a file here, or click to select</p>
          </div>
        )}
      </div>

      <div className="form-group mt-3">
        <label className="form-label">Display Name</label>
        <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="File display name" />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <input type="text" className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
      </div>

      <div className="form-group">
        <label className="form-label">Category</label>
        <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>
    </div>
  )
}
