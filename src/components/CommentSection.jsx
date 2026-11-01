import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function CommentSection({ targetType, targetId }) {
  const { user, isAuthenticated, profile, isOwner } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [targetId])

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        is_deleted,
        parent_id,
        author_id,
        profiles:author_id (username, display_name, avatar_url)
      `)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: true })

    if (!error) {
      setComments(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!newComment.trim() || !isAuthenticated) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({
        target_type: targetType,
        target_id: targetId,
        author_id: user.id,
        content: newComment.trim(),
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        is_deleted,
        parent_id,
        author_id,
        profiles:author_id (username, display_name, avatar_url)
      `)
      .single()

    if (!error && data) {
      setComments((prev) => [...prev, data])
      setNewComment('')
    }
    setSubmitting(false)
  }

  const handleReply = async (parentId) => {
    if (!replyContent.trim() || !isAuthenticated) return
    setSubmitting(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({
        target_type: targetType,
        target_id: targetId,
        author_id: user.id,
        content: replyContent.trim(),
        parent_id: parentId,
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        is_deleted,
        parent_id,
        author_id,
        profiles:author_id (username, display_name, avatar_url)
      `)
      .single()

    if (!error && data) {
      setComments((prev) => [...prev, data])
      setReplyContent('')
      setReplyingTo(null)
    }
    setSubmitting(false)
  }

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return
    const { error } = await supabase.from('comments').delete().eq('id', commentId)
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_id !== commentId))
    }
  }

  // Build comment tree (top-level + replies)
  const topLevel = comments.filter((c) => !c.parent_id)
  const getReplies = (parentId) => comments.filter((c) => c.parent_id === parentId)

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = (now - date) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <section className="comments-section mt-3">
        <h3>Comments</h3>
        <div className="loading"><div className="loading-spinner" /></div>
      </section>
    )
  }

  return (
    <section className="comments-section mt-3">
      <h3>Comments ({topLevel.length})</h3>

      {/* New comment form */}
      {isAuthenticated ? (
        <div className="comment-form mt-2">
          <textarea
            className="form-textarea"
            rows="3"
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            className="btn btn-primary btn-sm mt-1"
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      ) : (
        <div className="comment-login-prompt card mt-2 text-center">
          <p className="text-secondary">Sign in to leave a comment.</p>
        </div>
      )}

      {/* Comments list */}
      {topLevel.length === 0 ? (
        <p className="text-muted mt-2 text-center">No comments yet. Be the first to comment!</p>
      ) : (
        <div className="comments-list mt-2">
          {topLevel.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-header">
                <span className="comment-author">
                  {comment.profiles?.display_name || comment.profiles?.username || 'Anonymous'}
                </span>
                <span className="text-muted">{formatTime(comment.created_at)}</span>
              </div>
              {comment.is_deleted ? (
                <p className="text-muted italic">[deleted]</p>
              ) : (
                <p className="comment-content">{comment.content}</p>
              )}
              <div className="comment-actions">
                {isAuthenticated && (
                  <button
                    className="btn btn-sm"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  >
                    Reply
                  </button>
                )}
                {(isOwner || comment.author_id === user?.id) && !comment.is_deleted && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDeleteComment(comment.id)}
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className="comment-reply-form mt-1">
                  <textarea
                    className="form-textarea"
                    rows="2"
                    placeholder="Write a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleReply(comment.id)}
                      disabled={submitting || !replyContent.trim()}
                    >
                      Post Reply
                    </button>
                    <button className="btn btn-sm" onClick={() => setReplyingTo(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {getReplies(comment.id).length > 0 && (
                <div className="comment-replies">
                  {getReplies(comment.id).map((reply) => (
                    <div key={reply.id} className="comment-item reply">
                      <div className="comment-header">
                        <span className="comment-author">
                          {reply.profiles?.display_name || reply.profiles?.username || 'Anonymous'}
                        </span>
                        <span className="text-muted">{formatTime(reply.created_at)}</span>
                      </div>
                      {reply.is_deleted ? (
                        <p className="text-muted italic">[deleted]</p>
                      ) : (
                        <p className="comment-content">{reply.content}</p>
                      )}
                      <div className="comment-actions">
                        {(isOwner || reply.author_id === user?.id) && !reply.is_deleted && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteComment(reply.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
