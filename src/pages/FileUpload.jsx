import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, BUCKETS } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { translations } from '../i18n/translations'

export default function FileUpload() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { lang } = useLanguage()
  const t = translations[lang]

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  const categoryOptions = lang === 'zh'
    ? [
        { value: 'general', label: '\u4E00\u822C' },
        { value: 'documents', label: '\u6587\u6863' },
        { value: 'images', label: '\u56FE\u7247' },
        { value: 'code', label: '\u4EE3\u7801' },
        { value: 'archives', label: '\u538B\u7F29\u5305' },
        { value: 'videos', label: '\u89C6\u9891' },
        { value: 'audio', label: '\u97F3\u9891' },
        { value: 'data', label: '\u6570\u636E' },
        { value: 'other', label: '\u5176\u4ED6' },
      ]
    : [
        { value: 'general', label: 'General' },
        { value: 'documents', label: 'Documents' },
        { value: 'images', label: 'Images' },
        { value: 'code', label: 'Code' },
        { value: 'archives', label: 'Archives' },
        { value: 'videos', label: 'Videos' },
        { value: 'audio', label: 'Audio' },
        { value: 'data', label: 'Data' },
        { value: 'other', label: 'Other' },
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
      setError(t.files.selectFile)
      return
    }

    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop() || 'bin'
      const uniqueName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `${category}/${uniqueName}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.FILES)
        .upload(filePath, file)

      if (uploadError) throw uploadError

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
      setError(t.files.uploadFailed + ': ' + err.message)
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
        <h1>{t.files.uploadFile}</h1>
        <button className="btn btn-sm" onClick={() => navigate(-1)}>{t.common.cancel}</button>
      </div>

      {error && <div className="error-banner mb-2">{error}</div>}

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
              <div className="text-muted">{formatFileSize(file.size)} - {file.type || t.files.unknownType}</div>
            </div>
            <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setFile(null) }}>
              {t.files.changeFile}
            </button>
          </div>
        ) : (
          <div className="drop-zone-prompt">
            <div className="empty-state-icon">&#8682;</div>
            <p>{t.files.dragDrop}</p>
          </div>
        )}
      </div>

      <div className="form-group mt-3">
        <label className="form-label">{t.files.displayName}</label>
        <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.files.displayNamePlaceholder} />
      </div>

      <div className="form-group">
        <label className="form-label">{t.files.description}</label>
        <input type="text" className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.files.descriptionPlaceholder} />
      </div>

      <div className="form-group">
        <label className="form-label">{t.files.category}</label>
        <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categoryOptions.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? t.files.uploading : t.files.uploadFile}
      </button>
    </div>
  )
}
