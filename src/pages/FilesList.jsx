import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, BUCKETS } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { translations } from '../i18n/translations'
import { OwnerOnly } from '../components/AccessControl'

export default function FilesList() {
  const { isOwner } = useAuth()
  const { lang } = useLanguage()
  const t = translations[lang]

  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [previewFile, setPreviewFile] = useState(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('file_entries')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setFiles(data || [])
    setLoading(false)
  }

  const categories = [...new Set(files.map((f) => f.category))].sort()

  const filtered = files.filter((f) => {
    const matchesCategory = !category || f.category === category
    const matchesSearch =
      !searchTerm ||
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const formatFileSize = (bytes) => {
    if (!bytes) return '-'
    const units = ['B', 'KB', 'MB', 'GB']
    let i = 0
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024
      i++
    }
    return `${bytes.toFixed(1)} ${units[i]}`
  }

  const handleDownload = async (file) => {
    await supabase
      .from('file_entries')
      .update({ download_count: (file.download_count || 0) + 1 })
      .eq('id', file.id)

    const { data: urlData } = supabase.storage
      .from(BUCKETS.FILES)
      .getPublicUrl(file.file_path)

    const link = document.createElement('a')
    link.href = urlData.publicUrl
    link.download = file.name
    link.target = '_blank'
    link.click()
  }

  const handlePreview = (file) => {
    setPreviewFile(file)
  }

  const getPreviewUrl = (file) => {
    const { data: urlData } = supabase.storage
      .from(BUCKETS.FILES)
      .getPublicUrl(file.file_path)
    return urlData.publicUrl
  }

  const getFileIcon = (file) => {
    const ext = file.file_extension?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '\uD83D\uDDBC'
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) return '\uD83C\uDFAC'
    if (['mp3', 'wav', 'flac', 'ogg'].includes(ext)) return '\uD83C\uDFB5'
    if (['pdf'].includes(ext)) return '\uD83D\uDCC4'
    if (['doc', 'docx'].includes(ext)) return '\uD83D\uDCC2'
    if (['xls', 'xlsx'].includes(ext)) return '\uD83D\uDCCA'
    if (['ppt', 'pptx'].includes(ext)) return '\uD83D\uDCCA'
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'go', 'java', 'c', 'cpp', 'rs', 'rb', 'php'].includes(ext)) return '\uD83D\uDCBB'
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '\uD83D\uDCE6'
    return '\uD83D\uDCC1'
  }

  if (loading) return <div className="loading"><div className="loading-spinner" /></div>

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h1>{t.files.title}</h1>
        <OwnerOnly>
          <Link to="/files/upload" className="btn btn-primary btn-sm">+ {t.files.uploadFile}</Link>
        </OwnerOnly>
      </div>

      <div className="filter-bar mb-3">
        <input
          type="text"
          className="form-input"
          placeholder={t.files.searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {categories.length > 0 && (
          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t.files.allCategories}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#128193;</div>
          <p>{t.files.noFiles}</p>
        </div>
      ) : (
        <div className="files-grid">
          {filtered.map((file) => (
            <div key={file.id} className="file-card card">
              <div className="file-card-header">
                <span className="file-icon-large">{getFileIcon(file)}</span>
                <div className="file-card-info">
                  <div className="file-name">{file.name}</div>
                  {file.description && <div className="text-muted text-sm">{file.description}</div>}
                </div>
              </div>
              <div className="file-card-meta">
                <span className="badge badge-secondary">{file.category}</span>
                <span className="text-muted text-sm">{formatFileSize(file.file_size)}</span>
                <span className="text-muted text-sm">{file.download_count || 0} {t.files.downloads}</span>
              </div>
              <div className="file-card-actions">
                <button className="btn btn-sm" onClick={() => handleDownload(file)}>
                  {t.files.download}
                </button>
                <button className="btn btn-sm" onClick={() => handlePreview(file)}>
                  {t.files.preview}
                </button>
                {isOwner && (
                  <DeleteFileButton fileId={file.id} filePath={file.file_path} onDeleted={fetchFiles} t={t} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="modal-content card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3>{previewFile.name}</h3>
              <button className="btn btn-sm" onClick={() => setPreviewFile(null)}>{t.common.close}</button>
            </div>
            <div className="file-preview-area">
              {(() => {
                const ext = previewFile.file_extension?.toLowerCase()
                const url = getPreviewUrl(previewFile)
                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
                  return <img src={url} alt={previewFile.name} style={{ maxWidth: '100%', borderRadius: 'var(--radius)' }} />
                }
                if (['mp4', 'webm', 'ogg'].includes(ext)) {
                  return <video controls style={{ width: '100%' }}><source src={url} /></video>
                }
                if (['mp3', 'wav', 'flac'].includes(ext)) {
                  return <audio controls style={{ width: '100%' }}><source src={url} /></audio>
                }
                if (['pdf'].includes(ext)) {
                  return <iframe src={url} style={{ width: '100%', height: '500px', border: 'none' }} title={previewFile.name} />
                }
                if (['txt', 'md', 'json', 'js', 'ts', 'py', 'go', 'java', 'c', 'cpp', 'html', 'css', 'xml', 'yml', 'yaml'].includes(ext)) {
                  return <iframe src={url} style={{ width: '100%', height: '500px', border: 'none' }} title={previewFile.name} />
                }
                return (
                  <div className="empty-state">
                    <div className="empty-state-icon">{getFileIcon(previewFile)}</div>
                    <p>{t.files.noPreviewAvailable}</p>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-2">{t.files.download}</a>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DeleteFileButton({ fileId, filePath, onDeleted, t }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(t.common.confirmDelete)) return
    setDeleting(true)
    await supabase.storage.from(BUCKETS.FILES).remove([filePath])
    await supabase.from('file_entries').delete().eq('id', fileId)
    setDeleting(false)
    onDeleted()
  }

  return (
    <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
      {deleting ? '...' : t.common.delete}
    </button>
  )
}
