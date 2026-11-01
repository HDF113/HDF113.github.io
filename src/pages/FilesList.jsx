import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, BUCKETS } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { OwnerOnly } from '../components/AccessControl'

export default function FilesList() {
  const { isOwner } = useAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

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
    // Increment download count
    await supabase
      .from('file_entries')
      .update({ download_count: (file.download_count || 0) + 1 })
      .eq('id', file.id)

    // Get download URL
    const { data: urlData } = supabase.storage
      .from(BUCKETS.FILES)
      .getPublicUrl(file.file_path)

    // Trigger download
    const link = document.createElement('a')
    link.href = urlData.publicUrl
    link.download = file.name
    link.target = '_blank'
    link.click()
  }

  if (loading) return <div className="loading"><div className="loading-spinner" /></div>

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h1>File Repository</h1>
        <OwnerOnly>
          <Link to="/files/upload" className="btn btn-primary btn-sm">+ Upload File</Link>
        </OwnerOnly>
      </div>

      <div className="filter-bar mb-3">
        <input
          type="text"
          className="form-input"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {categories.length > 0 && (
          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#128193;</div>
          <p>No files in the repository.</p>
        </div>
      ) : (
        <div className="files-table card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Size</th>
                <th>Downloads</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((file) => (
                <tr key={file.id}>
                  <td>
                    <div className="file-name">{file.name}</div>
                    {file.description && <div className="text-muted text-sm">{file.description}</div>}
                  </td>
                  <td><span className="badge badge-secondary">{file.category}</span></td>
                  <td className="text-muted">{formatFileSize(file.file_size)}</td>
                  <td className="text-muted">{file.download_count || 0}</td>
                  <td className="text-muted">{new Date(file.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-sm" onClick={() => handleDownload(file)}>
                      Download
                    </button>
                    {isOwner && (
                      <DeleteFileButton fileId={file.id} filePath={file.file_path} onDeleted={fetchFiles} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DeleteFileButton({ fileId, filePath, onDeleted }) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this file? This cannot be undone.')) return
    setDeleting(true)
    // Delete from storage
    await supabase.storage.from(BUCKETS.FILES).remove([filePath])
    // Delete from database
    await supabase.from('file_entries').delete().eq('id', fileId)
    setDeleting(false)
    onDeleted()
  }

  return (
    <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
      {deleting ? '...' : 'Delete'}
    </button>
  )
}
