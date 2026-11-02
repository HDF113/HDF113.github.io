import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { translations } from '../i18n/translations'
import { OwnerOnly } from '../components/AccessControl'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Plans() {
  const { isOwner } = useAuth()
  const { lang } = useLanguage()
  const t = translations[lang]

  const [plans, setPlans] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', 'main')
      .single()

    if (!error && data) {
      setPlans(data)
      setEditContent(data.content || '')
    } else {
      const defaultContent = lang === 'zh' ? `# 未来规划\n\n## 短期目标 (2026)\n- 完善个人网站\n- 学习新的技术栈\n\n## 中期目标 (2026-2027)\n- 发表更多技术文章\n- 参与开源项目\n\n## 长期目标\n- 持续成长，持续创造\n` : `# Future Plans\n\n## Short-term (2026)\n- Improve personal website\n- Learn new tech stacks\n\n## Mid-term (2026-2027)\n- Publish more tech articles\n- Contribute to open source\n\n## Long-term\n- Keep growing, keep creating\n`
      setPlans({ id: 'main', content: defaultContent })
      setEditContent(defaultContent)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    const { error } = await supabase
      .from('plans')
      .upsert({ id: 'main', content: editContent, updated_at: new Date().toISOString() })

    if (!error) {
      setPlans({ ...plans, content: editContent })
      setEditing(false)
    }
  }

  if (loading) {
    return <div className="loading"><div className="loading-spinner" /></div>
  }

  return (
    <div className="container">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h1>{t.plans.title}</h1>
        <OwnerOnly>
          {editing ? (
            <div className="flex gap-1">
              <button className="btn btn-primary btn-sm" onClick={handleSave}>{t.common.save}</button>
              <button className="btn btn-sm" onClick={() => { setEditing(false); setEditContent(plans?.content || ''); }}>{t.common.cancel}</button>
            </div>
          ) : (
            <button className="btn btn-sm" onClick={() => setEditing(true)}>{t.common.edit}</button>
          )}
        </OwnerOnly>
      </div>

      {editing ? (
        <div className="editor-layout">
          <div className="editor-form">
            <textarea
              className="form-textarea"
              rows="25"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="# Markdown future plans..."
            />
          </div>
          <div className="editor-preview">
            <h4 className="text-secondary mb-1">{t.blog.preview}</h4>
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{editContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{plans?.content || ''}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
